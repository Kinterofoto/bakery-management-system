"""Telegram daily summary jobs - AM (6:15) and PM (17:00) Bogota time."""

import logging

from ..core.supabase import get_supabase_client
from ..services.telegram.bot import get_bot
from ..services.telegram.ai_agent import generate_summary

logger = logging.getLogger(__name__)


async def send_daily_summaries(period: str = "AM") -> dict:
    """
    Send daily summaries to all active Telegram-linked commercials.

    Args:
        period: "AM" for morning summary, "PM" for evening summary
    """
    bot = get_bot()
    if not bot:
        logger.warning("Telegram bot not initialized, skipping summaries")
        return {"status": "skipped", "reason": "bot_not_initialized"}

    supabase = get_supabase_client()

    # Get all active mappings
    result = (
        supabase.table("telegram_user_mappings")
        .select("user_id, telegram_chat_id, users(name)")
        .eq("is_active", True)
        .execute()
    )

    mappings = result.data or []
    if not mappings:
        logger.info("No active Telegram mappings, no summaries to send")
        return {"status": "ok", "sent": 0}

    sent = 0
    errors = 0

    for mapping in mappings:
        user_id = mapping["user_id"]
        chat_id = mapping["telegram_chat_id"]

        try:
            summary = await generate_summary(user_id, period=period)
            await bot.send_message(
                chat_id=chat_id,
                text=summary,
                parse_mode="Markdown",
            )
            sent += 1
            logger.info(f"Summary sent to chat_id={chat_id} (user={user_id})")

        except Exception as e:
            errors += 1
            logger.error(f"Failed to send summary to chat_id={chat_id}: {e}")

    logger.info(f"Daily {period} summaries: sent={sent}, errors={errors}")
    return {"status": "ok", "period": period, "sent": sent, "errors": errors}


async def run_am_summary():
    """Scheduled job: morning summary at 6:15 AM Bogota."""
    logger.info("Running AM Telegram summary")
    return await send_daily_summaries("AM")


async def run_pm_summary():
    """Scheduled job: evening summary at 5:00 PM Bogota."""
    logger.info("Running PM Telegram summary")
    return await send_daily_summaries("PM")
