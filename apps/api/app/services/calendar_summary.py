"""Calendar summary service: fetch and format Outlook calendar events."""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from .email_summary import get_users_with_outlook, _escape_md
from .microsoft_graph import get_graph_service

logger = logging.getLogger(__name__)

# Bogota is UTC-5
BOG_OFFSET = timedelta(hours=-5)


def _format_event_time(event: dict) -> str:
    """Format an event's time range for display."""
    if event.get("isAllDay"):
        return "Todo el dia"

    start = event.get("start", {})
    end = event.get("end", {})

    start_str = start.get("dateTime", "")
    end_str = end.get("dateTime", "")

    try:
        s = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
        e = datetime.fromisoformat(end_str.replace("Z", "+00:00"))
        return f"{s.strftime('%H:%M')} - {e.strftime('%H:%M')}"
    except (ValueError, AttributeError):
        return ""


def _format_event_location(event: dict) -> str:
    """Extract location display name."""
    loc = event.get("location")
    if isinstance(loc, dict):
        return loc.get("displayName", "")
    return ""


def _format_organizer(event: dict) -> str:
    """Extract organizer name."""
    org = event.get("organizer")
    if isinstance(org, dict):
        email_addr = org.get("emailAddress")
        if isinstance(email_addr, dict):
            return email_addr.get("name", "")
    return ""


async def generate_calendar_summary(
    outlook_email: str,
    user_name: str,
) -> Optional[str]:
    """Generate a Telegram-formatted calendar summary for today. Returns None if no events."""
    graph = get_graph_service()

    # Today in Bogota: midnight to midnight
    now_utc = datetime.now(timezone.utc)
    now_bog = now_utc + BOG_OFFSET
    start_of_day = now_bog.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day + timedelta(days=1)

    start_iso = start_of_day.strftime("%Y-%m-%dT%H:%M:%S")
    end_iso = end_of_day.strftime("%Y-%m-%dT%H:%M:%S")

    events = await graph.list_events(
        mailbox=outlook_email,
        start_date=start_iso,
        end_date=end_iso,
        top=50,
    )

    # Format message
    lines = []
    lines.append(f"*Buenos dias, {user_name}! Tu agenda de hoy:*\n")

    if not events:
        lines.append("No tienes eventos programados para hoy.")
    else:
        lines.append(f"*{len(events)} evento(s):*\n")
        for i, ev in enumerate(events, 1):
            subject = _escape_md(ev.get("subject", "(sin titulo)"))
            time_str = _format_event_time(ev)
            location = _format_event_location(ev)
            organizer = _format_organizer(ev)

            lines.append(f"{i}. *{subject}*")
            if time_str:
                lines.append(f"   {time_str}")
            if location:
                lines.append(f"   Lugar: {_escape_md(location)}")
            if organizer:
                lines.append(f"   Organiza: {_escape_md(organizer)}")
            lines.append("")

    lines.append(
        '_Para consultar: "que tengo hoy?" o "agenda reunion manana a las 10"_'
    )

    return "\n".join(lines)
