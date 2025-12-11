from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from supabase import Client
from datetime import datetime

from ...core.supabase import get_supabase
from ...jobs.daily_orders_report import generate_daily_orders_report

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


@router.get("/status")
async def get_jobs_status():
    """Get status of all scheduled jobs."""
    from ...jobs.scheduler import get_scheduler_status

    return {
        "scheduler": get_scheduler_status(),
        "timestamp": datetime.utcnow().isoformat()
    }
