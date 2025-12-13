"""Order workflow - State machine, transitions, cancel, events."""

import logging
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Header, Query

from ....core.supabase import get_supabase_client
from ....models.order import (
    OrderTransition,
    OrderCancel,
    OrderPendingMissing,
    OrderEvent,
    OrderEventsResponse,
    validate_transition,
    get_allowed_transitions,
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


@router.patch("/{order_id}/transition")
async def transition_order(
    order_id: str,
    transition: OrderTransition,
    authorization: Optional[str] = Header(None),
):
    """
    Transition order to new status with validation.

    State machine enforces allowed transitions:
    - received -> review_area1, cancelled
    - review_area1 -> review_area2, cancelled
    - review_area2 -> ready_dispatch, cancelled
    - ready_dispatch -> dispatched, cancelled
    - dispatched -> in_delivery
    - in_delivery -> delivered, partially_delivered, returned
    """
    logger.info(f"Transitioning order {order_id} to {transition.new_status}")

    supabase = get_supabase_client()

    try:
        # Get current order
        current = (
            supabase.table("orders")
            .select("id, status, order_number")
            .eq("id", order_id)
            .single()
            .execute()
        )

        if not current.data:
            raise HTTPException(status_code=404, detail="Order not found")

        current_status = current.data["status"]

        # Validate transition
        if not validate_transition(current_status, transition.new_status):
            allowed = get_allowed_transitions(current_status)
            raise HTTPException(
                status_code=400,
                detail=f"Invalid transition: {current_status} -> {transition.new_status}. "
                       f"Allowed: {allowed}"
            )

        # Update status
        update_data = {
            "status": transition.new_status,
            "updated_at": datetime.now().isoformat(),
        }

        result = (
            supabase.table("orders")
            .update(update_data)
            .eq("id", order_id)
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to update status")

        # Create audit event
        user_id = get_user_id_from_token(authorization)
        try:
            supabase.table("order_events").insert({
                "order_id": order_id,
                "event_type": "status_change",
                "payload": {
                    "previous_status": current_status,
                    "new_status": transition.new_status,
                    "notes": transition.notes,
                },
                "created_by": user_id,
            }).execute()
        except Exception as e:
            logger.warning(f"Failed to create audit event: {e}")

        logger.info(f"Order {order_id} transitioned: {current_status} -> {transition.new_status}")

        return {
            "success": True,
            "previous_status": current_status,
            "new_status": transition.new_status,
            "allowed_next": get_allowed_transitions(transition.new_status),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error transitioning order: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{order_id}/cancel")
async def cancel_order(
    order_id: str,
    cancel: OrderCancel,
    authorization: Optional[str] = Header(None),
):
    """
    Cancel an order (instead of DELETE).

    Orders are never deleted - they transition to 'cancelled' status.
    A reason is required for audit purposes.
    """
    logger.info(f"Cancelling order {order_id}: {cancel.reason}")

    supabase = get_supabase_client()

    try:
        # Get current order
        current = (
            supabase.table("orders")
            .select("id, status, order_number")
            .eq("id", order_id)
            .single()
            .execute()
        )

        if not current.data:
            raise HTTPException(status_code=404, detail="Order not found")

        current_status = current.data["status"]

        # Check if can be cancelled
        if not validate_transition(current_status, "cancelled"):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot cancel order in status: {current_status}"
            )

        # Update to cancelled
        result = (
            supabase.table("orders")
            .update({
                "status": "cancelled",
                "updated_at": datetime.now().isoformat(),
            })
            .eq("id", order_id)
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to cancel order")

        # Create audit event
        user_id = get_user_id_from_token(authorization)
        try:
            supabase.table("order_events").insert({
                "order_id": order_id,
                "event_type": "cancelled",
                "payload": {
                    "previous_status": current_status,
                    "reason": cancel.reason,
                    "notes": cancel.notes,
                },
                "created_by": user_id,
            }).execute()
        except Exception as e:
            logger.warning(f"Failed to create audit event: {e}")

        logger.info(f"Order {order_id} cancelled")

        return {
            "success": True,
            "message": "Order cancelled",
            "reason": cancel.reason,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling order: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{order_id}/pending-missing")
async def update_pending_missing(
    order_id: str,
    data: OrderPendingMissing,
    authorization: Optional[str] = Header(None),
):
    """Mark/unmark order as having pending missing items."""
    logger.info(f"Updating pending_missing for order {order_id}: {data.has_pending_missing}")

    supabase = get_supabase_client()

    try:
        result = (
            supabase.table("orders")
            .update({
                "has_pending_missing": data.has_pending_missing,
                "updated_at": datetime.now().isoformat(),
            })
            .eq("id", order_id)
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=404, detail="Order not found")

        # Create audit event
        user_id = get_user_id_from_token(authorization)
        try:
            supabase.table("order_events").insert({
                "order_id": order_id,
                "event_type": "item_updated",
                "payload": {
                    "field": "has_pending_missing",
                    "value": data.has_pending_missing,
                },
                "created_by": user_id,
            }).execute()
        except Exception as e:
            logger.warning(f"Failed to create audit event: {e}")

        return {
            "success": True,
            "has_pending_missing": data.has_pending_missing,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating pending_missing: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{order_id}/events", response_model=OrderEventsResponse)
async def get_order_events(
    order_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Get audit events for an order."""
    logger.info(f"Fetching events for order {order_id}")

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

        # Get events (handle case where table doesn't exist yet)
        try:
            result = (
                supabase.table("order_events")
                .select("*", count="exact")
                .eq("order_id", order_id)
                .order("created_at", desc=True)
                .range(offset, offset + limit - 1)
                .execute()
            )
        except Exception as table_error:
            # Table might not exist yet - return empty response
            logger.warning(f"order_events table may not exist: {table_error}")
            return OrderEventsResponse(events=[], total_count=0)

        events = []
        for event in result.data:
            # Get user name if created_by exists
            created_by_name = None
            if event.get("created_by"):
                try:
                    user_result = (
                        supabase.table("users")
                        .select("name")
                        .eq("id", event["created_by"])
                        .single()
                        .execute()
                    )
                    if user_result.data:
                        created_by_name = user_result.data.get("name")
                except:
                    pass

            events.append(OrderEvent(
                id=event["id"],
                order_id=event["order_id"],
                event_type=event["event_type"],
                payload=event.get("payload") or {},
                created_by=event.get("created_by"),
                created_by_name=created_by_name,
                created_at=event["created_at"],
            ))

        return OrderEventsResponse(
            events=events,
            total_count=result.count if result.count else len(events),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching events: {e}")
        raise HTTPException(status_code=500, detail=str(e))
