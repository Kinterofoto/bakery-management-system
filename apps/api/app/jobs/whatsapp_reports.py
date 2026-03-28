"""WhatsApp daily report jobs: entregas and recepciones."""

import logging
from datetime import datetime
from zoneinfo import ZoneInfo

from ..core.supabase import get_supabase_client
from ..services.whatsapp import send_template_message

logger = logging.getLogger(__name__)

BOG_TZ = ZoneInfo("America/Bogota")

# Recipients: list of phone numbers (international format, no '+')
ENTREGAS_RECIPIENTS = [
    "573115259295",   # Nicolás
]

RECEPCIONES_RECIPIENTS = [
    "573115259295",   # Nicolás
]


async def send_entregas_report():
    """Send daily delivery report via WhatsApp."""
    logger.info("Starting WhatsApp entregas report")
    supabase = get_supabase_client()
    today = datetime.now(BOG_TZ).strftime("%d/%m/%Y")

    try:
        pct_pedidos = await _query_pct_pedidos(supabase)
        pct_unidades = await _query_pct_unidades(supabase)

        logger.info(f"Entregas stats: pedidos={pct_pedidos}, unidades={pct_unidades}")

        for phone in ENTREGAS_RECIPIENTS:
            await send_template_message(
                to=phone,
                template_name="reporte_entregas_diario",
                language="es",
                components=[
                    {
                        "type": "header",
                        "parameters": [
                            {"type": "text", "text": today},
                        ],
                    },
                    {
                        "type": "body",
                        "parameters": [
                            {"type": "text", "text": pct_pedidos},
                            {"type": "text", "text": pct_unidades},
                        ],
                    },
                ],
            )

        logger.info("WhatsApp entregas report completed")
    except Exception as e:
        logger.error(f"WhatsApp entregas report failed: {e}", exc_info=True)


async def send_recepciones_report():
    """Send daily receptions report via WhatsApp."""
    logger.info("Starting WhatsApp recepciones report")
    supabase = get_supabase_client()
    today = datetime.now(BOG_TZ).strftime("%d/%m/%Y")

    try:
        count = await _query_recepciones_count(supabase)
        logger.info(f"Recepciones count: {count}")

        for phone in RECEPCIONES_RECIPIENTS:
            await send_template_message(
                to=phone,
                template_name="reporte_recepciones_diario",
                language="es",
                components=[
                    {
                        "type": "header",
                        "parameters": [
                            {"type": "text", "text": today},
                        ],
                    },
                    {
                        "type": "body",
                        "parameters": [
                            {"type": "text", "text": str(count)},
                        ],
                    },
                ],
            )

        logger.info("WhatsApp recepciones report completed")
    except Exception as e:
        logger.error(f"WhatsApp recepciones report failed: {e}", exc_info=True)


async def _query_pct_pedidos(supabase) -> str:
    """Query percentage of orders delivered today."""
    result = supabase.table("orders").select(
        "id, status"
    ).eq(
        "expected_delivery_date",
        datetime.now(BOG_TZ).strftime("%Y-%m-%d"),
    ).execute()

    rows = result.data or []
    if not rows:
        return "0%"

    delivered = sum(1 for r in rows if r["status"] == "delivered")
    pct = round(delivered / len(rows) * 100, 1)
    return f"{pct}%"


async def _query_pct_unidades(supabase) -> str:
    """Query in-full percentage for today's deliveries."""
    # Get today's order IDs
    orders = supabase.table("orders").select("id").eq(
        "expected_delivery_date",
        datetime.now(BOG_TZ).strftime("%Y-%m-%d"),
    ).execute()

    order_ids = [o["id"] for o in (orders.data or [])]
    if not order_ids:
        return "0%"

    items = supabase.table("order_items").select(
        "quantity_requested, quantity_delivered"
    ).in_("order_id", order_ids).execute()

    rows = items.data or []
    total_requested = sum(r.get("quantity_requested", 0) or 0 for r in rows)
    total_delivered = sum(r.get("quantity_delivered", 0) or 0 for r in rows)

    if total_requested == 0:
        return "0%"

    pct = round(total_delivered / total_requested * 100, 1)
    return f"{pct}%"


async def _query_recepciones_count(supabase) -> int:
    """Query count of receptions (purchase movements) today."""
    today = datetime.now(BOG_TZ).strftime("%Y-%m-%d")

    # Query inventory movements with reason_type = 'purchase' for today
    # The movement_date is stored with timezone, filter by date
    result = supabase.schema("inventario").table("inventory_movements").select(
        "id", count="exact"
    ).eq("reason_type", "purchase").gte(
        "movement_date", f"{today}T00:00:00-05:00"
    ).lt(
        "movement_date", f"{today}T23:59:59-05:00"
    ).execute()

    return result.count or 0


# Scheduler wrappers (sync entry points for APScheduler)
async def run_entregas_report():
    await send_entregas_report()


async def run_recepciones_report():
    await send_recepciones_report()
