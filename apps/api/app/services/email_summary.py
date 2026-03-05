"""Email summary service: fetch, classify, and format Outlook email summaries."""

import json
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

from ..core.supabase import get_supabase_client
from .microsoft_graph import get_graph_service
from .openai_client import get_openai_client

logger = logging.getLogger(__name__)

CLASSIFICATION_PROMPT = """Clasifica cada correo como:
- "importante": pedidos, cotizaciones, quejas, comunicaciones de clientes/proveedores/jefes/colegas sobre trabajo
- "promocional": newsletters, publicidad, notificaciones automaticas, suscripciones, spam

Devuelve un JSON array:
[{{"id": "...", "category": "importante"|"promocional", "summary": "resumen en 1-2 lineas en espanol"}}]

Correos:
{emails_json}"""


async def get_users_with_outlook() -> List[Dict[str, Any]]:
    """Get all active users with outlook_email and active Telegram mapping."""
    supabase = get_supabase_client()
    result = (
        supabase.table("telegram_user_mappings")
        .select("user_id, telegram_chat_id, users(id, name, outlook_email)")
        .eq("is_active", True)
        .execute()
    )
    mappings = result.data or []
    return [
        m for m in mappings
        if isinstance(m.get("users"), dict)
        and m["users"].get("outlook_email")
    ]


async def get_last_summary_time(user_id: str, period: str) -> Optional[datetime]:
    """Get the receivedDateTime cutoff from the last summary (any period)."""
    supabase = get_supabase_client()
    # Query most recent tracking regardless of period so AM/PM don't overlap
    result = (
        supabase.table("email_summary_tracking")
        .select("last_summarized_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if result.data:
        ts = result.data[0]["last_summarized_at"]
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    return None


async def save_summary_tracking(
    user_id: str, period: str, last_email_time: datetime, count: int
):
    """Record that we summarized emails up to last_email_time."""
    supabase = get_supabase_client()
    supabase.table("email_summary_tracking").insert({
        "user_id": user_id,
        "period": period,
        "last_summarized_at": last_email_time.isoformat(),
        "email_count": count,
    }).execute()


def _extract_from_address(email: dict) -> str:
    """Extract email address from Graph API email dict."""
    from_obj = email.get("from")
    if isinstance(from_obj, dict):
        addr_obj = from_obj.get("emailAddress")
        if isinstance(addr_obj, dict):
            return addr_obj.get("address", "")
    return ""


def _extract_from_name(email: dict) -> str:
    """Extract sender name from Graph API email dict."""
    from_obj = email.get("from")
    if isinstance(from_obj, dict):
        addr_obj = from_obj.get("emailAddress")
        if isinstance(addr_obj, dict):
            return addr_obj.get("name", "")
    return ""


async def classify_emails(emails: List[dict]) -> List[Dict[str, Any]]:
    """Use OpenAI to classify and summarize a batch of emails."""
    if not emails:
        return []

    email_data = []
    for e in emails:
        email_data.append({
            "id": e["id"],
            "subject": e.get("subject", "(sin asunto)"),
            "from": _extract_from_address(e),
            "preview": (e.get("bodyPreview", ""))[:200],
            "importance": e.get("importance", "normal"),
        })

    openai_client = get_openai_client()
    prompt = CLASSIFICATION_PROMPT.format(
        emails_json=json.dumps(email_data, ensure_ascii=False)
    )

    response = await openai_client.chat_completion(
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=2000,
    )

    try:
        text = response.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        return json.loads(text)
    except (json.JSONDecodeError, Exception) as e:
        logger.error(f"Failed to parse classification: {e}")
        return [
            {"id": ed["id"], "category": "importante", "summary": ed["subject"]}
            for ed in email_data
        ]


async def generate_email_summary(
    user_id: str,
    outlook_email: str,
    user_name: str,
    period: str,
) -> Optional[str]:
    """Generate a Telegram-formatted email summary. Returns None if no new emails."""
    graph = get_graph_service()

    # Determine cutoff
    last_time = await get_last_summary_time(user_id, period)
    if not last_time:
        last_time = datetime.now(timezone.utc) - timedelta(hours=12)

    # Fetch emails
    raw_emails = await graph.list_emails(
        mailbox=outlook_email,
        since=last_time,
        top=50,
    )

    if not raw_emails:
        return None

    # Classify via OpenAI
    classified = await classify_emails(raw_emails)
    classified_map = {c["id"]: c for c in classified}

    important = []
    promotional = []
    latest_received = last_time

    for email in raw_emails:
        eid = email["id"]
        received_str = email.get("receivedDateTime", "")
        try:
            received = datetime.fromisoformat(received_str.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            received = datetime.now(timezone.utc)

        if received > latest_received:
            latest_received = received

        info = classified_map.get(
            eid, {"category": "importante", "summary": email.get("subject", "")}
        )
        entry = {
            "id": eid,
            "subject": email.get("subject", "(sin asunto)"),
            "from": _extract_from_address(email),
            "from_name": _extract_from_name(email),
            "summary": info.get("summary", ""),
        }

        if info.get("category") == "importante":
            important.append(entry)
        else:
            promotional.append(entry)

    # Save tracking
    await save_summary_tracking(user_id, period, latest_received, len(raw_emails))

    # Format message - concise, no promotional details
    lines = []
    greeting = "Buenos dias" if period == "AM" else "Resumen de la tarde"
    lines.append(f"*{greeting}, {user_name}!*\n")

    if important:
        lines.append(f"*{len(important)} correo(s) importante(s):*")
        for i, e in enumerate(important, 1):
            sender = e.get("from_name") or e.get("from", "")
            lines.append(f"{i}. *{_escape_md(sender)}*: {_escape_md(e['subject'])}")

    if not important:
        lines.append("No hay correos importantes nuevos.")

    if promotional:
        lines.append(f"\n_({len(promotional)} promocionales filtrados)_")

    lines.append(
        '\n_Para responder: "responde al correo de [remitente] diciendo [mensaje]"_'
    )

    return "\n".join(lines)


def _escape_md(text: str) -> str:
    """Escape Markdown special characters for Telegram."""
    for ch in ["*", "_", "`", "["]:
        text = text.replace(ch, f"\\{ch}")
    return text
