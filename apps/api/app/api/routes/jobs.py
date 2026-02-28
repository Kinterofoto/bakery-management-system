from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from supabase import Client
from datetime import datetime

from ...core.supabase import get_supabase
from ...jobs.daily_orders_report import generate_daily_orders_report
from ...jobs.telegram_daily_summary import send_daily_summaries

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("/daily-orders-report")
async def trigger_daily_orders_report(
    background_tasks: BackgroundTasks,
    supabase: Client = Depends(get_supabase)
):
    """
    Manually trigger the daily orders report job.
    Can be called by Cloud Scheduler or manually for testing.
    """
    background_tasks.add_task(generate_daily_orders_report, supabase)

    return {
        "status": "accepted",
        "job": "daily_orders_report",
        "triggered_at": datetime.utcnow().isoformat(),
        "message": "Job started in background"
    }


@router.post("/telegram-summary")
async def trigger_telegram_summary(
    background_tasks: BackgroundTasks,
    period: str = "AM",
):
    """Manually trigger Telegram daily summary. period: AM or PM."""
    background_tasks.add_task(send_daily_summaries, period)
    return {
        "status": "accepted",
        "job": "telegram_daily_summary",
        "period": period,
        "triggered_at": datetime.utcnow().isoformat(),
    }


@router.get("/status")
async def get_jobs_status():
    """Get status of all scheduled jobs."""
    from ...jobs.scheduler import get_scheduler_status

    return {
        "scheduler": get_scheduler_status(),
        "timestamp": datetime.utcnow().isoformat()
    }
