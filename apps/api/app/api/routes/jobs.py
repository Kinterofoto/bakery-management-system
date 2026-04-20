from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from supabase import Client
from datetime import datetime
from typing import Optional

from ...core.supabase import get_supabase
from ...jobs.daily_orders_report import generate_daily_orders_report
from ...jobs.telegram_daily_summary import send_daily_summaries
from ...jobs.whatsapp_reports import send_entregas_report, send_recepciones_report
from ...jobs.supplier_documents_reminder import run_supplier_documents_reminder

router = APIRouter(prefix="/jobs", tags=["jobs"])


class SupplierDocsReminderRequest(BaseModel):
    supplier_ids: Optional[list[str]] = None
    dry_run: bool = False


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


@router.post("/email-summary")
async def trigger_email_summary(
    background_tasks: BackgroundTasks,
    period: str = "AM",
):
    """Manually trigger email summary. period: AM or PM."""
    from ...jobs.email_daily_summary import send_email_summaries

    background_tasks.add_task(send_email_summaries, period)
    return {
        "status": "accepted",
        "job": "email_daily_summary",
        "period": period,
        "triggered_at": datetime.utcnow().isoformat(),
    }


@router.post("/calendar-summary")
async def trigger_calendar_summary(
    background_tasks: BackgroundTasks,
):
    """Manually trigger calendar daily summary."""
    from ...jobs.calendar_daily_summary import send_calendar_summaries

    background_tasks.add_task(send_calendar_summaries)
    return {
        "status": "accepted",
        "job": "calendar_daily_summary",
        "triggered_at": datetime.utcnow().isoformat(),
    }


@router.post("/whatsapp-entregas")
async def trigger_whatsapp_entregas(background_tasks: BackgroundTasks):
    """Manually trigger WhatsApp entregas report."""
    background_tasks.add_task(send_entregas_report)
    return {
        "status": "accepted",
        "job": "whatsapp_entregas",
        "triggered_at": datetime.utcnow().isoformat(),
    }


@router.post("/whatsapp-recepciones")
async def trigger_whatsapp_recepciones(background_tasks: BackgroundTasks):
    """Manually trigger WhatsApp recepciones report."""
    background_tasks.add_task(send_recepciones_report)
    return {
        "status": "accepted",
        "job": "whatsapp_recepciones",
        "triggered_at": datetime.utcnow().isoformat(),
    }


@router.post("/supplier-documents-reminder")
async def trigger_supplier_documents_reminder(
    request: SupplierDocsReminderRequest = SupplierDocsReminderRequest(),
):
    """Manually trigger the supplier documents reminder job.

    Runs synchronously so the caller sees the result (useful for testing).
    Optional body: {"supplier_ids": ["<uuid>", ...]} to restrict the run.
    """
    summary = await run_supplier_documents_reminder(supplier_ids=request.supplier_ids)
    return {
        "status": "ok",
        "job": "supplier_documents_reminder",
        "triggered_at": datetime.utcnow().isoformat(),
        "summary": summary,
    }


@router.get("/status")
async def get_jobs_status():
    """Get status of all scheduled jobs."""
    from ...jobs.scheduler import get_scheduler_status

    return {
        "scheduler": get_scheduler_status(),
        "timestamp": datetime.utcnow().isoformat()
    }
