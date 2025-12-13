"""Orders CRUD operations - GET list, GET detail, POST, PATCH."""

import logging
from typing import Optional, List
from datetime import datetime, timedelta
from fastapi import APIRouter, Query, HTTPException, Header

from ....core.supabase import get_supabase_client
from ....models.order import (
    OrderListItem,
    OrderListResponse,
    OrderDetail,
    OrderItemDetail,
    OrderCreate,
    OrderCreateResponse,
    OrderUpdate,
    OrderFullUpdate,
    OrderFullUpdateResponse,
    OrderBatchRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# === Helper Functions ===

def get_today_date() -> str:
    return datetime.now().strftime("%Y-%m-%d")


def get_tomorrow_date() -> str:
    return (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")


def get_week_end_date() -> str:
    return (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")


def get_next_monday() -> str:
    """Get next Monday's date."""
    today = datetime.now()
    days_until_monday = (7 - today.weekday()) % 7
    if days_until_monday == 0:
        days_until_monday = 7
    next_monday = today + timedelta(days=days_until_monday)
    return next_monday.strftime("%Y-%m-%d")


def apply_view_filters(query, view: str):
    """Apply filters based on view parameter."""
    today = get_today_date()
    tomorrow = get_tomorrow_date()
    next_monday = get_next_monday()

    if view == "review_area1":
        # Orders for first review
        query = query.in_("status", ["received", "review_area1"])
        query = query.in_("expected_delivery_date", [tomorrow, next_monday])
    elif view == "review_area2":
        # Orders for second review
        query = query.eq("status", "review_area2")
    elif view == "ready_dispatch":
        # Orders ready for dispatch
        query = query.eq("status", "ready_dispatch")
    elif view == "today":
        query = query.eq("expected_delivery_date", today)
    elif view == "tomorrow":
        query = query.eq("expected_delivery_date", tomorrow)
    elif view == "week":
        week_end = get_week_end_date()
        query = query.gte("expected_delivery_date", today)
        query = query.lte("expected_delivery_date", week_end)
    # "list" or default: no additional filters

    return query


# === Endpoints ===

@router.get("/", response_model=OrderListResponse)
async def list_orders(
    view: str = Query("list", description="View mode: list, review_area1, review_area2, ready_dispatch, today, tomorrow, week"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = Query(None, description="Filter by specific status"),
    search: Optional[str] = Query(None, description="Search by order_number or client name"),
    client_id: Optional[str] = Query(None, description="Filter by client"),
    date: Optional[str] = Query(None, description="Filter by expected_delivery_date"),
):
    """
    Get paginated list of orders with ?view= parameter.

    Views:
    - list: Default list view
    - review_area1: Orders for first review (received/review_area1, tomorrow/monday)
    - review_area2: Orders for second review
    - ready_dispatch: Orders ready for dispatch
    - today/tomorrow/week: Date filters
    """
    logger.info(f"Fetching orders: view={view}, page={page}, limit={limit}")

    supabase = get_supabase_client()
    offset = (page - 1) * limit

    # Build query with minimal fields for list view
    query = (
        supabase.table("orders")
        .select(
            "id, order_number, expected_delivery_date, requested_delivery_date, status, total_value, "
            "client_id, branch_id, created_at, has_pending_missing, "
            "clients(id, name), branches(id, name), "
            "created_by_user:users!created_by(id, name)",
            count="exact"
        )
        .order("created_at", desc=True)
    )

    # Apply view-specific filters
    query = apply_view_filters(query, view)

    # Apply additional filters
    if status:
        query = query.eq("status", status)

    if client_id:
        query = query.eq("client_id", client_id)

    if date:
        query = query.eq("expected_delivery_date", date)

    if search:
        query = query.or_(f"order_number.ilike.%{search}%")

    # Apply pagination
    query = query.range(offset, offset + limit - 1)

    result = query.execute()
    total_count = result.count if result.count is not None else 0

    # Get order IDs for delivery percentage calculation
    order_ids = [order["id"] for order in result.data]

    # Calculate delivery percentages for delivered orders (single efficient query)
    delivery_percentages = {}
    if order_ids:
        try:
            # Get aggregated delivery data for all orders at once
            items_result = (
                supabase.table("order_items")
                .select("order_id, quantity_requested, quantity_delivered")
                .in_("order_id", order_ids)
                .execute()
            )

            # Calculate percentages per order
            order_totals = {}  # {order_id: {requested: X, delivered: Y}}
            for item in items_result.data:
                order_id = item["order_id"]
                if order_id not in order_totals:
                    order_totals[order_id] = {"requested": 0, "delivered": 0}
                order_totals[order_id]["requested"] += item.get("quantity_requested") or 0
                order_totals[order_id]["delivered"] += item.get("quantity_delivered") or 0

            for order_id, totals in order_totals.items():
                if totals["requested"] > 0:
                    delivery_percentages[order_id] = round(
                        (totals["delivered"] / totals["requested"]) * 100
                    )
                else:
                    delivery_percentages[order_id] = 0
        except Exception as e:
            logger.warning(f"Failed to calculate delivery percentages: {e}")

    # Transform data
    orders = []
    for order in result.data:
        client = order.get("clients") or {}
        branch = order.get("branches") or {}
        created_by_user = order.get("created_by_user") or {}

        # Determine source from created_by_user name
        source = created_by_user.get("name") if created_by_user else None

        orders.append(OrderListItem(
            id=order["id"],
            order_number=order.get("order_number"),
            expected_delivery_date=order.get("expected_delivery_date"),
            requested_delivery_date=order.get("requested_delivery_date"),
            status=order["status"],
            total=order.get("total_value"),
            client_id=order.get("client_id"),
            client_name=client.get("name") if client else None,
            branch_id=order.get("branch_id"),
            branch_name=branch.get("name") if branch else None,
            items_count=0,
            created_at=order.get("created_at"),
            has_pending_missing=order.get("has_pending_missing", False),
            source=source,
            delivery_percentage=delivery_percentages.get(order["id"]),
        ))

    has_more = offset + len(orders) < total_count

    return OrderListResponse(
        orders=orders,
        total_count=total_count,
        page=page,
        limit=limit,
        has_more=has_more,
    )


@router.get("/{order_id}", response_model=OrderDetail)
async def get_order_detail(order_id: str):
    """Get full order details including items."""
    logger.info(f"Fetching order detail: {order_id}")

    supabase = get_supabase_client()

    # Get order with related data (include client and branch contact fields)
    order_result = (
        supabase.table("orders")
        .select(
            "*, "
            "clients(id, name, razon_social, address, phone, email, contact_person), "
            "branches(id, name, address, phone, email, contact_person), "
            "created_by_user:users!created_by(id, name)"
        )
        .eq("id", order_id)
        .single()
        .execute()
    )

    if not order_result.data:
        raise HTTPException(status_code=404, detail="Order not found")

    order = order_result.data
    client = order.get("clients") or {}
    branch = order.get("branches") or {}
    created_by_user = order.get("created_by_user") or {}

    # Get order items with products
    items_result = (
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
    for item in items_result.data:
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

    return OrderDetail(
        id=order["id"],
        order_number=order.get("order_number"),
        expected_delivery_date=order.get("expected_delivery_date"),
        requested_delivery_date=order.get("requested_delivery_date"),
        status=order["status"],
        total=order.get("total_value"),
        subtotal=order.get("subtotal"),
        vat_amount=order.get("vat_amount"),
        observations=order.get("observations"),
        purchase_order_number=order.get("purchase_order_number"),
        has_pending_missing=order.get("has_pending_missing", False),
        is_invoiced=order.get("is_invoiced", False),
        created_at=order.get("created_at"),
        updated_at=order.get("updated_at"),
        pdf_filename=order.get("pdf_filename"),
        # Client contact info
        client_id=order.get("client_id"),
        client_name=client.get("name"),
        client_razon_social=client.get("razon_social"),
        client_address=client.get("address"),
        client_phone=client.get("phone"),
        client_email=client.get("email"),
        client_contact_person=client.get("contact_person"),
        # Branch contact info
        branch_id=order.get("branch_id"),
        branch_name=branch.get("name"),
        branch_address=branch.get("address"),
        branch_phone=branch.get("phone"),
        branch_email=branch.get("email"),
        branch_contact_person=branch.get("contact_person"),
        created_by=order.get("created_by"),
        created_by_name=created_by_user.get("name"),
        items=items,
    )


@router.post("/batch", response_model=List[OrderDetail])
async def get_orders_batch(request: OrderBatchRequest):
    """
    Get multiple order details in a single request.
    Optimized for prefetching - returns up to 100 orders at once.
    """
    order_ids = request.order_ids
    logger.info(f"Batch fetching {len(order_ids)} orders")

    supabase = get_supabase_client()

    # Get all orders in one query (include client and branch contact fields)
    orders_result = (
        supabase.table("orders")
        .select(
            "*, "
            "clients(id, name, razon_social, address, phone, email, contact_person), "
            "branches(id, name, address, phone, email, contact_person), "
            "created_by_user:users!created_by(id, name)"
        )
        .in_("id", order_ids)
        .execute()
    )

    if not orders_result.data:
        return []

    # Get all items for these orders in one query
    items_result = (
        supabase.table("order_items")
        .select(
            "id, order_id, product_id, quantity_requested, quantity_available, "
            "quantity_missing, quantity_dispatched, quantity_delivered, "
            "quantity_returned, unit_price, availability_status, lote, "
            "products(id, name)"
        )
        .in_("order_id", order_ids)
        .execute()
    )

    # Group items by order_id
    items_by_order: dict = {}
    for item in items_result.data:
        order_id = item["order_id"]
        if order_id not in items_by_order:
            items_by_order[order_id] = []

        product = item.get("products") or {}
        subtotal = None
        if item.get("quantity_requested") and item.get("unit_price"):
            subtotal = item["quantity_requested"] * item["unit_price"]

        items_by_order[order_id].append(OrderItemDetail(
            id=item["id"],
            product_id=item["product_id"],
            product_name=product.get("name"),
            product_code=None,
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

    # Build response
    result = []
    for order in orders_result.data:
        client = order.get("clients") or {}
        branch = order.get("branches") or {}
        created_by_user = order.get("created_by_user") or {}

        result.append(OrderDetail(
            id=order["id"],
            order_number=order.get("order_number"),
            expected_delivery_date=order.get("expected_delivery_date"),
            requested_delivery_date=order.get("requested_delivery_date"),
            status=order["status"],
            total=order.get("total_value"),
            subtotal=order.get("subtotal"),
            vat_amount=order.get("vat_amount"),
            observations=order.get("observations"),
            purchase_order_number=order.get("purchase_order_number"),
            has_pending_missing=order.get("has_pending_missing", False),
            is_invoiced=order.get("is_invoiced", False),
            created_at=order.get("created_at"),
            updated_at=order.get("updated_at"),
            pdf_filename=order.get("pdf_filename"),
            # Client contact info
            client_id=order.get("client_id"),
            client_name=client.get("name"),
            client_razon_social=client.get("razon_social"),
            client_address=client.get("address"),
            client_phone=client.get("phone"),
            client_email=client.get("email"),
            client_contact_person=client.get("contact_person"),
            # Branch contact info
            branch_id=order.get("branch_id"),
            branch_name=branch.get("name"),
            branch_address=branch.get("address"),
            branch_phone=branch.get("phone"),
            branch_email=branch.get("email"),
            branch_contact_person=branch.get("contact_person"),
            created_by=order.get("created_by"),
            created_by_name=created_by_user.get("name"),
            items=items_by_order.get(order["id"], []),
        ))

    logger.info(f"Batch returned {len(result)} orders")
    return result


@router.post("/", response_model=OrderCreateResponse)
async def create_order(
    order_data: OrderCreate,
    authorization: Optional[str] = Header(None),
):
    """Create a new order with items."""
    logger.info(f"Creating order for client: {order_data.client_id}")

    supabase = get_supabase_client()

    try:
        # Get next order number
        last_order_result = (
            supabase.table("orders")
            .select("order_number")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )

        next_order_number = "000001"
        if last_order_result.data and last_order_result.data[0].get("order_number"):
            try:
                last_num = int(last_order_result.data[0]["order_number"])
                next_order_number = str(last_num + 1).zfill(6)
            except ValueError:
                pass

        # Extract user_id from JWT if provided
        user_id = None
        if authorization and authorization.startswith("Bearer "):
            import jwt
            token = authorization.replace("Bearer ", "")
            try:
                decoded = jwt.decode(token, options={"verify_signature": False})
                user_id = decoded.get("sub")
            except Exception as e:
                logger.warning(f"Could not decode JWT: {e}")

        # Calculate totals
        total_value = sum(
            item.quantity_requested * item.unit_price
            for item in order_data.items
        )

        # Create order
        order_insert = {
            "order_number": next_order_number,
            "client_id": order_data.client_id,
            "branch_id": order_data.branch_id,
            "expected_delivery_date": order_data.expected_delivery_date,
            "purchase_order_number": order_data.purchase_order_number,
            "observations": order_data.observations,
            "total_value": total_value,
            "status": "received",
        }

        if user_id:
            order_insert["created_by"] = user_id

        order_result = (
            supabase.table("orders")
            .insert(order_insert)
            .execute()
        )

        if not order_result.data:
            raise HTTPException(status_code=500, detail="Failed to create order")

        order = order_result.data[0]
        order_id = order["id"]

        # Create order items
        order_items = []
        for item in order_data.items:
            order_items.append({
                "order_id": order_id,
                "product_id": item.product_id,
                "quantity_requested": item.quantity_requested,
                "unit_price": item.unit_price,
                "availability_status": "pending",
                "quantity_available": 0,
                "quantity_missing": item.quantity_requested,
            })

        items_result = (
            supabase.table("order_items")
            .insert(order_items)
            .execute()
        )

        if not items_result.data:
            # Cleanup
            supabase.table("orders").delete().eq("id", order_id).execute()
            raise HTTPException(status_code=500, detail="Failed to create order items")

        # Create audit event
        try:
            supabase.table("order_events").insert({
                "order_id": order_id,
                "event_type": "created",
                "payload": {
                    "order_number": next_order_number,
                    "client_id": order_data.client_id,
                    "items_count": len(order_data.items),
                    "total_value": total_value,
                },
                "created_by": user_id,
            }).execute()
        except Exception as e:
            logger.warning(f"Failed to create audit event: {e}")

        logger.info(f"Order created: {order_id} / {next_order_number}")

        return OrderCreateResponse(
            id=order_id,
            order_number=next_order_number,
            status="received",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating order: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{order_id}")
async def update_order(
    order_id: str,
    order_data: OrderUpdate,
    authorization: Optional[str] = Header(None),
):
    """Update order (only editable fields)."""
    logger.info(f"Updating order: {order_id}")

    supabase = get_supabase_client()

    # Build update data (only non-None fields)
    update_data = {}
    if order_data.expected_delivery_date is not None:
        update_data["expected_delivery_date"] = order_data.expected_delivery_date
    if order_data.observations is not None:
        update_data["observations"] = order_data.observations
    if order_data.purchase_order_number is not None:
        update_data["purchase_order_number"] = order_data.purchase_order_number

    if not update_data:
        return {"success": True, "message": "No changes to apply"}

    update_data["updated_at"] = datetime.now().isoformat()

    try:
        # Get current order for audit
        current = (
            supabase.table("orders")
            .select("*")
            .eq("id", order_id)
            .single()
            .execute()
        )

        if not current.data:
            raise HTTPException(status_code=404, detail="Order not found")

        # Update order
        result = (
            supabase.table("orders")
            .update(update_data)
            .eq("id", order_id)
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=404, detail="Order not found")

        # Create audit event
        user_id = None
        if authorization and authorization.startswith("Bearer "):
            import jwt
            try:
                decoded = jwt.decode(
                    authorization.replace("Bearer ", ""),
                    options={"verify_signature": False}
                )
                user_id = decoded.get("sub")
            except:
                pass

        try:
            supabase.table("order_events").insert({
                "order_id": order_id,
                "event_type": "updated",
                "payload": {
                    "changes": update_data,
                    "previous": {
                        k: current.data.get(k)
                        for k in update_data.keys()
                        if k != "updated_at"
                    },
                },
                "created_by": user_id,
            }).execute()
        except Exception as e:
            logger.warning(f"Failed to create audit event: {e}")

        return {"success": True, "message": "Order updated"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating order: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{order_id}/full", response_model=OrderFullUpdateResponse)
async def update_order_full(
    order_id: str,
    order_data: OrderFullUpdate,
    authorization: Optional[str] = Header(None),
):
    """
    Full order update including items - optimized for modal edit.

    Performs smart diff on items:
    - Items with id that exist: UPDATE if changed
    - Items with id that don't exist in new list: DELETE
    - Items without id (new): INSERT

    All in a single request for efficiency.
    """
    logger.info(f"Full update order: {order_id}")

    supabase = get_supabase_client()

    try:
        # Get current order and items
        order_result = (
            supabase.table("orders")
            .select("id, status")
            .eq("id", order_id)
            .single()
            .execute()
        )

        if not order_result.data:
            raise HTTPException(status_code=404, detail="Order not found")

        current_order = order_result.data

        # Only allow full update in early statuses
        if current_order["status"] not in ["received", "review_area1", "review_area2"]:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot fully update order in status: {current_order['status']}"
            )

        # Get current items
        items_result = (
            supabase.table("order_items")
            .select("id, product_id, quantity_requested, unit_price")
            .eq("order_id", order_id)
            .execute()
        )
        current_items = {item["id"]: item for item in items_result.data}
        current_item_ids = set(current_items.keys())

        # Process new items list
        new_item_ids = set()
        items_to_update = []
        items_to_insert = []

        for item in order_data.items:
            if item.id:
                new_item_ids.add(item.id)
                # Check if item exists and needs update
                if item.id in current_items:
                    current = current_items[item.id]
                    if (current["product_id"] != item.product_id or
                        current["quantity_requested"] != item.quantity_requested or
                        current["unit_price"] != item.unit_price):
                        items_to_update.append({
                            "id": item.id,
                            "product_id": item.product_id,
                            "quantity_requested": item.quantity_requested,
                            "unit_price": item.unit_price,
                        })
            else:
                # New item (no id)
                items_to_insert.append({
                    "order_id": order_id,
                    "product_id": item.product_id,
                    "quantity_requested": item.quantity_requested,
                    "unit_price": item.unit_price,
                    "availability_status": "pending",
                    "quantity_available": 0,
                    "quantity_missing": item.quantity_requested,
                })

        # Items to delete: in current but not in new
        items_to_delete = list(current_item_ids - new_item_ids)

        # Calculate new total
        total_value = sum(
            item.quantity_requested * item.unit_price
            for item in order_data.items
        )

        # === Execute all operations ===

        # 1. Update order fields
        order_update = {"total_value": total_value, "updated_at": datetime.now().isoformat()}
        if order_data.client_id is not None:
            order_update["client_id"] = order_data.client_id
        if order_data.branch_id is not None:
            order_update["branch_id"] = order_data.branch_id
        if order_data.expected_delivery_date is not None:
            order_update["expected_delivery_date"] = order_data.expected_delivery_date
        if order_data.purchase_order_number is not None:
            order_update["purchase_order_number"] = order_data.purchase_order_number
        if order_data.observations is not None:
            order_update["observations"] = order_data.observations

        supabase.table("orders").update(order_update).eq("id", order_id).execute()

        # 2. Delete removed items
        if items_to_delete:
            supabase.table("order_items").delete().in_("id", items_to_delete).execute()
            logger.info(f"Deleted {len(items_to_delete)} items")

        # 3. Update existing items
        for item in items_to_update:
            supabase.table("order_items").update({
                "product_id": item["product_id"],
                "quantity_requested": item["quantity_requested"],
                "unit_price": item["unit_price"],
                "quantity_missing": item["quantity_requested"],  # Reset missing on update
            }).eq("id", item["id"]).execute()
        if items_to_update:
            logger.info(f"Updated {len(items_to_update)} items")

        # 4. Insert new items
        if items_to_insert:
            supabase.table("order_items").insert(items_to_insert).execute()
            logger.info(f"Inserted {len(items_to_insert)} items")

        # 5. Create audit event
        user_id = None
        if authorization and authorization.startswith("Bearer "):
            import jwt
            try:
                decoded = jwt.decode(
                    authorization.replace("Bearer ", ""),
                    options={"verify_signature": False}
                )
                user_id = decoded.get("sub")
            except:
                pass

        try:
            supabase.table("order_events").insert({
                "order_id": order_id,
                "event_type": "updated",
                "payload": {
                    "type": "full_update",
                    "items_created": len(items_to_insert),
                    "items_updated": len(items_to_update),
                    "items_deleted": len(items_to_delete),
                    "new_total": total_value,
                },
                "created_by": user_id,
            }).execute()
        except Exception as e:
            logger.warning(f"Failed to create audit event: {e}")

        return OrderFullUpdateResponse(
            success=True,
            order_id=order_id,
            total_value=total_value,
            items_created=len(items_to_insert),
            items_updated=len(items_to_update),
            items_deleted=len(items_to_delete),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error full updating order: {e}")
        raise HTTPException(status_code=500, detail=str(e))
