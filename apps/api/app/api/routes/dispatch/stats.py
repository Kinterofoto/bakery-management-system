"""Dispatch statistics endpoints."""

import logging
from datetime import datetime, timedelta, date
from fastapi import APIRouter

from ....core.supabase import get_supabase_client
from ....models.route import DispatchStats

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/init")
async def get_dispatch_init_data():
    """
    Get all initial data for dispatch page in a single request.

    Returns routes, vehicles, drivers, receiving schedules, and stats.
    This reduces multiple API calls to a single one for faster page load.
    """
    logger.info("Getting dispatch init data")
    supabase = get_supabase_client()

    try:
        today = get_bogota_today()
        today_start = datetime.combine(today, datetime.min.time())
        today_end = datetime.combine(today, datetime.max.time())

        # Run all queries
        # 1. Routes with planned status
        routes_query = supabase.table("routes").select(
            "*, route_orders(id, order_id, delivery_sequence)"
        ).eq("status", "planned").order("route_date", desc=True)

        # 2. Vehicles
        vehicles_query = supabase.table("vehicles").select("*").order("vehicle_code")

        # 3. Drivers (users with driver role)
        drivers_query = supabase.table("users").select(
            "id, name, email, cedula"
        ).eq("role", "driver").eq("status", "active").order("name")

        # 4. Receiving schedules
        schedules_query = supabase.table("receiving_schedules").select("*").order("day_of_week").order("start_time")

        # 5. Stats queries
        active_routes_query = supabase.table("routes").select("id", count="exact").eq("status", "planned")
        dispatched_query = supabase.table("orders").select("id", count="exact").in_(
            "status", ["dispatched", "in_delivery"]
        ).gte("updated_at", today_start.isoformat()).lte("updated_at", today_end.isoformat())
        unassigned_query = supabase.table("orders").select("id", count="exact").eq(
            "status", "ready_dispatch"
        ).is_("assigned_route_id", "null")

        # Execute all queries
        routes_result = routes_query.execute()

        vehicles_result = None
        try:
            vehicles_result = vehicles_query.execute()
        except Exception:
            pass

        drivers_result = drivers_query.execute()
        schedules_result = schedules_query.execute()
        active_routes_result = active_routes_query.execute()
        dispatched_result = dispatched_query.execute()
        unassigned_result = unassigned_query.execute()

        # Get driver and vehicle info for routes
        routes_data = routes_result.data or []
        driver_ids = [r["driver_id"] for r in routes_data if r.get("driver_id")]
        vehicle_ids = [r["vehicle_id"] for r in routes_data if r.get("vehicle_id")]

        drivers_map = {}
        if driver_ids:
            drivers_info = supabase.table("users").select("id, name").in_("id", driver_ids).execute()
            drivers_map = {d["id"]: d["name"] for d in (drivers_info.data or [])}

        vehicles_map = {}
        if vehicle_ids and vehicles_result:
            vehicles_map = {v["id"]: v["vehicle_code"] for v in (vehicles_result.data or [])}

        # Build routes with driver/vehicle names
        routes = []
        for r in routes_data:
            routes.append({
                "id": r["id"],
                "route_number": r.get("route_number"),
                "route_name": r["route_name"],
                "route_date": r["route_date"],
                "status": r["status"],
                "driver_id": r.get("driver_id"),
                "driver_name": drivers_map.get(r.get("driver_id")),
                "vehicle_id": r.get("vehicle_id"),
                "vehicle_code": vehicles_map.get(r.get("vehicle_id")),
                "orders_count": len(r.get("route_orders", [])),
                "created_at": r.get("created_at"),
            })

        return {
            "routes": routes,
            "vehicles": vehicles_result.data if vehicles_result else [],
            "drivers": drivers_result.data or [],
            "receiving_schedules": schedules_result.data or [],
            "stats": {
                "active_routes": active_routes_result.count or 0,
                "dispatched_today": dispatched_result.count or 0,
                "unassigned_orders": unassigned_result.count or 0,
                "ready_for_dispatch": unassigned_result.count or 0,
            }
        }
    except Exception as e:
        logger.error(f"Error getting dispatch init data: {e}")
        raise


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
            "id, order_number, expected_delivery_date, status, observations, assigned_route_id, "
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
