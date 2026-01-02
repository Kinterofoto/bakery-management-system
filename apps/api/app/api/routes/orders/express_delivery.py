"""Express Delivery endpoint - Super Admin only.

This endpoint allows super admins to complete deliveries directly
from any order status, without requiring the normal workflow.
Photo evidence is optional (unlike the driver delivery flow).
"""

import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Header

from ....core.supabase import get_supabase_client
from ....models.order import (
    ExpressDeliveryRequest,
    ExpressDeliveryResponse,
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


@router.post("/{order_id}/express-delivery", response_model=ExpressDeliveryResponse)
async def express_delivery(
    order_id: str,
    data: ExpressDeliveryRequest,
    authorization: Optional[str] = Header(None),
):
    """
    Process express delivery for an order - Super Admin only.

    This endpoint:
    1. Updates quantity_delivered for each order_item
    2. Calculates delivery_percentage
    3. Updates order status (delivered, partially_delivered, or returned)
    4. Saves evidence_url if provided (OPTIONAL)
    5. Creates return records if there are returns
    6. Records an order_event

    Note: Photo evidence is OPTIONAL unlike the driver delivery flow.
    """
    logger.info(f"Processing express delivery for order: {order_id}")
    supabase = get_supabase_client()
    user_id = get_user_id_from_token(authorization)

    try:
        # 1. Get order to verify it exists and get current status
        order_result = supabase.table("orders").select(
            "id, order_number, status"
        ).eq("id", order_id).single().execute()

        if not order_result.data:
            raise HTTPException(status_code=404, detail="Order not found")

        order = order_result.data
        old_status = order["status"]

        # Don't allow express delivery on already delivered or cancelled orders
        if old_status in ["delivered", "cancelled"]:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot process express delivery for order with status '{old_status}'"
            )

        # 2. Get order items to calculate totals
        items_result = supabase.table("order_items").select(
            "id, quantity_requested, quantity_available"
        ).eq("order_id", order_id).execute()

        if not items_result.data:
            raise HTTPException(status_code=404, detail="No items found for this order")

        order_items = {item["id"]: item for item in items_result.data}

        # 3. Process each item and calculate totals
        total_requested = 0
        total_delivered = 0
        items_updated = 0
        returns_created = 0

        for item in data.items:
            if item.item_id not in order_items:
                logger.warning(f"Item {item.item_id} not found in order {order_id}")
                continue

            order_item = order_items[item.item_id]
            requested = order_item.get("quantity_requested", 0) or 0

            total_requested += requested
            total_delivered += item.quantity_delivered

            # Update order_item
            update_data = {
                "quantity_delivered": item.quantity_delivered,
                "quantity_returned": item.quantity_returned,
            }

            update_result = supabase.table("order_items").update(
                update_data
            ).eq("id", item.item_id).execute()

            if update_result.data:
                items_updated += 1

            # Create return record if there are returns
            if item.quantity_returned > 0:
                # Get product_id from order_item
                item_detail = supabase.table("order_items").select(
                    "product_id"
                ).eq("id", item.item_id).single().execute()

                if item_detail.data:
                    return_record = {
                        "order_id": order_id,
                        "product_id": item_detail.data["product_id"],
                        "quantity_returned": item.quantity_returned,
                        "return_reason": data.general_return_reason or "Express delivery - return",
                        "status": "pending",
                        "created_by": user_id,
                    }

                    try:
                        supabase.table("returns").insert(return_record).execute()
                        returns_created += 1
                    except Exception as e:
                        logger.warning(f"Could not create return record: {e}")

        # 4. Calculate delivery percentage
        delivery_percentage = 0
        if total_requested > 0:
            delivery_percentage = round((total_delivered / total_requested) * 100)

        # 5. Determine final status
        if delivery_percentage == 100:
            final_status = "delivered"
        elif delivery_percentage > 0:
            final_status = "partially_delivered"
        else:
            final_status = "returned"

        # 6. Update order - only status (like routes/delivery.py does)
        order_update = {
            "status": final_status,
        }

        # Add evidence URL if provided
        if data.evidence_url:
            order_update["delivery_evidence_url"] = data.evidence_url

        supabase.table("orders").update(order_update).eq("id", order_id).execute()

        # 7. Record event
        event_payload = {
            "old_status": old_status,
            "new_status": final_status,
            "delivery_percentage": delivery_percentage,
            "express_delivery": True,
            "items_count": len(data.items),
        }

        if data.evidence_url:
            event_payload["evidence_url"] = data.evidence_url

        if data.general_return_reason:
            event_payload["return_reason"] = data.general_return_reason

        supabase.table("order_events").insert({
            "order_id": order_id,
            "event_type": "express_delivery",
            "payload": event_payload,
            "created_by": user_id,
        }).execute()

        # 8. Build success message
        status_messages = {
            "delivered": "Pedido entregado completamente",
            "partially_delivered": "Pedido entregado parcialmente",
            "returned": "Pedido devuelto",
        }

        return ExpressDeliveryResponse(
            success=True,
            order_id=order_id,
            new_status=final_status,
            delivery_percentage=delivery_percentage,
            message=status_messages.get(final_status, "Entrega procesada"),
            items_updated=items_updated,
            returns_created=returns_created,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing express delivery for order {order_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
