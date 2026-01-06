"""Routes CRUD endpoints."""

import logging
from datetime import date, datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Header

from ....core.supabase import get_supabase_client
from ....models.route import (
    RouteCreate,
    RouteUpdate,
    RouteListItem,
    RouteDetail,
    RouteListResponse,
    RouteOrderInfo,
)

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


@router.get("/", response_model=RouteListResponse)
async def list_routes(
    status: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    page: int = 1,
    limit: int = 50,
    exclude_completed: bool = True,
):
    """
    List routes with pagination and filters.

    - status: Filter by route status (planned, in_progress, completed, cancelled)
    - date_from/date_to: Filter by route date range
    - exclude_completed: Exclude completed routes (default True)
    """
    logger.info(f"Listing routes: status={status}, page={page}, limit={limit}")
    supabase = get_supabase_client()

    try:
        # Build query
        query = supabase.table("routes").select(
            "*, route_orders(id, order_id, delivery_sequence)",
            count="exact"
        )

        # Apply filters
        if status:
            query = query.eq("status", status)
        elif exclude_completed:
            query = query.neq("status", "completed")

        if date_from:
            query = query.gte("route_date", date_from.isoformat())
        if date_to:
            query = query.lte("route_date", date_to.isoformat())

        # Pagination
        offset = (page - 1) * limit
        query = query.order("route_date", desc=True).range(offset, offset + limit - 1)

        result = query.execute()
        total = result.count or 0

        # Get driver and vehicle info
        routes_data = result.data or []
        driver_ids = [r["driver_id"] for r in routes_data if r.get("driver_id")]
        vehicle_ids = [r["vehicle_id"] for r in routes_data if r.get("vehicle_id")]

        # Fetch drivers
        drivers_map = {}
        if driver_ids:
            drivers_result = supabase.table("users").select("id, name").in_("id", driver_ids).execute()
            drivers_map = {d["id"]: d["name"] for d in (drivers_result.data or [])}

        # Fetch vehicles
        vehicles_map = {}
        if vehicle_ids:
            try:
                vehicles_result = supabase.table("vehicles").select("id, vehicle_code").in_("id", vehicle_ids).execute()
                vehicles_map = {v["id"]: v["vehicle_code"] for v in (vehicles_result.data or [])}
            except Exception:
                pass  # Table might not exist

        # Build response
        routes = []
        for r in routes_data:
            routes.append(RouteListItem(
                id=r["id"],
                route_number=r.get("route_number"),
                route_name=r["route_name"],
                route_date=r["route_date"],
                status=r["status"],
                driver_id=r.get("driver_id"),
                driver_name=drivers_map.get(r.get("driver_id")),
                vehicle_id=r.get("vehicle_id"),
                vehicle_code=vehicles_map.get(r.get("vehicle_id")),
                orders_count=len(r.get("route_orders", [])),
                created_at=r.get("created_at"),
            ))

        total_pages = (total + limit - 1) // limit if total > 0 else 1

        return RouteListResponse(
            routes=routes,
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
        )
    except Exception as e:
        logger.error(f"Error listing routes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{route_id}", response_model=RouteDetail)
async def get_route(route_id: str):
    """Get detailed route with all orders."""
    logger.info(f"Getting route: {route_id}")
    supabase = get_supabase_client()

    try:
        # Get route with route_orders
        result = supabase.table("routes").select(
            "*, route_orders(id, order_id, delivery_sequence)"
        ).eq("id", route_id).single().execute()

        route = result.data
        if not route:
            raise HTTPException(status_code=404, detail="Route not found")

        # Get driver info
        driver_name = None
        if route.get("driver_id"):
            driver_result = supabase.table("users").select("name").eq("id", route["driver_id"]).single().execute()
            driver_name = driver_result.data.get("name") if driver_result.data else None

        # Get vehicle info
        vehicle_code = None
        if route.get("vehicle_id"):
            try:
                vehicle_result = supabase.table("vehicles").select("vehicle_code").eq("id", route["vehicle_id"]).single().execute()
                vehicle_code = vehicle_result.data.get("vehicle_code") if vehicle_result.data else None
            except Exception:
                pass

        # Get orders info
        route_orders_data = route.get("route_orders", [])
        order_ids = [ro["order_id"] for ro in route_orders_data if ro.get("order_id")]

        orders_map = {}
        if order_ids:
            orders_result = supabase.table("orders").select(
                "id, order_number, expected_delivery_date, status, "
                "clients(name), branches(name), "
                "order_items(id)"
            ).in_("id", order_ids).execute()

            for o in (orders_result.data or []):
                orders_map[o["id"]] = o

        # Build route_orders with order details
        route_orders = []
        for ro in sorted(route_orders_data, key=lambda x: x.get("delivery_sequence", 0)):
            order = orders_map.get(ro["order_id"], {})
            route_orders.append(RouteOrderInfo(
                id=ro["id"],
                order_id=ro["order_id"],
                delivery_sequence=ro.get("delivery_sequence", 0),
                order_number=order.get("order_number"),
                client_name=order.get("client", {}).get("name") if order.get("client") else None,
                branch_name=order.get("branch", {}).get("name") if order.get("branch") else None,
                expected_delivery_date=order.get("expected_delivery_date"),
                status=order.get("status"),
                items_count=len(order.get("order_items", [])),
            ))

        return RouteDetail(
            id=route["id"],
            route_number=route.get("route_number"),
            route_name=route["route_name"],
            route_date=route["route_date"],
            status=route["status"],
            driver_id=route.get("driver_id"),
            driver_name=driver_name,
            vehicle_id=route.get("vehicle_id"),
            vehicle_code=vehicle_code,
            orders_count=len(route_orders),
            created_at=route.get("created_at"),
            route_orders=route_orders,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting route {route_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", status_code=201)
async def create_route(
    data: RouteCreate,
    authorization: Optional[str] = Header(None),
):
    """Create a new route."""
    logger.info(f"Creating route: {data.route_name}")
    supabase = get_supabase_client()
    user_id = get_user_id_from_token(authorization)

    try:
        insert_data = {
            "route_name": data.route_name,
            "route_date": data.route_date.isoformat(),
            "status": "planned",
        }

        if data.driver_id:
            insert_data["driver_id"] = data.driver_id
        if data.vehicle_id:
            insert_data["vehicle_id"] = data.vehicle_id
        if user_id:
            insert_data["created_by"] = user_id

        result = supabase.table("routes").insert(insert_data).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create route")

        return {
            "success": True,
            "route": result.data[0],
            "message": "Route created successfully",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating route: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{route_id}")
async def update_route(
    route_id: str,
    data: RouteUpdate,
    authorization: Optional[str] = Header(None),
):
    """Update a route (driver, vehicle, status)."""
    logger.info(f"Updating route: {route_id}")
    supabase = get_supabase_client()

    try:
        # Build update data (only non-None fields)
        update_data = {}
        if data.driver_id is not None:
            update_data["driver_id"] = data.driver_id if data.driver_id != "" else None
        if data.vehicle_id is not None:
            update_data["vehicle_id"] = data.vehicle_id if data.vehicle_id != "" else None
        if data.status is not None:
            update_data["status"] = data.status.value

        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        result = supabase.table("routes").update(update_data).eq("id", route_id).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Route not found")

        return {
            "success": True,
            "route": result.data[0],
            "message": "Route updated successfully",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating route {route_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/driver/{driver_id}")
async def get_driver_routes(
    driver_id: str,
    role: str = "driver",
    page: int = 1,
    limit: int = 20,
    authorization: Optional[str] = Header(None),
):
    """
    Get routes for a specific driver with full order details.
    If role is admin/administrator, returns all routes.
    """
    logger.info(f"Getting routes for driver: {driver_id}, role: {role}, page: {page}")
    supabase = get_supabase_client()

    try:
        is_admin = role in ["admin", "administrator", "super_admin", "coordinador_logistico"]

        # Build query
        query = supabase.table("routes").select(
            "*, route_orders(id, order_id, delivery_sequence)",
            count="exact"
        ).neq("status", "completed")

        # Filter by driver if not admin
        if not is_admin:
            query = query.eq("driver_id", driver_id)

        # Pagination
        offset = (page - 1) * limit
        query = query.order("route_date", desc=True).range(offset, offset + limit - 1)

        result = query.execute()
        total = result.count or 0
        routes_data = result.data or []

        # Get order IDs for all routes
        all_order_ids = []
        for r in routes_data:
            for ro in r.get("route_orders", []):
                if ro.get("order_id"):
                    all_order_ids.append(ro["order_id"])

        # Fetch all orders with full details
        orders_map = {}
        if all_order_ids:
            orders_result = supabase.table("orders").select(
                "id, order_number, expected_delivery_date, status, observations, "
                "clients(id, name, address), "
                "branches(id, name, address, observations, contact_person, phone), "
                "order_items(id, product_id, quantity_requested, quantity_available, quantity_delivered, quantity_returned, "
                "products(id, name, unit, weight, price))"
            ).in_("id", all_order_ids).execute()

            for o in (orders_result.data or []):
                orders_map[o["id"]] = o

        # Get driver and vehicle names
        driver_ids = list(set([r["driver_id"] for r in routes_data if r.get("driver_id")]))
        vehicle_ids = list(set([r["vehicle_id"] for r in routes_data if r.get("vehicle_id")]))

        drivers_map = {}
        if driver_ids:
            drivers_result = supabase.table("users").select("id, name").in_("id", driver_ids).execute()
            drivers_map = {d["id"]: d["name"] for d in (drivers_result.data or [])}

        vehicles_map = {}
        if vehicle_ids:
            vehicles_result = supabase.table("vehicles").select("id, vehicle_code").in_("id", vehicle_ids).execute()
            vehicles_map = {v["id"]: v["vehicle_code"] for v in (vehicles_result.data or [])}

        # Build enriched routes
        routes = []
        for r in routes_data:
            route_orders = []
            for ro in sorted(r.get("route_orders", []), key=lambda x: x.get("delivery_sequence", 0)):
                order = orders_map.get(ro["order_id"])
                route_orders.append({
                    "id": ro["id"],
                    "order_id": ro["order_id"],
                    "delivery_sequence": ro.get("delivery_sequence", 0),
                    "orders": order,
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
                "created_at": r.get("created_at"),
                "route_orders": route_orders,
            })

        total_pages = (total + limit - 1) // limit if total > 0 else 1

        return {
            "routes": routes,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": total_pages,
            "has_more": page < total_pages,
        }

    except Exception as e:
        logger.error(f"Error getting driver routes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/completed/list")
async def get_completed_routes(
    driver_id: Optional[str] = None,
    role: str = "driver",
    page: int = 1,
    limit: int = 20,
    authorization: Optional[str] = Header(None),
):
    """
    Get completed routes with pagination.
    If role is admin/administrator, returns all completed routes.
    """
    logger.info(f"Getting completed routes: driver={driver_id}, role={role}, page={page}")
    supabase = get_supabase_client()

    try:
        is_admin = role in ["admin", "administrator", "super_admin", "coordinador_logistico"]

        # Build query
        query = supabase.table("routes").select(
            "*, route_orders(id, order_id, delivery_sequence)",
            count="exact"
        ).eq("status", "completed")

        # Filter by driver if not admin and driver_id provided
        if not is_admin and driver_id:
            query = query.eq("driver_id", driver_id)

        # Pagination
        offset = (page - 1) * limit
        query = query.order("route_date", desc=True).range(offset, offset + limit - 1)

        result = query.execute()
        total = result.count or 0
        routes_data = result.data or []

        # Get order IDs for all routes
        all_order_ids = []
        for r in routes_data:
            for ro in r.get("route_orders", []):
                if ro.get("order_id"):
                    all_order_ids.append(ro["order_id"])

        # Fetch orders with basic details
        orders_map = {}
        if all_order_ids:
            orders_result = supabase.table("orders").select(
                "id, order_number, status, "
                "clients(id, name), "
                "order_items(id)"
            ).in_("id", all_order_ids).execute()

            for o in (orders_result.data or []):
                orders_map[o["id"]] = o

        # Get driver names
        driver_ids = list(set([r["driver_id"] for r in routes_data if r.get("driver_id")]))
        drivers_map = {}
        if driver_ids:
            drivers_result = supabase.table("users").select("id, name").in_("id", driver_ids).execute()
            drivers_map = {d["id"]: d["name"] for d in (drivers_result.data or [])}

        # Build enriched routes
        routes = []
        for r in routes_data:
            route_orders = []
            for ro in sorted(r.get("route_orders", []), key=lambda x: x.get("delivery_sequence", 0)):
                order = orders_map.get(ro["order_id"])
                route_orders.append({
                    "id": ro["id"],
                    "order_id": ro["order_id"],
                    "delivery_sequence": ro.get("delivery_sequence", 0),
                    "orders": order,
                })

            routes.append({
                "id": r["id"],
                "route_number": r.get("route_number"),
                "route_name": r["route_name"],
                "route_date": r["route_date"],
                "status": r["status"],
                "driver_id": r.get("driver_id"),
                "driver_name": drivers_map.get(r.get("driver_id")),
                "created_at": r.get("created_at"),
                "route_orders": route_orders,
            })

        total_pages = (total + limit - 1) // limit if total > 0 else 1

        return {
            "routes": routes,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": total_pages,
            "has_more": page < total_pages,
        }

    except Exception as e:
        logger.error(f"Error getting completed routes: {e}")
        raise HTTPException(status_code=500, detail=str(e))
