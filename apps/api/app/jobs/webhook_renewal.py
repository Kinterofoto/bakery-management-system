"""Job for renewing Microsoft Graph webhook subscriptions."""

import logging

from ..core.config import get_settings
from ..core.supabase import get_supabase_client
from ..services.microsoft_graph import get_graph_service

logger = logging.getLogger(__name__)


async def renew_webhook_subscriptions():
    """
    Renew all active webhook subscriptions.

    This job should run every 2-3 days to prevent subscriptions from expiring.
    Microsoft Graph subscriptions for mailbox resources expire after ~3 days (4230 minutes max).
    """
    logger.info("Starting webhook subscription renewal job")

    try:
        graph = get_graph_service()

        # List current subscriptions
        subscriptions = await graph.list_subscriptions()

        if not subscriptions:
            logger.info("No active subscriptions to renew")
            return {"renewed": 0, "message": "No subscriptions found"}

        renewed = 0
        errors = []

        for sub in subscriptions:
            try:
                logger.info(f"Renewing subscription: {sub.id}")
                await graph.renew_subscription(sub.id)
                renewed += 1
                logger.info(f"Subscription {sub.id} renewed successfully")
            except Exception as e:
                logger.error(f"Failed to renew subscription {sub.id}: {e}")
                errors.append({"subscription_id": sub.id, "error": str(e)})

        result = {
            "renewed": renewed,
            "total": len(subscriptions),
            "errors": errors if errors else None,
        }

        logger.info(f"Webhook renewal job completed: {result}")
        return result

    except Exception as e:
        logger.error(f"Webhook renewal job failed: {e}")
        raise


async def ensure_subscription_exists():
    """
    Ensure a webhook subscription exists for the configured mailbox.

    Creates a new subscription if none exists.
    """
    logger.info("Checking for existing webhook subscription")

    settings = get_settings()

    if not settings.webhook_base_url:
        logger.warning("WEBHOOK_BASE_URL not configured, skipping subscription check")
        return {"status": "skipped", "reason": "WEBHOOK_BASE_URL not configured"}

    try:
        graph = get_graph_service()

        # Check existing subscriptions
        subscriptions = await graph.list_subscriptions()

        webhook_url = f"{settings.webhook_base_url}/webhooks/ms-graph"

        # Check if we already have a subscription for our webhook
        for sub in subscriptions:
            if sub.notificationUrl == webhook_url:
                logger.info(f"Found existing subscription: {sub.id}")
                return {
                    "status": "exists",
                    "subscription_id": sub.id,
                    "expiration": sub.expirationDateTime,
                }

        # No subscription found, create one
        logger.info(f"Creating new subscription for: {webhook_url}")

        subscription = await graph.create_subscription(
            webhook_url=webhook_url,
            client_state=settings.webhook_secret or None,
        )

        logger.info(f"New subscription created: {subscription.id}")

        return {
            "status": "created",
            "subscription_id": subscription.id,
            "expiration": subscription.expirationDateTime,
        }

    except Exception as e:
        logger.error(f"Failed to ensure subscription: {e}")
        return {"status": "error", "error": str(e)}
