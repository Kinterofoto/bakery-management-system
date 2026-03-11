"""Multi-step conversation flows for modifying orders."""

import logging
import re
from typing import Dict, Any, Optional, List, Tuple
from datetime import date, timedelta

from ...core.tz import today_bogota

from telegram import InlineKeyboardButton, InlineKeyboardMarkup

from ...core.supabase import get_supabase_client, set_audit_user, backfill_audit_user
from ..rag_sync import match_product, match_client as rag_match_client
from . import memory, queries, formatters

logger = logging.getLogger(__name__)


async def handle_conversation_message(
    telegram_chat_id: int,
    message_text: str,
    conversation: Dict[str, Any],
) -> Tuple[str, Optional[InlineKeyboardMarkup]]:
    """Handle a message in an active conversation flow. Returns (text, optional keyboard)."""

    flow_type = conversation["flow_type"]
    state = conversation["state"]
    context = conversation["context"]
    conv_id = conversation["id"]
    user_id = context.get("user_id", "")

    # Cancel
    if message_text.lower().strip() in ("cancelar", "cancel", "/cancelar"):
        await memory.delete_conversation(telegram_chat_id)
        return "Operacion cancelada.", None

    if flow_type == "modify_order":
        return await _handle_modify_order(
            telegram_chat_id, message_text, state, context, conv_id, user_id
        )

    # Unknown/stale flow type (e.g. old create_order) — clean up and re-route to AI
    await memory.delete_conversation(telegram_chat_id)
    return None, None


async def handle_callback(
    telegram_chat_id: int,
    callback_data: str,
    conversation: Dict[str, Any],
) -> Tuple[str, Optional[InlineKeyboardMarkup]]:
    """Handle inline keyboard callback queries (modify order only)."""

    context = conversation["context"]

    # Modify order callbacks
    if callback_data == "modify_confirm":
        return await _confirm_modify_order(telegram_chat_id, context)

    if callback_data == "modify_cancel":
        await memory.delete_conversation(telegram_chat_id)
        return "Modificacion cancelada.", None

    return "Opcion no reconocida.", None


# === Modify Order Flow ===

async def start_modify_order_flow(
    user_id: str,
    telegram_chat_id: int,
    order_number: Optional[str] = None,
) -> str:
    """Start modify order flow."""
    if not order_number:
        context = {"user_id": user_id}
        await memory.create_conversation(
            telegram_chat_id, "modify_order", "waiting_order_number", context
        )
        return "Cual es el numero de pedido que quieres modificar?"

    order = await queries.query_order_detail(user_id, order_number=order_number)
    if not order:
        return "No encontre ese pedido o no tienes acceso."

    # Check if modifiable
    if order.get("status") not in ("received", "review_area1", "review_area2"):
        return (
            f"El pedido #{order_number} esta en estado "
            f"*{formatters.ORDER_STATUS_LABELS.get(order.get('status', ''), order.get('status', ''))}* "
            "y no se puede modificar."
        )

    context = {
        "user_id": user_id,
        "order_id": order["id"],
        "order_number": order_number,
        "client_id": order.get("client_id"),
        "client_name": order.get("client_name", ""),
        "items": [
            {
                "id": item["id"],
                "product_id": item.get("product_id"),
                "product_name": item.get("product_name", ""),
                "quantity": item.get("quantity_requested", 0),
                "unit_price": item.get("unit_price", 0),
            }
            for item in order.get("items", [])
        ],
    }

    detail = formatters.format_order_detail(order, order.get("items", []))
    await memory.create_conversation(
        telegram_chat_id, "modify_order", "waiting_changes", context
    )

    return (
        f"{detail}\n\n"
        "Que quieres cambiar?\n"
        '  - "cambiar 50 croissants a 80"\n'
        '  - "agregar 20 pan tajado"\n'
        '  - "quitar croissants"\n'
        '  - "cambiar fecha a 2026-03-05"\n\n'
        'Escribe "listo" para guardar o "cancelar" para abortar.'
    )


async def _handle_modify_order(
    telegram_chat_id: int,
    message_text: str,
    state: str,
    context: Dict[str, Any],
    conv_id: str,
    user_id: str,
) -> Tuple[str, Optional[InlineKeyboardMarkup]]:
    """Handle modify order flow states."""

    if state == "waiting_order_number":
        # Extract order number
        number = re.sub(r"[^0-9]", "", message_text.strip())
        if number:
            number = number.zfill(6)
            result = await start_modify_order_flow(user_id, telegram_chat_id, number)
            return result, None
        return "Envia el numero de pedido (ej: 000234).", None

    if state == "waiting_changes":
        text = message_text.lower().strip()

        if text in ("listo", "guardar", "ok"):
            # Show summary and confirm
            summary_lines = ["*Pedido modificado:*\n"]
            total = 0
            for item in context.get("items", []):
                qty = item.get("quantity", 0)
                price = item.get("unit_price", 0)
                subtotal = qty * price
                total += subtotal
                summary_lines.append(
                    f"  - {item.get('product_name', 'Producto')}: {qty} x {formatters.format_currency(price)}"
                )
            summary_lines.append(f"\n*Total: {formatters.format_currency(total)}*")

            await memory.update_conversation(conv_id, "waiting_modify_confirmation", context)
            keyboard = InlineKeyboardMarkup([
                [
                    InlineKeyboardButton("Guardar", callback_data="modify_confirm"),
                    InlineKeyboardButton("Cancelar", callback_data="modify_cancel"),
                ]
            ])
            return "\n".join(summary_lines), keyboard

        # Handle changes
        # Change quantity: "cambiar X a Y" or "X producto: Y unidades"
        change_match = re.search(
            r'(?:cambiar|actualizar)\s+(?:(\d+)\s+)?(.+?)\s+a\s+(\d+)',
            text,
        )
        if change_match:
            product_query = change_match.group(2).strip()
            new_qty = int(change_match.group(3))
            items = context.get("items", [])
            for item in items:
                if product_query.lower() in item.get("product_name", "").lower():
                    item["quantity"] = new_qty
                    await memory.update_conversation(conv_id, "waiting_changes", context)
                    return f"Actualizado: {item['product_name']} a {new_qty} uds.", None

            return f'No encontre "{product_query}" en el pedido.', None

        # Add product
        add_match = re.search(r'(?:agregar|anadir|sumar)\s+(\d+)\s+(.+)', text)
        if add_match:
            qty = int(add_match.group(1))
            product_text = add_match.group(2).strip()
            parsed = await _parse_products(
                f"{qty} {product_text}",
                client_id=context.get("client_id"),
            )
            if parsed:
                item = parsed[0]
                context.setdefault("items", []).append(item)
                await memory.update_conversation(conv_id, "waiting_changes", context)
                return f"Agregado: {qty} {item['product_name']}", None
            return f'No encontre el producto "{product_text}".', None

        # Remove product
        remove_match = re.search(r'(?:quitar|eliminar|remover)\s+(.+)', text)
        if remove_match:
            product_query = remove_match.group(1).strip()
            items = context.get("items", [])
            for i, item in enumerate(items):
                if product_query.lower() in item.get("product_name", "").lower():
                    removed = items.pop(i)
                    context["items"] = items
                    await memory.update_conversation(conv_id, "waiting_changes", context)
                    return f"Eliminado: {removed['product_name']}", None
            return f'No encontre "{product_query}" en el pedido.', None

        # Change date
        date_match = re.search(r'(?:cambiar\s+)?fecha\s+(?:a\s+)?(.+)', text)
        if date_match:
            new_date = resolve_date(date_match.group(1).strip())
            if new_date:
                context["new_delivery_date"] = new_date
                await memory.update_conversation(conv_id, "waiting_changes", context)
                return f"Fecha cambiada a {formatters.format_date(new_date)}", None
            return "No entendi la fecha. Usa formato YYYY-MM-DD o 'manana'.", None

        return (
            "No entendi el cambio. Opciones:\n"
            '  "cambiar [producto] a [cantidad]"\n'
            '  "agregar [cantidad] [producto]"\n'
            '  "quitar [producto]"\n'
            '  "fecha a YYYY-MM-DD"',
            None,
        )

    if state == "waiting_modify_confirmation":
        if message_text.lower().strip() in ("si", "guardar", "ok"):
            return await _confirm_modify_order(telegram_chat_id, context)
        elif message_text.lower().strip() in ("no", "cancelar"):
            await memory.delete_conversation(telegram_chat_id)
            return "Modificacion cancelada.", None
        return "Usa los botones para guardar o cancelar.", None

    return "No entendi. Escribe *cancelar* para abortar.", None


async def _confirm_modify_order(
    telegram_chat_id: int,
    context: Dict[str, Any],
) -> Tuple[str, Optional[InlineKeyboardMarkup]]:
    """Apply order modifications to the database."""
    supabase = get_supabase_client()

    try:
        order_id = context.get("order_id")
        if not order_id:
            return "Error: no se encontro el pedido.", None

        # Set audit context so triggers attribute changes to the real user
        set_audit_user(supabase, context.get("user_id"))

        # Recalculate total
        total_value = sum(
            item.get("quantity", 0) * item.get("unit_price", 0)
            for item in context.get("items", [])
        )

        # Update order
        update_data = {"total_value": total_value}
        if context.get("new_delivery_date"):
            update_data["expected_delivery_date"] = context["new_delivery_date"]

        supabase.table("orders").update(update_data).eq("id", order_id).execute()

        # Get existing items
        existing = supabase.table("order_items").select("id").eq("order_id", order_id).execute()
        existing_ids = {item["id"] for item in (existing.data or [])}

        new_items = context.get("items", [])
        new_ids = {item["id"] for item in new_items if item.get("id")}

        # Delete removed items
        deleted_ids = existing_ids - new_ids
        for did in deleted_ids:
            supabase.table("order_items").delete().eq("id", did).execute()

        # Update existing / insert new
        for item in new_items:
            if item.get("id") and item["id"] in existing_ids:
                supabase.table("order_items").update({
                    "quantity_requested": item["quantity"],
                    "unit_price": item["unit_price"],
                    "quantity_missing": item["quantity"],
                }).eq("id", item["id"]).execute()
            elif not item.get("id"):
                supabase.table("order_items").insert({
                    "order_id": order_id,
                    "product_id": item["product_id"],
                    "quantity_requested": item["quantity"],
                    "unit_price": item["unit_price"],
                    "availability_status": "pending",
                    "quantity_available": 0,
                    "quantity_missing": item["quantity"],
                }).execute()

        # Backfill audit entries with the real user
        backfill_audit_user(supabase, context.get("user_id"), order_id, ["orders_audit", "order_items_audit"])

        # Audit event
        try:
            supabase.table("order_events").insert({
                "order_id": order_id,
                "event_type": "item_updated",
                "payload": {
                    "source": "telegram",
                    "items_count": len(new_items),
                    "total_value": total_value,
                },
                "created_by": context.get("user_id"),
            }).execute()
        except Exception:
            pass

        await memory.delete_conversation(telegram_chat_id)

        order_number = context.get("order_number", "?")
        return (
            f"Pedido *#{order_number}* modificado!\n"
            f"Total: {formatters.format_currency(total_value)}"
        ), None

    except Exception as e:
        logger.error(f"Error modifying order: {e}")
        return "Error al modificar el pedido. Intenta de nuevo.", None


# === Helpers ===

async def _search_client(user_id: str, name: str) -> List[Dict[str, Any]]:
    """Search clients by name: ilike first, RAG fallback.

    Always scoped to user's assigned clients.
    """
    # 1. Fast ilike search (scoped to user)
    clients = await queries.search_client_by_name(user_id, name)
    if clients:
        return clients

    # 2. RAG vector fallback - finds client even with typos/abbreviations
    rag_result = await rag_match_client(name)
    if rag_result and rag_result.get("client_id"):
        # Verify the matched client belongs to this user
        supabase = get_supabase_client()
        verify = (
            supabase.table("clients")
            .select("id, name, category")
            .eq("id", rag_result["client_id"])
            .eq("assigned_user_id", user_id)
            .eq("is_active", True)
            .limit(1)
            .execute()
        )
        if verify.data:
            logger.info(
                f"Client RAG match: '{name}' → '{verify.data[0]['name']}' "
                f"(sim={rag_result.get('similarity', 0):.2f})"
            )
            return verify.data

    return []


async def _parse_products(
    text: str,
    client_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Parse product quantities from natural language text.

    Uses RAG vector matching (same as order import workflow) for robust
    product name resolution. Handles plurals, abbreviations, weight info,
    and client-specific aliases automatically.

    Formats:
    - "50 croissants, 30 pasteles de pollo"
    - "50 croissants europa de 30g"
    - "croissants 50"
    - "50 paquetes de croissant europa"
    """
    items = []
    supabase = get_supabase_client()

    # Split by comma or newline
    parts = re.split(r'[,\n]+', text.strip())

    for part in parts:
        part = part.strip()
        if not part:
            continue

        # Try "qty [packaging_word] product_name" pattern
        match = re.match(r'^(\d+)\s+(.+)$', part)
        if not match:
            # Try "product_name qty" pattern
            match = re.match(r'^(.+?)\s+(\d+)$', part)
            if match:
                qty = int(match.group(2))
                product_text = match.group(1).strip()
            else:
                continue
        else:
            qty = int(match.group(1))
            product_text = match.group(2).strip()

        if not product_text:
            continue

        # Use RAG matching (same pipeline as order import workflow)
        result = await match_product(
            extracted_name=product_text,
            client_id=client_id,
        )

        if result and result.get("product_id"):
            # Fetch price from products table
            price = 0
            try:
                price_result = (
                    supabase.table("products")
                    .select("price")
                    .eq("id", result["product_id"])
                    .limit(1)
                    .execute()
                )
                if price_result.data:
                    price = price_result.data[0].get("price", 0) or 0
            except Exception:
                pass

            items.append({
                "product_id": result["product_id"],
                "product_name": result["matched_name"],
                "quantity": qty,
                "unit_price": price,
            })
            logger.info(
                f"Product matched: '{product_text}' → '{result['matched_name']}' "
                f"(source={result['source']}, sim={result.get('similarity', 0):.2f})"
            )
        else:
            logger.warning(f"Product not matched: '{product_text}'")

    return items


def resolve_date(text: str) -> Optional[str]:
    """Resolve natural language date to YYYY-MM-DD."""
    text = text.lower().strip()
    today = today_bogota()

    if text in ("hoy", "today"):
        return today.isoformat()
    elif text in ("manana", "mañana", "tomorrow"):
        return (today + timedelta(days=1)).isoformat()
    elif text in ("pasado manana", "pasado mañana"):
        return (today + timedelta(days=2)).isoformat()

    # Day names
    day_map = {
        "lunes": 0, "martes": 1, "miercoles": 2, "miércoles": 2,
        "jueves": 3, "viernes": 4, "sabado": 5, "sábado": 5, "domingo": 6,
    }
    for day_name, day_num in day_map.items():
        if day_name in text:
            days_ahead = day_num - today.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            return (today + timedelta(days=days_ahead)).isoformat()

    # Try ISO format
    date_match = re.search(r'(\d{4}-\d{2}-\d{2})', text)
    if date_match:
        return date_match.group(1)

    # Try DD/MM/YYYY
    date_match = re.search(r'(\d{1,2})/(\d{1,2})/(\d{4})', text)
    if date_match:
        day, month, year = date_match.groups()
        return f"{year}-{month.zfill(2)}-{day.zfill(2)}"

    return None
