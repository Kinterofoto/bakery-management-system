"""
Email reconciliation job.

Runs every hour. Lists the last 24h of emails from the monitored mailbox
via MS Graph, classifies unprocessed ones with the AI classifier, and
automatically reprocesses any purchase orders that were missed
(e.g. due to a dropped webhook notification).
"""

import logging
from datetime import datetime, timedelta, timezone

from ..core.supabase import get_supabase_client
from ..models.purchase_order import ClassificationType
from ..services.ai_classifier import get_classifier
from ..services.microsoft_graph import get_graph_service
from ..services.email_processor import get_email_processor

logger = logging.getLogger(__name__)


async def reconcile_missed_emails():
    """Check for emails that were received but never processed."""
    logger.info("Starting email reconciliation job")

    try:
        graph = get_graph_service()
        supabase = get_supabase_client()
        processor = get_email_processor()
        classifier = get_classifier()

        # Fetch emails from the last 24h in the monitored inbox
        since = datetime.now(timezone.utc) - timedelta(hours=24)
        emails = await graph.list_emails(since=since, top=100)

        if not emails:
            logger.info("Reconciliation: no emails in the last 24h")
            return

        # Get the MS Graph IDs of all fetched emails
        inbox_email_ids = [e["id"] for e in emails]

        # Query which of these email_ids already exist in ordenes_compra
        result = (
            supabase.schema("workflows")
            .table("ordenes_compra")
            .select("email_id")
            .in_("email_id", inbox_email_ids)
            .execute()
        )
        processed_ids = {row["email_id"] for row in result.data}

        # Filter to emails with attachments that haven't been processed
        candidates = [
            e for e in emails
            if e["id"] not in processed_ids and e.get("hasAttachments")
        ]

        if not candidates:
            logger.info(
                f"Reconciliation: {len(emails)} emails checked, "
                f"{len(processed_ids)} already processed, 0 candidates to reprocess"
            )
            return

        # Classify each candidate to only reprocess actual purchase orders
        logger.info(
            f"Reconciliation: {len(candidates)} unprocessed emails with "
            f"attachments, classifying..."
        )

        reprocessed = 0
        skipped_not_oc = 0
        for email in candidates:
            email_id = email["id"]
            subject = email.get("subject", "(no subject)")
            body_preview = email.get("bodyPreview", "")

            try:
                classification = await classifier.classify(
                    subject=subject, body_preview=body_preview
                )

                if classification.classification != ClassificationType.PURCHASE_ORDER:
                    skipped_not_oc += 1
                    logger.info(
                        f"Reconciliation: '{subject}' classified as "
                        f"'{classification.classification.value}', skipping"
                    )
                    continue

                logger.info(f"Reconciliation: processing missed OC: {subject}")
                result = await processor.process_email(email_id)

                if result.orders_created > 0:
                    reprocessed += 1
                    logger.info(
                        f"Reconciliation: recovered order from '{subject}' "
                        f"(orders_created={result.orders_created})"
                    )
                else:
                    logger.info(
                        f"Reconciliation: '{subject}' processed but "
                        f"no order created (error={result.error_message})"
                    )
            except Exception as e:
                logger.error(
                    f"Reconciliation: failed to process email '{subject}': {e}"
                )

        logger.info(
            f"Reconciliation complete: {reprocessed} orders recovered, "
            f"{skipped_not_oc} skipped (not OC), "
            f"from {len(candidates)} candidates"
        )

    except Exception as e:
        logger.error(f"Email reconciliation job failed: {e}")
        raise
