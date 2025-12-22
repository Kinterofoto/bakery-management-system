"""Route and dispatch models for FastAPI."""

from datetime import date, datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field


class RouteStatus(str, Enum):
    """Route status values."""
    planned = "planned"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


# ---------------------------------------------------------------------------
# Route Models
# ---------------------------------------------------------------------------

class RouteCreate(BaseModel):
    """Model for creating a new route."""
    route_name: str = Field(..., min_length=1)
    route_date: date
    driver_id: Optional[str] = None
    vehicle_id: Optional[str] = None


class RouteUpdate(BaseModel):
    """Model for updating a route."""
    driver_id: Optional[str] = None
    vehicle_id: Optional[str] = None
    status: Optional[RouteStatus] = None


class RouteOrderInfo(BaseModel):
    """Order info within a route."""
    id: str
    order_id: str
    delivery_sequence: int
    order_number: Optional[str] = None
    client_name: Optional[str] = None
    branch_name: Optional[str] = None
    expected_delivery_date: Optional[str] = None
    status: Optional[str] = None
    items_count: Optional[int] = None


class RouteListItem(BaseModel):
    """Route item for list views."""
    id: str
    route_number: Optional[int] = None
    route_name: str
    route_date: date
    status: RouteStatus
    driver_id: Optional[str] = None
    driver_name: Optional[str] = None
    vehicle_id: Optional[str] = None
    vehicle_code: Optional[str] = None
    orders_count: int = 0
    created_at: Optional[datetime] = None


class RouteDetail(RouteListItem):
    """Detailed route with orders."""
    route_orders: List[RouteOrderInfo] = []


class RouteListResponse(BaseModel):
    """Paginated route list response."""
    routes: List[RouteListItem]
    total: int
    page: int
    limit: int
    total_pages: int


# ---------------------------------------------------------------------------
# Route Orders Models
# ---------------------------------------------------------------------------

class AssignOrdersRequest(BaseModel):
    """Request to assign orders to a route."""
    order_ids: List[str] = Field(..., min_items=1)


class ReorderSequenceItem(BaseModel):
    """Single item for reordering."""
    route_order_id: str
    new_sequence: int


class ReorderSequenceRequest(BaseModel):
    """Request to reorder delivery sequence."""
    items: List[ReorderSequenceItem] = Field(..., min_items=1)


# ---------------------------------------------------------------------------
# Dispatch Models
# ---------------------------------------------------------------------------

class DispatchOrderRequest(BaseModel):
    """Request to dispatch an order."""
    route_id: Optional[str] = None
    create_inventory_movements: bool = True


class DispatchOrderResponse(BaseModel):
    """Response after dispatching an order."""
    success: bool
    order_id: str
    new_status: str
    inventory_movements_created: bool = False
    inventory_errors: Optional[List[str]] = None
    message: str


class DispatchConfig(BaseModel):
    """Dispatch configuration."""
    default_dispatch_location_id: Optional[str] = None


class DispatchStats(BaseModel):
    """Dispatch dashboard stats."""
    active_routes: int
    dispatched_today: int
    unassigned_orders: int
    ready_for_dispatch: int


# ---------------------------------------------------------------------------
# Vehicle and Driver Models
# ---------------------------------------------------------------------------

class VehicleItem(BaseModel):
    """Vehicle for list views."""
    id: str
    vehicle_code: str
    plate_number: Optional[str] = None
    capacity: Optional[float] = None
    status: Optional[str] = None
    driver_id: Optional[str] = None


class DriverItem(BaseModel):
    """Driver (user with driver role) for list views."""
    id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
