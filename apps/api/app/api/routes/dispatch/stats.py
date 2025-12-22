"""Dispatch statistics endpoints."""

import logging
from datetime import datetime, timedelta, date
from fastapi import APIRouter

from ....core.supabase import get_supabase_client
from ....models.route import DispatchStats

logger = logging.getLogger(__name__)
router = APIRouter()


def get_bogota_today() -> date:
    """Get today's date in Bogota timezone (UTC-5)."""
    utc_now = datetime.utcnow()
    bogota_now = utc_now - timedelta(hours=5)
    return bogota_now.date()


@router.get("/stats", response_model=DispatchStats)
async def get_dispatch_stats():
    """
    Get dispatch dashboard statistics.

    Returns:
    - active_routes: Routes with status 'planned'
    - dispatched_today: Orders dispatched today
    - unassigned_orders: Orders ready for dispatch without route
    - ready_for_dispatch: All orders with status 'ready_dispatch'
    """
    logger.info("Getting dispatch stats")
    supabase = get_supabase_client()

    try:
        today = get_bogota_today()
        today_start = datetime.combine(today, datetime.min.time())
        today_end = datetime.combine(today, datetime.max.time())

        # Active routes (status = planned)
        routes_result = supabase.table("routes").select(
            "id", count="exact"
        ).eq("status", "planned").execute()
        active_routes = routes_result.count or 0

        # Dispatched today (status in [dispatched, in_delivery] and updated today)
        dispatched_result = supabase.table("orders").select(
            "id", count="exact"
        ).in_("status", ["dispatched", "in_delivery"]).gte(
            "updated_at", today_start.isoformat()
        ).lte(
            "updated_at", today_end.isoformat()
        ).execute()
        dispatched_today = dispatched_result.count or 0

        # Unassigned orders (ready_dispatch without assigned_route_id)
        unassigned_result = supabase.table("orders").select(
            "id", count="exact"
        ).eq("status", "ready_dispatch").is_("assigned_route_id", "null").execute()
        unassigned_orders = unassigned_result.count or 0

        # Ready for dispatch (all with status ready_dispatch)
        ready_result = supabase.table("orders").select(
            "id", count="exact"
        ).eq("status", "ready_dispatch").execute()
        ready_for_dispatch = ready_result.count or 0

        return DispatchStats(
            active_routes=active_routes,
            dispatched_today=dispatched_today,
            unassigned_orders=unassigned_orders,
            ready_for_dispatch=ready_for_dispatch,
        )
    except Exception as e:
        logger.error(f"Error getting dispatch stats: {e}")
        # Return zeros on error
        return DispatchStats(
            active_routes=0,
            dispatched_today=0,
            unassigned_orders=0,
            ready_for_dispatch=0,
        )


@router.get("/orders/ready")
async def get_orders_ready_for_dispatch(
    assigned_only: bool = False,
    unassigned_only: bool = False,
    route_id: str = None,
):
    """
    Get orders ready for dispatch.

    Filters:
    - assigned_only: Only orders assigned to a route
    - unassigned_only: Only orders without a route
    - route_id: Only orders assigned to specific route
    """
    logger.info("Getting orders ready for dispatch")
    supabase = get_supabase_client()

    try:
        query = supabase.table("orders").select(
            "id, order_number, expected_delivery_date, status, notes, assigned_route_id, "
            "client:clients(id, name), "
            "branch:branches(id, name, address), "
            "order_items(id, product_id, quantity_requested, quantity_available, availability_status, "
            "product:products(id, name, weight))"
        ).eq("status", "ready_dispatch")

        if unassigned_only:
            query = query.is_("assigned_route_id", "null")
        elif assigned_only:
            query = query.not_.is_("assigned_route_id", "null")

        if route_id:
            query = query.eq("assigned_route_id", route_id)

        query = query.order("expected_delivery_date")
        result = query.execute()

        return {"orders": result.data or [], "total": len(result.data or [])}
    except Exception as e:
        logger.error(f"Error getting ready orders: {e}")
        raise
