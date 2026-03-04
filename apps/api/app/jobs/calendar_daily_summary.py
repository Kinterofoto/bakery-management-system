"""Calendar daily summary job - 7:00 AM Bogota time."""

import logging

from ..services.telegram.bot import get_bot
from ..services.email_summary import get_users_with_outlook
from ..services.calendar_summary import generate_calendar_summary

logger = logging.getLogger(__name__)


async def send_calendar_summaries() -> dict:
    """Send calendar summaries to all users with outlook_email via Telegram."""
    bot = get_bot()
    if not bot:
        logger.warning("Telegram bot not initialized, skipping calendar summaries")
        return {"status": "skipped", "reason": "bot_not_initialized"}

    mappings = await get_users_with_outlook()
    if not mappings:
        logger.info("No users with outlook_email, no calendar summaries to send")
        return {"status": "ok", "sent": 0}

    sent = 0
    errors = 0

    for mapping in mappings:
        chat_id = mapping["telegram_chat_id"]
        user_data = mapping.get("users", {})
        outlook_email = user_data.get("outlook_email")
        user_name = user_data.get("name", "")

        if not outlook_email:
            continue

        try:
            summary = await generate_calendar_summary(
                outlook_email=outlook_email,
                user_name=user_name,
            )
            if summary:
                await bot.send_message(
                    chat_id=chat_id,
                    text=summary,
                    parse_mode="Markdown",
                )
                sent += 1
                logger.info(f"Calendar summary sent to chat_id={chat_id}")

        except Exception as e:
            errors += 1
            logger.error(f"Failed to send calendar summary to chat_id={chat_id}: {e}")

    logger.info(f"Calendar summaries: sent={sent}, errors={errors}")
    return {"status": "ok", "sent": sent, "errors": errors}


async def run_calendar_summary():
    """Scheduled job: calendar summary at 7:00 AM Bogota."""
    logger.info("Running calendar daily summary")
    return await send_calendar_summaries()
