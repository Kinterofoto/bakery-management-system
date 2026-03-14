"""Telegram bot handlers: commands, contact sharing, messages, callbacks."""

import asyncio
import logging
import re
import time
from typing import Dict, List
from telegram import (
    Update,
    ReplyKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardRemove,
)
from telegram.constants import ChatAction
from telegram.error import BadRequest
from telegram.ext import ContextTypes

from ...core.supabase import get_supabase_client
from ..openai_client import get_openai_client
from . import memory
from .ai_agent import process_message, generate_summary, get_help_text
from .conversation import handle_conversation_message, handle_callback

logger = logging.getLogger(__name__)

# ─── Message batching: accumulate rapid-fire messages before processing ───

MESSAGE_BATCH_DELAY = 5.0  # seconds to wait for more messages

# Per-chat buffer: {chat_id: {"messages": [...], "task": asyncio.Task, "update": Update, ...}}
_chat_buffers: Dict[int, dict] = {}


async def _keep_typing(chat, stop_event: asyncio.Event):
    """Re-send typing indicator every 4s until stop_event is set."""
    while not stop_event.is_set():
        try:
            await chat.send_action(ChatAction.TYPING)
        except Exception:
            break
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=4)
            break
        except asyncio.TimeoutError:
            continue


async def _safe_reply(message, text: str, **kwargs) -> None:
    """Send a reply, falling back to plain text if Markdown parsing fails."""
    try:
        await message.reply_text(text, **kwargs)
    except BadRequest as e:
        logger.warning(f"Markdown send failed: {e}. Retrying without parse_mode.")
        kwargs.pop("parse_mode", None)
        await message.reply_text(text, **kwargs)


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /start command - greet and ask for contact sharing."""
    chat_id = update.effective_chat.id

    # Check if already linked
    mapping = await memory.get_user_mapping(chat_id)
    if mapping:
        user_name = mapping.get("users", {}).get("name", "comercial") if isinstance(mapping.get("users"), dict) else "comercial"
        await update.message.reply_text(
            f"Hola {user_name}! Ya estas vinculado.\n"
            "Escribe /ayuda para ver lo que puedo hacer.",
            reply_markup=ReplyKeyboardRemove(),
        )
        return

    # Ask to share contact
    keyboard = ReplyKeyboardMarkup(
        [[KeyboardButton("Compartir mi numero", request_contact=True)]],
        one_time_keyboard=True,
        resize_keyboard=True,
    )
    await update.message.reply_text(
        "Bienvenido al asistente comercial de Pastry Chef!\n\n"
        "Para vincularte, comparte tu numero de telefono con el boton de abajo.",
        reply_markup=keyboard,
    )


async def ayuda_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /ayuda command."""
    chat_id = update.effective_chat.id

    # Check auth
    mapping = await memory.get_user_mapping(chat_id)
    if not mapping:
        await update.message.reply_text(
            "No estas vinculado. Usa /start para comenzar."
        )
        return

    await update.message.reply_text(
        get_help_text(),
        parse_mode="Markdown",
    )


async def resumen_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /resumen command - on-demand daily summary."""
    chat_id = update.effective_chat.id

    mapping = await memory.get_user_mapping(chat_id)
    if not mapping:
        await update.message.reply_text(
            "No estas vinculado. Usa /start para comenzar."
        )
        return

    user_id = mapping["user_id"]

    stop_typing = asyncio.Event()
    typing_task = asyncio.create_task(_keep_typing(update.message.chat, stop_typing))
    try:
        summary = await generate_summary(user_id)
    finally:
        stop_typing.set()
        await typing_task

    await update.message.reply_text(summary, parse_mode="Markdown")


async def contact_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle shared contact - link Telegram to user by phone number."""
    chat_id = update.effective_chat.id
    contact = update.message.contact

    if not contact or not contact.phone_number:
        await update.message.reply_text(
            "No se pudo obtener tu numero. Intenta de nuevo.",
            reply_markup=ReplyKeyboardRemove(),
        )
        return

    phone = normalize_phone(contact.phone_number)
    logger.info(f"Contact shared: phone={phone}, chat_id={chat_id}")

    # Check if already mapped
    existing = await memory.get_user_mapping(chat_id)
    if existing:
        user_name = existing.get("users", {}).get("name", "comercial") if isinstance(existing.get("users"), dict) else "comercial"
        await update.message.reply_text(
            f"Ya estas vinculado como {user_name}!",
            reply_markup=ReplyKeyboardRemove(),
        )
        return

    # Search for user by phone
    supabase = get_supabase_client()
    user = _find_user_by_phone(supabase, phone)

    if not user:
        await update.message.reply_text(
            "Tu numero no esta registrado en el sistema.\n"
            "Contacta al administrador para que te registre.",
            reply_markup=ReplyKeyboardRemove(),
        )
        return

    # Create mapping
    username = update.effective_user.username if update.effective_user else None
    mapping = await memory.create_user_mapping(
        user_id=user["id"],
        telegram_chat_id=chat_id,
        telegram_username=username,
    )

    if mapping:
        await update.message.reply_text(
            f"Hola {user.get('name', 'comercial')}! Vinculacion exitosa.\n\n"
            "Escribe /ayuda para ver lo que puedo hacer.",
            reply_markup=ReplyKeyboardRemove(),
        )
    else:
        await update.message.reply_text(
            "Error al vincularte. Intenta de nuevo.",
            reply_markup=ReplyKeyboardRemove(),
        )


async def message_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle text messages with batching — waits for rapid-fire messages before processing.

    When a user sends multiple messages quickly (common in Telegram), we buffer
    them for MESSAGE_BATCH_DELAY seconds and then process them as one combined message.
    """
    chat_id = update.effective_chat.id
    text = update.message.text

    if not text:
        return

    # Quick auth check (before buffering)
    if chat_id not in _chat_buffers or not _chat_buffers[chat_id].get("authenticated"):
        mapping = await memory.get_user_mapping(chat_id)
        if not mapping:
            await update.message.reply_text(
                "No estas vinculado. Usa /start para compartir tu numero."
            )
            return

    buf = _chat_buffers.get(chat_id)

    if buf and buf.get("processing"):
        # A batch is already being processed — queue this for the next batch
        buf.setdefault("queued_messages", []).append(text)
        buf["last_update"] = update
        logger.info(f"Message queued (batch processing): chat={chat_id}, text={text[:40]}")
        return

    if buf and "task" in buf and not buf["task"].done():
        # Timer is running — add message to current batch and reset timer
        buf["messages"].append(text)
        buf["last_update"] = update
        buf["task"].cancel()
        logger.info(f"Message added to batch: chat={chat_id}, count={len(buf['messages'])}")
    else:
        # Start new batch
        buf = {
            "messages": [text],
            "last_update": update,
            "context": context,
            "authenticated": True,
        }
        _chat_buffers[chat_id] = buf
        logger.info(f"New message batch started: chat={chat_id}")

    # Show typing immediately so user knows we received it
    try:
        await update.message.chat.send_action(ChatAction.TYPING)
    except Exception:
        pass

    # Start/restart the timer
    buf["task"] = asyncio.create_task(_batch_timer(chat_id))


async def _batch_timer(chat_id: int) -> None:
    """Wait for MESSAGE_BATCH_DELAY, then process the batched messages."""
    try:
        await asyncio.sleep(MESSAGE_BATCH_DELAY)
    except asyncio.CancelledError:
        return  # Timer reset — new message arrived

    await _process_batched_messages(chat_id)


async def _process_batched_messages(chat_id: int) -> None:
    """Process all buffered messages for a chat as a single combined message."""
    buf = _chat_buffers.get(chat_id)
    if not buf:
        return

    messages = buf["messages"]
    update = buf["last_update"]
    buf["processing"] = True

    # Combine messages into one
    combined_text = "\n".join(messages)
    msg_count = len(messages)

    if msg_count > 1:
        logger.info(f"Processing batch of {msg_count} messages: chat={chat_id}, combined={combined_text[:80]}")
    else:
        logger.info(f"Processing single message: chat={chat_id}, text={combined_text[:50]}")

    # Parallelize: auth check + conversation check + message history
    mapping, conversation, history = await asyncio.gather(
        memory.get_user_mapping(chat_id),
        memory.get_active_conversation(chat_id),
        memory.get_recent_messages(chat_id),
    )

    if not mapping:
        buf["processing"] = False
        _chat_buffers.pop(chat_id, None)
        await update.message.reply_text(
            "No estas vinculado. Usa /start para compartir tu numero."
        )
        return

    user_id = mapping["user_id"]
    user_data = mapping.get("users", {}) if isinstance(mapping.get("users"), dict) else {}
    user_name = user_data.get("name", "comercial")

    # Persistent typing indicator
    stop_typing = asyncio.Event()
    typing_task = asyncio.create_task(_keep_typing(update.message.chat, stop_typing))

    try:
        # Check for active conversation flow (modify_order)
        if conversation:
            response_text, keyboard = await handle_conversation_message(
                chat_id, combined_text, conversation
            )
            if response_text is not None:
                if keyboard:
                    await _safe_reply(
                        update.message, response_text, parse_mode="Markdown", reply_markup=keyboard
                    )
                else:
                    await _safe_reply(update.message, response_text, parse_mode="Markdown")
                return
            # Fall through to AI agent below

        # Route to AI agent (pass pre-fetched history to avoid duplicate query)
        response = await process_message(
            user_id=user_id,
            user_name=user_name,
            telegram_chat_id=chat_id,
            message_text=combined_text,
            history=history,
        )

        await _safe_reply(update.message, response, parse_mode="Markdown")

    except Exception as e:
        logger.error(f"process_message error: {e}", exc_info=True)
        await update.message.reply_text("Hubo un error. Intenta de nuevo.")
    finally:
        stop_typing.set()
        await typing_task
        buf["processing"] = False

        # Check if more messages arrived while we were processing
        queued = buf.pop("queued_messages", [])
        _chat_buffers.pop(chat_id, None)

        if queued:
            logger.info(f"Processing {len(queued)} queued messages: chat={chat_id}")
            _chat_buffers[chat_id] = {
                "messages": queued,
                "last_update": update,
                "authenticated": True,
            }
            _chat_buffers[chat_id]["task"] = asyncio.create_task(_batch_timer(chat_id))


async def photo_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle photo messages - convert to base64 and route with vision."""
    chat_id = update.effective_chat.id

    mapping, conversation, history = await asyncio.gather(
        memory.get_user_mapping(chat_id),
        memory.get_active_conversation(chat_id),
        memory.get_recent_messages(chat_id),
    )

    if not mapping:
        await update.message.reply_text(
            "No estas vinculado. Usa /start para compartir tu numero."
        )
        return

    user_id = mapping["user_id"]
    user_data = mapping.get("users", {}) if isinstance(mapping.get("users"), dict) else {}
    user_name = user_data.get("name", "comercial")

    stop_typing = asyncio.Event()
    typing_task = asyncio.create_task(_keep_typing(update.message.chat, stop_typing))

    try:
        # Download the largest photo resolution
        photo = update.message.photo[-1]
        photo_file = await photo.get_file()
        photo_data = await photo_file.download_as_bytearray()

        # Convert to base64 data URL
        import base64
        b64 = base64.b64encode(bytes(photo_data)).decode("utf-8")
        image_url = f"data:image/jpeg;base64,{b64}"

        # Use caption as message text, or default
        text = update.message.caption or ""

        # Skip conversation flows for photos — route directly to AI agent
        response = await process_message(
            user_id=user_id,
            user_name=user_name,
            telegram_chat_id=chat_id,
            message_text=text,
            history=history,
            image_url=image_url,
        )

        await _safe_reply(update.message, response, parse_mode="Markdown")

    except Exception as e:
        logger.error(f"photo_handler error: {e}", exc_info=True)
        await update.message.reply_text(
            "No pude procesar la imagen. Intenta de nuevo."
        )
    finally:
        stop_typing.set()
        await typing_task


async def voice_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle voice messages - transcribe and route like text."""
    chat_id = update.effective_chat.id

    mapping, conversation, history = await asyncio.gather(
        memory.get_user_mapping(chat_id),
        memory.get_active_conversation(chat_id),
        memory.get_recent_messages(chat_id),
    )

    if not mapping:
        await update.message.reply_text(
            "No estas vinculado. Usa /start para compartir tu numero."
        )
        return

    user_id = mapping["user_id"]
    user_data = mapping.get("users", {}) if isinstance(mapping.get("users"), dict) else {}
    user_name = user_data.get("name", "comercial")

    stop_typing = asyncio.Event()
    typing_task = asyncio.create_task(_keep_typing(update.message.chat, stop_typing))

    try:
        # Download voice audio
        voice = update.message.voice
        voice_file = await voice.get_file()
        audio_data = await voice_file.download_as_bytearray()

        # Transcribe
        openai_client = get_openai_client()
        text = await openai_client.transcribe_audio(bytes(audio_data), "voice.ogg")

        if not text:
            await update.message.reply_text(
                "No pude entender el audio, intenta de nuevo."
            )
            return

        # Route through same logic as text messages
        if conversation:
            response_text, keyboard = await handle_conversation_message(
                chat_id, text, conversation
            )
            if response_text is not None:
                if keyboard:
                    await _safe_reply(
                        update.message, response_text, parse_mode="Markdown", reply_markup=keyboard
                    )
                else:
                    await _safe_reply(update.message, response_text, parse_mode="Markdown")
                return

        response = await process_message(
            user_id=user_id,
            user_name=user_name,
            telegram_chat_id=chat_id,
            message_text=text,
            history=history,
        )

        await _safe_reply(update.message, response, parse_mode="Markdown")

    except Exception as e:
        logger.error(f"voice_handler error: {e}", exc_info=True)
        await update.message.reply_text(
            "No pude procesar el audio. Intenta de nuevo."
        )
    finally:
        stop_typing.set()
        await typing_task


async def callback_query_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle inline keyboard callbacks."""
    query = update.callback_query
    await query.answer()

    chat_id = query.message.chat_id
    callback_data = query.data

    # Check auth
    mapping = await memory.get_user_mapping(chat_id)
    if not mapping:
        await query.edit_message_text("No estas vinculado. Usa /start.")
        return

    # Get active conversation
    conversation = await memory.get_active_conversation(chat_id)
    if not conversation:
        await query.edit_message_text("No hay flujo activo. Escribe un nuevo mensaje.")
        return

    # Persistent typing indicator
    stop_typing = asyncio.Event()
    typing_task = asyncio.create_task(_keep_typing(query.message.chat, stop_typing))

    try:
        response_text, keyboard = await handle_callback(
            chat_id, callback_data, conversation
        )

        try:
            if keyboard:
                await query.edit_message_text(
                    response_text, parse_mode="Markdown", reply_markup=keyboard
                )
            else:
                await query.edit_message_text(response_text, parse_mode="Markdown")
        except BadRequest as e:
            logger.warning(f"Callback Markdown failed: {e}. Retrying without parse_mode.")
            if keyboard:
                await query.edit_message_text(response_text, reply_markup=keyboard)
            else:
                await query.edit_message_text(response_text)
    finally:
        stop_typing.set()
        await typing_task


# === Helpers ===

def normalize_phone(phone: str) -> str:
    """Normalize phone number for matching.

    Removes +, spaces, dashes. For Colombian numbers:
    - +57 prefix is kept as just the digits
    - Ensures we have the raw digits for matching
    """
    # Remove all non-digit characters
    digits = re.sub(r'\D', '', phone)

    # If starts with 57 and has 12 digits (57 + 10 digit number), strip 57
    if digits.startswith("57") and len(digits) == 12:
        digits = digits[2:]

    return digits


def _find_user_by_phone(supabase, phone: str):
    """Find user by phone number, trying various formats."""
    # Try direct match
    result = supabase.table("users").select("id, name, email, role").eq("phone", phone).limit(1).execute()
    if result.data:
        return result.data[0]

    # Try with country code
    with_code = f"57{phone}" if not phone.startswith("57") else phone
    result = supabase.table("users").select("id, name, email, role").eq("phone", with_code).limit(1).execute()
    if result.data:
        return result.data[0]

    # Try with + prefix
    for prefix in [f"+57{phone}", f"+{phone}"]:
        result = supabase.table("users").select("id, name, email, role").eq("phone", prefix).limit(1).execute()
        if result.data:
            return result.data[0]

    # Try ilike for flexible matching
    result = (
        supabase.table("users")
        .select("id, name, email, role")
        .ilike("phone", f"%{phone[-10:]}")
        .limit(1)
        .execute()
    )
    if result.data:
        return result.data[0]

    return None
