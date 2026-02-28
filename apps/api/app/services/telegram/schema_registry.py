"""Curated database schema registry for AI-powered SQL generation.

Inspired by Hex's Data Manager: enriches raw schema with business descriptions,
scoping rules, and tips so the AI generates accurate, secure queries.
"""

from typing import List, Dict, Any


SCHEMA_REGISTRY: Dict[str, Dict[str, Any]] = {
    "orders": {
        "description": "Pedidos de clientes para entrega. Cada pedido pertenece a un cliente y una sucursal.",
        "columns": {
            "id": "UUID PK",
            "order_number": "TEXT numero secuencial unico (ej: '000234')",
            "client_id": "UUID FK → clients.id",
            "branch_id": "UUID FK → branches.id (sucursal destino)",
            "expected_delivery_date": "DATE fecha de entrega esperada",
            "requested_delivery_date": "DATE fecha solicitada original",
            "status": "TEXT enum: received, review_area1, review_area2, ready_dispatch, dispatched, in_delivery, delivered, partially_delivered, returned, cancelled",
            "total_value": "NUMERIC valor total en pesos colombianos (COP)",
            "subtotal": "NUMERIC subtotal sin IVA",
            "vat_amount": "NUMERIC monto IVA",
            "has_pending_missing": "BOOLEAN tiene faltantes pendientes",
            "observations": "TEXT notas del pedido",
            "purchase_order_number": "TEXT numero de orden de compra del cliente",
            "is_invoiced": "BOOLEAN si ya fue facturado",
            "created_at": "TIMESTAMPTZ",
            "created_by": "UUID FK → users.id quien creo el pedido",
        },
        "scoping": "JOIN clients c ON orders.client_id = c.id WHERE c.assigned_user_id = '{user_id}'",
        "tips": "Siempre filtrar via clients.assigned_user_id. Los status estan en ingles. Para pedidos de hoy: expected_delivery_date = CURRENT_DATE.",
    },
    "order_items": {
        "description": "Items/lineas de un pedido. Cada item es un producto con cantidad y precio.",
        "columns": {
            "id": "UUID PK",
            "order_id": "UUID FK → orders.id",
            "product_id": "UUID FK → products.id",
            "quantity_requested": "NUMERIC cantidad solicitada",
            "quantity_dispatched": "NUMERIC cantidad despachada",
            "quantity_delivered": "NUMERIC cantidad entregada",
            "quantity_returned": "NUMERIC cantidad devuelta",
            "quantity_missing": "NUMERIC cantidad faltante",
            "quantity_available": "NUMERIC cantidad disponible",
            "unit_price": "NUMERIC precio unitario en COP",
            "availability_status": "TEXT estado de disponibilidad",
            "lote": "TEXT numero de lote",
        },
        "scoping": "JOIN orders o ON order_items.order_id = o.id JOIN clients c ON o.client_id = c.id WHERE c.assigned_user_id = '{user_id}'",
        "tips": "Siempre JOINear con orders y clients para scopear. unit_price * quantity_requested = subtotal del item.",
    },
    "clients": {
        "description": "Clientes de la empresa. Cada comercial tiene clientes asignados. Tambien se usan como leads (lead_status != 'client').",
        "columns": {
            "id": "UUID PK",
            "name": "TEXT nombre del cliente/empresa",
            "category": "TEXT categoria del cliente",
            "lead_status": "TEXT etapa: prospect, contacted, qualified, proposal, negotiation, closed_won, closed_lost, client",
            "phone": "TEXT telefono",
            "email": "TEXT correo",
            "assigned_user_id": "UUID FK → users.id comercial asignado",
            "is_active": "BOOLEAN",
            "nit": "TEXT NIT de la empresa",
            "razon_social": "TEXT razon social",
            "contact_person": "TEXT persona de contacto",
            "address": "TEXT direccion",
            "billing_type": "TEXT tipo de facturacion",
            "lead_source_id": "UUID fuente del lead",
        },
        "scoping": "WHERE clients.assigned_user_id = '{user_id}'",
        "tips": "Filtrar por assigned_user_id. Para leads: lead_status != 'client'. Para clientes activos: is_active = true.",
    },
    "branches": {
        "description": "Sucursales/puntos de entrega de un cliente. Un cliente puede tener varias sucursales.",
        "columns": {
            "id": "UUID PK",
            "name": "TEXT nombre de la sucursal",
            "client_id": "UUID FK → clients.id",
            "address": "TEXT direccion",
            "contact_person": "TEXT persona de contacto",
            "phone": "TEXT telefono",
            "email": "TEXT correo",
            "is_main": "BOOLEAN si es la sucursal principal",
            "latitude": "NUMERIC",
            "longitude": "NUMERIC",
        },
        "scoping": "JOIN clients c ON branches.client_id = c.id WHERE c.assigned_user_id = '{user_id}'",
        "tips": "Scopear via clients.assigned_user_id.",
    },
    "products": {
        "description": "Catalogo de productos de la panaderia. No requiere scoping por usuario.",
        "columns": {
            "id": "UUID PK",
            "name": "TEXT nombre del producto",
            "codigo_wo": "TEXT codigo interno del producto",
            "price": "NUMERIC precio de venta en COP",
            "category": "TEXT categoria (panaderia, pasteleria, etc)",
            "subcategory": "TEXT subcategoria",
            "unit": "TEXT unidad de medida (unidad, kg, etc)",
            "weight": "TEXT peso por unidad",
            "is_active": "BOOLEAN",
            "tax_rate": "NUMERIC tasa de impuesto",
        },
        "scoping": "WHERE products.is_active = true",
        "tips": "No requiere filtro por usuario. Filtrar is_active = true para productos vigentes.",
    },
    "client_frequencies": {
        "description": "Dias de entrega configurados por sucursal. day_of_week: 0=domingo, 1=lunes, ..., 6=sabado.",
        "columns": {
            "id": "UUID PK",
            "branch_id": "UUID FK → branches.id",
            "day_of_week": "INTEGER 0-6 (0=domingo, 1=lunes, 2=martes, 3=miercoles, 4=jueves, 5=viernes, 6=sabado)",
            "is_active": "BOOLEAN",
            "notes": "TEXT notas",
        },
        "scoping": "JOIN branches b ON client_frequencies.branch_id = b.id JOIN clients c ON b.client_id = c.id WHERE c.assigned_user_id = '{user_id}'",
        "tips": "Scopear via branches → clients.assigned_user_id. Filtrar is_active = true.",
    },
    "sales_opportunities": {
        "description": "Oportunidades de venta en el pipeline comercial.",
        "columns": {
            "id": "UUID PK",
            "title": "TEXT titulo de la oportunidad",
            "client_id": "UUID FK → clients.id",
            "assigned_user_id": "UUID FK → users.id comercial asignado",
            "pipeline_stage_id": "UUID FK → pipeline_stages.id etapa del pipeline",
            "estimated_value": "NUMERIC valor estimado en COP",
            "probability": "NUMERIC probabilidad de cierre 0-100",
            "status": "TEXT: open, won, lost",
            "expected_close_date": "DATE fecha esperada de cierre",
            "actual_close_date": "DATE fecha real de cierre",
            "description": "TEXT descripcion",
        },
        "scoping": "WHERE sales_opportunities.assigned_user_id = '{user_id}'",
        "tips": "Filtrar por assigned_user_id directamente. JOINear con pipeline_stages para nombre de etapa y clients para nombre de cliente.",
    },
    "pipeline_stages": {
        "description": "Etapas del pipeline de ventas (prospecto, calificado, propuesta, etc).",
        "columns": {
            "id": "UUID PK",
            "name": "TEXT nombre de la etapa",
            "stage_order": "INTEGER orden de la etapa",
            "probability": "NUMERIC probabilidad default de la etapa",
            "is_active": "BOOLEAN",
            "description": "TEXT descripcion",
        },
        "scoping": "",
        "tips": "Tabla de referencia, no requiere scoping. Ordenar por stage_order.",
    },
    "lead_activities": {
        "description": "Actividades CRM: llamadas, visitas, reuniones, emails, seguimientos registrados por el comercial.",
        "columns": {
            "id": "UUID PK",
            "client_id": "UUID FK → clients.id",
            "user_id": "UUID FK → users.id comercial que registra",
            "activity_type": "TEXT: call, email, meeting, note, proposal, follow_up",
            "title": "TEXT titulo de la actividad",
            "description": "TEXT descripcion detallada",
            "status": "TEXT: pending, completed",
            "scheduled_date": "TIMESTAMPTZ fecha programada",
            "completed_date": "TIMESTAMPTZ fecha de completado",
            "estimated_value": "NUMERIC valor estimado",
            "actual_value": "NUMERIC valor real",
        },
        "scoping": "WHERE lead_activities.user_id = '{user_id}'",
        "tips": "Filtrar por user_id. Para vencidas: status = 'pending' AND scheduled_date < NOW(). activity_type en ingles.",
    },
}

# Table name → short description for the system prompt
TABLE_SUMMARIES = {name: info["description"].split(".")[0] for name, info in SCHEMA_REGISTRY.items()}


def get_schema_context(tables: List[str], user_id: str) -> str:
    """Build curated schema prompt for the requested tables.

    Returns a formatted string with table descriptions, columns, scoping rules,
    and tips - ready to inject into the SQL generation prompt.
    """
    sections = []

    for table_name in tables:
        info = SCHEMA_REGISTRY.get(table_name)
        if not info:
            continue

        cols = "\n".join(f"  - {col}: {desc}" for col, desc in info["columns"].items())
        scoping = info["scoping"].replace("{user_id}", user_id) if info["scoping"] else "Sin restriccion"

        section = (
            f"### {table_name}\n"
            f"{info['description']}\n"
            f"Columnas:\n{cols}\n"
            f"Scoping: {scoping}\n"
            f"Tips: {info['tips']}"
        )
        sections.append(section)

    return "\n\n".join(sections)


def get_table_list_prompt() -> str:
    """Return a concise list of available tables for the main system prompt."""
    lines = [f"- {name}: {desc}" for name, desc in TABLE_SUMMARIES.items()]
    return "\n".join(lines)
