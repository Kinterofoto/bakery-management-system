"""Order items management - CRUD with BATCH update support."""

import logging
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Header

from ....core.supabase import get_supabase_client
from ....models.order import (
    OrderItemDetail,
    OrderItemUpdate,
    OrderItemBatchUpdate,
    OrderItemAddRequest,
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
    except:
        return None


@router.get("/{order_id}/items")
async def list_order_items(order_id: str):
    """Get all items for an order."""
    logger.info(f"Fetching items for order {order_id}")

    supabase = get_supabase_client()

    try:
        # Check order exists
        order = (
            supabase.table("orders")
            .select("id")
            .eq("id", order_id)
            .single()
            .execute()
        )

        if not order.data:
            raise HTTPException(status_code=404, detail="Order not found")

        # Get items with products
        result = (
            supabase.table("order_items")
            .select(
                "id, product_id, quantity_requested, quantity_available, "
                "quantity_missing, quantity_dispatched, quantity_delivered, "
                "quantity_returned, unit_price, availability_status, lote, "
                "products(id, name)"
            )
            .eq("order_id", order_id)
            .execute()
        )

        items = []
        for item in result.data:
            product = item.get("products") or {}
            subtotal = None
            if item.get("quantity_requested") and item.get("unit_price"):
                subtotal = item["quantity_requested"] * item["unit_price"]

            items.append(OrderItemDetail(
                id=item["id"],
                product_id=item["product_id"],
                product_name=product.get("name"),
                product_code=None,  # products table doesn't have code column
                quantity_requested=item.get("quantity_requested"),
                quantity_available=item.get("quantity_available"),
                quantity_missing=item.get("quantity_missing"),
                quantity_dispatched=item.get("quantity_dispatched"),
                quantity_delivered=item.get("quantity_delivered"),
                quantity_returned=item.get("quantity_returned"),
                unit_price=item.get("unit_price"),
                subtotal=subtotal,
                availability_status=item.get("availability_status"),
                lote=item.get("lote"),
            ))

        return {"items": items, "total_count": len(items)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching items: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{order_id}/items")
async def add_order_item(
    order_id: str,
    item: OrderItemAddRequest,
    authorization: Optional[str] = Header(None),
):
    """Add a new item to an existing order."""
    logger.info(f"Adding item to order {order_id}: product {item.product_id}")

    supabase = get_supabase_client()

    try:
        # Check order exists and get current total
        order = (
            supabase.table("orders")
            .select("id, total_value, status")
            .eq("id", order_id)
            .single()
            .execute()
        )

        if not order.data:
            raise HTTPException(status_code=404, detail="Order not found")

        # Only allow adding items in early statuses
        if order.data["status"] not in ["received", "review_area1"]:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot add items to order in status: {order.data['status']}"
            )

        # Create item
        item_data = {
            "order_id": order_id,
            "product_id": item.product_id,
            "quantity_requested": item.quantity_requested,
            "unit_price": item.unit_price,
            "availability_status": "pending",
            "quantity_available": 0,
            "quantity_missing": item.quantity_requested,
        }

        result = (
            supabase.table("order_items")
            .insert(item_data)
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to add item")

        new_item = result.data[0]

        # Update order total
        item_total = item.quantity_requested * item.unit_price
        new_total = (order.data.get("total_value") or 0) + item_total

        supabase.table("orders").update({
            "total_value": new_total,
            "updated_at": datetime.now().isoformat(),
        }).eq("id", order_id).execute()

        # Create audit event
        user_id = get_user_id_from_token(authorization)
        try:
            supabase.table("order_events").insert({
                "order_id": order_id,
                "event_type": "item_added",
                "payload": {
                    "item_id": new_item["id"],
                    "product_id": item.product_id,
                    "quantity": item.quantity_requested,
                    "unit_price": item.unit_price,
                },
                "created_by": user_id,
            }).execute()
        except Exception as e:
            logger.warning(f"Failed to create audit event: {e}")

        return {
            "success": True,
            "item_id": new_item["id"],
            "new_total": new_total,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding item: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{order_id}/items")
async def batch_update_items(
    order_id: str,
    batch: OrderItemBatchUpdate,
    authorization: Optional[str] = Header(None),
):
    """
    BATCH update multiple items in single request.

    This is the recommended way to update items - reduces network calls
    from N to 1 when updating multiple items (e.g., in review screens).
    """
    logger.info(f"Batch updating {len(batch.updates)} items for order {order_id}")

    supabase = get_supabase_client()

    try:
        # Check order exists
        order = (
            supabase.table("orders")
            .select("id")
            .eq("id", order_id)
            .single()
            .execute()
        )

        if not order.data:
            raise HTTPException(status_code=404, detail="Order not found")

        updated_items = []
        errors = []

        for update in batch.updates:
            try:
                # Build update data (only non-None fields)
                update_data = {}

                if update.quantity_available is not None:
                    update_data["quantity_available"] = update.quantity_available

                if update.availability_status is not None:
                    update_data["availability_status"] = update.availability_status

                if update.lote is not None:
                    update_data["lote"] = update.lote

                if update.quantity_dispatched is not None:
                    update_data["quantity_dispatched"] = update.quantity_dispatched

                if update.quantity_delivered is not None:
                    update_data["quantity_delivered"] = update.quantity_delivered

                if not update_data:
                    continue

                # If quantity_available changed, recalculate quantity_missing
                if "quantity_available" in update_data:
                    # Get current item to calculate missing
                    current_item = (
                        supabase.table("order_items")
                        .select("quantity_requested")
                        .eq("id", update.item_id)
                        .single()
                        .execute()
                    )

                    if current_item.data:
                        requested = current_item.data.get("quantity_requested", 0)
                        available = update_data["quantity_available"]
                        update_data["quantity_missing"] = max(0, requested - available)

                # Update item
                result = (
                    supabase.table("order_items")
                    .update(update_data)
                    .eq("id", update.item_id)
                    .eq("order_id", order_id)  # Security: ensure item belongs to order
                    .execute()
                )

                if result.data:
                    updated_items.append(update.item_id)
                else:
                    errors.append({"item_id": update.item_id, "error": "Item not found"})

            except Exception as e:
                errors.append({"item_id": update.item_id, "error": str(e)})

        # Update order timestamp
        supabase.table("orders").update({
            "updated_at": datetime.now().isoformat(),
        }).eq("id", order_id).execute()

        # Create audit event
        user_id = get_user_id_from_token(authorization)
        try:
            supabase.table("order_events").insert({
                "order_id": order_id,
                "event_type": "item_updated",
                "payload": {
                    "batch_size": len(batch.updates),
                    "updated_items": updated_items,
                    "errors": errors if errors else None,
                },
                "created_by": user_id,
            }).execute()
        except Exception as e:
            logger.warning(f"Failed to create audit event: {e}")

        return {
            "success": len(errors) == 0,
            "updated_count": len(updated_items),
            "updated_items": updated_items,
            "errors": errors if errors else None,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error batch updating items: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{order_id}/items/{item_id}")
async def update_single_item(
    order_id: str,
    item_id: str,
    update: OrderItemUpdate,
    authorization: Optional[str] = Header(None),
):
    """Update a single item (prefer batch update for multiple items)."""
    # Reuse batch update logic
    batch = OrderItemBatchUpdate(updates=[OrderItemUpdate(item_id=item_id, **update.model_dump(exclude={"item_id"}))])
    return await batch_update_items(order_id, batch, authorization)
