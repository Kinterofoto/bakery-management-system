"""Email daily summary jobs - AM (8:00) and PM (16:00) Bogota time."""

import logging

from ..services.telegram.bot import get_bot
from ..services.email_summary import get_users_with_outlook, generate_email_summary

logger = logging.getLogger(__name__)


async def send_email_summaries(period: str = "AM") -> dict:
    """Send email digest summaries to all users with outlook_email via Telegram."""
    bot = get_bot()
    if not bot:
        logger.warning("Telegram bot not initialized, skipping email summaries")
        return {"status": "skipped", "reason": "bot_not_initialized"}

    mappings = await get_users_with_outlook()
    if not mappings:
        logger.info("No users with outlook_email, no email summaries to send")
        return {"status": "ok", "sent": 0}

    sent = 0
    errors = 0

    for mapping in mappings:
        user_id = mapping["user_id"]
        chat_id = mapping["telegram_chat_id"]
        user_data = mapping.get("users", {})
        outlook_email = user_data.get("outlook_email")
        user_name = user_data.get("name", "")

        if not outlook_email:
            continue

        try:
            summary = await generate_email_summary(
                user_id=user_id,
                outlook_email=outlook_email,
                user_name=user_name,
                period=period,
            )
            if summary:
                await bot.send_message(
                    chat_id=chat_id,
                    text=summary,
                    parse_mode="Markdown",
                )
                sent += 1
                logger.info(f"Email summary sent to chat_id={chat_id}")
            else:
                logger.info(f"No new emails for user={user_id}, skipping")

        except Exception as e:
            errors += 1
            logger.error(f"Failed to send email summary to chat_id={chat_id}: {e}")

    logger.info(f"Email {period} summaries: sent={sent}, errors={errors}")
    return {"status": "ok", "period": period, "sent": sent, "errors": errors}


async def run_email_am_summary():
    """Scheduled job: morning email summary at 8:00 AM Bogota."""
    logger.info("Running AM email summary")
    return await send_email_summaries("AM")


async def run_email_pm_summary():
    """Scheduled job: afternoon email summary at 4:00 PM Bogota."""
    logger.info("Running PM email summary")
    return await send_email_summaries("PM")
