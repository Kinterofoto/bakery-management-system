"""Order statistics and dashboard data endpoints."""

import logging
from datetime import datetime, timedelta
from fastapi import APIRouter

from .....core.supabase import get_supabase_client
from .....models.order import OrderStats

logger = logging.getLogger(__name__)
router = APIRouter()


def get_today_date() -> str:
    return datetime.now().strftime("%Y-%m-%d")


def get_tomorrow_date() -> str:
    return (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")


def get_week_end_date() -> str:
    return (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")


@router.get("/stats", response_model=OrderStats)
async def get_order_stats():
    """
    Get order statistics for dashboard badges.

    Returns counts by:
    - today: Orders for today's delivery
    - tomorrow: Orders for tomorrow's delivery
    - this_week: Orders for the next 7 days
    - by_status: Count per status
    - total: Total active orders
    """
    logger.info("Fetching order statistics")

    supabase = get_supabase_client()
    today = get_today_date()
    tomorrow = get_tomorrow_date()
    week_end = get_week_end_date()

    # Statuses to exclude from counts
    excluded_statuses = "(delivered,cancelled,returned)"

    try:
        # Get counts by date (using PostgREST filter syntax)
        today_result = (
            supabase.table("orders")
            .select("id", count="exact")
            .eq("expected_delivery_date", today)
            .filter("status", "not.in", excluded_statuses)
            .execute()
        )

        tomorrow_result = (
            supabase.table("orders")
            .select("id", count="exact")
            .eq("expected_delivery_date", tomorrow)
            .filter("status", "not.in", excluded_statuses)
            .execute()
        )

        week_result = (
            supabase.table("orders")
            .select("id", count="exact")
            .gte("expected_delivery_date", today)
            .lte("expected_delivery_date", week_end)
            .filter("status", "not.in", excluded_statuses)
            .execute()
        )

        # Get counts by status
        all_orders = (
            supabase.table("orders")
            .select("status")
            .filter("status", "not.in", excluded_statuses)
            .execute()
        )

        # Count by status
        by_status = {}
        for order in all_orders.data:
            status = order["status"]
            by_status[status] = by_status.get(status, 0) + 1

        total = sum(by_status.values())

        return OrderStats(
            today=today_result.count or 0,
            tomorrow=tomorrow_result.count or 0,
            this_week=week_result.count or 0,
            by_status=by_status,
            total=total,
        )

    except Exception as e:
        logger.error(f"Error fetching stats: {e}")
        # Return empty stats on error
        return OrderStats()


@router.get("/dashboard")
async def get_dashboard_data():
    """
    Get aggregated dashboard data in a single request.

    Combines stats, recent orders, and alerts.
    """
    logger.info("Fetching dashboard data")

    supabase = get_supabase_client()
    today = get_today_date()
    tomorrow = get_tomorrow_date()

    try:
        # Get stats
        stats_result = await get_order_stats()

        # Get recent orders (last 10)
        recent_orders = (
            supabase.table("orders")
            .select(
                "id, order_number, expected_delivery_date, status, total_value, "
                "clients(name)"
            )
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )

        # Get orders with pending missing items
        pending_missing = (
            supabase.table("orders")
            .select("id, order_number, clients(name)", count="exact")
            .eq("has_pending_missing", True)
            .filter("status", "not.in", "(delivered,cancelled,returned)")
            .execute()
        )

        # Get orders needing review (review_area1 or review_area2)
        needs_review = (
            supabase.table("orders")
            .select("id", count="exact")
            .filter("status", "in", "(received,review_area1,review_area2)")
            .execute()
        )

        # Format recent orders
        recent = []
        for order in recent_orders.data:
            client = order.get("clients") or {}
            recent.append({
                "id": order["id"],
                "order_number": order.get("order_number"),
                "expected_delivery_date": order.get("expected_delivery_date"),
                "status": order["status"],
                "total": order.get("total_value"),
                "client_name": client.get("name"),
            })

        return {
            "stats": stats_result.model_dump(),
            "recent_orders": recent,
            "alerts": {
                "pending_missing_count": pending_missing.count or 0,
                "needs_review_count": needs_review.count or 0,
            }
        }

    except Exception as e:
        logger.error(f"Error fetching dashboard: {e}")
        return {
            "stats": OrderStats().model_dump(),
            "recent_orders": [],
            "alerts": {"pending_missing_count": 0, "needs_review_count": 0},
        }


@router.get("/client-frequencies")
async def get_client_frequencies():
    """
    Get active client delivery frequencies.

    Used for suggesting delivery dates based on branch configuration.
    """
    logger.info("Fetching client frequencies")

    supabase = get_supabase_client()

    try:
        result = (
            supabase.table("client_frequencies")
            .select("*")
            .eq("is_active", True)
            .execute()
        )

        return {"frequencies": result.data or []}

    except Exception as e:
        logger.error(f"Error fetching client frequencies: {e}")
        return {"frequencies": []}
