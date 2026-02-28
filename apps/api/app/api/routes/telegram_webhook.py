"""Telegram webhook endpoint."""

import logging
from fastapi import APIRouter, Request, Response, BackgroundTasks, Header
from typing import Optional

from ...core.config import get_settings
from ...services.telegram.bot import process_webhook_update

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["telegram"])


@router.post("/telegram")
async def telegram_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_telegram_bot_api_secret_token: Optional[str] = Header(None),
):
    """
    Receive updates from Telegram Bot API.

    Telegram sends a POST with the Update JSON.
    We validate the secret token and process in background.
    """
    settings = get_settings()

    # Verify webhook secret if configured
    if settings.telegram_webhook_secret:
        if x_telegram_bot_api_secret_token != settings.telegram_webhook_secret:
            logger.warning("Invalid Telegram webhook secret token")
            return Response(status_code=403)

    body = await request.json()
    logger.info(f"Telegram webhook received update_id={body.get('update_id')}")

    # Process in background to respond quickly to Telegram
    background_tasks.add_task(process_webhook_update, body)

    return Response(status_code=200)
