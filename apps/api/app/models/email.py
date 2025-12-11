"""Pydantic models for email and webhook handling."""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class EmailAddress(BaseModel):
    """Email address with name."""
    address: str
    name: Optional[str] = None


class EmailFrom(BaseModel):
    """Email sender info."""
    emailAddress: EmailAddress


class EmailAttachment(BaseModel):
    """Email attachment metadata."""
    id: str
    name: str
    contentType: str
    size: int
    isInline: bool = False


class EmailMessage(BaseModel):
    """Outlook email message."""
    id: str
    subject: str
    from_address: str = Field(alias="from")
    bodyPreview: str = ""
    receivedDateTime: datetime
    hasAttachments: bool = False

    class Config:
        populate_by_name = True

    @classmethod
    def from_graph_response(cls, data: dict) -> "EmailMessage":
        """Create EmailMessage from Microsoft Graph API response."""
        from_email = ""
        if "from" in data and "emailAddress" in data["from"]:
            from_email = data["from"]["emailAddress"].get("address", "")

        return cls(
            id=data["id"],
            subject=data.get("subject", ""),
            from_address=from_email,
            bodyPreview=data.get("bodyPreview", ""),
            receivedDateTime=data.get("receivedDateTime", datetime.now().isoformat()),
            hasAttachments=data.get("hasAttachments", False),
        )


class ResourceData(BaseModel):
    """Resource data from webhook notification."""
    odata_type: Optional[str] = Field(None, alias="@odata.type")
    odata_id: Optional[str] = Field(None, alias="@odata.id")
    odata_etag: Optional[str] = Field(None, alias="@odata.etag")
    id: str

    class Config:
        populate_by_name = True


class GraphNotification(BaseModel):
    """Single notification from Microsoft Graph webhook."""
    subscriptionId: str
    subscriptionExpirationDateTime: Optional[str] = None
    changeType: str
    resource: str
    resourceData: Optional[ResourceData] = None
    clientState: Optional[str] = None
    tenantId: Optional[str] = None


class WebhookNotification(BaseModel):
    """Microsoft Graph webhook notification payload."""
    value: List[GraphNotification] = []


class WebhookValidationRequest(BaseModel):
    """Webhook validation request from Microsoft Graph."""
    validationToken: str


class SubscriptionResponse(BaseModel):
    """Response from creating/renewing a subscription."""
    id: str
    resource: str
    changeType: str
    notificationUrl: str
    expirationDateTime: str
    clientState: Optional[str] = None
