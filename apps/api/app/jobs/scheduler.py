from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
import logging

from ..core.supabase import get_supabase_client
from .daily_orders_report import generate_daily_orders_report

logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler: AsyncIOScheduler | None = None


def init_scheduler() -> AsyncIOScheduler:
    """Initialize and configure the APScheduler."""
    global scheduler

    scheduler = AsyncIOScheduler(timezone="America/Bogota")

    # Daily orders report - runs at 6:00 AM every day
    scheduler.add_job(
        run_daily_orders_report,
        CronTrigger(hour=6, minute=0),
        id="daily_orders_report",
        name="Daily Orders Report",
        replace_existing=True
    )

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
