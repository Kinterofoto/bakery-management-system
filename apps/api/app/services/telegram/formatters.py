"""Telegram Markdown formatters for conversation flows and daily summaries.

Note: General query result formatting is now handled by the AI agent directly
via the dynamic SQL query skill. This file only contains formatters needed by
structured conversation flows (create/modify order) and daily summaries.
"""

from typing import List, Dict, Any
from datetime import datetime


# Status labels in Spanish
ORDER_STATUS_LABELS = {
    "received": "Recibido",
    "review_area1": "Revision Area 1",
    "review_area2": "Revision Area 2",
    "ready_dispatch": "Listo Despacho",
    "dispatched": "Despachado",
    "in_delivery": "En Entrega",
    "delivered": "Entregado",
    "partially_delivered": "Entregado Parcial",
    "returned": "Devuelto",
    "cancelled": "Cancelado",
}

ACTIVITY_TYPE_LABELS = {
    "call": "Llamada",
    "email": "Email",
    "meeting": "Reunion",
    "note": "Nota",
    "proposal": "Propuesta",
    "follow_up": "Seguimiento",
}


def format_currency(value: float) -> str:
    """Format as Colombian Pesos."""
    if value is None:
        return "$0"
    return f"${value:,.0f}"


def format_date(date_str: str) -> str:
    """Format ISO date to readable Spanish format."""
    if not date_str:
        return "N/A"
    try:
        if "T" in date_str:
            dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        else:
            dt = datetime.strptime(date_str, "%Y-%m-%d")
        return dt.strftime("%d/%m/%Y")
    except (ValueError, TypeError):
        return date_str


def format_order_detail(order: Dict[str, Any], items: List[Dict[str, Any]] = None) -> str:
    """Format a single order with details (used by modify_order flow)."""
    status = ORDER_STATUS_LABELS.get(order.get("status", ""), order.get("status", ""))
    num = order.get("order_number", "?")
    client_name = order.get("client_name", "N/A")
    if not client_name and isinstance(order.get("clients"), dict):
        client_name = order["clients"].get("name", "N/A")
    branch_name = order.get("branch_name", "")
    if not branch_name and isinstance(order.get("branches"), dict):
        branch_name = order["branches"].get("name", "")
    date = format_date(order.get("expected_delivery_date", ""))
    total = format_currency(order.get("total_value", 0))

    lines = [
        f"*Pedido #{num}*",
        f"Cliente: {client_name}",
    ]
    if branch_name:
        lines.append(f"Sucursal: {branch_name}")
    lines.extend([
        f"Fecha entrega: {date}",
        f"Estado: {status}",
        f"Total: {total}",
    ])

    if items:
        lines.append("\n*Productos:*")
        for item in items:
            product_name = item.get("product_name") or "Producto"
            if isinstance(item.get("products"), dict):
                product_name = item["products"].get("name", product_name)
            qty_req = item.get("quantity_requested", 0)
            qty_disp = item.get("quantity_dispatched", 0)
            qty_del = item.get("quantity_delivered", 0)
            price = format_currency(item.get("unit_price", 0))

            line = f"  - {product_name}: {qty_req} uds x {price}"
            if qty_disp:
                line += f" (desp: {qty_disp})"
            if qty_del:
                line += f" (entr: {qty_del})"
            lines.append(line)

    return "\n".join(lines)


def format_daily_summary(data: Dict[str, Any], period: str = "AM") -> str:
    """Format AM or PM daily summary."""
    lines = []

    if period == "AM":
        lines.append("*Buenos dias! Resumen de hoy:*\n")

        # Orders today
        orders_count = data.get("orders_today_count", 0)
        orders_total = format_currency(data.get("orders_today_total", 0))
        lines.append(f"*Pedidos hoy:* {orders_count} ({orders_total})")

        # By status
        by_status = data.get("orders_by_status", {})
        if by_status:
            for status, count in by_status.items():
                label = ORDER_STATUS_LABELS.get(status, status)
                lines.append(f"  {label}: {count}")

        # Missing
        missing = data.get("orders_with_missing", 0)
        if missing:
            lines.append(f"\nPedidos con faltantes: {missing}")

        # CRM
        pending = data.get("pending_activities", 0)
        overdue = data.get("overdue_activities", 0)
        if pending or overdue:
            lines.append(f"\n*CRM:*")
            if pending:
                lines.append(f"  Actividades pendientes hoy: {pending}")
            if overdue:
                lines.append(f"  Actividades vencidas: {overdue}")

    else:  # PM
        lines.append("*Resumen del dia:*\n")

        # Orders summary
        orders_count = data.get("orders_today_count", 0)
        orders_total = format_currency(data.get("orders_today_total", 0))
        lines.append(f"*Pedidos del dia:* {orders_count} ({orders_total})")

        by_status = data.get("orders_by_status", {})
        if by_status:
            for status, count in by_status.items():
                label = ORDER_STATUS_LABELS.get(status, status)
                lines.append(f"  {label}: {count}")

        # Completed activities
        completed = data.get("completed_activities_today", 0)
        if completed:
            lines.append(f"\nActividades completadas hoy: {completed}")

        # Tomorrow preview
        tom_count = data.get("orders_tomorrow_count", 0)
        tom_total = format_currency(data.get("orders_tomorrow_total", 0))
        if tom_count:
            lines.append(f"\n*Manana:* {tom_count} pedidos ({tom_total})")

        # Leads needing follow-up
        followup = data.get("leads_needing_followup", 0)
        if followup:
            lines.append(f"\nLeads que requieren seguimiento: {followup}")

    return "\n".join(lines)


def format_order_confirmation(order_data: Dict[str, Any]) -> str:
    """Format order summary for confirmation before creating."""
    client_name = order_data.get("client_name", "N/A")
    branch_name = order_data.get("branch_name", "")
    date = order_data.get("expected_delivery_date", "")
    items = order_data.get("items", [])

    lines = [
        "*Confirmar pedido:*\n",
        f"Cliente: {client_name}",
    ]
    if branch_name:
        lines.append(f"Sucursal: {branch_name}")
    lines.append(f"Fecha entrega: {format_date(date)}\n")

    total = 0
    lines.append("*Productos:*")
    for item in items:
        name = item.get("product_name", "Producto")
        qty = item.get("quantity", 0)
        price = item.get("unit_price", 0)
        subtotal = qty * price
        total += subtotal
        lines.append(f"  - {name}: {qty} x {format_currency(price)} = {format_currency(subtotal)}")

    lines.append(f"\n*Total: {format_currency(total)}*")

    return "\n".join(lines)
