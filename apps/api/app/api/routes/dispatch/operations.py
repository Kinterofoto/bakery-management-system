"""Dispatch operations endpoints."""

import logging
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Header

from ....core.supabase import get_supabase_client, set_audit_user, backfill_audit_user
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
    set_audit_user(supabase, user_id)

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

        # NOTE: Inventory movements are NO LONGER created during dispatch.
        # They are now created at billing (invoice) or remision time.
        # See billing/export.py and billing/remisions.py for the new flow.
        inventory_created = False
        inventory_errors = []

        # Backfill audit entries with the real user
        backfill_audit_user(supabase, user_id, order_id, ["orders_audit", "order_items_audit"])

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
    user_id = get_user_id_from_token(authorization)
    set_audit_user(supabase, user_id)

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

        # Backfill audit entries with the real user
        backfill_audit_user(supabase, user_id, order_id, ["orders_audit", "order_items_audit"])

        return {
            "success": True,
            "updated_count": len(updated),
            "updated_items": updated,
        }
    except Exception as e:
        logger.error(f"Error updating items: {e}")
        raise HTTPException(status_code=500, detail=str(e))
