"""Route orders management endpoints."""

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Header

from ....core.supabase import get_supabase_client
from ....models.route import AssignOrdersRequest, ReorderSequenceRequest

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


@router.get("/{route_id}/orders")
async def get_route_orders(route_id: str):
    """Get all orders assigned to a route with full details."""
    logger.info(f"Getting orders for route: {route_id}")
    supabase = get_supabase_client()

    try:
        # Get route_orders
        result = supabase.table("route_orders").select(
            "id, order_id, delivery_sequence"
        ).eq("route_id", route_id).order("delivery_sequence").execute()

        route_orders = result.data or []
        order_ids = [ro["order_id"] for ro in route_orders if ro.get("order_id")]

        if not order_ids:
            return {"orders": [], "total": 0}

        # Get full order details
        orders_result = supabase.table("orders").select(
            "id, order_number, expected_delivery_date, status, observations, "
            "clients(id, name), "
            "branches(id, name, address), "
            "order_items(id, product_id, quantity_requested, quantity_available, availability_status, "
            "products(id, name, weight))"
        ).in_("id", order_ids).execute()

        orders_map = {o["id"]: o for o in (orders_result.data or [])}

        # Build response with delivery sequence
        orders = []
        for ro in route_orders:
            order = orders_map.get(ro["order_id"])
            if order:
                orders.append({
                    "route_order_id": ro["id"],
                    "delivery_sequence": ro["delivery_sequence"],
                    **order,
                })

        return {"orders": orders, "total": len(orders)}
    except Exception as e:
        logger.error(f"Error getting route orders: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/unassigned")
async def get_unassigned_orders():
    """Get orders ready for dispatch that are not assigned to any route."""
    logger.info("Getting unassigned orders")
    supabase = get_supabase_client()

    try:
        # Get orders with status=ready_dispatch and no assigned route
        result = supabase.table("orders").select(
            "id, order_number, expected_delivery_date, status, observations, "
            "clients(id, name), "
            "branches(id, name, address), "
            "order_items(id, product_id, quantity_requested, "
            "products(id, name, weight))"
        ).eq("status", "ready_dispatch").is_("assigned_route_id", "null").order(
            "expected_delivery_date"
        ).execute()

        return {"orders": result.data or [], "total": len(result.data or [])}
    except Exception as e:
        logger.error(f"Error getting unassigned orders: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{route_id}/orders")
async def assign_orders_to_route(
    route_id: str,
    data: AssignOrdersRequest,
    authorization: Optional[str] = Header(None),
):
    """Assign multiple orders to a route."""
    logger.info(f"Assigning {len(data.order_ids)} orders to route {route_id}")
    supabase = get_supabase_client()

    try:
        # Verify route exists
        route_result = supabase.table("routes").select("id, status").eq("id", route_id).single().execute()
        if not route_result.data:
            raise HTTPException(status_code=404, detail="Route not found")

        # Get current max sequence
        seq_result = supabase.table("route_orders").select(
            "delivery_sequence"
        ).eq("route_id", route_id).order("delivery_sequence", desc=True).limit(1).execute()

        current_max = 0
        if seq_result.data:
            current_max = seq_result.data[0].get("delivery_sequence", 0)

        # Create route_orders entries
        route_orders_data = []
        for i, order_id in enumerate(data.order_ids):
            route_orders_data.append({
                "route_id": route_id,
                "order_id": order_id,
                "delivery_sequence": current_max + i + 1,
            })

        # Insert route_orders
        insert_result = supabase.table("route_orders").insert(route_orders_data).execute()

        # Update orders with assigned_route_id
        for order_id in data.order_ids:
            supabase.table("orders").update({
                "assigned_route_id": route_id
            }).eq("id", order_id).execute()

        return {
            "success": True,
            "assigned_count": len(data.order_ids),
            "route_orders": insert_result.data,
            "message": f"{len(data.order_ids)} orders assigned to route",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assigning orders to route: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{route_id}/orders/{order_id}")
async def remove_order_from_route(
    route_id: str,
    order_id: str,
    authorization: Optional[str] = Header(None),
):
    """Remove an order from a route."""
    logger.info(f"Removing order {order_id} from route {route_id}")
    supabase = get_supabase_client()

    try:
        # Delete from route_orders
        delete_result = supabase.table("route_orders").delete().match({
            "route_id": route_id,
            "order_id": order_id,
        }).execute()

        # Clear assigned_route_id from order
        supabase.table("orders").update({
            "assigned_route_id": None
        }).eq("id", order_id).execute()

        return {
            "success": True,
            "message": "Order removed from route",
        }
    except Exception as e:
        logger.error(f"Error removing order from route: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{route_id}/orders/sequence")
async def reorder_delivery_sequence(
    route_id: str,
    data: ReorderSequenceRequest,
    authorization: Optional[str] = Header(None),
):
    """Reorder the delivery sequence of orders in a route."""
    logger.info(f"Reordering {len(data.items)} items in route {route_id}")
    supabase = get_supabase_client()

    try:
        # Update each item's sequence
        for item in data.items:
            supabase.table("route_orders").update({
                "delivery_sequence": item.new_sequence
            }).eq("id", item.route_order_id).eq("route_id", route_id).execute()

        return {
            "success": True,
            "updated_count": len(data.items),
            "message": "Delivery sequence updated",
        }
    except Exception as e:
        logger.error(f"Error reordering sequence: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{route_id}/orders/swap")
async def swap_order_positions(
    route_id: str,
    route_order_id_1: str,
    route_order_id_2: str,
    authorization: Optional[str] = Header(None),
):
    """Swap positions of two orders in a route."""
    logger.info(f"Swapping orders in route {route_id}")
    supabase = get_supabase_client()

    try:
        # Get both route_orders
        result1 = supabase.table("route_orders").select(
            "id, delivery_sequence"
        ).eq("id", route_order_id_1).eq("route_id", route_id).single().execute()

        result2 = supabase.table("route_orders").select(
            "id, delivery_sequence"
        ).eq("id", route_order_id_2).eq("route_id", route_id).single().execute()

        if not result1.data or not result2.data:
            raise HTTPException(status_code=404, detail="Route orders not found")

        seq1 = result1.data["delivery_sequence"]
        seq2 = result2.data["delivery_sequence"]

        # Swap sequences
        supabase.table("route_orders").update({
            "delivery_sequence": seq2
        }).eq("id", route_order_id_1).execute()

        supabase.table("route_orders").update({
            "delivery_sequence": seq1
        }).eq("id", route_order_id_2).execute()

        return {
            "success": True,
            "message": "Order positions swapped",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error swapping orders: {e}")
        raise HTTPException(status_code=500, detail=str(e))
