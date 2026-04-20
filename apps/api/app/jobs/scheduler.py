from zoneinfo import ZoneInfo

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
import logging

BOG_TZ = ZoneInfo("America/Bogota")

from ..core.supabase import get_supabase_client
from .daily_orders_report import generate_daily_orders_report
from .telegram_daily_summary import run_am_summary, run_pm_summary
from .email_daily_summary import run_email_am_summary, run_email_pm_summary
from .calendar_daily_summary import run_calendar_summary
from .telegram_reminders import process_due_reminders
from .email_reconciliation import reconcile_missed_emails
from .whatsapp_reports import run_entregas_report, run_recepciones_report
from .supplier_documents_reminder import run_supplier_documents_reminder

logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler: AsyncIOScheduler | None = None


def init_scheduler() -> AsyncIOScheduler:
    """Initialize and configure the APScheduler."""
    global scheduler

    scheduler = AsyncIOScheduler(timezone="America/Bogota")

    # Daily orders report - runs at 6:00 AM COL every day
    scheduler.add_job(
        run_daily_orders_report,
        CronTrigger(hour=6, minute=0, timezone=BOG_TZ),
        id="daily_orders_report",
        name="Daily Orders Report",
        replace_existing=True
    )

    # Telegram daily summaries
    scheduler.add_job(
        run_am_summary,
        CronTrigger(hour=6, minute=15, timezone=BOG_TZ),
        id="telegram_am_summary",
        name="Telegram AM Summary",
        replace_existing=True,
    )
    scheduler.add_job(
        run_pm_summary,
        CronTrigger(hour=17, minute=0, timezone=BOG_TZ),
        id="telegram_pm_summary",
        name="Telegram PM Summary",
        replace_existing=True,
    )

    # Email daily summaries (Outlook inbox digest)
    scheduler.add_job(
        run_email_am_summary,
        CronTrigger(hour=8, minute=0, timezone=BOG_TZ),
        id="email_am_summary",
        name="Email AM Summary",
        replace_existing=True,
    )
    scheduler.add_job(
        run_email_pm_summary,
        CronTrigger(hour=16, minute=0, timezone=BOG_TZ),
        id="email_pm_summary",
        name="Email PM Summary",
        replace_existing=True,
    )

    # Calendar daily summary at 7:00 AM COL
    scheduler.add_job(
        run_calendar_summary,
        CronTrigger(hour=7, minute=0, timezone=BOG_TZ),
        id="calendar_am_summary",
        name="Calendar AM Summary",
        replace_existing=True,
    )

    # Telegram reminders — check every minute for due reminders
    scheduler.add_job(
        process_due_reminders,
        IntervalTrigger(minutes=1, timezone=BOG_TZ),
        id="telegram_reminders",
        name="Telegram Reminders",
        replace_existing=True,
    )

    # Email reconciliation — L-V 1pm, 2pm, 3pm / Sáb 8am, 9am, 10am (COL)
    scheduler.add_job(
        reconcile_missed_emails,
        CronTrigger(
            day_of_week="mon-fri", hour="13,14,15", minute=0, timezone=BOG_TZ
        ),
        id="email_reconciliation_weekday",
        name="Email Reconciliation (L-V)",
        replace_existing=True,
    )
    scheduler.add_job(
        reconcile_missed_emails,
        CronTrigger(
            day_of_week="sat", hour="8,9,10", minute=0, timezone=BOG_TZ
        ),
        id="email_reconciliation_saturday",
        name="Email Reconciliation (Sáb)",
        replace_existing=True,
    )

    # WhatsApp daily reports
    scheduler.add_job(
        run_recepciones_report,
        CronTrigger(hour=19, minute=0, timezone=BOG_TZ),
        id="whatsapp_recepciones",
        name="WhatsApp Recepciones Report",
        replace_existing=True,
    )
    scheduler.add_job(
        run_entregas_report,
        CronTrigger(hour=20, minute=0, timezone=BOG_TZ),
        id="whatsapp_entregas",
        name="WhatsApp Entregas Report",
        replace_existing=True,
    )

    # Supplier documents reminder - Mon/Thu 8:00 AM COL
    scheduler.add_job(
        run_supplier_documents_reminder,
        CronTrigger(day_of_week="mon,thu", hour=8, minute=0, timezone=BOG_TZ),
        id="supplier_documents_reminder",
        name="Supplier Documents Reminder",
        replace_existing=True,
    )

    # Webhook renewal is handled externally by Cloud Scheduler + startup check
    # (resilient to Cloud Run scale-to-zero)

    logger.info("Scheduler initialized with jobs")
    return scheduler


async def run_daily_orders_report():
    """Wrapper to run daily orders report with Supabase client."""
    logger.info("Starting scheduled daily orders report")
    try:
        supabase = get_supabase_client()
        await generate_daily_orders_report(supabase)
        logger.info("Daily orders report completed successfully")
    except Exception as e:
        logger.error(f"Daily orders report failed: {e}")
        raise



def start_scheduler():
    """Start the scheduler if not already running."""
    global scheduler
    if scheduler and not scheduler.running:
        scheduler.start()
        logger.info("Scheduler started")


def shutdown_scheduler():
    """Shutdown the scheduler gracefully."""
    global scheduler
    if scheduler and scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler shutdown")


def get_scheduler_status() -> dict:
    """Get current scheduler status and job information."""
    global scheduler

    if not scheduler:
        return {"status": "not_initialized", "jobs": []}

    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "name": job.name,
            "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
            "trigger": str(job.trigger)
        })

    return {
        "status": "running" if scheduler.running else "stopped",
        "jobs": jobs,
        "timezone": str(scheduler.timezone)
    }
