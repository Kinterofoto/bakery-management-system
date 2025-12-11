from .email import (
    EmailMessage,
    EmailAttachment,
    WebhookNotification,
    WebhookValidationRequest,
    GraphNotification,
)
from .purchase_order import (
    ProductoExtraido,
    ExtractionResult,
    PurchaseOrderCreate,
    ClassificationResult,
)

__all__ = [
    "EmailMessage",
    "EmailAttachment",
    "WebhookNotification",
    "WebhookValidationRequest",
    "GraphNotification",
    "ProductoExtraido",
    "ExtractionResult",
    "PurchaseOrderCreate",
    "ClassificationResult",
]
