"""Pydantic models for Orders API - Enterprise-ready."""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# === Enums ===

class OrderStatus(str, Enum):
    RECEIVED = "received"
    REVIEW_AREA1 = "review_area1"
    REVIEW_AREA2 = "review_area2"
    READY_DISPATCH = "ready_dispatch"
    DISPATCHED = "dispatched"
    IN_DELIVERY = "in_delivery"
    DELIVERED = "delivered"
    PARTIALLY_DELIVERED = "partially_delivered"
    RETURNED = "returned"
    CANCELLED = "cancelled"


class AvailabilityStatus(str, Enum):
    PENDING = "pending"
    AVAILABLE = "available"
    PARTIAL = "partial"
    UNAVAILABLE = "unavailable"


class EventType(str, Enum):
    CREATED = "created"
    STATUS_CHANGE = "status_change"
    ITEM_ADDED = "item_added"
    ITEM_UPDATED = "item_updated"
    ITEM_REMOVED = "item_removed"
    CANCELLED = "cancelled"
    ASSIGNED_ROUTE = "assigned_route"
    INVOICED = "invoiced"


# === List/Response Models ===

class OrderListItem(BaseModel):
    """Order item for list view - minimal fields for performance."""
    id: str
    order_number: Optional[str] = None
    expected_delivery_date: Optional[str] = None
    requested_delivery_date: Optional[str] = None  # Original date requested by client
    status: str
    total: Optional[float] = None
    client_id: Optional[str] = None
    client_name: Optional[str] = None
    branch_id: Optional[str] = None
    branch_name: Optional[str] = None
    items_count: int = 0
    created_at: Optional[str] = None
    has_pending_missing: bool = False
    # Source identification
    source: Optional[str] = None  # "woocommerce", "outlook", "whatsapp", or user name
    # Delivery metrics (only relevant for delivered/partially_delivered orders)
    delivery_percentage: Optional[int] = None


class OrderListResponse(BaseModel):
    """Paginated list response."""
    orders: List[OrderListItem]
    total_count: int
    page: int
    limit: int
    has_more: bool


class OrderBatchRequest(BaseModel):
    """Request for batch order details."""
    order_ids: List[str] = Field(min_length=1, max_length=100)


class OrderStats(BaseModel):
    """Order statistics for dashboard badges."""
    today: int = 0
    tomorrow: int = 0
    this_week: int = 0
    by_status: Dict[str, int] = {}
    total: int = 0


# === Detail Models ===

class OrderItemDetail(BaseModel):
    """Order item with product details."""
    id: str
    product_id: str
    product_name: Optional[str] = None
    product_code: Optional[str] = None
    quantity_requested: Optional[int] = None
    quantity_available: Optional[int] = None
    quantity_missing: Optional[int] = None
    quantity_dispatched: Optional[int] = None
    quantity_delivered: Optional[int] = None
    quantity_returned: Optional[int] = None
    unit_price: Optional[float] = None
    subtotal: Optional[float] = None
    availability_status: Optional[str] = None
    lote: Optional[str] = None


class OrderDetail(BaseModel):
    """Full order details for edit view."""
    id: str
    order_number: Optional[str] = None
    expected_delivery_date: Optional[str] = None
    requested_delivery_date: Optional[str] = None
    status: str
    total: Optional[float] = None
    subtotal: Optional[float] = None
    vat_amount: Optional[float] = None
    observations: Optional[str] = None
    purchase_order_number: Optional[str] = None
    has_pending_missing: bool = False
    is_invoiced: bool = False
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    pdf_filename: Optional[str] = None  # PDF attachment

    # Related data - Client
    client_id: Optional[str] = None
    client_name: Optional[str] = None

    # Related data - Branch (full contact info)
    branch_id: Optional[str] = None
    branch_name: Optional[str] = None
    branch_address: Optional[str] = None
    branch_phone: Optional[str] = None
    branch_email: Optional[str] = None
    branch_contact_person: Optional[str] = None

    # Related data - User
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None

    # Order items
    items: List[OrderItemDetail] = []


# === Create/Update Models ===

class OrderItemCreate(BaseModel):
    """Model for creating an order item."""
    product_id: str
    quantity_requested: int = Field(gt=0)
    unit_price: float = Field(ge=0)


class OrderCreate(BaseModel):
    """Model for creating a new order."""
    client_id: str
    branch_id: Optional[str] = None
    expected_delivery_date: str
    purchase_order_number: Optional[str] = None
    observations: Optional[str] = None
    items: List[OrderItemCreate] = Field(min_length=1)


class OrderCreateResponse(BaseModel):
    """Response after creating an order."""
    id: str
    order_number: str
    status: str
    message: str = "Order created successfully"


class OrderUpdate(BaseModel):
    """Only editable fields - NOT full order update."""
    expected_delivery_date: Optional[str] = None
    observations: Optional[str] = None
    purchase_order_number: Optional[str] = None
    # NO: client_id, status, total_value (controlled fields)


class OrderItemFullUpdate(BaseModel):
    """Item for full order update - may have id (existing) or not (new)."""
    id: Optional[str] = None  # None = new item
    product_id: str
    quantity_requested: int = Field(gt=0)
    unit_price: float = Field(ge=0)


class OrderFullUpdate(BaseModel):
    """Full order update including items - for modal edit."""
    client_id: Optional[str] = None
    branch_id: Optional[str] = None
    expected_delivery_date: Optional[str] = None
    purchase_order_number: Optional[str] = None
    observations: Optional[str] = None
    items: List[OrderItemFullUpdate] = Field(min_length=1)


class OrderFullUpdateResponse(BaseModel):
    """Response after full order update."""
    success: bool
    order_id: str
    total_value: float
    items_created: int = 0
    items_updated: int = 0
    items_deleted: int = 0
    message: str = "Order updated successfully"


# === Items Update Models ===

class OrderItemUpdate(BaseModel):
    """Single item update."""
    item_id: str
    quantity_available: Optional[int] = None
    availability_status: Optional[str] = None
    lote: Optional[str] = None
    quantity_dispatched: Optional[int] = None
    quantity_delivered: Optional[int] = None


class OrderItemBatchUpdate(BaseModel):
    """Batch update for multiple items - single request."""
    updates: List[OrderItemUpdate] = Field(min_length=1)


class OrderItemAddRequest(BaseModel):
    """Add new item to existing order."""
    product_id: str
    quantity_requested: int = Field(gt=0)
    unit_price: float = Field(ge=0)


# === Workflow Models ===

class OrderTransition(BaseModel):
    """Status transition with validation."""
    new_status: str
    notes: Optional[str] = None


class OrderCancel(BaseModel):
    """Cancel order request."""
    reason: str = Field(min_length=1)
    notes: Optional[str] = None


class OrderPendingMissing(BaseModel):
    """Mark/unmark pending missing flag."""
    has_pending_missing: bool


# === Event/Audit Models ===

class OrderEvent(BaseModel):
    """Audit event record."""
    id: str
    order_id: str
    event_type: str
    payload: Dict[str, Any] = {}
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: str


class OrderEventsResponse(BaseModel):
    """List of order events."""
    events: List[OrderEvent]
    total_count: int


# === State Machine ===

ALLOWED_TRANSITIONS: Dict[str, List[str]] = {
    "received": ["review_area1", "cancelled"],
    "review_area1": ["review_area2", "cancelled"],
    "review_area2": ["ready_dispatch", "cancelled"],
    "ready_dispatch": ["dispatched", "cancelled"],
    "dispatched": ["in_delivery"],
    "in_delivery": ["delivered", "partially_delivered", "returned"],
    "delivered": [],
    "partially_delivered": [],
    "returned": [],
    "cancelled": [],
}


def validate_transition(current_status: str, new_status: str) -> bool:
    """Check if status transition is allowed."""
    allowed = ALLOWED_TRANSITIONS.get(current_status, [])
    return new_status in allowed


def get_allowed_transitions(current_status: str) -> List[str]:
    """Get list of allowed next statuses."""
    return ALLOWED_TRANSITIONS.get(current_status, [])
