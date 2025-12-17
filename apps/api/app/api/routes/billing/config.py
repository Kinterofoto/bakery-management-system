"""Billing Configuration - Invoice numbers, World Office config."""

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Header
from datetime import datetime

from ....core.supabase import get_supabase_client
from ....models.billing import (
    InvoiceNumberResponse,
    NextInvoiceNumberResponse,
    WorldOfficeConfig,
    WorldOfficeConfigUpdate,
    BillingStats,
    RemisionStats,
    MonthlyStatsResponse,
    MonthlyStatItem,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/config")


# === Invoice Numbers ===

@router.get("/invoice-number", response_model=InvoiceNumberResponse)
async def get_last_invoice_number():
    """Get the last used invoice number from system_config."""
    logger.info("Fetching last invoice number")

    supabase = get_supabase_client()

    result = (
        supabase.table("system_config")
        .select("value")
        .eq("key", "last_invoice_number")
        .single()
        .execute()
    )

    if not result.data:
        # Return default if not configured
        return InvoiceNumberResponse(last_number=0)

    try:
        last_number = int(result.data["value"])
    except (ValueError, TypeError):
        last_number = 0

    return InvoiceNumberResponse(last_number=last_number)


@router.post("/invoice-number/next", response_model=NextInvoiceNumberResponse)
async def get_next_invoice_number():
    """
    Reserve and return the next invoice number.

    This atomically increments the last_invoice_number and returns the new value.
    Used when starting a billing process to ensure unique invoice numbers.
    """
    logger.info("Getting next invoice number")

    supabase = get_supabase_client()

    try:
        # Get current value
        result = (
            supabase.table("system_config")
            .select("value")
            .eq("key", "last_invoice_number")
            .single()
            .execute()
        )

        current_number = 0
        if result.data:
            try:
                current_number = int(result.data["value"])
            except (ValueError, TypeError):
                current_number = 0

        next_number = current_number + 1

        # Update the value
        supabase.table("system_config").upsert({
            "key": "last_invoice_number",
            "value": str(next_number),
            "updated_at": datetime.now().isoformat(),
        }).execute()

        logger.info(f"Reserved invoice number: {next_number}")

        return NextInvoiceNumberResponse(next_number=next_number)

    except Exception as e:
        logger.error(f"Error getting next invoice number: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/invoice-number/set")
async def set_invoice_number(
    invoice_number: int,
    authorization: Optional[str] = Header(None),
):
    """
    Set the last invoice number manually.

    Used for initial setup or corrections.
    """
    logger.info(f"Setting invoice number to: {invoice_number}")

    supabase = get_supabase_client()

    try:
        supabase.table("system_config").upsert({
            "key": "last_invoice_number",
            "value": str(invoice_number),
            "updated_at": datetime.now().isoformat(),
        }).execute()

        return {"success": True, "invoice_number": invoice_number}

    except Exception as e:
        logger.error(f"Error setting invoice number: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# === World Office Configuration ===

@router.get("/world-office", response_model=WorldOfficeConfig)
async def get_world_office_config():
    """Get World Office export configuration."""
    logger.info("Fetching World Office config")

    supabase = get_supabase_client()

    # Get all world office config keys
    config_keys = [
        "wo_company_name",
        "wo_third_party_internal",
        "wo_third_party_external",
        "wo_document_type",
        "wo_document_prefix",
        "wo_payment_method",
        "wo_warehouse",
        "wo_unit_measure",
        "wo_iva_rate",
    ]

    result = (
        supabase.table("system_config")
        .select("key, value")
        .in_("key", config_keys)
        .execute()
    )

    config = {}
    for item in result.data:
        key = item["key"].replace("wo_", "")
        config[key] = item["value"]

    return WorldOfficeConfig(
        company_name=config.get("company_name"),
        third_party_internal=config.get("third_party_internal"),
        third_party_external=config.get("third_party_external"),
        document_type=config.get("document_type"),
        document_prefix=config.get("document_prefix"),
        payment_method=config.get("payment_method"),
        warehouse=config.get("warehouse"),
        unit_measure=config.get("unit_measure"),
        iva_rate=float(config["iva_rate"]) if config.get("iva_rate") else None,
    )


@router.patch("/world-office", response_model=WorldOfficeConfig)
async def update_world_office_config(config_update: WorldOfficeConfigUpdate):
    """Update World Office export configuration."""
    logger.info("Updating World Office config")

    supabase = get_supabase_client()

    try:
        # Build updates
        updates = []
        if config_update.company_name is not None:
            updates.append({"key": "wo_company_name", "value": config_update.company_name})
        if config_update.third_party_internal is not None:
            updates.append({"key": "wo_third_party_internal", "value": config_update.third_party_internal})
        if config_update.third_party_external is not None:
            updates.append({"key": "wo_third_party_external", "value": config_update.third_party_external})
        if config_update.document_type is not None:
            updates.append({"key": "wo_document_type", "value": config_update.document_type})
        if config_update.document_prefix is not None:
            updates.append({"key": "wo_document_prefix", "value": config_update.document_prefix})
        if config_update.payment_method is not None:
            updates.append({"key": "wo_payment_method", "value": config_update.payment_method})
        if config_update.warehouse is not None:
            updates.append({"key": "wo_warehouse", "value": config_update.warehouse})
        if config_update.unit_measure is not None:
            updates.append({"key": "wo_unit_measure", "value": config_update.unit_measure})
        if config_update.iva_rate is not None:
            updates.append({"key": "wo_iva_rate", "value": str(config_update.iva_rate)})

        # Upsert all updates
        for update in updates:
            update["updated_at"] = datetime.now().isoformat()
            supabase.table("system_config").upsert(update).execute()

        # Return updated config
        return await get_world_office_config()

    except Exception as e:
        logger.error(f"Error updating World Office config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# === Statistics ===

@router.get("/stats/billing", response_model=BillingStats)
async def get_billing_stats():
    """Get general billing statistics."""
    logger.info("Fetching billing stats")

    supabase = get_supabase_client()

    # Get export history stats
    exports_result = (
        supabase.table("export_history")
        .select("id, total_orders, total_amount, invoice_number_end")
        .execute()
    )

    total_exports = len(exports_result.data)
    total_orders = sum(e.get("total_orders") or 0 for e in exports_result.data)
    total_amount = sum(e.get("total_amount") or 0 for e in exports_result.data)
    latest_invoice = max((e.get("invoice_number_end") or 0 for e in exports_result.data), default=0)

    avg_orders = total_orders / total_exports if total_exports > 0 else 0

    return BillingStats(
        total_exports=total_exports,
        total_orders_invoiced=total_orders,
        total_amount=total_amount,
        avg_orders_per_export=round(avg_orders, 1),
        latest_invoice_number=latest_invoice,
    )


@router.get("/stats/remisions", response_model=RemisionStats)
async def get_remision_stats():
    """Get remision statistics."""
    logger.info("Fetching remision stats")

    supabase = get_supabase_client()

    # Get all remisions
    remisions_result = (
        supabase.table("remisions")
        .select("id, total_amount, order_id")
        .execute()
    )

    total_remisions = len(remisions_result.data)
    total_amount = sum(r.get("total_amount") or 0 for r in remisions_result.data)
    avg_amount = total_amount / total_remisions if total_remisions > 0 else 0

    # Get order IDs to check invoiced status
    order_ids = [r["order_id"] for r in remisions_result.data if r.get("order_id")]

    invoiced_count = 0
    if order_ids:
        invoiced_result = (
            supabase.table("orders")
            .select("id")
            .in_("id", order_ids)
            .eq("is_invoiced_from_remision", True)
            .execute()
        )
        invoiced_count = len(invoiced_result.data)

    pending_count = total_remisions - invoiced_count

    return RemisionStats(
        total_remisions=total_remisions,
        pending_remisions=pending_count,
        invoiced_remisions=invoiced_count,
        total_remision_amount=total_amount,
        avg_remision_amount=round(avg_amount, 2),
    )


@router.get("/stats/monthly", response_model=MonthlyStatsResponse)
async def get_monthly_stats(year: Optional[int] = None):
    """Get monthly billing statistics for a given year."""
    if year is None:
        year = datetime.now().year

    logger.info(f"Fetching monthly stats for year: {year}")

    supabase = get_supabase_client()

    # Get exports for the year
    start_date = f"{year}-01-01"
    end_date = f"{year}-12-31"

    exports_result = (
        supabase.table("export_history")
        .select("id, export_date, total_orders, total_amount")
        .gte("export_date", start_date)
        .lte("export_date", end_date)
        .execute()
    )

    # Group by month
    monthly_data = {i: {"exports": 0, "orders": 0, "amount": 0} for i in range(1, 13)}

    for export in exports_result.data:
        if export.get("export_date"):
            month = int(export["export_date"].split("-")[1])
            monthly_data[month]["exports"] += 1
            monthly_data[month]["orders"] += export.get("total_orders") or 0
            monthly_data[month]["amount"] += export.get("total_amount") or 0

    month_names = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ]

    stats = [
        MonthlyStatItem(
            month=month,
            month_name=month_names[month - 1],
            exports=data["exports"],
            orders=data["orders"],
            amount=data["amount"],
        )
        for month, data in monthly_data.items()
    ]

    return MonthlyStatsResponse(year=year, stats=stats)
