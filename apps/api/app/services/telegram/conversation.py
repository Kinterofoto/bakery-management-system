"""Multi-step conversation flows for creating and modifying orders."""

import logging
import re
from typing import Dict, Any, Optional, List, Tuple
from datetime import date, timedelta

from telegram import InlineKeyboardButton, InlineKeyboardMarkup

from ...core.supabase import get_supabase_client
from . import memory, queries, formatters

logger = logging.getLogger(__name__)


# === Create Order Flow ===

async def start_create_order_flow(
    user_id: str,
    telegram_chat_id: int,
    client_name: Optional[str] = None,
    delivery_date: Optional[str] = None,
) -> str:
    """Start the create order conversation flow."""

    context: Dict[str, Any] = {"user_id": user_id, "items": []}

    # Resolve delivery date
    if delivery_date:
        resolved_date = resolve_date(delivery_date)
        if resolved_date:
            context["delivery_date"] = resolved_date

    # If client name provided, try to match
    if client_name:
        clients = await queries.search_client_by_name(user_id, client_name)
        if len(clients) == 1:
            context["client_id"] = clients[0]["id"]
            context["client_name"] = clients[0]["name"]

            # Check for branches
            branches = await queries.get_branches_for_client(clients[0]["id"])
            if len(branches) == 1:
                context["branch_id"] = branches[0]["id"]
                context["branch_name"] = branches[0]["name"]

                if context.get("delivery_date"):
                    # We have everything, go to products
                    await memory.create_conversation(
                        telegram_chat_id, "create_order", "waiting_products", context
                    )
                    return (
                        f"Pedido para *{context['client_name']}* "
                        f"({context['branch_name']}) "
                        f"entrega {formatters.format_date(context['delivery_date'])}.\n\n"
                        "Envia los productos. Ejemplo:\n"
                        '"50 croissants, 30 pasteles de pollo"\n\n'
                        "Escribe *cancelar* para abortar."
                    )
                else:
                    await memory.create_conversation(
                        telegram_chat_id, "create_order", "waiting_date", context
                    )
                    return (
                        f"Pedido para *{context['client_name']}* ({context['branch_name']}).\n"
                        "Para que fecha quieres la entrega?"
                    )

            elif len(branches) > 1:
                context["branches"] = [{"id": b["id"], "name": b["name"]} for b in branches]
                await memory.create_conversation(
                    telegram_chat_id, "create_order", "waiting_branch", context
                )
                return "SELECT_BRANCH"  # Signal to send inline keyboard

            # No branches, proceed
            if context.get("delivery_date"):
                await memory.create_conversation(
                    telegram_chat_id, "create_order", "waiting_products", context
                )
                return (
                    f"Pedido para *{context['client_name']}* "
                    f"entrega {formatters.format_date(context['delivery_date'])}.\n\n"
                    "Envia los productos.\n"
                    "Escribe *cancelar* para abortar."
                )
            else:
                await memory.create_conversation(
                    telegram_chat_id, "create_order", "waiting_date", context
                )
                return (
                    f"Pedido para *{context['client_name']}*.\n"
                    "Para que fecha quieres la entrega?"
                )

        elif len(clients) > 1:
            context["client_matches"] = [{"id": c["id"], "name": c["name"]} for c in clients]
            await memory.create_conversation(
                telegram_chat_id, "create_order", "waiting_client", context
            )
            return "SELECT_CLIENT"  # Signal to send inline keyboard

        else:
            return f'No encontre cliente "{client_name}". Verifica el nombre.'

    # No client name, ask for it
    await memory.create_conversation(
        telegram_chat_id, "create_order", "waiting_client_name", context
    )
    return "Para que cliente quieres hacer el pedido?"


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
        return "Pedido cancelado.", None

    if flow_type == "create_order":
        return await _handle_create_order(
            telegram_chat_id, message_text, state, context, conv_id, user_id
        )
    elif flow_type == "modify_order":
        return await _handle_modify_order(
            telegram_chat_id, message_text, state, context, conv_id, user_id
        )

    return "No entendi. Escribe *cancelar* para abortar.", None


async def _handle_create_order(
    telegram_chat_id: int,
    message_text: str,
    state: str,
    context: Dict[str, Any],
    conv_id: str,
    user_id: str,
) -> Tuple[str, Optional[InlineKeyboardMarkup]]:
    """Handle create order flow states."""

    if state == "waiting_client_name":
        clients = await queries.search_client_by_name(user_id, message_text.strip())
        if len(clients) == 1:
            context["client_id"] = clients[0]["id"]
            context["client_name"] = clients[0]["name"]
            branches = await queries.get_branches_for_client(clients[0]["id"])

            if len(branches) > 1:
                context["branches"] = [{"id": b["id"], "name": b["name"]} for b in branches]
                await memory.update_conversation(conv_id, "waiting_branch", context)
                keyboard = _build_branch_keyboard(branches)
                return f"Selecciona la sucursal de *{context['client_name']}*:", keyboard

            if branches:
                context["branch_id"] = branches[0]["id"]
                context["branch_name"] = branches[0]["name"]

            await memory.update_conversation(conv_id, "waiting_date", context)
            return "Para que fecha quieres la entrega?", None

        elif len(clients) > 1:
            keyboard = _build_client_keyboard(clients)
            context["client_matches"] = [{"id": c["id"], "name": c["name"]} for c in clients]
            await memory.update_conversation(conv_id, "waiting_client", context)
            return "Encontre varios clientes. Selecciona uno:", keyboard

        return 'No encontre ese cliente. Intenta con otro nombre o escribe "cancelar".', None

    elif state == "waiting_date":
        resolved = resolve_date(message_text.strip())
        if resolved:
            context["delivery_date"] = resolved
            await memory.update_conversation(conv_id, "waiting_products", context)
            branch_str = f" ({context.get('branch_name', '')})" if context.get("branch_name") else ""
            return (
                f"Pedido para *{context.get('client_name', '')}*{branch_str} "
                f"entrega {formatters.format_date(resolved)}.\n\n"
                "Envia los productos. Ejemplo:\n"
                '"50 croissants, 30 pasteles de pollo"\n\n'
                'Escribe "listo" cuando termines o "cancelar" para abortar.',
                None,
            )
        return "No entendi la fecha. Usa 'hoy', 'manana', o un formato como '2026-03-01'.", None

    elif state == "waiting_products":
        if message_text.lower().strip() in ("listo", "confirmar", "ok"):
            # Show confirmation
            if not context.get("items"):
                return "No has agregado productos. Envia productos o escribe *cancelar*.", None

            summary = formatters.format_order_confirmation(context)
            context["ready_to_confirm"] = True
            await memory.update_conversation(conv_id, "waiting_confirmation", context)

            keyboard = InlineKeyboardMarkup([
                [
                    InlineKeyboardButton("Confirmar", callback_data="order_confirm"),
                    InlineKeyboardButton("Cancelar", callback_data="order_cancel"),
                ]
            ])
            return summary, keyboard

        # Parse products from message
        parsed = await _parse_products(message_text)
        if parsed:
            context.setdefault("items", []).extend(parsed)
            await memory.update_conversation(conv_id, "waiting_products", context)

            items_summary = "\n".join(
                f"  - {item['product_name']}: {item['quantity']} x {formatters.format_currency(item['unit_price'])}"
                for item in context["items"]
            )
            return (
                f"Productos agregados. Total hasta ahora:\n{items_summary}\n\n"
                'Agrega mas productos o escribe "listo" para confirmar.',
                None,
            )

        return (
            "No encontre esos productos. Intenta con otro nombre.\n"
            "Formato: '50 croissants, 30 pasteles de pollo'",
            None,
        )

    elif state == "waiting_confirmation":
        # This should be handled by callback, but handle text too
        if message_text.lower().strip() in ("si", "confirmar", "ok"):
            return await _confirm_create_order(telegram_chat_id, context)
        elif message_text.lower().strip() in ("no", "cancelar"):
            await memory.delete_conversation(telegram_chat_id)
            return "Pedido cancelado.", None

        return "Usa los botones para confirmar o cancelar el pedido.", None

    return "No entendi. Escribe *cancelar* para abortar.", None


async def handle_callback(
    telegram_chat_id: int,
    callback_data: str,
    conversation: Dict[str, Any],
) -> Tuple[str, Optional[InlineKeyboardMarkup]]:
    """Handle inline keyboard callback queries."""

    flow_type = conversation["flow_type"]
    state = conversation["state"]
    context = conversation["context"]
    conv_id = conversation["id"]
    user_id = context.get("user_id", "")

    # Branch selection
    if callback_data.startswith("branch_"):
        branch_id = callback_data.replace("branch_", "")
        branches = context.get("branches", [])
        selected = next((b for b in branches if b["id"] == branch_id), None)
        if selected:
            context["branch_id"] = selected["id"]
            context["branch_name"] = selected["name"]

            if context.get("delivery_date"):
                await memory.update_conversation(conv_id, "waiting_products", context)
                return (
                    f"Sucursal: *{selected['name']}*\n"
                    f"Entrega: {formatters.format_date(context['delivery_date'])}\n\n"
                    "Envia los productos.",
                    None,
                )
            else:
                await memory.update_conversation(conv_id, "waiting_date", context)
                return f"Sucursal: *{selected['name']}*\nPara que fecha quieres la entrega?", None

    # Client selection
    if callback_data.startswith("client_"):
        client_id = callback_data.replace("client_", "")
        matches = context.get("client_matches", [])
        selected = next((c for c in matches if c["id"] == client_id), None)
        if selected:
            context["client_id"] = selected["id"]
            context["client_name"] = selected["name"]

            branches = await queries.get_branches_for_client(selected["id"])
            if len(branches) > 1:
                context["branches"] = [{"id": b["id"], "name": b["name"]} for b in branches]
                await memory.update_conversation(conv_id, "waiting_branch", context)
                keyboard = _build_branch_keyboard(branches)
                return f"Selecciona la sucursal de *{selected['name']}*:", keyboard

            if branches:
                context["branch_id"] = branches[0]["id"]
                context["branch_name"] = branches[0]["name"]

            await memory.update_conversation(conv_id, "waiting_date", context)
            return f"Cliente: *{selected['name']}*\nPara que fecha quieres la entrega?", None

    # Order confirmation
    if callback_data == "order_confirm":
        return await _confirm_create_order(telegram_chat_id, context)

    if callback_data == "order_cancel":
        await memory.delete_conversation(telegram_chat_id)
        return "Pedido cancelado.", None

    # Modify order callbacks
    if callback_data == "modify_confirm":
        return await _confirm_modify_order(telegram_chat_id, context)

    if callback_data == "modify_cancel":
        await memory.delete_conversation(telegram_chat_id)
        return "Modificacion cancelada.", None

    return "Opcion no reconocida.", None


async def _confirm_create_order(
    telegram_chat_id: int,
    context: Dict[str, Any],
) -> Tuple[str, Optional[InlineKeyboardMarkup]]:
    """Create the order in the database."""
    supabase = get_supabase_client()

    try:
        # Generate order number
        last_order = (
            supabase.table("orders")
            .select("order_number")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )

        next_number = "000001"
        if last_order.data and last_order.data[0].get("order_number"):
            try:
                last_num = int(last_order.data[0]["order_number"])
                next_number = str(last_num + 1).zfill(6)
            except ValueError:
                pass

        # Calculate total
        total_value = sum(
            item["quantity"] * item["unit_price"]
            for item in context.get("items", [])
        )

        # Insert order
        order_insert = {
            "order_number": next_number,
            "client_id": context.get("client_id"),
            "expected_delivery_date": context.get("delivery_date"),
            "total_value": total_value,
            "status": "received",
            "source": "telegram",
        }
        if context.get("branch_id"):
            order_insert["branch_id"] = context["branch_id"]
        if context.get("user_id"):
            order_insert["created_by"] = context["user_id"]

        order_result = supabase.table("orders").insert(order_insert).execute()
        if not order_result.data:
            return "Error al crear el pedido. Intenta de nuevo.", None

        order_id = order_result.data[0]["id"]

        # Insert items
        order_items = []
        for item in context.get("items", []):
            order_items.append({
                "order_id": order_id,
                "product_id": item["product_id"],
                "quantity_requested": item["quantity"],
                "unit_price": item["unit_price"],
                "availability_status": "pending",
                "quantity_available": 0,
                "quantity_missing": item["quantity"],
            })

        if order_items:
            supabase.table("order_items").insert(order_items).execute()

        # Audit event
        try:
            supabase.table("order_events").insert({
                "order_id": order_id,
                "event_type": "created",
                "payload": {
                    "order_number": next_number,
                    "client_id": context.get("client_id"),
                    "items_count": len(order_items),
                    "total_value": total_value,
                    "source": "telegram",
                },
                "created_by": context.get("user_id"),
            }).execute()
        except Exception:
            pass

        await memory.delete_conversation(telegram_chat_id)

        return (
            f"Pedido *#{next_number}* creado!\n"
            f"Cliente: {context.get('client_name', '')}\n"
            f"Total: {formatters.format_currency(total_value)}\n"
            f"Entrega: {formatters.format_date(context.get('delivery_date', ''))}"
        ), None

    except Exception as e:
        logger.error(f"Error creating order: {e}")
        return "Error al crear el pedido. Intenta de nuevo.", None


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
            product_query = add_match.group(2).strip()
            products = await queries.search_products(product_query, limit=1)
            if products:
                product = products[0]
                context.setdefault("items", []).append({
                    "product_id": product["id"],
                    "product_name": product["name"],
                    "quantity": qty,
                    "unit_price": product.get("default_price", 0) or 0,
                })
                await memory.update_conversation(conv_id, "waiting_changes", context)
                return f"Agregado: {qty} {product['name']}", None
            return f'No encontre el producto "{product_query}".', None

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

async def _parse_products(text: str) -> List[Dict[str, Any]]:
    """Parse product quantities from natural language text.

    Formats:
    - "50 croissants, 30 pasteles de pollo"
    - "50 croissants europa"
    - "croissants 50"
    """
    items = []
    # Split by comma or newline
    parts = re.split(r'[,\n]+', text.strip())

    for part in parts:
        part = part.strip()
        if not part:
            continue

        # Try "qty product_name" pattern
        match = re.match(r'^(\d+)\s+(.+)$', part)
        if not match:
            # Try "product_name qty" pattern
            match = re.match(r'^(.+?)\s+(\d+)$', part)
            if match:
                qty = int(match.group(2))
                product_query = match.group(1).strip()
            else:
                continue
        else:
            qty = int(match.group(1))
            product_query = match.group(2).strip()

        # Search product in DB
        products = await queries.search_products(product_query, limit=1)
        if products:
            product = products[0]
            items.append({
                "product_id": product["id"],
                "product_name": product["name"],
                "quantity": qty,
                "unit_price": product.get("default_price", 0) or 0,
            })

    return items


def resolve_date(text: str) -> Optional[str]:
    """Resolve natural language date to YYYY-MM-DD."""
    text = text.lower().strip()
    today = date.today()

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


def _build_branch_keyboard(branches: List[Dict[str, Any]]) -> InlineKeyboardMarkup:
    """Build inline keyboard for branch selection."""
    buttons = [
        [InlineKeyboardButton(b["name"], callback_data=f"branch_{b['id']}")]
        for b in branches[:6]
    ]
    return InlineKeyboardMarkup(buttons)


def _build_client_keyboard(clients: List[Dict[str, Any]]) -> InlineKeyboardMarkup:
    """Build inline keyboard for client selection."""
    buttons = [
        [InlineKeyboardButton(c["name"], callback_data=f"client_{c['id']}")]
        for c in clients[:5]
    ]
    return InlineKeyboardMarkup(buttons)
