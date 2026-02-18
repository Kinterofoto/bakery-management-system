"""Email processing endpoints for manual operations."""

import logging
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Query

from ...core.supabase import get_supabase_client
from ...services.email_processor import get_email_processor
from ...services.rag_sync import match_client, match_branch, match_product

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/emails", tags=["emails"])


@router.post("/process/{email_id}")
async def process_email_manually(
    email_id: str,
    background_tasks: BackgroundTasks,
    wait: bool = Query(False, description="Wait for processing to complete"),
):
    """
    Process a specific email by ID.

    This endpoint allows manual triggering of email processing,
    useful for reprocessing or testing.

    Args:
        email_id: Microsoft Graph email ID
        wait: If True, wait for processing; if False, process in background
    """
    logger.info(f"Manual email processing requested: {email_id}")

    processor = get_email_processor()

    if wait:
        # Process synchronously
        result = await processor.process_email(email_id)
        return {
            "status": "completed",
            "result": {
                "email_id": result.email_id,
                "success": result.success,
                "classification": result.classification.value,
                "orders_created": result.orders_created,
                "error_message": result.error_message,
                "processing_time_ms": result.processing_time_ms,
            },
        }
    else:
        # Process in background
        background_tasks.add_task(processor.process_email, email_id)
        return {
            "status": "accepted",
            "email_id": email_id,
            "message": "Processing started in background",
        }


@router.get("/logs")
async def get_processing_logs(
    limit: int = Query(50, le=200, description="Number of logs to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    status: Optional[str] = Query(None, description="Filter by status"),
):
    """
    Get email processing logs from the database.

    Returns recent processing results from workflows.ordenes_compra.
    """
    logger.info(f"Fetching processing logs: limit={limit}, offset={offset}")

    supabase = get_supabase_client()

    query = (
        supabase.schema("workflows")
        .table("ordenes_compra")
        .select("id, email_id, email_subject, email_from, cliente, cliente_id, sucursal_id, oc_number, status, created_at, updated_at")
        .order("created_at", desc=True)
        .limit(limit)
        .offset(offset)
    )

    if status:
        query = query.eq("status", status)

    result = query.execute()

    return {
        "status": "success",
        "count": len(result.data),
        "logs": result.data,
    }


@router.get("/logs/{order_id}")
async def get_order_details(order_id: str):
    """
    Get detailed information about a specific order.

    Includes processing logs and extracted products.
    """
    logger.info(f"Fetching order details: {order_id}")

    supabase = get_supabase_client()

    # Get order
    order_result = (
        supabase.schema("workflows")
        .table("ordenes_compra")
        .select("*")
        .eq("id", order_id)
        .single()
        .execute()
    )

    if not order_result.data:
        return {
            "status": "error",
            "message": "Order not found",
        }

    # Get products
    products_result = (
        supabase.schema("workflows")
        .table("ordenes_compra_productos")
        .select("*")
        .eq("orden_compra_id", order_id)
        .execute()
    )

    # Enrich with canonical product name from catalog
    products = products_result.data or []
    product_ids = [p["producto_id"] for p in products if p.get("producto_id")]
    if product_ids:
        catalog = (
            supabase.table("products")
            .select("id, name")
            .in_("id", product_ids)
            .execute()
        )
        catalog_map = {p["id"]: p["name"] for p in (catalog.data or [])}
        for p in products:
            if p.get("producto_id"):
                p["catalogo_nombre"] = catalog_map.get(p["producto_id"])

    return {
        "status": "success",
        "order": order_result.data,
        "products": products,
    }


@router.get("/stats")
async def get_processing_stats():
    """
    Get processing statistics.

    Returns counts by status and recent activity.
    """
    logger.info("Fetching processing stats")

    supabase = get_supabase_client()

    # Get counts by status
    all_orders = (
        supabase.schema("workflows")
        .table("ordenes_compra")
        .select("status")
        .execute()
    )

    status_counts = {}
    for order in all_orders.data:
        status = order["status"]
        status_counts[status] = status_counts.get(status, 0) + 1

    # Get recent orders (last 24 hours)
    from datetime import datetime, timedelta

    yesterday = (datetime.now() - timedelta(days=1)).isoformat()

    recent = (
        supabase.schema("workflows")
        .table("ordenes_compra")
        .select("id")
        .gte("created_at", yesterday)
        .execute()
    )

    return {
        "status": "success",
        "stats": {
            "total_orders": len(all_orders.data),
            "by_status": status_counts,
            "last_24_hours": len(recent.data),
        },
    }


@router.post("/backfill-client-match")
async def backfill_client_match():
    """Match existing orders that have no cliente_id against RAG vector DB."""
    logger.info("Starting client match backfill")
    supabase = get_supabase_client()

    orders = (
        supabase.schema("workflows")
        .table("ordenes_compra")
        .select("id, cliente")
        .is_("cliente_id", "null")
        .not_.is_("cliente", "null")
        .execute()
    )

    matched = 0
    no_match = 0
    errors = 0

    for order in orders.data:
        try:
            result = await match_client(order["cliente"])
            if result:
                supabase.schema("workflows").table("ordenes_compra").update({
                    "cliente_id": result["client_id"],
                }).eq("id", order["id"]).execute()
                matched += 1
                logger.info(f"Backfill matched '{order['cliente']}' -> {result['matched_content']} ({result['similarity']:.2f})")
            else:
                no_match += 1
        except Exception as e:
            errors += 1
            logger.error(f"Backfill error for order {order['id']}: {e}")

    return {
        "status": "completed",
        "total": len(orders.data),
        "matched": matched,
        "no_match": no_match,
        "errors": errors,
    }


@router.post("/backfill-branch-match")
async def backfill_branch_match():
    """Match existing orders that have cliente_id but no sucursal_id."""
    logger.info("Starting branch match backfill")
    supabase = get_supabase_client()

    orders = (
        supabase.schema("workflows")
        .table("ordenes_compra")
        .select("id, cliente_id, sucursal, direccion")
        .not_.is_("cliente_id", "null")
        .is_("sucursal_id", "null")
        .execute()
    )

    matched = 0
    no_match = 0
    errors = 0

    for order in orders.data:
        try:
            result = await match_branch(
                client_id=order["cliente_id"],
                sucursal_text=order.get("sucursal"),
                direccion_text=order.get("direccion"),
            )
            if result:
                supabase.schema("workflows").table("ordenes_compra").update({
                    "sucursal_id": result["branch_id"],
                }).eq("id", order["id"]).execute()
                matched += 1
                logger.info(f"Backfill branch: '{order.get('sucursal')}' -> {result['branch_name']} ({result['confidence']})")
            else:
                no_match += 1
        except Exception as e:
            errors += 1
            logger.error(f"Branch backfill error for order {order['id']}: {e}")

    return {
        "status": "completed",
        "total": len(orders.data),
        "matched": matched,
        "no_match": no_match,
        "errors": errors,
    }


@router.post("/backfill-product-match")
async def backfill_product_match():
    """Match existing order products that have no producto_id against aliases and RAG."""
    logger.info("Starting product match backfill")
    supabase = get_supabase_client()

    # Get products without a match, joining to get the client_id from the parent order
    products = (
        supabase.schema("workflows")
        .table("ordenes_compra_productos")
        .select("id, producto, precio, orden_compra_id")
        .is_("producto_id", "null")
        .not_.is_("producto", "null")
        .execute()
    )

    matched = 0
    no_match = 0
    errors = 0

    # Cache order -> client_id lookups
    order_client_cache: dict[str, str | None] = {}

    for prod in products.data:
        try:
            order_id = prod["orden_compra_id"]

            # Get client_id from parent order (cached)
            if order_id not in order_client_cache:
                order_result = (
                    supabase.schema("workflows")
                    .table("ordenes_compra")
                    .select("cliente_id")
                    .eq("id", order_id)
                    .single()
                    .execute()
                )
                order_client_cache[order_id] = (
                    order_result.data.get("cliente_id") if order_result.data else None
                )

            client_id = order_client_cache[order_id]

            result = await match_product(
                extracted_name=prod["producto"],
                client_id=client_id,
                precio=float(prod["precio"]) if prod.get("precio") is not None else None,
            )
            if result:
                supabase.schema("workflows").table("ordenes_compra_productos").update({
                    "producto_id": result["product_id"],
                    "producto_nombre": result["matched_name"],
                    "confidence_score": result["similarity"],
                }).eq("id", prod["id"]).execute()
                matched += 1
                logger.info(
                    f"Backfill product matched '{prod['producto']}' -> "
                    f"'{result['matched_name']}' ({result['source']}, {result['similarity']:.2f})"
                )
            else:
                no_match += 1
        except Exception as e:
            errors += 1
            logger.error(f"Product backfill error for product {prod['id']}: {e}")

    return {
        "status": "completed",
        "total": len(products.data),
        "matched": matched,
        "no_match": no_match,
        "errors": errors,
    }


@router.delete("/logs/{order_id}")
async def delete_order(order_id: str):
    """
    Delete an order and its products.

    Use with caution - this permanently deletes the record.
    """
    logger.info(f"Deleting order: {order_id}")

    supabase = get_supabase_client()

    try:
        # Products are deleted via CASCADE
        supabase.schema("workflows").table("ordenes_compra").delete().eq(
            "id", order_id
        ).execute()

        return {
            "status": "success",
            "message": f"Order {order_id} deleted",
        }

    except Exception as e:
        logger.error(f"Failed to delete order: {e}")
        return {
            "status": "error",
            "message": str(e),
        }
