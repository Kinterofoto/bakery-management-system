"""Webhook endpoints for Microsoft Graph notifications."""

import logging
from fastapi import APIRouter, BackgroundTasks, Query, Request, Response
from typing import Optional

from ...core.config import get_settings
from ...models.email import WebhookNotification
from ...services.email_processor import get_email_processor
from ...services.microsoft_graph import get_graph_service
from ...jobs.webhook_renewal import ensure_subscription_exists

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.get("/ms-graph")
async def validate_webhook(
    validationToken: Optional[str] = Query(None),
):
    """
    Handle Microsoft Graph webhook validation.

    Microsoft Graph sends a GET request with validationToken when
    creating/renewing a subscription. We must return the token as
    plain text with content-type text/plain.
    """
    if validationToken:
        logger.info("Webhook validation request received")
        return Response(
            content=validationToken,
            media_type="text/plain",
        )

    return {"status": "ok", "message": "Webhook endpoint ready"}


@router.post("/ms-graph")
async def receive_notification(
    request: Request,
    background_tasks: BackgroundTasks,
    validationToken: Optional[str] = Query(None),
):
    """
    Receive notifications from Microsoft Graph webhook.

    When a new email arrives, Microsoft Graph sends a POST request
    with notification details. We process emails in the background.

    Microsoft Graph also sends POST with validationToken as query param
    during subscription validation.
    """
    # Check for validation token in query params (subscription validation)
    if validationToken:
        logger.info("Webhook validation via POST (query param)")
        return Response(
            content=validationToken,
            media_type="text/plain",
        )

    # Parse request body
    body = await request.json()

    # Check for validation token in body (fallback)
    if "validationToken" in body:
        logger.info("Webhook validation via POST (body)")
        return Response(
            content=body["validationToken"],
            media_type="text/plain",
        )

    logger.info(f"Webhook notification received: {body}")

    # Parse notification
    try:
        notification = WebhookNotification(**body)
    except Exception as e:
        logger.error(f"Failed to parse notification: {e}")
        # Return 200 to prevent Microsoft from retrying
        return {"status": "error", "message": str(e)}

    # Piggyback: ensure subscription stays active on every notification
    background_tasks.add_task(ensure_subscription_exists)

    # Process each notification in background
    processor = get_email_processor()
    processed = 0

    for item in notification.value:
        logger.info(f"Notification: change={item.changeType}, resource={item.resource}")

        # Only process "created" events (new emails)
        if item.changeType == "created" and item.resourceData:
            email_id = item.resourceData.id
            logger.info(f"Queuing email for processing: {email_id}")

            # Process in background to respond quickly to Microsoft
            background_tasks.add_task(
                process_email_notification,
                email_id,
            )
            processed += 1

    return {
        "status": "accepted",
        "notifications_received": len(notification.value),
        "emails_queued": processed,
    }


async def process_email_notification(email_id: str):
    """Background task to process an email notification."""
    logger.info(f"Processing email notification: {email_id}")

    try:
        processor = get_email_processor()
        result = await processor.process_email(email_id)

        logger.info(
            f"Email processed: success={result.success}, "
            f"classification={result.classification.value}, "
            f"orders_created={result.orders_created}"
        )

        if result.error_message:
            logger.warning(f"Processing warning: {result.error_message}")

    except Exception as e:
        logger.error(f"Failed to process email {email_id}: {e}")


@router.post("/subscribe")
async def create_subscription():
    """
    Create a new Microsoft Graph webhook subscription.

    This creates a subscription to receive notifications when new
    emails arrive in the configured mailbox.
    """
    settings = get_settings()

    if not settings.webhook_base_url:
        return {
            "status": "error",
            "message": "WEBHOOK_BASE_URL not configured",
        }

    webhook_url = f"{settings.webhook_base_url}/webhooks/ms-graph"

    logger.info(f"Creating subscription for webhook: {webhook_url}")

    try:
        graph = get_graph_service()
        subscription = await graph.create_subscription(
            webhook_url=webhook_url,
            client_state=settings.webhook_secret or None,
        )

        return {
            "status": "success",
            "subscription": {
                "id": subscription.id,
                "resource": subscription.resource,
                "expiration": subscription.expirationDateTime,
                "webhook_url": subscription.notificationUrl,
            },
        }

    except Exception as e:
        logger.error(f"Failed to create subscription: {e}", exc_info=True)
        error_msg = str(e)
        # Try to extract more details from HTTP errors
        if hasattr(e, '__cause__') and e.__cause__:
            error_msg = f"{error_msg} - Cause: {e.__cause__}"
        return {
            "status": "error",
            "message": error_msg,
        }


@router.post("/ensure")
async def ensure_subscription():
    """Ensure a webhook subscription exists. Idempotent - safe to call repeatedly."""
    result = await ensure_subscription_exists()
    return result


@router.post("/renew/{subscription_id}")
async def renew_subscription(subscription_id: str):
    """
    Renew an existing webhook subscription.

    Subscriptions expire after ~3 days and must be renewed.
    """
    logger.info(f"Renewing subscription: {subscription_id}")

    try:
        graph = get_graph_service()
        subscription = await graph.renew_subscription(subscription_id)

        return {
            "status": "success",
            "subscription": {
                "id": subscription.id,
                "expiration": subscription.expirationDateTime,
            },
        }

    except Exception as e:
        logger.error(f"Failed to renew subscription: {e}")
        return {
            "status": "error",
            "message": str(e),
        }


@router.get("/status")
async def get_subscription_status():
    """
    Get current webhook subscription status.

    Lists all active subscriptions for this application.
    """
    logger.info("Getting subscription status")

    try:
        graph = get_graph_service()
        subscriptions = await graph.list_subscriptions()

        return {
            "status": "success",
            "count": len(subscriptions),
            "subscriptions": [
                {
                    "id": sub.id,
                    "resource": sub.resource,
                    "expiration": sub.expirationDateTime,
                    "webhook_url": sub.notificationUrl,
                }
                for sub in subscriptions
            ],
        }

    except Exception as e:
        logger.error(f"Failed to get subscriptions: {e}")
        return {
            "status": "error",
            "message": str(e),
        }


@router.delete("/unsubscribe/{subscription_id}")
async def delete_subscription(subscription_id: str):
    """
    Delete a webhook subscription.
    """
    logger.info(f"Deleting subscription: {subscription_id}")

    try:
        graph = get_graph_service()
        await graph.delete_subscription(subscription_id)

        return {
            "status": "success",
            "message": f"Subscription {subscription_id} deleted",
        }

    except Exception as e:
        logger.error(f"Failed to delete subscription: {e}")
        return {
            "status": "error",
            "message": str(e),
        }
