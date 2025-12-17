"""Billing CRUD operations - GET pending orders, unfactured orders."""

import logging
from typing import Optional
from fastapi import APIRouter, Query, HTTPException

from ....core.supabase import get_supabase_client
from ....models.billing import (
    PendingOrder,
    PendingOrderItem,
    PendingOrdersResponse,
    UnfacturedOrder,
    UnfacturedOrdersResponse,
    MarkInvoicedRequest,
    MarkInvoicedResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/pending", response_model=PendingOrdersResponse)
async def get_pending_orders(
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=500),
    client_id: Optional[str] = Query(None, description="Filter by client"),
    date: Optional[str] = Query(None, description="Filter by expected_delivery_date"),
):
    """
    Get orders ready for billing (status=ready_dispatch, is_invoiced=false).

    These are orders that:
    - Have status = 'ready_dispatch'
    - Are NOT yet invoiced (is_invoiced = false)
    - Do NOT have an existing remision (for remision-type orders)
    """
    logger.info(f"Fetching pending orders: page={page}, limit={limit}")

    supabase = get_supabase_client()
    offset = (page - 1) * limit

    # Build query for pending orders
    query = (
        supabase.table("orders")
        .select(
            "id, order_number, expected_delivery_date, total_value, status, "
            "client_id, branch_id, created_at, requires_remision, "
            "clients(id, name, razon_social, nit, billing_type), "
            "branches(id, name)",
            count="exact"
        )
        .eq("status", "ready_dispatch")
        .eq("is_invoiced", False)
        .order("expected_delivery_date", desc=False)
    )

    # Apply additional filters
    if client_id:
        query = query.eq("client_id", client_id)

    if date:
        query = query.eq("expected_delivery_date", date)

    # Apply pagination
    query = query.range(offset, offset + limit - 1)

    result = query.execute()
    total_count = result.count if result.count is not None else 0

    # Get order IDs for items query
    order_ids = [order["id"] for order in result.data]

    # Get items for all orders in one query
    items_by_order = {}
    if order_ids:
        items_result = (
            supabase.table("order_items")
            .select(
                "id, order_id, product_id, quantity_requested, quantity_available, "
                "unit_price, products(id, name)"
            )
            .in_("order_id", order_ids)
            .execute()
        )

        for item in items_result.data:
            order_id = item["order_id"]
            if order_id not in items_by_order:
                items_by_order[order_id] = []

            product = item.get("products") or {}
            subtotal = None
            if item.get("quantity_requested") and item.get("unit_price"):
                subtotal = item["quantity_requested"] * item["unit_price"]

            items_by_order[order_id].append(PendingOrderItem(
                id=item["id"],
                product_id=item["product_id"],
                product_name=product.get("name"),
                product_code=None,  # products table doesn't have a code column
                quantity_requested=item.get("quantity_requested"),
                quantity_available=item.get("quantity_available"),
                unit_price=item.get("unit_price"),
                subtotal=subtotal,
            ))

    # Check which orders already have remisions
    orders_with_remisions = set()
    if order_ids:
        remisions_result = (
            supabase.table("remisions")
            .select("order_id")
            .in_("order_id", order_ids)
            .execute()
        )
        orders_with_remisions = {r["order_id"] for r in remisions_result.data}

    # Transform data
    orders = []
    for order in result.data:
        # Skip orders that already have remision (if they require one)
        client = order.get("clients") or {}
        branch = order.get("branches") or {}

        # Determine if order requires remision
        requires_remision = order.get("requires_remision", False) or client.get("billing_type") == "remision"

        # Skip if order requires remision and already has one
        if requires_remision and order["id"] in orders_with_remisions:
            continue

        items = items_by_order.get(order["id"], [])

        orders.append(PendingOrder(
            id=order["id"],
            order_number=order.get("order_number"),
            expected_delivery_date=order.get("expected_delivery_date"),
            total_value=order.get("total_value"),
            status=order["status"],
            requires_remision=requires_remision,
            client_id=order.get("client_id"),
            client_name=client.get("name"),
            client_razon_social=client.get("razon_social"),
            client_nit=client.get("nit"),
            client_billing_type=client.get("billing_type"),
            branch_id=order.get("branch_id"),
            branch_name=branch.get("name"),
            items=items,
            items_count=len(items),
            created_at=order.get("created_at"),
        ))

    return PendingOrdersResponse(
        orders=orders,
        total_count=len(orders),  # Adjusted count after filtering
        page=page,
        limit=limit,
    )


@router.get("/unfactured", response_model=UnfacturedOrdersResponse)
async def get_unfactured_orders():
    """
    Get orders with remision but not invoiced yet (is_invoiced_from_remision=false).

    These are orders that:
    - Have a remision created
    - The remision is NOT yet marked as invoiced
    """
    logger.info("Fetching unfactured orders (with remision, not invoiced)")

    supabase = get_supabase_client()

    # Query remisions that are not yet invoiced
    remisions_result = (
        supabase.table("remisions")
        .select(
            "id, remision_number, order_id, total_amount, created_at, "
            "orders(id, order_number, expected_delivery_date, total_value, "
            "is_invoiced_from_remision, "
            "clients(id, name, nit), "
            "branches(id, name))"
        )
        .eq("orders.is_invoiced_from_remision", False)
        .order("created_at", desc=True)
        .execute()
    )

    orders = []
    for remision in remisions_result.data:
        order = remision.get("orders") or {}

        # Skip if order data is not available (shouldn't happen but safety check)
        if not order:
            continue

        client = order.get("clients") or {}
        branch = order.get("branches") or {}

        orders.append(UnfacturedOrder(
            id=remision["id"],  # Using remision id as the main identifier
            order_id=order.get("id") or remision["order_id"],
            order_number=order.get("order_number"),
            expected_delivery_date=order.get("expected_delivery_date"),
            total_value=order.get("total_value"),
            client_name=client.get("name"),
            client_nit=client.get("nit"),
            branch_name=branch.get("name"),
            remision_id=remision["id"],
            remision_number=remision.get("remision_number"),
            remision_created_at=remision.get("created_at"),
            remision_total_amount=remision.get("total_amount"),
        ))

    return UnfacturedOrdersResponse(
        orders=orders,
        total_count=len(orders),
    )


@router.post("/unfactured/mark-invoiced", response_model=MarkInvoicedResponse)
async def mark_orders_as_invoiced(request: MarkInvoicedRequest):
    """
    Mark orders as invoiced from remision.

    Updates is_invoiced_from_remision = true for the specified orders.
    """
    logger.info(f"Marking {len(request.order_ids)} orders as invoiced from remision")

    supabase = get_supabase_client()

    try:
        result = (
            supabase.table("orders")
            .update({"is_invoiced_from_remision": True})
            .in_("id", request.order_ids)
            .execute()
        )

        updated_count = len(result.data) if result.data else 0

        logger.info(f"Marked {updated_count} orders as invoiced")

        return MarkInvoicedResponse(
            success=True,
            updated_count=updated_count,
        )

    except Exception as e:
        logger.error(f"Error marking orders as invoiced: {e}")
        raise HTTPException(status_code=500, detail=str(e))
