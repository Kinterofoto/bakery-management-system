"""Scheduled job: check and send due Telegram reminders."""

import logging
from datetime import timedelta
from zoneinfo import ZoneInfo

from ..core.supabase import get_supabase_client
from ..core.tz import now_bogota
from ..services.telegram.bot import get_bot

logger = logging.getLogger(__name__)

BOG_TZ = ZoneInfo("America/Bogota")


def _calculate_next_run(remind_at, recurrence: str):
    """Calculate the next run time based on recurrence pattern.

    Patterns:
        None      → one-time (no next run)
        'daily'   → same time next day
        'weekdays'→ same time next weekday (Mon-Fri)
        'weekly:N'→ same time next week on day N (0=Mon, 6=Sun)
    """
    if not recurrence:
        return None

    if recurrence == "daily":
        return remind_at + timedelta(days=1)

    if recurrence == "weekdays":
        next_run = remind_at + timedelta(days=1)
        # Skip weekends
        while next_run.weekday() >= 5:  # 5=Sat, 6=Sun
            next_run += timedelta(days=1)
        return next_run

    if recurrence.startswith("weekly:"):
        target_day = int(recurrence.split(":")[1])
        next_run = remind_at + timedelta(days=7)
        # Adjust to target day of week
        days_diff = (target_day - next_run.weekday()) % 7
        if days_diff == 0:
            days_diff = 7
        next_run = remind_at + timedelta(days=days_diff)
        return next_run

    return None


async def process_due_reminders():
    """Check for due reminders and send them via Telegram."""
    bot = get_bot()
    if not bot:
        return

    supabase = get_supabase_client()
    now = now_bogota()

    # Fetch due reminders
    result = (
        supabase.table("telegram_reminders")
        .select("*")
        .eq("status", "active")
        .lte("next_run_at", now.isoformat())
        .order("next_run_at")
        .limit(50)
        .execute()
    )

    reminders = result.data or []
    if not reminders:
        return

    logger.info(f"Processing {len(reminders)} due reminders")

    for reminder in reminders:
        try:
            chat_id = reminder["telegram_chat_id"]
            message = f"⏰ *Recordatorio*\n\n{reminder['message']}"

            await bot.send_message(
                chat_id=chat_id,
                text=message,
                parse_mode="Markdown",
            )

            # Update status based on recurrence
            recurrence = reminder.get("recurrence")
            if recurrence:
                next_run = _calculate_next_run(
                    now,  # Use current time as base
                    recurrence,
                )
                if next_run:
                    supabase.table("telegram_reminders").update({
                        "next_run_at": next_run.isoformat(),
                    }).eq("id", reminder["id"]).execute()
                else:
                    supabase.table("telegram_reminders").update({
                        "status": "completed",
                    }).eq("id", reminder["id"]).execute()
            else:
                # One-time reminder → mark completed
                supabase.table("telegram_reminders").update({
                    "status": "completed",
                }).eq("id", reminder["id"]).execute()

            logger.info(f"Reminder sent: {reminder['id']} to chat {chat_id}")

        except Exception as e:
            logger.error(f"Failed to send reminder {reminder['id']}: {e}")
