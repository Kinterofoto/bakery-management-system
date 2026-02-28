"""Telegram bot handlers: commands, contact sharing, messages, callbacks."""

import logging
import re
from telegram import (
    Update,
    ReplyKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardRemove,
)
from telegram.constants import ChatAction
from telegram.ext import ContextTypes

from ...core.supabase import get_supabase_client
from . import memory
from .ai_agent import process_message, generate_summary, get_help_text
from .conversation import handle_conversation_message, handle_callback

logger = logging.getLogger(__name__)


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

    await update.message.chat.send_action(ChatAction.TYPING)
    summary = await generate_summary(user_id)

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
    """Handle all text messages - route to AI agent or conversation flow."""
    chat_id = update.effective_chat.id
    text = update.message.text

    if not text:
        return

    # Check auth
    mapping = await memory.get_user_mapping(chat_id)
    if not mapping:
        await update.message.reply_text(
            "No estas vinculado. Usa /start para compartir tu numero."
        )
        return

    user_id = mapping["user_id"]
    user_data = mapping.get("users", {}) if isinstance(mapping.get("users"), dict) else {}
    user_name = user_data.get("name", "comercial")

    # Show "typing..." indicator
    await update.message.chat.send_action(ChatAction.TYPING)

    # Check for active conversation flow
    conversation = await memory.get_active_conversation(chat_id)
    if conversation:
        response_text, keyboard = await handle_conversation_message(
            chat_id, text, conversation
        )
        if keyboard:
            await update.message.reply_text(
                response_text, parse_mode="Markdown", reply_markup=keyboard
            )
        else:
            await update.message.reply_text(response_text, parse_mode="Markdown")
        return

    # Route to AI agent
    response = await process_message(
        user_id=user_id,
        user_name=user_name,
        telegram_chat_id=chat_id,
        message_text=text,
    )

    # Check if response signals need for inline keyboard (from conversation start)
    if response == "SELECT_BRANCH":
        conversation = await memory.get_active_conversation(chat_id)
        if conversation:
            branches = conversation.get("context", {}).get("branches", [])
            from .conversation import _build_branch_keyboard
            keyboard = _build_branch_keyboard(branches)
            client_name = conversation.get("context", {}).get("client_name", "")
            await update.message.reply_text(
                f"Selecciona la sucursal de *{client_name}*:",
                parse_mode="Markdown",
                reply_markup=keyboard,
            )
            return

    if response == "SELECT_CLIENT":
        conversation = await memory.get_active_conversation(chat_id)
        if conversation:
            clients = conversation.get("context", {}).get("client_matches", [])
            from .conversation import _build_client_keyboard
            keyboard = _build_client_keyboard(clients)
            await update.message.reply_text(
                "Encontre varios clientes. Selecciona uno:",
                reply_markup=keyboard,
            )
            return

    await update.message.reply_text(response, parse_mode="Markdown")


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

    # Show typing indicator
    await query.message.chat.send_action(ChatAction.TYPING)

    # Get active conversation
    conversation = await memory.get_active_conversation(chat_id)
    if not conversation:
        await query.edit_message_text("No hay flujo activo. Escribe un nuevo mensaje.")
        return

    response_text, keyboard = await handle_callback(
        chat_id, callback_data, conversation
    )

    if keyboard:
        await query.edit_message_text(
            response_text, parse_mode="Markdown", reply_markup=keyboard
        )
    else:
        await query.edit_message_text(response_text, parse_mode="Markdown")


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
