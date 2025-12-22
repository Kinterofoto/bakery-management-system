"""Dispatch operations endpoints."""

import logging
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Header

from ....core.supabase import get_supabase_client
from ....models.route import DispatchOrderRequest, DispatchOrderResponse, DispatchConfig

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


@router.get("/config", response_model=DispatchConfig)
async def get_dispatch_config():
    """Get dispatch configuration (default location, etc.)."""
    logger.info("Getting dispatch config")
    supabase = get_supabase_client()

    try:
        result = supabase.table("dispatch_inventory_config").select(
            "default_dispatch_location_id"
        ).eq("id", "00000000-0000-0000-0000-000000000000").single().execute()

        if result.data:
            return DispatchConfig(
                default_dispatch_location_id=result.data.get("default_dispatch_location_id")
            )
        return DispatchConfig()
    except Exception as e:
        logger.warning(f"Error getting dispatch config: {e}")
        return DispatchConfig()


@router.post("/orders/{order_id}", response_model=DispatchOrderResponse)
async def dispatch_order(
    order_id: str,
    data: DispatchOrderRequest,
    authorization: Optional[str] = Header(None),
):
    """
    Dispatch an order - change status to 'dispatched' and optionally create inventory movements.

    This endpoint:
    1. Gets the order details
    2. Updates status to 'dispatched'
    3. Optionally creates inventory movements for dispatched items
    4. Records the dispatch event
    """
    logger.info(f"Dispatching order: {order_id}")
    supabase = get_supabase_client()
    user_id = get_user_id_from_token(authorization)

    try:
        # Get order with items
        order_result = supabase.table("orders").select(
            "id, order_number, status, assigned_route_id, "
            "order_items(id, product_id, quantity_requested, quantity_available, availability_status)"
        ).eq("id", order_id).single().execute()

        if not order_result.data:
            raise HTTPException(status_code=404, detail="Order not found")

        order = order_result.data

        # Validate order can be dispatched
        if order["status"] not in ["ready_dispatch"]:
            raise HTTPException(
                status_code=400,
                detail=f"Order cannot be dispatched from status '{order['status']}'"
            )

        # Update order status to dispatched
        update_result = supabase.table("orders").update({
            "status": "dispatched",
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", order_id).execute()

        # Record status change event
        supabase.table("order_events").insert({
            "order_id": order_id,
            "event_type": "status_change",
            "payload": {
                "from_status": order["status"],
                "to_status": "dispatched",
            },
            "created_by": user_id,
        }).execute()

        # Handle inventory movements if requested
        inventory_created = False
        inventory_errors = []

        if data.create_inventory_movements:
            try:
                # Get dispatch config
                config_result = supabase.table("dispatch_inventory_config").select(
                    "default_dispatch_location_id"
                ).eq("id", "00000000-0000-0000-0000-000000000000").single().execute()

                default_location_id = config_result.data.get("default_dispatch_location_id") if config_result.data else None

                if default_location_id and order.get("order_items"):
                    # Prepare items for batch dispatch
                    items = []
                    for item in order["order_items"]:
                        if item.get("availability_status") != "unavailable":
                            items.append({
                                "product_id": item["product_id"],
                                "quantity": item.get("quantity_available") or item["quantity_requested"],
                            })

                    if items:
                        # Get route name for notes
                        route_name = ""
                        if data.route_id or order.get("assigned_route_id"):
                            route_id = data.route_id or order.get("assigned_route_id")
                            route_result = supabase.table("routes").select("route_name").eq("id", route_id).single().execute()
                            route_name = route_result.data.get("route_name", "") if route_result.data else ""

                        # Call batch dispatch function
                        rpc_result = supabase.schema("inventario").rpc(
                            "perform_batch_dispatch_movements",
                            {
                                "p_order_id": order_id,
                                "p_order_number": order["order_number"],
                                "p_items": items,
                                "p_location_id_from": default_location_id,
                                "p_notes": f"Dispatch to route {route_name}".strip(),
                                "p_recorded_by": user_id,
                            }
                        ).execute()

                        if rpc_result.data:
                            result_data = rpc_result.data
                            if isinstance(result_data, dict):
                                if result_data.get("success"):
                                    inventory_created = True
                                else:
                                    inventory_errors = result_data.get("errors", [])
                            else:
                                inventory_created = True

            except Exception as inv_error:
                logger.error(f"Error creating inventory movements: {inv_error}")
                inventory_errors.append(str(inv_error))

        return DispatchOrderResponse(
            success=True,
            order_id=order_id,
            new_status="dispatched",
            inventory_movements_created=inventory_created,
            inventory_errors=inventory_errors if inventory_errors else None,
            message="Order dispatched successfully" + (
                " (inventory movements created)" if inventory_created else
                " (inventory movements failed)" if inventory_errors else ""
            ),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error dispatching order {order_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/orders/{order_id}/items")
async def update_order_items_availability(
    order_id: str,
    items: list,
    authorization: Optional[str] = Header(None),
):
    """
    Batch update availability status for order items.

    Each item should have:
    - item_id: str
    - availability_status: 'available' | 'unavailable' | 'partial' | 'pending'
    - quantity_available: int (optional, calculated if not provided)
    """
    logger.info(f"Updating {len(items)} items for order {order_id}")
    supabase = get_supabase_client()

    try:
        updated = []
        for item in items:
            item_id = item.get("item_id")
            status = item.get("availability_status")
            qty = item.get("quantity_available")

            if not item_id or not status:
                continue

            update_data = {"availability_status": status}

            # Calculate quantity if not provided
            if qty is not None:
                update_data["quantity_available"] = qty
            elif status == "unavailable":
                update_data["quantity_available"] = 0
            elif status == "available":
                # Get requested quantity
                item_result = supabase.table("order_items").select(
                    "quantity_requested"
                ).eq("id", item_id).single().execute()
                if item_result.data:
                    update_data["quantity_available"] = item_result.data["quantity_requested"]

            result = supabase.table("order_items").update(update_data).eq("id", item_id).execute()
            if result.data:
                updated.append(item_id)

        return {
            "success": True,
            "updated_count": len(updated),
            "updated_items": updated,
        }
    except Exception as e:
        logger.error(f"Error updating items: {e}")
        raise HTTPException(status_code=500, detail=str(e))
