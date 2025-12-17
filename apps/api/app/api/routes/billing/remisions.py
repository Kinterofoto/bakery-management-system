"""Remisions CRUD operations - List, detail, create, PDF download."""

import logging
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Query, HTTPException, Header

from ....core.supabase import get_supabase_client
from ....models.billing import (
    RemisionListItem,
    RemisionDetail,
    RemisionItemDetail,
    RemisionsListResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/remisions")


@router.get("/", response_model=RemisionsListResponse)
async def list_remisions(
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=500),
    client_id: Optional[str] = Query(None, description="Filter by client"),
    date_from: Optional[str] = Query(None, description="Filter from date"),
    date_to: Optional[str] = Query(None, description="Filter to date"),
):
    """Get paginated list of remisions."""
    logger.info(f"Fetching remisions: page={page}, limit={limit}")

    supabase = get_supabase_client()
    offset = (page - 1) * limit

    query = (
        supabase.table("remisions")
        .select(
            "id, remision_number, order_id, total_amount, notes, "
            "created_at, created_by, client_data, "
            "orders(id, order_number, expected_delivery_date, purchase_order_number, "
            "clients(id, name, nit), branches(id, name)), "
            "created_by_user:users!created_by(id, name)",
            count="exact"
        )
        .order("created_at", desc=True)
    )

    # Apply filters
    if date_from:
        query = query.gte("created_at", date_from)
    if date_to:
        query = query.lte("created_at", f"{date_to}T23:59:59")

    # Apply pagination
    query = query.range(offset, offset + limit - 1)

    result = query.execute()
    total_count = result.count if result.count is not None else 0

    remisions = []
    for remision in result.data:
        order = remision.get("orders") or {}
        client = order.get("clients") or {}
        branch = order.get("branches") or {}
        created_by_user = remision.get("created_by_user") or {}
        client_data = remision.get("client_data") or {}

        # Use client_data if available, fallback to order.clients
        client_name = client_data.get("name") or client.get("name")
        client_nit = client_data.get("nit") or client.get("nit")

        remisions.append(RemisionListItem(
            id=remision["id"],
            remision_number=remision.get("remision_number"),
            order_id=remision.get("order_id"),
            order_number=order.get("order_number"),
            total_amount=remision.get("total_amount"),
            client_name=client_name,
            client_nit=client_nit,
            expected_delivery_date=order.get("expected_delivery_date"),
            branch_name=branch.get("name"),
            purchase_order_number=order.get("purchase_order_number"),
            notes=remision.get("notes"),
            created_at=remision.get("created_at"),
            created_by=remision.get("created_by"),
            created_by_name=created_by_user.get("name"),
        ))

    return RemisionsListResponse(
        remisions=remisions,
        total_count=total_count,
        page=page,
        limit=limit,
    )


@router.get("/{remision_id}", response_model=RemisionDetail)
async def get_remision_detail(remision_id: str):
    """Get full remision details including items."""
    logger.info(f"Fetching remision detail: {remision_id}")

    supabase = get_supabase_client()

    # Get remision with order and client info
    remision_result = (
        supabase.table("remisions")
        .select(
            "*, "
            "orders(id, order_number, expected_delivery_date, purchase_order_number, "
            "clients(id, name, razon_social, nit, phone, email, address), "
            "branches(id, name)), "
            "created_by_user:users!created_by(id, name)"
        )
        .eq("id", remision_id)
        .single()
        .execute()
    )

    if not remision_result.data:
        raise HTTPException(status_code=404, detail="Remision not found")

    remision = remision_result.data
    order = remision.get("orders") or {}
    client = order.get("clients") or {}
    branch = order.get("branches") or {}
    created_by_user = remision.get("created_by_user") or {}
    client_data = remision.get("client_data") or {}

    # Get remision items
    items_result = (
        supabase.table("remision_items")
        .select(
            "id, remision_id, product_id, quantity_delivered, unit_price, "
            "total_price, units_per_package, "
            "products(id, name, unit)"
        )
        .eq("remision_id", remision_id)
        .execute()
    )

    items = []
    for item in items_result.data:
        product = item.get("products") or {}
        items.append(RemisionItemDetail(
            id=item["id"],
            remision_id=item["remision_id"],
            product_id=item.get("product_id"),
            product_name=product.get("name"),
            product_unit=product.get("unit"),
            quantity_delivered=item.get("quantity_delivered"),
            unit_price=item.get("unit_price"),
            total_price=item.get("total_price"),
            units_per_package=item.get("units_per_package"),
        ))

    # Use client_data if available, fallback to order.clients
    return RemisionDetail(
        id=remision["id"],
        remision_number=remision.get("remision_number"),
        order_id=remision.get("order_id"),
        order_number=order.get("order_number"),
        total_amount=remision.get("total_amount"),
        client_name=client_data.get("name") or client.get("name"),
        client_razon_social=client_data.get("razon_social") or client.get("razon_social"),
        client_nit=client_data.get("nit") or client.get("nit"),
        client_phone=client_data.get("phone") or client.get("phone"),
        client_email=client_data.get("email") or client.get("email"),
        client_address=client_data.get("address") or client.get("address"),
        expected_delivery_date=order.get("expected_delivery_date"),
        branch_name=branch.get("name"),
        purchase_order_number=order.get("purchase_order_number"),
        items=items,
        notes=remision.get("notes"),
        created_at=remision.get("created_at"),
        created_by=remision.get("created_by"),
        created_by_name=created_by_user.get("name"),
    )


@router.post("/")
async def create_remision(
    order_id: str,
    authorization: Optional[str] = Header(None),
):
    """
    Create a remision for an order.

    Note: PDF generation is handled client-side using @react-pdf/renderer.
    """
    logger.info(f"Creating remision for order: {order_id}")

    supabase = get_supabase_client()

    # Extract user_id from JWT
    user_id = None
    if authorization and authorization.startswith("Bearer "):
        import jwt
        try:
            decoded = jwt.decode(
                authorization.replace("Bearer ", ""),
                options={"verify_signature": False}
            )
            user_id = decoded.get("sub")
        except Exception as e:
            logger.warning(f"Could not decode JWT: {e}")

    try:
        # Verify order exists and is ready for dispatch
        order_result = (
            supabase.table("orders")
            .select(
                "id, order_number, total_value, "
                "clients(id, name, razon_social, nit, address, phone, email)"
            )
            .eq("id", order_id)
            .eq("status", "ready_dispatch")
            .single()
            .execute()
        )

        if not order_result.data:
            raise HTTPException(
                status_code=400,
                detail="Order not found or not ready for dispatch"
            )

        order = order_result.data
        client = order.get("clients") or {}

        # Check if remision already exists for this order
        existing_result = (
            supabase.table("remisions")
            .select("id")
            .eq("order_id", order_id)
            .execute()
        )

        if existing_result.data:
            raise HTTPException(
                status_code=400,
                detail="Remision already exists for this order"
            )

        # Get next remision number
        config_result = (
            supabase.table("system_config")
            .select("value")
            .eq("key", "last_remision_number")
            .single()
            .execute()
        )

        current_remision = 0
        if config_result.data:
            try:
                current_remision = int(config_result.data["value"])
            except:
                current_remision = 0

        next_remision = current_remision + 1
        remision_number = str(next_remision).zfill(6)

        # Update remision number
        supabase.table("system_config").upsert({
            "key": "last_remision_number",
            "value": str(next_remision),
            "updated_at": datetime.now().isoformat(),
        }).execute()

        # Get order items
        items_result = (
            supabase.table("order_items")
            .select(
                "id, product_id, quantity_requested, quantity_available, unit_price, "
                "products(id, name, units_per_package)"
            )
            .eq("order_id", order_id)
            .execute()
        )

        # Calculate total from items (using quantity_available if set, otherwise quantity_requested)
        total_amount = 0
        for item in items_result.data:
            qty = item.get("quantity_available") or item.get("quantity_requested") or 0
            price = item.get("unit_price") or 0
            total_amount += qty * price

        # Create remision
        remision_result = (
            supabase.table("remisions")
            .insert({
                "remision_number": remision_number,
                "order_id": order_id,
                "total_amount": total_amount,
                "client_data": {
                    "name": client.get("name"),
                    "razon_social": client.get("razon_social"),
                    "nit": client.get("nit"),
                    "address": client.get("address"),
                    "phone": client.get("phone"),
                    "email": client.get("email"),
                },
                "notes": f"Remision para pedido {order.get('order_number')}",
                "created_by": user_id,
            })
            .execute()
        )

        if not remision_result.data:
            raise HTTPException(status_code=500, detail="Failed to create remision")

        remision_id = remision_result.data[0]["id"]

        # Create remision items
        remision_items = []
        for item in items_result.data:
            product = item.get("products") or {}
            qty = item.get("quantity_available") or item.get("quantity_requested") or 0
            price = item.get("unit_price") or 0

            remision_items.append({
                "remision_id": remision_id,
                "product_id": item["product_id"],
                "quantity_delivered": qty,
                "unit_price": price,
                "total_price": qty * price,
                "units_per_package": product.get("units_per_package"),
            })

        if remision_items:
            supabase.table("remision_items").insert(remision_items).execute()

        logger.info(f"Remision created: {remision_id} / {remision_number}")

        return {
            "success": True,
            "remision_id": remision_id,
            "remision_number": remision_number,
            "total_amount": total_amount,
            "items_count": len(remision_items),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating remision: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{remision_id}")
async def delete_remision(remision_id: str):
    """Delete a remision (and its items)."""
    logger.info(f"Deleting remision: {remision_id}")

    supabase = get_supabase_client()

    try:
        # Check if remision exists
        existing = (
            supabase.table("remisions")
            .select("id, order_id")
            .eq("id", remision_id)
            .single()
            .execute()
        )

        if not existing.data:
            raise HTTPException(status_code=404, detail="Remision not found")

        # Delete remision items first (foreign key constraint)
        supabase.table("remision_items").delete().eq("remision_id", remision_id).execute()

        # Delete remision
        supabase.table("remisions").delete().eq("id", remision_id).execute()

        logger.info(f"Remision deleted: {remision_id}")

        return {"success": True, "message": "Remision deleted"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting remision: {e}")
        raise HTTPException(status_code=500, detail=str(e))
