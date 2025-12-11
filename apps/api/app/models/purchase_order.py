"""Pydantic models for purchase order extraction."""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from enum import Enum


class ClassificationType(str, Enum):
    """Email classification types."""
    PURCHASE_ORDER = "Orden de compra"
    OTHER = "Otro"


class ClassificationResult(BaseModel):
    """Result of email classification."""
    classification: ClassificationType
    confidence: float = Field(ge=0, le=1)
    reason: Optional[str] = None


class ProductoExtraido(BaseModel):
    """Product extracted from purchase order PDF."""
    producto: str
    cantidad_solicitada: int = Field(gt=0)
    fecha_entrega: Optional[date] = None
    precio: Optional[float] = Field(None, ge=0)
    unidad: str = "unidades"


class ExtractionResult(BaseModel):
    """Result of PDF extraction."""
    cliente: str
    sucursal: Optional[str] = None
    oc_number: str
    direccion: Optional[str] = None
    productos: List[ProductoExtraido]
    raw_response: Optional[str] = None
    confidence_score: float = Field(default=0.9, ge=0, le=1)


class PurchaseOrderCreate(BaseModel):
    """Data to create a purchase order in the database."""
    email_id: str
    email_subject: str
    email_from: str
    email_body_preview: Optional[str] = None
    received_at: datetime
    pdf_url: str
    pdf_filename: str
    openai_file_id: Optional[str] = None
    cliente: str
    sucursal: Optional[str] = None
    oc_number: str
    direccion: Optional[str] = None
    status: str = "pending"
    processing_logs: List[dict] = []


class ProcessingResult(BaseModel):
    """Result of processing an email."""
    email_id: str
    success: bool
    classification: ClassificationType
    orders_created: int = 0
    error_message: Optional[str] = None
    processing_time_ms: int = 0
    details: Optional[dict] = None
