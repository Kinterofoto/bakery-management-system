"""Pydantic models for Billing API - Enterprise-ready."""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# === Enums ===

class BillingType(str, Enum):
    """Client billing type."""
    FACTURABLE = "facturable"
    REMISION = "remision"


# === Pending Orders (Tab: Pendientes) ===

class PendingOrderItem(BaseModel):
    """Order item in pending orders list."""
    id: str
    product_id: str
    product_name: Optional[str] = None
    product_code: Optional[str] = None
    quantity_requested: Optional[int] = None
    quantity_available: Optional[int] = None
    unit_price: Optional[float] = None
    subtotal: Optional[float] = None


class PendingOrder(BaseModel):
    """Order ready for billing (status=ready_dispatch, is_invoiced=false, no remision)."""
    id: str
    order_number: Optional[str] = None
    expected_delivery_date: Optional[str] = None
    total_value: Optional[float] = None
    status: str = "ready_dispatch"
    requires_remision: Optional[bool] = None

    # Client info
    client_id: Optional[str] = None
    client_name: Optional[str] = None
    client_razon_social: Optional[str] = None
    client_nit: Optional[str] = None
    client_billing_type: Optional[str] = None

    # Branch info
    branch_id: Optional[str] = None
    branch_name: Optional[str] = None

    # Items
    items: List[PendingOrderItem] = []
    items_count: int = 0

    created_at: Optional[str] = None


class PendingOrdersResponse(BaseModel):
    """Paginated pending orders response."""
    orders: List[PendingOrder]
    total_count: int
    page: int = 1
    limit: int = 100


# === Unfactured Orders (Tab: No Facturados) ===

class UnfacturedOrder(BaseModel):
    """Order with remision but not invoiced yet (is_invoiced_from_remision=false)."""
    id: str
    order_id: str
    order_number: Optional[str] = None
    expected_delivery_date: Optional[str] = None
    total_value: Optional[float] = None

    # Client info
    client_name: Optional[str] = None
    client_nit: Optional[str] = None

    # Branch info
    branch_name: Optional[str] = None

    # Remision info
    remision_id: str
    remision_number: Optional[str] = None
    remision_created_at: Optional[str] = None
    remision_total_amount: Optional[float] = None


class UnfacturedOrdersResponse(BaseModel):
    """List of unfactured orders (with remision but not invoiced)."""
    orders: List[UnfacturedOrder]
    total_count: int


class MarkInvoicedRequest(BaseModel):
    """Request to mark orders as invoiced from remision."""
    order_ids: List[str] = Field(min_length=1)


class MarkInvoicedResponse(BaseModel):
    """Response after marking orders as invoiced."""
    success: bool
    updated_count: int


# === Remisions (Tab: Remisiones) ===

class RemisionItemDetail(BaseModel):
    """Item in a remision."""
    id: str
    remision_id: str
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    product_unit: Optional[str] = None
    quantity_delivered: Optional[float] = None
    unit_price: Optional[float] = None
    total_price: Optional[float] = None
    units_per_package: Optional[int] = None


class RemisionListItem(BaseModel):
    """Remision for list view."""
    id: str
    remision_number: Optional[str] = None
    order_id: Optional[str] = None
    order_number: Optional[str] = None
    total_amount: Optional[float] = None

    # Client info (from client_data JSON or joined)
    client_name: Optional[str] = None
    client_nit: Optional[str] = None

    # Order info
    expected_delivery_date: Optional[str] = None
    branch_name: Optional[str] = None
    purchase_order_number: Optional[str] = None

    notes: Optional[str] = None
    created_at: Optional[str] = None
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None


class RemisionDetail(BaseModel):
    """Full remision details with items."""
    id: str
    remision_number: Optional[str] = None
    order_id: Optional[str] = None
    order_number: Optional[str] = None
    total_amount: Optional[float] = None

    # Client info
    client_name: Optional[str] = None
    client_razon_social: Optional[str] = None
    client_nit: Optional[str] = None
    client_phone: Optional[str] = None
    client_email: Optional[str] = None
    client_address: Optional[str] = None

    # Order info
    expected_delivery_date: Optional[str] = None
    branch_name: Optional[str] = None
    purchase_order_number: Optional[str] = None

    # Items
    items: List[RemisionItemDetail] = []

    notes: Optional[str] = None
    created_at: Optional[str] = None
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None


class RemisionsListResponse(BaseModel):
    """Paginated remisions response."""
    remisions: List[RemisionListItem]
    total_count: int
    page: int = 1
    limit: int = 100


# === Export History (Tab: Historial) ===

class ExportHistoryItem(BaseModel):
    """Export history item for list view."""
    id: str
    export_date: Optional[str] = None
    invoice_number_start: Optional[int] = None
    invoice_number_end: Optional[int] = None
    total_orders: Optional[int] = None
    total_amount: Optional[float] = None
    file_name: Optional[str] = None
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: Optional[str] = None


class ExportHistoryDetail(BaseModel):
    """Full export history details."""
    id: str
    export_date: Optional[str] = None
    invoice_number_start: Optional[int] = None
    invoice_number_end: Optional[int] = None
    total_orders: Optional[int] = None
    total_amount: Optional[float] = None
    file_name: Optional[str] = None
    routes_exported: List[str] = []
    route_names: List[str] = []
    export_summary: Dict[str, Any] = {}
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: Optional[str] = None

    # Order invoices
    order_invoices: List[Dict[str, Any]] = []


class ExportHistoryResponse(BaseModel):
    """Paginated export history response."""
    exports: List[ExportHistoryItem]
    total_count: int
    page: int = 1
    limit: int = 100


# === Billing Process (Main Action) ===

class BillingProcessRequest(BaseModel):
    """Request to process billing for selected orders."""
    order_ids: List[str] = Field(min_length=1, max_length=200)


class BillingSummary(BaseModel):
    """Summary of billing operation."""
    total_orders: int = 0
    direct_billing_count: int = 0
    remision_count: int = 0
    total_direct_billing_amount: float = 0.0
    total_remision_amount: float = 0.0
    total_amount: float = 0.0
    order_numbers: List[str] = []


class BillingProcessResponse(BaseModel):
    """Response after processing billing."""
    success: bool
    summary: BillingSummary
    invoice_number_start: Optional[int] = None
    invoice_number_end: Optional[int] = None
    export_history_id: Optional[str] = None
    remisions_created: int = 0
    excel_file_name: Optional[str] = None
    errors: List[str] = []


# === System Config ===

class InvoiceNumberResponse(BaseModel):
    """Current invoice number."""
    last_number: int


class NextInvoiceNumberResponse(BaseModel):
    """Next invoice number (reserved)."""
    next_number: int


class WorldOfficeConfig(BaseModel):
    """World Office export configuration."""
    company_name: Optional[str] = None
    third_party_internal: Optional[str] = None
    third_party_external: Optional[str] = None
    document_type: Optional[str] = None
    document_prefix: Optional[str] = None
    payment_method: Optional[str] = None
    warehouse: Optional[str] = None
    unit_measure: Optional[str] = None
    iva_rate: Optional[float] = None


class WorldOfficeConfigUpdate(BaseModel):
    """Update World Office configuration."""
    company_name: Optional[str] = None
    third_party_internal: Optional[str] = None
    third_party_external: Optional[str] = None
    document_type: Optional[str] = None
    document_prefix: Optional[str] = None
    payment_method: Optional[str] = None
    warehouse: Optional[str] = None
    unit_measure: Optional[str] = None
    iva_rate: Optional[float] = None


# === Statistics ===

class BillingStats(BaseModel):
    """General billing statistics."""
    total_exports: int = 0
    total_orders_invoiced: int = 0
    total_amount: float = 0.0
    avg_orders_per_export: float = 0.0
    latest_invoice_number: int = 0


class RemisionStats(BaseModel):
    """Remision statistics."""
    total_remisions: int = 0
    pending_remisions: int = 0
    invoiced_remisions: int = 0
    total_remision_amount: float = 0.0
    avg_remision_amount: float = 0.0


class MonthlyStatItem(BaseModel):
    """Monthly statistics item."""
    month: int
    month_name: str
    exports: int = 0
    orders: int = 0
    amount: float = 0.0


class MonthlyStatsResponse(BaseModel):
    """Monthly statistics response."""
    year: int
    stats: List[MonthlyStatItem]
