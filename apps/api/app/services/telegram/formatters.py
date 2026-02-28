"""Telegram Markdown formatters for orders, CRM, and summaries."""

from typing import List, Dict, Any, Optional
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

LEAD_STATUS_LABELS = {
    "prospect": "Prospecto",
    "contacted": "Contactado",
    "qualified": "Calificado",
    "proposal": "Propuesta",
    "negotiation": "Negociacion",
    "closed_won": "Ganado",
    "closed_lost": "Perdido",
    "client": "Cliente",
}

ACTIVITY_TYPE_LABELS = {
    "call": "Llamada",
    "email": "Email",
    "meeting": "Reunion",
    "note": "Nota",
    "proposal": "Propuesta",
    "follow_up": "Seguimiento",
}

DAY_NAMES = {
    0: "Domingo",
    1: "Lunes",
    2: "Martes",
    3: "Miercoles",
    4: "Jueves",
    5: "Viernes",
    6: "Sabado",
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


def format_orders_list(orders: List[Dict[str, Any]]) -> str:
    """Format a list of orders for Telegram."""
    if not orders:
        return "No se encontraron pedidos."

    lines = [f"*Pedidos ({len(orders)}):*\n"]
    for o in orders[:15]:  # Limit to 15 to avoid message size issues
        status = ORDER_STATUS_LABELS.get(o.get("status", ""), o.get("status", ""))
        client_name = o.get("client_name") or o.get("clients", {}).get("name", "N/A") if isinstance(o.get("clients"), dict) else "N/A"
        total = format_currency(o.get("total_value", 0))
        date = format_date(o.get("expected_delivery_date", ""))
        num = o.get("order_number", "?")

        lines.append(
            f"  #{num} | {client_name}\n"
            f"  {date} | {status} | {total}"
        )

    if len(orders) > 15:
        lines.append(f"\n_...y {len(orders) - 15} mas_")

    return "\n".join(lines)


def format_order_detail(order: Dict[str, Any], items: List[Dict[str, Any]] = None) -> str:
    """Format a single order with details."""
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


def format_clients_list(clients: List[Dict[str, Any]]) -> str:
    """Format a list of clients."""
    if not clients:
        return "No tienes clientes asignados."

    lines = [f"*Tus Clientes ({len(clients)}):*\n"]
    for c in clients[:20]:
        name = c.get("name", "N/A")
        category = c.get("category", "")
        status = LEAD_STATUS_LABELS.get(c.get("lead_status", ""), c.get("lead_status", ""))
        cat_str = f" [{category}]" if category else ""
        lines.append(f"  - {name}{cat_str} ({status})")

    if len(clients) > 20:
        lines.append(f"\n_...y {len(clients) - 20} mas_")

    return "\n".join(lines)


def format_frequencies(frequencies: List[Dict[str, Any]], client_name: str = "") -> str:
    """Format delivery frequencies."""
    if not frequencies:
        return f"No hay frecuencias configuradas{' para ' + client_name if client_name else ''}."

    header = f"*Frecuencias de entrega{' - ' + client_name if client_name else ''}:*\n"
    lines = [header]

    # Group by branch
    by_branch: Dict[str, List[int]] = {}
    for f in frequencies:
        branch_name = f.get("branch_name", "")
        if not branch_name and isinstance(f.get("branches"), dict):
            branch_name = f["branches"].get("name", "Sucursal")
        day = f.get("day_of_week", 0)
        by_branch.setdefault(branch_name, []).append(day)

    for branch, days in by_branch.items():
        day_names = [DAY_NAMES.get(d, str(d)) for d in sorted(days)]
        lines.append(f"  {branch}: {', '.join(day_names)}")

    return "\n".join(lines)


def format_leads_summary(leads: List[Dict[str, Any]]) -> str:
    """Format leads summary with names grouped by status."""
    if not leads:
        return "No tienes leads activos."

    # Group by status
    by_status: Dict[str, List[str]] = {}
    for lead in leads:
        status = lead.get("lead_status", "prospect")
        name = lead.get("name", "N/A")
        by_status.setdefault(status, []).append(name)

    lines = [f"*Tus Leads ({len(leads)}):*\n"]
    for status, names in sorted(by_status.items()):
        label = LEAD_STATUS_LABELS.get(status, status)
        lines.append(f"*{label}* ({len(names)}):")
        for name in names[:10]:
            lines.append(f"  - {name}")
        if len(names) > 10:
            lines.append(f"  _...y {len(names) - 10} mas_")
        lines.append("")

    return "\n".join(lines)


def format_pipeline(opportunities: List[Dict[str, Any]]) -> str:
    """Format sales pipeline/opportunities."""
    if not opportunities:
        return "No tienes oportunidades en el pipeline."

    total_value = sum(o.get("estimated_value", 0) or 0 for o in opportunities)
    lines = [
        f"*Pipeline ({len(opportunities)} oportunidades):*",
        f"Valor total estimado: {format_currency(total_value)}\n",
    ]

    for o in opportunities[:10]:
        title = o.get("title", "N/A")
        value = format_currency(o.get("estimated_value", 0))
        status = o.get("status", "open")
        stage_name = ""
        if isinstance(o.get("pipeline_stages"), dict):
            stage_name = o["pipeline_stages"].get("name", "")
        prob = o.get("probability", 0)
        lines.append(f"  - {title} | {value} | {stage_name} ({prob}%)")

    if len(opportunities) > 10:
        lines.append(f"\n_...y {len(opportunities) - 10} mas_")

    return "\n".join(lines)


def format_activities(activities: List[Dict[str, Any]], title: str = "Actividades") -> str:
    """Format list of CRM activities."""
    if not activities:
        return f"No hay {title.lower()} pendientes."

    lines = [f"*{title} ({len(activities)}):*\n"]
    for a in activities[:10]:
        act_type = ACTIVITY_TYPE_LABELS.get(a.get("activity_type", ""), a.get("activity_type", ""))
        act_title = a.get("title", "N/A")
        status = a.get("status", "pending")
        client_name = ""
        if isinstance(a.get("clients"), dict):
            client_name = f" - {a['clients'].get('name', '')}"
        scheduled = ""
        if a.get("scheduled_date"):
            scheduled = f" ({format_date(a['scheduled_date'])})"

        emoji = "+" if status == "completed" else "-"
        lines.append(f"  {emoji} [{act_type}] {act_title}{client_name}{scheduled}")

    if len(activities) > 10:
        lines.append(f"\n_...y {len(activities) - 10} mas_")

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
