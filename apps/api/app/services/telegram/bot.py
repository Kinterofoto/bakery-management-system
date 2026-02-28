"""Telegram bot setup, lifecycle, and webhook processing."""

import logging
from functools import lru_cache
from telegram import Bot, Update
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    filters,
)

from ...core.config import get_settings

logger = logging.getLogger(__name__)

# Global application instance
_application: Application | None = None


async def init_bot() -> Application:
    """Initialize the Telegram bot Application (webhook mode)."""
    global _application

    settings = get_settings()
    if not settings.telegram_bot_token:
        logger.warning("TELEGRAM_BOT_TOKEN not set, bot disabled")
        return None

    from .handlers import (
        start_command,
        ayuda_command,
        resumen_command,
        contact_handler,
        message_handler,
        callback_query_handler,
    )

    _application = (
        Application.builder()
        .token(settings.telegram_bot_token)
        .build()
    )

    # Register handlers (order matters)
    _application.add_handler(CommandHandler("start", start_command))
    _application.add_handler(CommandHandler("ayuda", ayuda_command))
    _application.add_handler(CommandHandler("resumen", resumen_command))
    _application.add_handler(
        MessageHandler(filters.CONTACT, contact_handler)
    )
    _application.add_handler(CallbackQueryHandler(callback_query_handler))
    _application.add_handler(
        MessageHandler(filters.TEXT & ~filters.COMMAND, message_handler)
    )

    # Initialize without starting polling (webhook mode)
    await _application.initialize()

    logger.info("Telegram bot initialized (webhook mode)")
    return _application


async def shutdown_bot():
    """Graceful shutdown of the bot."""
    global _application
    if _application:
        await _application.shutdown()
        _application = None
        logger.info("Telegram bot shutdown")


def get_application() -> Application | None:
    """Get the current bot Application instance."""
    return _application


def get_bot() -> Bot | None:
    """Get the Bot instance for sending messages."""
    if _application:
        return _application.bot
    return None


async def process_webhook_update(update_data: dict) -> None:
    """Process an incoming webhook update from Telegram."""
    app = get_application()
    if not app:
        logger.error("Bot not initialized, cannot process update")
        return

    update = Update.de_json(update_data, app.bot)
    await app.process_update(update)
