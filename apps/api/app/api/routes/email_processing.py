"""Email processing endpoints for manual operations."""

import logging
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Query

from ...core.supabase import get_supabase_client
from ...services.email_processor import get_email_processor

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/emails", tags=["emails"])


@router.post("/process/{email_id}")
async def process_email_manually(
    email_id: str,
    background_tasks: BackgroundTasks,
    wait: bool = Query(False, description="Wait for processing to complete"),
):
    """
    Process a specific email by ID.

    This endpoint allows manual triggering of email processing,
    useful for reprocessing or testing.

    Args:
        email_id: Microsoft Graph email ID
        wait: If True, wait for processing; if False, process in background
    """
    logger.info(f"Manual email processing requested: {email_id}")

    processor = get_email_processor()

    if wait:
        # Process synchronously
        result = await processor.process_email(email_id)
        return {
            "status": "completed",
            "result": {
                "email_id": result.email_id,
                "success": result.success,
                "classification": result.classification.value,
                "orders_created": result.orders_created,
                "error_message": result.error_message,
                "processing_time_ms": result.processing_time_ms,
            },
        }
    else:
        # Process in background
        background_tasks.add_task(processor.process_email, email_id)
        return {
            "status": "accepted",
            "email_id": email_id,
            "message": "Processing started in background",
        }


@router.get("/logs")
async def get_processing_logs(
    limit: int = Query(50, le=200, description="Number of logs to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    status: Optional[str] = Query(None, description="Filter by status"),
):
    """
    Get email processing logs from the database.

    Returns recent processing results from workflows.ordenes_compra.
    """
    logger.info(f"Fetching processing logs: limit={limit}, offset={offset}")

    supabase = get_supabase_client()

    query = (
        supabase.schema("workflows")
        .table("ordenes_compra")
        .select("id, email_id, email_subject, email_from, cliente, cliente_id, oc_number, status, created_at, updated_at")
        .order("created_at", desc=True)
        .limit(limit)
        .offset(offset)
    )

    if status:
        query = query.eq("status", status)

    result = query.execute()

    return {
        "status": "success",
        "count": len(result.data),
        "logs": result.data,
    }


@router.get("/logs/{order_id}")
async def get_order_details(order_id: str):
    """
    Get detailed information about a specific order.

    Includes processing logs and extracted products.
    """
    logger.info(f"Fetching order details: {order_id}")

    supabase = get_supabase_client()

    # Get order
    order_result = (
        supabase.schema("workflows")
        .table("ordenes_compra")
        .select("*")
        .eq("id", order_id)
        .single()
        .execute()
    )

    if not order_result.data:
        return {
            "status": "error",
            "message": "Order not found",
        }

    # Get products
    products_result = (
        supabase.schema("workflows")
        .table("ordenes_compra_productos")
        .select("*")
        .eq("orden_compra_id", order_id)
        .execute()
    )

    return {
        "status": "success",
        "order": order_result.data,
        "products": products_result.data,
    }


@router.get("/stats")
async def get_processing_stats():
    """
    Get processing statistics.

    Returns counts by status and recent activity.
    """
    logger.info("Fetching processing stats")

    supabase = get_supabase_client()

    # Get counts by status
    all_orders = (
        supabase.schema("workflows")
        .table("ordenes_compra")
        .select("status")
        .execute()
    )

    status_counts = {}
    for order in all_orders.data:
        status = order["status"]
        status_counts[status] = status_counts.get(status, 0) + 1

    # Get recent orders (last 24 hours)
    from datetime import datetime, timedelta

    yesterday = (datetime.now() - timedelta(days=1)).isoformat()

    recent = (
        supabase.schema("workflows")
        .table("ordenes_compra")
        .select("id")
        .gte("created_at", yesterday)
        .execute()
    )

    return {
        "status": "success",
        "stats": {
            "total_orders": len(all_orders.data),
            "by_status": status_counts,
            "last_24_hours": len(recent.data),
        },
    }


@router.delete("/logs/{order_id}")
async def delete_order(order_id: str):
    """
    Delete an order and its products.

    Use with caution - this permanently deletes the record.
    """
    logger.info(f"Deleting order: {order_id}")

    supabase = get_supabase_client()

    try:
        # Products are deleted via CASCADE
        supabase.schema("workflows").table("ordenes_compra").delete().eq(
            "id", order_id
        ).execute()

        return {
            "status": "success",
            "message": f"Order {order_id} deleted",
        }

    except Exception as e:
        logger.error(f"Failed to delete order: {e}")
        return {
            "status": "error",
            "message": str(e),
        }
