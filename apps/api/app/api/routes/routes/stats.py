"""Routes statistics and initialization endpoints."""

import logging
from typing import Optional
from fastapi import APIRouter, Header

from ....core.supabase import get_supabase_client

logger = logging.getLogger(__name__)
router = APIRouter()


def get_user_id_from_token(authorization: Optional[str]) -> Optional[str]:
    """Extract user_id from JWT token."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        import jwt
        token = authorization.replace("Bearer ", "")
        decoded = jwt.decode(token, options={"verify_signature": False})
        return decoded.get("sub")
    except Exception:
        return None


@router.get("/init")
async def get_routes_init_data(
    authorization: Optional[str] = Header(None),
):
    """
    Get all initial data for routes page in ONE request.

    Returns:
    - routes (con status != completed)
    - vehicles
    - drivers
    - stats (active routes count, etc)
    """
    logger.info("Getting routes init data")
    supabase = get_supabase_client()
    user_id = get_user_id_from_token(authorization)

    try:
        # === QUERIES ===

        # 1. Routes activas (no completadas) con route_orders
        routes_query = supabase.table("routes").select(
            "*, route_orders(id, order_id, delivery_sequence)"
        ).neq("status", "completed").order("route_date", desc=True).limit(20)

        routes_result = routes_query.execute()

        # 2. Vehicles
        vehicles_result = supabase.table("vehicles").select(
            "id, vehicle_code, capacity_kg, status"
        ).execute()

        # 3. Drivers (usuarios con rol driver)
        drivers_result = supabase.table("users").select(
            "id, name, email"
        ).eq("role", "driver").execute()

        # 4. Stats
        active_routes_result = supabase.table("routes").select(
            "id", count="exact"
        ).in_("status", ["planned", "in_progress"]).execute()

        # === ENRIQUECIMIENTO ===
        routes_data = routes_result.data or []
        driver_ids = list(set([r["driver_id"] for r in routes_data if r.get("driver_id")]))
        vehicle_ids = list(set([r["vehicle_id"] for r in routes_data if r.get("vehicle_id")]))

        # Get all order IDs from route_orders
        all_order_ids = []
        for r in routes_data:
            for ro in r.get("route_orders", []):
                if ro.get("order_id"):
                    all_order_ids.append(ro["order_id"])

        # Fetch orders with client info
        orders_map = {}
        if all_order_ids:
            orders_result = supabase.table("orders").select(
                "id, order_number, status, client_id, clients(id, name, razon_social, nit)"
            ).in_("id", all_order_ids).execute()

            for o in (orders_result.data or []):
                orders_map[o["id"]] = o

        # Mapeo de drivers
        drivers_map = {}
        if driver_ids:
            drivers_info = supabase.table("users").select("id, name").in_("id", driver_ids).execute()
            drivers_map = {d["id"]: d["name"] for d in (drivers_info.data or [])}

        # Mapeo de vehicles
        vehicles_map = {}
        if vehicle_ids:
            vehicles_info = supabase.table("vehicles").select("id, vehicle_code").in_("id", vehicle_ids).execute()
            vehicles_map = {v["id"]: v["vehicle_code"] for v in (vehicles_info.data or [])}

        # === TRANSFORMACION ===
        routes = []
        for r in routes_data:
            # Enrich route_orders with full order details
            route_orders = []
            for ro in sorted(r.get("route_orders", []), key=lambda x: x.get("delivery_sequence", 0)):
                order = orders_map.get(ro["order_id"])
                route_orders.append({
                    "id": ro["id"],
                    "order_id": ro["order_id"],
                    "delivery_sequence": ro.get("delivery_sequence", 0),
                    "orders": order,  # Include full order object with client info
                })

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
                "orders_count": len(route_orders),
                "created_at": r.get("created_at"),
                "route_orders": route_orders,
            })

        return {
            "success": True,
            "routes": routes,
            "vehicles": vehicles_result.data or [],
            "drivers": drivers_result.data or [],
            "stats": {
                "active_routes": active_routes_result.count or 0,
                "total_vehicles": len(vehicles_result.data or []),
                "total_drivers": len(drivers_result.data or []),
            }
        }

    except Exception as e:
        logger.error(f"Error getting routes init data: {e}")
        return {
            "success": False,
            "error": str(e),
            "routes": [],
            "vehicles": [],
            "drivers": [],
            "stats": {}
        }
