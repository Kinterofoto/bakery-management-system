"""Microsoft Graph API service for email operations."""

import logging
from functools import lru_cache
from typing import List, Optional
from datetime import datetime, timedelta

import httpx
from msal import ConfidentialClientApplication
from tenacity import retry, stop_after_attempt, wait_exponential

from ..core.config import get_settings
from ..models.email import EmailMessage, EmailAttachment, SubscriptionResponse

logger = logging.getLogger(__name__)

GRAPH_API_BASE = "https://graph.microsoft.com/v1.0"


class MicrosoftGraphService:
    """Service for Microsoft Graph API operations."""

    def __init__(
        self,
        client_id: str,
        client_secret: str,
        tenant_id: str,
        target_mailbox: str,
    ):
        self.client_id = client_id
        self.client_secret = client_secret
        self.tenant_id = tenant_id
        self.target_mailbox = target_mailbox
        self._access_token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None

        # Initialize MSAL client
        self.msal_app = ConfidentialClientApplication(
            client_id=client_id,
            client_credential=client_secret,
            authority=f"https://login.microsoftonline.com/{tenant_id}",
        )

    async def _get_access_token(self) -> str:
        """Get or refresh access token."""
        # Check if we have a valid cached token
        if (
            self._access_token
            and self._token_expires_at
            and datetime.now() < self._token_expires_at - timedelta(minutes=5)
        ):
            return self._access_token

        logger.info("Acquiring new access token from Azure AD")

        result = self.msal_app.acquire_token_for_client(
            scopes=["https://graph.microsoft.com/.default"]
        )

        if "access_token" not in result:
            error = result.get("error_description", "Unknown error")
            logger.error(f"Failed to acquire token: {error}")
            raise Exception(f"Failed to acquire access token: {error}")

        self._access_token = result["access_token"]
        # Token usually valid for 1 hour
        self._token_expires_at = datetime.now() + timedelta(
            seconds=result.get("expires_in", 3600)
        )

        logger.info("Access token acquired successfully")
        return self._access_token

    async def _make_request(
        self,
        method: str,
        endpoint: str,
        json_data: Optional[dict] = None,
        timeout: float = 30.0,
    ) -> dict:
        """Make an authenticated request to Graph API."""
        token = await self._get_access_token()

        url = f"{GRAPH_API_BASE}{endpoint}"

        async with httpx.AsyncClient() as client:
            response = await client.request(
                method=method,
                url=url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                json=json_data,
                timeout=timeout,
            )

            if response.status_code >= 400:
                error_body = response.text
                logger.error(f"Graph API error {response.status_code}: {error_body}")
                response.raise_for_status()

            if response.status_code == 204:
                return {}

            return response.json()

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
    )
    async def get_email(self, email_id: str) -> EmailMessage:
        """
        Get email details by ID.

        Args:
            email_id: The email message ID

        Returns:
            EmailMessage object
        """
        logger.info(f"Fetching email: {email_id}")

        endpoint = f"/users/{self.target_mailbox}/messages/{email_id}"
        params = "?$select=id,subject,from,bodyPreview,receivedDateTime,hasAttachments"

        data = await self._make_request("GET", endpoint + params)

        return EmailMessage.from_graph_response(data)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
    )
    async def get_attachments(self, email_id: str) -> List[EmailAttachment]:
        """
        Get attachments for an email.

        Args:
            email_id: The email message ID

        Returns:
            List of EmailAttachment objects
        """
        logger.info(f"Fetching attachments for email: {email_id}")

        endpoint = f"/users/{self.target_mailbox}/messages/{email_id}/attachments"

        data = await self._make_request("GET", endpoint)

        attachments = []
        for item in data.get("value", []):
            attachments.append(
                EmailAttachment(
                    id=item["id"],
                    name=item.get("name", ""),
                    contentType=item.get("contentType", ""),
                    size=item.get("size", 0),
                    isInline=item.get("isInline", False),
                )
            )

        logger.info(f"Found {len(attachments)} attachments")
        return attachments

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
    )
    async def download_attachment(
        self, email_id: str, attachment_id: str
    ) -> bytes:
        """
        Download attachment content.

        Args:
            email_id: The email message ID
            attachment_id: The attachment ID

        Returns:
            Attachment content as bytes
        """
        logger.info(f"Downloading attachment: {attachment_id}")

        endpoint = (
            f"/users/{self.target_mailbox}/messages/{email_id}"
            f"/attachments/{attachment_id}"
        )

        data = await self._make_request("GET", endpoint)

        # Attachment content is base64 encoded
        import base64

        content_bytes = data.get("contentBytes", "")
        return base64.b64decode(content_bytes)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
    )
    async def create_subscription(
        self,
        webhook_url: str,
        expiration_minutes: int = 4230,
        client_state: Optional[str] = None,
    ) -> SubscriptionResponse:
        """
        Create a webhook subscription for new emails.

        Args:
            webhook_url: The webhook endpoint URL (must be HTTPS)
            expiration_minutes: Minutes until expiration (max 4230 for mailbox)
            client_state: Optional state for validation

        Returns:
            SubscriptionResponse with subscription details
        """
        logger.info(f"Creating subscription for webhook: {webhook_url}")

        expiration_time = datetime.utcnow() + timedelta(minutes=expiration_minutes)

        subscription_data = {
            "changeType": "created",
            "notificationUrl": webhook_url,
            "resource": f"/users/{self.target_mailbox}/messages",
            "expirationDateTime": expiration_time.isoformat() + "Z",
            "clientState": client_state or f"bakery-api-{int(datetime.now().timestamp())}",
        }

        data = await self._make_request("POST", "/subscriptions", subscription_data)

        logger.info(f"Subscription created: {data['id']}")

        return SubscriptionResponse(
            id=data["id"],
            resource=data["resource"],
            changeType=data["changeType"],
            notificationUrl=data["notificationUrl"],
            expirationDateTime=data["expirationDateTime"],
            clientState=data.get("clientState"),
        )

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
    )
    async def renew_subscription(
        self, subscription_id: str, expiration_minutes: int = 4230
    ) -> SubscriptionResponse:
        """
        Renew an existing subscription.

        Args:
            subscription_id: The subscription ID
            expiration_minutes: Minutes until new expiration

        Returns:
            Updated SubscriptionResponse
        """
        logger.info(f"Renewing subscription: {subscription_id}")

        expiration_time = datetime.utcnow() + timedelta(minutes=expiration_minutes)

        data = await self._make_request(
            "PATCH",
            f"/subscriptions/{subscription_id}",
            {"expirationDateTime": expiration_time.isoformat() + "Z"},
        )

        logger.info(f"Subscription renewed. New expiration: {data['expirationDateTime']}")

        return SubscriptionResponse(
            id=data["id"],
            resource=data["resource"],
            changeType=data["changeType"],
            notificationUrl=data["notificationUrl"],
            expirationDateTime=data["expirationDateTime"],
            clientState=data.get("clientState"),
        )

    async def list_subscriptions(self) -> List[SubscriptionResponse]:
        """
        List all active subscriptions.

        Returns:
            List of SubscriptionResponse objects
        """
        logger.info("Listing subscriptions")

        data = await self._make_request("GET", "/subscriptions")

        subscriptions = []
        for item in data.get("value", []):
            subscriptions.append(
                SubscriptionResponse(
                    id=item["id"],
                    resource=item["resource"],
                    changeType=item["changeType"],
                    notificationUrl=item["notificationUrl"],
                    expirationDateTime=item["expirationDateTime"],
                    clientState=item.get("clientState"),
                )
            )

        logger.info(f"Found {len(subscriptions)} subscriptions")
        return subscriptions

    async def delete_subscription(self, subscription_id: str) -> bool:
        """
        Delete a subscription.

        Args:
            subscription_id: The subscription ID

        Returns:
            True if successful
        """
        logger.info(f"Deleting subscription: {subscription_id}")

        await self._make_request("DELETE", f"/subscriptions/{subscription_id}")

        logger.info("Subscription deleted")
        return True


@lru_cache()
def get_graph_service() -> MicrosoftGraphService:
    """Get cached Microsoft Graph service instance."""
    settings = get_settings()
    return MicrosoftGraphService(
        client_id=settings.ms_graph_client_id,
        client_secret=settings.ms_graph_client_secret,
        tenant_id=settings.ms_graph_tenant_id,
        target_mailbox=settings.ms_graph_target_mailbox,
    )
