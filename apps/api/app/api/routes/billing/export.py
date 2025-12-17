"""Billing Export - Process billing, download Excel files."""

import logging
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, HTTPException, Header, Query
from fastapi.responses import Response

from ....core.supabase import get_supabase_client
from ....models.billing import (
    BillingProcessRequest,
    BillingProcessResponse,
    BillingSummary,
    ExportHistoryItem,
    ExportHistoryDetail,
    ExportHistoryResponse,
)
from ....services.excel_generator import generate_world_office_excel

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/history", response_model=ExportHistoryResponse)
async def get_export_history(
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=500),
):
    """Get paginated export history."""
    logger.info(f"Fetching export history: page={page}, limit={limit}")

    supabase = get_supabase_client()
    offset = (page - 1) * limit

    result = (
        supabase.table("export_history")
        .select(
            "id, export_date, invoice_number_start, invoice_number_end, "
            "total_orders, total_amount, file_name, created_by, created_at, "
            "created_by_user:users!created_by(id, name)",
            count="exact"
        )
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    total_count = result.count if result.count is not None else 0

    exports = []
    for export in result.data:
        created_by_user = export.get("created_by_user") or {}
        exports.append(ExportHistoryItem(
            id=export["id"],
            export_date=export.get("export_date"),
            invoice_number_start=export.get("invoice_number_start"),
            invoice_number_end=export.get("invoice_number_end"),
            total_orders=export.get("total_orders"),
            total_amount=export.get("total_amount"),
            file_name=export.get("file_name"),
            created_by=export.get("created_by"),
            created_by_name=created_by_user.get("name"),
            created_at=export.get("created_at"),
        ))

    return ExportHistoryResponse(
        exports=exports,
        total_count=total_count,
        page=page,
        limit=limit,
    )


@router.get("/history/{export_id}", response_model=ExportHistoryDetail)
async def get_export_detail(export_id: str):
    """Get detailed export history including order invoices."""
    logger.info(f"Fetching export detail: {export_id}")

    supabase = get_supabase_client()

    result = (
        supabase.table("export_history")
        .select(
            "*, "
            "created_by_user:users!created_by(id, name)"
        )
        .eq("id", export_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Export not found")

    export = result.data
    created_by_user = export.get("created_by_user") or {}

    # Parse routes exported from JSON if stored as string
    routes_exported = export.get("routes_exported") or []
    if isinstance(routes_exported, str):
        import json
        try:
            routes_exported = json.loads(routes_exported)
        except:
            routes_exported = []

    route_names = export.get("route_names") or []
    if isinstance(route_names, str):
        import json
        try:
            route_names = json.loads(route_names)
        except:
            route_names = []

    export_summary = export.get("export_summary") or {}
    if isinstance(export_summary, str):
        import json
        try:
            export_summary = json.loads(export_summary)
        except:
            export_summary = {}

    # Get order invoices for this export
    order_invoices_result = (
        supabase.table("order_invoices")
        .select(
            "id, order_id, invoice_number, export_history_id, "
            "orders(id, order_number, client_id, total_value, "
            "clients(id, name, nit))"
        )
        .eq("export_history_id", export_id)
        .execute()
    )

    order_invoices = []
    for invoice in order_invoices_result.data:
        order = invoice.get("orders") or {}
        client = order.get("clients") or {}
        order_invoices.append({
            "id": invoice["id"],
            "order_id": invoice["order_id"],
            "invoice_number": invoice.get("invoice_number"),
            "order_number": order.get("order_number"),
            "client_name": client.get("name"),
            "client_nit": client.get("nit"),
            "total_value": order.get("total_value"),
        })

    return ExportHistoryDetail(
        id=export["id"],
        export_date=export.get("export_date"),
        invoice_number_start=export.get("invoice_number_start"),
        invoice_number_end=export.get("invoice_number_end"),
        total_orders=export.get("total_orders"),
        total_amount=export.get("total_amount"),
        file_name=export.get("file_name"),
        routes_exported=routes_exported,
        route_names=route_names,
        export_summary=export_summary,
        created_by=export.get("created_by"),
        created_by_name=created_by_user.get("name"),
        created_at=export.get("created_at"),
        order_invoices=order_invoices,
    )


@router.get("/history/{export_id}/download")
async def download_export_file(export_id: str):
    """Download the Excel file for an export."""
    logger.info(f"Downloading export file: {export_id}")

    supabase = get_supabase_client()

    result = (
        supabase.table("export_history")
        .select("file_name, file_data")
        .eq("id", export_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Export not found")

    file_data = result.data.get("file_data")
    file_name = result.data.get("file_name") or f"export_{export_id}.xlsx"

    if not file_data:
        raise HTTPException(status_code=404, detail="File data not found")

    # Decode file data (could be hex, base64, or bytes)
    try:
        if isinstance(file_data, str):
            # Check if it's hex encoded (starts with \\x)
            if file_data.startswith("\\x"):
                # Remove \\x prefix and decode hex
                hex_str = file_data[2:].replace("\\x", "")
                file_bytes = bytes.fromhex(hex_str)
            elif file_data.startswith("0x"):
                # Alternative hex format
                hex_str = file_data[2:]
                file_bytes = bytes.fromhex(hex_str)
            else:
                # Try base64
                import base64
                file_bytes = base64.b64decode(file_data)
        elif isinstance(file_data, bytes):
            file_bytes = file_data
        elif isinstance(file_data, dict) and "data" in file_data:
            # Supabase might return {type: "Buffer", data: [...]}
            file_bytes = bytes(file_data["data"])
        else:
            raise HTTPException(status_code=500, detail="Unknown file format")

    except Exception as e:
        logger.error(f"Error decoding file data: {e}")
        raise HTTPException(status_code=500, detail=f"Error decoding file: {str(e)}")

    return Response(
        content=file_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{file_name}"'
        }
    )


@router.post("/process", response_model=BillingProcessResponse)
async def process_billing(
    request: BillingProcessRequest,
    authorization: Optional[str] = Header(None),
):
    """
    Process billing for selected orders.

    This is the main billing action that:
    1. Validates orders are ready for billing
    2. Separates into direct billing vs remision
    3. Generates World Office Excel for direct billing
    4. Creates remisions for remision-type orders
    5. Marks orders as invoiced
    6. Creates export history record

    Returns summary and file information.
    """
    logger.info(f"Processing billing for {len(request.order_ids)} orders")

    supabase = get_supabase_client()
    errors: List[str] = []

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
        # 1. Fetch all selected orders with client info
        orders_result = (
            supabase.table("orders")
            .select(
                "id, order_number, expected_delivery_date, total_value, "
                "client_id, branch_id, requires_remision, is_invoiced, "
                "purchase_order_number, "
                "clients(id, name, razon_social, nit, billing_type, address, phone, email), "
                "branches(id, name, address, phone)"
            )
            .in_("id", request.order_ids)
            .eq("status", "ready_dispatch")
            .eq("is_invoiced", False)
            .execute()
        )

        if not orders_result.data:
            raise HTTPException(status_code=400, detail="No valid orders found for billing")

        valid_orders = orders_result.data
        logger.info(f"Found {len(valid_orders)} valid orders for billing")

        # 2. Get order items for all orders
        items_result = (
            supabase.table("order_items")
            .select(
                "id, order_id, product_id, quantity_requested, quantity_available, "
                "unit_price, lote, products(id, name)"
            )
            .in_("order_id", request.order_ids)
            .execute()
        )

        items_by_order = {}
        for item in items_result.data:
            order_id = item["order_id"]
            if order_id not in items_by_order:
                items_by_order[order_id] = []
            items_by_order[order_id].append(item)

        # 3. Separate orders by billing type
        direct_billing_orders = []
        remision_orders = []

        for order in valid_orders:
            client = order.get("clients") or {}
            requires_remision = order.get("requires_remision", False) or client.get("billing_type") == "remision"

            if requires_remision:
                remision_orders.append(order)
            else:
                direct_billing_orders.append(order)

        logger.info(f"Direct billing: {len(direct_billing_orders)}, Remision: {len(remision_orders)}")

        # 4. Get next invoice number for direct billing
        invoice_number_start = None
        invoice_number_end = None
        excel_file_name = None
        excel_file_bytes = None
        export_history_id = None

        if direct_billing_orders:
            # Get starting invoice number
            config_result = (
                supabase.table("system_config")
                .select("config_value")
                .eq("config_key", "invoice_last_number")
                .single()
                .execute()
            )

            current_invoice = 0
            if config_result.data:
                try:
                    current_invoice = int(config_result.data["config_value"])
                except:
                    current_invoice = 0

            invoice_number_start = current_invoice + 1
            invoice_number_end = current_invoice + len(direct_billing_orders)

            # Update last invoice number
            supabase.table("system_config").upsert(
                {
                    "config_key": "invoice_last_number",
                    "config_value": str(invoice_number_end),
                    "updated_at": datetime.now().isoformat(),
                },
                on_conflict="config_key"
            ).execute()

            # 5. Generate World Office Excel
            try:
                excel_data = generate_world_office_excel(
                    orders=direct_billing_orders,
                    items_by_order=items_by_order,
                    invoice_number_start=invoice_number_start,
                    supabase=supabase,
                )
                excel_file_bytes = excel_data["file_bytes"]
                excel_file_name = excel_data["file_name"]
            except Exception as e:
                logger.error(f"Error generating Excel: {e}")
                errors.append(f"Error generating Excel: {str(e)}")
                # Re-raise to prevent partial processing
                raise HTTPException(status_code=500, detail=f"Error generating Excel: {str(e)}")

            # 6. Create export history record (only if Excel was generated)
            if excel_file_name and excel_file_bytes:
                total_direct_amount = sum(o.get("total_value") or 0 for o in direct_billing_orders)

                export_result = (
                    supabase.table("export_history")
                    .insert({
                        "export_date": datetime.now().strftime("%Y-%m-%d"),
                        "invoice_number_start": invoice_number_start,
                        "invoice_number_end": invoice_number_end,
                        "total_orders": len(direct_billing_orders),
                        "total_amount": total_direct_amount,
                        "file_name": excel_file_name,
                        "file_data": excel_file_bytes.hex() if excel_file_bytes else None,
                        "created_by": user_id,
                    })
                    .execute()
                )

                if export_result.data:
                    export_history_id = export_result.data[0]["id"]

                    # Create order_invoices records
                    order_invoices = []
                    invoice_date = datetime.now().strftime("%Y-%m-%d")
                    for idx, order in enumerate(direct_billing_orders):
                        order_invoices.append({
                            "order_id": order["id"],
                            "invoice_number": invoice_number_start + idx,
                            "export_history_id": export_history_id,
                            "invoice_date": invoice_date,
                        })

                    if order_invoices:
                        supabase.table("order_invoices").insert(order_invoices).execute()

                # Mark direct billing orders as invoiced
                direct_order_ids = [o["id"] for o in direct_billing_orders]
                supabase.table("orders").update({
                    "is_invoiced": True,
                    "updated_at": datetime.now().isoformat(),
                }).in_("id", direct_order_ids).execute()

        # 7. Create remisions for remision-type orders
        remisions_created = 0
        if remision_orders:
            for order in remision_orders:
                try:
                    # Get next remision number
                    remision_config = (
                        supabase.table("system_config")
                        .select("config_value")
                        .eq("config_key", "remision_number_current")
                        .single()
                        .execute()
                    )

                    current_remision = 0
                    if remision_config.data:
                        try:
                            current_remision = int(remision_config.data["config_value"])
                        except:
                            current_remision = 0

                    next_remision = current_remision + 1
                    remision_number = str(next_remision).zfill(6)

                    # Update remision number
                    supabase.table("system_config").upsert(
                        {
                            "config_key": "remision_number_current",
                            "config_value": str(next_remision),
                            "updated_at": datetime.now().isoformat(),
                        },
                        on_conflict="config_key"
                    ).execute()

                    # Get order items
                    order_items = items_by_order.get(order["id"], [])
                    client = order.get("clients") or {}

                    # Calculate total
                    total_amount = sum(
                        (item.get("quantity_available") or item.get("quantity_requested") or 0)
                        * (item.get("unit_price") or 0)
                        for item in order_items
                    )

                    # Create remision
                    remision_result = (
                        supabase.table("remisions")
                        .insert({
                            "remision_number": remision_number,
                            "order_id": order["id"],
                            "total_amount": total_amount,
                            "client_data": {
                                "name": client.get("name"),
                                "razon_social": client.get("razon_social"),
                                "nit": client.get("nit"),
                                "address": client.get("address"),
                                "phone": client.get("phone"),
                                "email": client.get("email"),
                            },
                            "notes": f"Remision generada automáticamente - Pedido {order.get('order_number')}",
                            "created_by": user_id,
                        })
                        .execute()
                    )

                    if remision_result.data:
                        remision_id = remision_result.data[0]["id"]

                        # Create remision items
                        remision_items = []
                        for item in order_items:
                            product = item.get("products") or {}
                            remision_items.append({
                                "remision_id": remision_id,
                                "product_id": item["product_id"],
                                "quantity_delivered": item.get("quantity_available") or item.get("quantity_requested"),
                                "unit_price": item.get("unit_price"),
                                "total_price": (item.get("quantity_available") or item.get("quantity_requested") or 0) * (item.get("unit_price") or 0),
                                "units_per_package": product.get("units_per_package"),
                            })

                        if remision_items:
                            supabase.table("remision_items").insert(remision_items).execute()

                        remisions_created += 1

                except Exception as e:
                    logger.error(f"Error creating remision for order {order.get('order_number')}: {e}")
                    errors.append(f"Error creating remision for order {order.get('order_number')}: {str(e)}")

        # 8. Build response
        total_direct = sum(o.get("total_value") or 0 for o in direct_billing_orders)
        total_remision = sum(o.get("total_value") or 0 for o in remision_orders)

        summary = BillingSummary(
            total_orders=len(valid_orders),
            direct_billing_count=len(direct_billing_orders),
            remision_count=len(remision_orders),
            total_direct_billing_amount=total_direct,
            total_remision_amount=total_remision,
            total_amount=total_direct + total_remision,
            order_numbers=[o.get("order_number") for o in valid_orders if o.get("order_number")],
        )

        return BillingProcessResponse(
            success=len(errors) == 0,
            summary=summary,
            invoice_number_start=invoice_number_start,
            invoice_number_end=invoice_number_end,
            export_history_id=export_history_id,
            remisions_created=remisions_created,
            excel_file_name=excel_file_name,
            errors=errors,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing billing: {e}")
        raise HTTPException(status_code=500, detail=str(e))
