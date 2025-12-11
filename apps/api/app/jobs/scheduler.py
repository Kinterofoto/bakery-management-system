from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
import logging

from ..core.supabase import get_supabase_client
from .daily_orders_report import generate_daily_orders_report
from .webhook_renewal import renew_webhook_subscriptions, ensure_subscription_exists

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

    # Webhook renewal - runs every 2 days at 3:00 AM
    # Microsoft Graph subscriptions expire after ~3 days (4230 minutes)
    scheduler.add_job(
        run_webhook_renewal,
        CronTrigger(day="*/2", hour=3, minute=0),
        id="webhook_renewal",
        name="Webhook Subscription Renewal",
        replace_existing=True
    )

    # Ensure subscription exists - runs at startup and daily at 4:00 AM
    scheduler.add_job(
        run_ensure_subscription,
        CronTrigger(hour=4, minute=0),
        id="ensure_subscription",
        name="Ensure Webhook Subscription",
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


async def run_webhook_renewal():
    """Wrapper to run webhook renewal job."""
    logger.info("Starting scheduled webhook renewal")
    try:
        result = await renew_webhook_subscriptions()
        logger.info(f"Webhook renewal completed: {result}")
    except Exception as e:
        logger.error(f"Webhook renewal failed: {e}")
        raise


async def run_ensure_subscription():
    """Wrapper to ensure webhook subscription exists."""
    logger.info("Starting scheduled subscription check")
    try:
        result = await ensure_subscription_exists()
        logger.info(f"Subscription check completed: {result}")
    except Exception as e:
        logger.error(f"Subscription check failed: {e}")
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
