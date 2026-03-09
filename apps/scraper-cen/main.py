"""CEN Carvajal Purchase Order Scraper - Entry point.

Runs daily to:
1. Scrape new purchase orders from CEN Carvajal (OXXO)
2. Download and process PDFs
3. Extract data, match products, and create orders
4. Send summary notification via Telegram
"""

import asyncio
import logging
import random
import sys
from datetime import date, timedelta

import httpx

from config import settings
from processor import ProcessResult, process_order
from scraper import scrape_cen_carvajal

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


async def send_telegram_summary(results: list[ProcessResult]) -> None:
    """Send a summary of processing results via Telegram."""
    if not settings.telegram_bot_token or not settings.telegram_chat_id:
        logger.info("Telegram not configured, skipping notification")
        return

    approved = [r for r in results if r.status == "approved"]
    processed = [r for r in results if r.status == "processed"]
    errors = [r for r in results if r.status == "error"]
    skipped = [r for r in results if r.status == "skipped"]

    lines = [
        f"*CEN Carvajal Scraper - {date.today().strftime('%d/%m/%Y')}*",
        "",
        f"Total OCs encontradas: {len(results)}",
        f"Auto-aprobadas: {len(approved)}",
        f"Pendientes revisión: {len(processed)}",
        f"Errores: {len(errors)}",
        f"Ya procesadas (skip): {len(skipped)}",
    ]

    if approved:
        lines.append("")
        lines.append("*Auto-aprobadas:*")
        for r in approved:
            lines.append(f"  - OC {r.doc_number} → Pedido #{r.order_number} ({r.products_matched} productos)")

    if processed:
        lines.append("")
        lines.append("*Pendientes revisión manual:*")
        for r in processed:
            lines.append(f"  - OC {r.doc_number}: {r.message}")

    if errors:
        lines.append("")
        lines.append("*Errores:*")
        for r in errors:
            lines.append(f"  - OC {r.doc_number}: {r.message[:100]}")

    message = "\n".join(lines)

    try:
        url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
        async with httpx.AsyncClient(timeout=30.0) as client:
            await client.post(url, json={
                "chat_id": settings.telegram_chat_id,
                "text": message,
                "parse_mode": "Markdown",
            })
        logger.info("Telegram summary sent")
    except Exception as e:
        logger.error(f"Failed to send Telegram summary: {e}")


async def main():
    """Main entry point for the scraper."""
    # Random delay 1-10 minutes to avoid predictable access patterns
    delay_seconds = random.randint(60, 600)
    logger.info(f"Random startup delay: {delay_seconds // 60}m {delay_seconds % 60}s")
    await asyncio.sleep(delay_seconds)

    logger.info("=" * 60)
    logger.info("CEN Carvajal Scraper starting")
    logger.info("=" * 60)

    # Validate configuration
    if not settings.cen_username or not settings.cen_password:
        logger.error("CEN_USERNAME and CEN_PASSWORD are required")
        sys.exit(1)

    if not settings.supabase_url or not settings.supabase_service_key:
        logger.error("SUPABASE_URL and SUPABASE_SERVICE_KEY are required")
        sys.exit(1)

    if not settings.openai_api_key:
        logger.error("OPENAI_API_KEY is required")
        sys.exit(1)

    # Parse target date from argv if provided (for manual runs)
    target_date = None
    if len(sys.argv) > 1:
        try:
            target_date = date.fromisoformat(sys.argv[1])
            logger.info(f"Using target date from argument: {target_date}")
        except ValueError:
            logger.warning(f"Invalid date argument: {sys.argv[1]}, using default")

    # Step 1: Scrape CEN Carvajal
    logger.info("Step 1: Scraping CEN Carvajal")
    new_orders = await scrape_cen_carvajal(target_date)
    logger.info(f"Found {len(new_orders)} orders to process")

    if not new_orders:
        logger.info("No new orders found. Done.")
        await send_telegram_summary([])
        return

    # Step 2: Process each PDF
    logger.info("Step 2: Processing PDFs")
    results: list[ProcessResult] = []
    for order in new_orders:
        result = await process_order(order)
        results.append(result)
        logger.info(f"  {order.doc_number}: {result.status} - {result.message}")

    # Step 3: Send summary
    logger.info("Step 3: Sending Telegram summary")
    await send_telegram_summary(results)

    # Summary
    approved = sum(1 for r in results if r.status == "approved")
    processed = sum(1 for r in results if r.status == "processed")
    errors = sum(1 for r in results if r.status == "error")
    skipped = sum(1 for r in results if r.status == "skipped")

    logger.info("=" * 60)
    logger.info(f"DONE: {len(results)} orders processed")
    logger.info(f"  Approved: {approved}, Review: {processed}, Errors: {errors}, Skipped: {skipped}")
    logger.info("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
