"""Pydantic models for Production Cascade API."""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from enum import Enum


# === Enums ===

class CascadeStatus(str, Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ProcessingType(str, Enum):
    PARALLEL = "parallel"
    SEQUENTIAL = "sequential"


# === Request Models ===

class CreateCascadeRequest(BaseModel):
    """Request to create a cascaded production schedule."""
    work_center_id: str = Field(..., description="Source work center ID (typically Armado)")
    product_id: str = Field(..., description="Product ID to produce")
    start_datetime: datetime = Field(..., description="Start time for production")
    duration_hours: float = Field(..., ge=0.5, le=24, description="Duration in hours")
    staff_count: int = Field(default=1, ge=1, le=50, description="Number of staff available")
    week_plan_id: Optional[str] = Field(None, description="Optional weekly plan ID to associate")


class CascadePreviewRequest(BaseModel):
    """Request to preview cascade without creating schedules."""
    work_center_id: str
    product_id: str
    start_datetime: datetime
    duration_hours: float
    staff_count: int = 1


# === Response Models ===

class BatchInfo(BaseModel):
    """Information about a single batch in the cascade."""
    batch_number: int
    batch_size: float
    start_date: datetime
    end_date: datetime
    work_center_id: str
    work_center_name: str
    cascade_level: int
    processing_type: ProcessingType
    duration_minutes: float


class WorkCenterSchedule(BaseModel):
    """Schedules grouped by work center."""
    work_center_id: str
    work_center_name: str
    cascade_level: int
    processing_type: ProcessingType
    batches: List[BatchInfo]
    total_duration_minutes: float
    earliest_start: datetime
    latest_end: datetime


class CascadeScheduleResponse(BaseModel):
    """Response from cascade creation."""
    production_order_number: int
    product_id: str
    product_name: str
    total_units: float
    lote_minimo: float
    num_batches: int
    schedules_created: int
    work_centers: List[WorkCenterSchedule]
    cascade_start: datetime
    cascade_end: datetime


class CascadePreviewResponse(BaseModel):
    """Preview response without creating schedules."""
    product_id: str
    product_name: str
    total_units: float
    lote_minimo: float
    num_batches: int
    work_centers: List[WorkCenterSchedule]
    cascade_start: datetime
    cascade_end: datetime
    warnings: List[str] = []


class ProductionOrderDetail(BaseModel):
    """Detail view of a production order with all schedules."""
    production_order_number: int
    product_id: str
    product_name: Optional[str] = None
    total_units: float
    num_batches: int
    status: str
    schedules: List[dict]  # Raw schedule data from DB
    created_at: Optional[datetime] = None


class DeleteCascadeResponse(BaseModel):
    """Response from deleting a cascade order."""
    production_order_number: int
    deleted_count: int
    message: str


# === Validation Models ===

class ProductivityInfo(BaseModel):
    """Productivity information for a product at a work center."""
    product_id: str
    work_center_id: str
    units_per_hour: float
    usa_tiempo_fijo: bool = False
    tiempo_minimo_fijo: Optional[float] = None
    tiempo_labor_por_carro: Optional[float] = None


class WorkCenterInfo(BaseModel):
    """Work center information for cascade processing."""
    id: str
    name: str
    code: Optional[str] = None
    operation_id: Optional[str] = None
    capacidad_maxima_carros: Optional[int] = None
    tipo_capacidad: Optional[str] = None
    is_parallel: bool = False


class ProductRouteStep(BaseModel):
    """A step in the product's production route."""
    sequence_order: int
    work_center: WorkCenterInfo
    productivity: Optional[ProductivityInfo] = None
    rest_time_hours: float = 0
