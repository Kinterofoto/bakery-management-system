"""AI Agent: Multi-agent router architecture for Telegram bot.

Architecture:
- Router (no tools, fast): classifies intent and dispatches to specialist agent
- Specialists (2-3 tools each): orders, CRM, email, calendar, query, summary
- Greetings/chat: handled directly by router with personality (zero tools)
- Each specialist has a focused prompt + only its relevant tools
"""

import asyncio
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import date, timedelta, datetime, timezone

from ...core.tz import BOG_OFFSET, today_bogota

from ...services.openai_client import get_openai_client
from . import memory, queries, crm_queries, formatters
from .sql_executor import generate_and_execute_query
from .schema_registry import get_table_list_prompt

logger = logging.getLogger(__name__)

# Available tables for the query_data tool
AVAILABLE_TABLES = [
    "orders", "order_items", "clients", "branches", "products",
    "client_frequencies", "sales_opportunities", "pipeline_stages", "lead_activities",
]

# ─── Personality (shared across all agents) ───

PERSONALITY = """Eres Geraldine, la asistente comercial de Pastry Chef (panaderia industrial).
- Joven, energica, alegre. Tono cercano, colombiano, profesional.
- Expresiones naturales: "listo!", "dale!", "con toda!", "super".
- Uno que otro emoji, sin exceso.
- Responde siempre en español colombiano.
- Puedes ver y analizar imagenes/fotos que te envien. Describe lo que ves con naturalidad."""

# ─── Router prompt (NO tools - just classifies intent) ───

ROUTER_PROMPT = PERSONALITY + """

Fecha de hoy: {today}. Ayudas a {user_name}.

Tu UNICA tarea: clasificar el mensaje del usuario en UNA categoria.

Categorias:
- "greeting" = saludos, agradecimientos, preguntas generales, despedidas, que puedes hacer
- "orders" = crear pedido, productos, cantidades, confirmar pedido, paquetes/unidades
- "modify_order" = modificar pedido existente, cambiar pedido, numero de pedido
- "crm" = registrar llamada, visita, reunion, actividad CRM, completar actividad
- "email" = correos, enviar correo, responder correo, bandeja, inbox
- "calendar" = agenda, reuniones del calendario Outlook, citas, eventos, mi agenda
- "query" = consultas de datos, cuantos pedidos, mis clientes, ventas, estadisticas
- "query_data" = consultas de datos (alias de query)
- "summary" = resumen del dia, como voy, mi resumen

IMPORTANTE — Razona con el contexto antes de clasificar:
1. Mira la conversacion reciente: hay un flujo activo? (pedido, CRM, email, etc.)
2. Si hay un flujo activo y el mensaje puede ser continuacion (fecha, nombre de cliente, producto, cantidad, "si", "no", sucursal), clasificalo en la MISMA categoria del flujo activo.
3. Solo cambia de categoria si el mensaje es CLARAMENTE un tema nuevo.

Ejemplos de continuacion:
- Flujo orders activo + "para el lunes" → orders (es la fecha del pedido, NO calendar)
- Flujo orders activo + "Compensar" → orders (es el cliente, NO greeting)
- Flujo orders activo + "sucursal cota" → orders (es la sucursal del pedido)
- Flujo crm activo + "manana a las 10" → crm (es detalle de la actividad, NO calendar)
- Flujo email activo + "si, envialo" → email (es confirmacion)
- Sin flujo activo + "para el lunes" → calendar (no hay contexto previo)

Responde en JSON: {{"razon": "<analisis breve del contexto>", "intent": "<categoria>"}}

Conversacion reciente:
{context}"""

# ─── Specialist tool definitions (compact, 2-3 tools each) ───

TOOLS_ORDERS = [
    {"type": "function", "function": {
        "name": "preview_order",
        "description": "Previsualizar pedido ANTES de crearlo. Resuelve productos con busqueda inteligente y convierte unidades a paquetes.",
        "parameters": {"type": "object", "properties": {
            "client_name": {"type": "string", "description": "Nombre del cliente"},
            "branch_name": {"type": "string", "description": "Nombre de la sucursal (opcional si una sola)"},
            "delivery_date": {"type": "string", "description": "Fecha: 'hoy', 'manana', o YYYY-MM-DD"},
            "items": {"type": "array", "items": {"type": "object", "properties": {
                "name": {"type": "string", "description": "Nombre del producto"},
                "quantity": {"type": "integer", "description": "Cantidad"},
            }, "required": ["name", "quantity"]}, "description": "Productos con nombre y cantidad"},
            "unit_type": {"type": "string", "enum": ["paquetes", "unidades"], "description": "Si las cantidades son en paquetes o unidades. SIEMPRE preguntar."},
        }, "required": ["client_name", "delivery_date", "items", "unit_type"]},
    }},
    {"type": "function", "function": {
        "name": "confirm_order",
        "description": "Confirmar y crear el pedido previamente previsualizado. SOLO despues de que el usuario confirme.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    }},
    {"type": "function", "function": {
        "name": "modify_order",
        "description": "Iniciar flujo para modificar un pedido existente.",
        "parameters": {"type": "object", "properties": {
            "order_number": {"type": "string", "description": "Numero de pedido a modificar"},
        }, "required": ["order_number"]},
    }},
]

TOOLS_CRM = [
    {"type": "function", "function": {
        "name": "create_activity",
        "description": "Registrar actividad CRM (llamada, visita, reunion, etc).",
        "parameters": {"type": "object", "properties": {
            "client_name": {"type": "string", "description": "Nombre del cliente"},
            "activity_type": {"type": "string", "description": "Tipo: llamada, visita, reunion, email, propuesta, seguimiento"},
            "title": {"type": "string", "description": "Titulo breve"},
            "description": {"type": "string", "description": "Descripcion detallada (opcional)"},
        }, "required": ["client_name", "activity_type"]},
    }},
    {"type": "function", "function": {
        "name": "complete_activity",
        "description": "Marcar actividad CRM como completada.",
        "parameters": {"type": "object", "properties": {
            "client_name": {"type": "string", "description": "Nombre del cliente"},
            "activity_type": {"type": "string", "description": "Tipo de actividad a completar"},
        }, "required": []},
    }},
]

TOOLS_EMAIL = [
    {"type": "function", "function": {
        "name": "check_emails",
        "description": "Revisar correos nuevos (filtra spam/promo).",
        "parameters": {"type": "object", "properties": {}, "required": []},
    }},
    {"type": "function", "function": {
        "name": "reply_email",
        "description": "Responder a un correo existente. SOLO cuando el usuario confirme.",
        "parameters": {"type": "object", "properties": {
            "email_reference": {"type": "string", "description": "Referencia: nombre del remitente o asunto"},
            "reply_text": {"type": "string", "description": "Texto de la respuesta"},
        }, "required": ["email_reference", "reply_text"]},
    }},
    {"type": "function", "function": {
        "name": "send_email",
        "description": "Enviar correo nuevo. SOLO cuando el usuario confirme.",
        "parameters": {"type": "object", "properties": {
            "to": {"type": "string", "description": "Direccion del destinatario"},
            "subject": {"type": "string", "description": "Asunto"},
            "body": {"type": "string", "description": "Cuerpo del correo"},
        }, "required": ["to", "subject", "body"]},
    }},
]

TOOLS_CALENDAR = [
    {"type": "function", "function": {
        "name": "query_calendar",
        "description": "Consultar eventos del calendario de Outlook.",
        "parameters": {"type": "object", "properties": {
            "start_date": {"type": "string", "description": "Fecha inicio YYYY-MM-DD (default: hoy)"},
            "end_date": {"type": "string", "description": "Fecha fin YYYY-MM-DD (default: mismo dia)"},
        }, "required": []},
    }},
    {"type": "function", "function": {
        "name": "create_event",
        "description": "Crear evento en calendario Outlook. SOLO cuando el usuario confirme.",
        "parameters": {"type": "object", "properties": {
            "subject": {"type": "string", "description": "Titulo del evento"},
            "start_datetime": {"type": "string", "description": "Inicio: YYYY-MM-DDTHH:MM:SS"},
            "end_datetime": {"type": "string", "description": "Fin: YYYY-MM-DDTHH:MM:SS"},
            "location": {"type": "string", "description": "Lugar (opcional)"},
            "attendees": {"type": "array", "items": {"type": "string"}, "description": "Correos de asistentes (opcional)"},
        }, "required": ["subject", "start_datetime", "end_datetime"]},
    }},
]

TOOLS_QUERY = [
    {"type": "function", "function": {
        "name": "query_data",
        "description": "Consultar datos del sistema usando lenguaje natural (pedidos, clientes, ventas, leads, etc).",
        "parameters": {"type": "object", "properties": {
            "question": {"type": "string", "description": "La pregunta en lenguaje natural con todo el contexto"},
            "tables": {"type": "array", "items": {"type": "string"},
                       "description": "Tablas: orders, order_items, clients, branches, products, client_frequencies, sales_opportunities, pipeline_stages, lead_activities"},
        }, "required": ["question", "tables"]},
    }},
]

TOOLS_SUMMARY = [
    {"type": "function", "function": {
        "name": "daily_summary",
        "description": "Generar resumen diario (pedidos, CRM, actividades).",
        "parameters": {"type": "object", "properties": {}, "required": []},
    }},
]

# ─── Specialist prompts ───

PROMPT_ORDERS = PERSONALITY + """
Fecha de hoy: {today}. Ayudas a {user_name}.

Eres la agente de PEDIDOS. Tu trabajo es crear y modificar pedidos.

Para crear pedidos (CRITICO):
REGLA ABSOLUTA: NUNCA escribas listas de productos, cantidades, conversiones o resumenes como texto.
Tu NO conoces los nombres reales de los productos ni las conversiones. SOLO preview_order puede hacerlo.

Pasos:
1. Si falta el cliente, pregunta: "Para que cliente?"
2. Si falta la fecha, pregunta: "Para que fecha?" (si no la mencionan, asume "mañana")
3. Si faltan los productos, pregunta: "Que productos y cantidades?"
4. Si no sabes si son paquetes o unidades, pregunta: "Las cantidades son en paquetes o unidades?"
5. Cuando tengas los 4 datos → llama preview_order INMEDIATAMENTE
6. Si el usuario da todos los datos en un solo mensaje → llama preview_order DE UNA VEZ
7. Cuando el usuario confirme ("si"/"dale"/"confirma") → llama confirm_order

PROHIBIDO:
- NO repitas la lista de productos como texto
- NO hagas conversiones de unidades a paquetes tu mismo
- Si tienes los 4 datos, tu UNICA respuesta valida es llamar preview_order

Notas:
- El usuario puede dar varios datos en un solo mensaje
- Recuerda datos de mensajes anteriores - NO vuelvas a pedirlos"""

PROMPT_CRM = PERSONALITY + """
Fecha de hoy: {today}. Ayudas a {user_name}.

Eres la agente de CRM. Registras y completas actividades comerciales.
- Para registrar llamada/visita/reunion: usa create_activity
- Para completar actividad: usa complete_activity
- Si falta el cliente o tipo, pregunta antes de llamar la herramienta."""

PROMPT_EMAIL = PERSONALITY + """
Fecha de hoy: {today}. Ayudas a {user_name}.

Eres la agente de CORREO.
- Para revisar correos: usa check_emails (filtra promociones automaticamente)
- Para responder: usa reply_email. SIEMPRE muestra resumen y pide confirmacion antes.
- Para enviar nuevo: usa send_email. SIEMPRE muestra resumen y pide confirmacion antes.
- Formato de confirmacion:
  "Voy a enviar esto:
  Para: destinatario
  Asunto: ...
  Mensaje: ...
  Confirmo?"
- SOLO llama send_email/reply_email cuando el usuario diga "si"/"dale"/"confirma"."""

PROMPT_CALENDAR = PERSONALITY + """
Fecha de hoy: {today}. Ayudas a {user_name}.

Eres la agente de CALENDARIO (Outlook).
- Para consultar agenda: usa query_calendar
- Para crear evento: usa create_event. SIEMPRE pide confirmacion primero.
- Si no dice hora de fin, asume 1 hora de duracion.
- Formato de confirmacion:
  "Voy a crear:
  Titulo: ...
  Fecha: ...
  Hora: HH:MM - HH:MM
  Confirmo?"
- SOLO llama create_event cuando confirme."""

PROMPT_QUERY = PERSONALITY + """
Fecha de hoy: {today}. Ayudas a {user_name}.

Eres la agente de CONSULTAS DE DATOS.
Cuando el usuario pregunte sobre pedidos, clientes, ventas, leads, oportunidades, etc., usa query_data.
Incluye en "question" todo el contexto necesario (nombres, fechas, etc).
Selecciona SOLO las tablas necesarias.

Tablas disponibles:
{table_list}"""

PROMPT_SUMMARY = PERSONALITY + """
Fecha de hoy: {today}. Ayudas a {user_name}.

Eres la agente de RESUMEN DIARIO. Cuando te pidan el resumen, llama daily_summary."""

# ─── Agent config mapping ───

AGENT_CONFIG = {
    "orders": {"tools": TOOLS_ORDERS, "prompt": PROMPT_ORDERS},
    "modify_order": {"tools": TOOLS_ORDERS, "prompt": PROMPT_ORDERS},
    "crm": {"tools": TOOLS_CRM, "prompt": PROMPT_CRM},
    "email": {"tools": TOOLS_EMAIL, "prompt": PROMPT_EMAIL},
    "calendar": {"tools": TOOLS_CALENDAR, "prompt": PROMPT_CALENDAR},
    "query": {"tools": TOOLS_QUERY, "prompt": PROMPT_QUERY},
    "summary": {"tools": TOOLS_SUMMARY, "prompt": PROMPT_SUMMARY},
}

# ─── Greeting prompt (no tools, direct text response) ───

GREETING_PROMPT = PERSONALITY + """
Fecha de hoy: {today}. Ayudas a {user_name}.

El usuario te saluda o hace una pregunta general. Responde de forma natural y breve.
Si pregunta que puedes hacer, menciona brevemente: pedidos, consultas de datos, CRM, correo y calendario.
No des listas largas, se concisa y calida."""


# ═══════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════


def _build_user_content(text: str, image_url: Optional[str] = None):
    """Build user message content — plain text or multimodal with image."""
    if not image_url:
        return text
    content = [{"type": "text", "text": text}]
    content.append({"type": "image_url", "image_url": {"url": image_url}})
    return content


# ═══════════════════════════════════════════════════════════════
# Main entry point
# ═══════════════════════════════════════════════════════════════

async def process_message(
    user_id: str,
    user_name: str,
    telegram_chat_id: int,
    message_text: str,
    history: List[Dict[str, Any]] = None,
    image_url: Optional[str] = None,
) -> str:
    """Process a message using the multi-agent router architecture.

    Flow:
    1. Router (no tools): classify intent in one fast call
    2. Dispatch to specialist agent with only its 2-3 tools
    3. Greetings bypass tools entirely

    Args:
        image_url: Optional base64 data URL for photo messages (vision support).
    """
    openai_client = get_openai_client()

    # Use pre-fetched history or fetch if not provided
    if history is None:
        history = await memory.get_recent_messages(telegram_chat_id)

    today = today_bogota().isoformat()

    # If image with no caption, set a default prompt
    if image_url and not message_text:
        message_text = "Que ves en esta imagen?"

    try:
        # ─── Step 1: Route intent (fast, no tools) ───
        intent = await _route_intent(openai_client, user_name, today, history, message_text, image_url)
        logger.info(f"Router intent: {intent} for message: {message_text[:50]}")

        # ─── Step 2: Handle greeting (no tools needed) ───
        if intent == "greeting":
            return await _handle_greeting(
                openai_client, user_name, today, history, message_text, telegram_chat_id, image_url
            )

        # ─── Step 3: Dispatch to specialist agent ───
        config = AGENT_CONFIG.get(intent)
        if not config:
            # Fallback: treat as greeting
            return await _handle_greeting(
                openai_client, user_name, today, history, message_text, telegram_chat_id, image_url
            )

        result = await _run_specialist(
            openai_client=openai_client,
            config=config,
            user_id=user_id,
            user_name=user_name,
            telegram_chat_id=telegram_chat_id,
            message_text=message_text,
            history=history,
            today=today,
            intent=intent,
            image_url=image_url,
        )

        # Save to conversation history
        await memory.save_message(telegram_chat_id, "user", message_text, intent=intent)
        await memory.save_message(telegram_chat_id, "assistant", result, intent=intent)

        return result

    except Exception as e:
        logger.error(f"AI agent error: {e}", exc_info=True)
        return "Hubo un error procesando tu mensaje. Intenta de nuevo."


async def _route_intent(
    openai_client,
    user_name: str,
    today: str,
    history: List[Dict[str, Any]],
    message_text: str,
    image_url: Optional[str] = None,
) -> str:
    """Classify user intent via a fast, no-tools OpenAI call with chain-of-thought."""
    # Build context from last few messages
    context_lines = []
    for msg in history[-4:]:
        role = "Usuario" if msg["role"] == "user" else "Geraldine"
        content = msg["content"][:100]
        context_lines.append(f"{role}: {content}")
    context = "\n".join(context_lines) if context_lines else "(primera interaccion)"

    prompt = ROUTER_PROMPT.format(
        today=today,
        user_name=user_name,
        context=context,
    )

    # Build user message (text or multimodal with image)
    user_content = _build_user_content(message_text, image_url)

    response = await openai_client.client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": user_content},
        ],
        temperature=0.0,
        max_tokens=150,
    )

    raw = (response.choices[0].message.content or "").strip()

    # Try to parse JSON response
    intent = _parse_router_response(raw)

    logger.info(f"Router reasoning: {raw[:120]}")
    return intent


def _parse_router_response(raw: str) -> str:
    """Parse router response — handles JSON format or plain text fallback."""
    valid_intents = {"greeting", "orders", "modify_order", "crm", "email", "calendar", "query", "summary"}

    # Try JSON parse first
    try:
        # Handle markdown code blocks
        clean = raw.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

        parsed = json.loads(clean)
        intent = parsed.get("intent", "").strip().lower().strip('"')

        # Normalize query_data alias
        if intent == "query_data":
            intent = "query"

        if intent in valid_intents:
            return intent
    except (json.JSONDecodeError, AttributeError):
        pass

    # Fallback: extract intent from raw text
    raw_lower = raw.lower().strip().strip('"')

    # Direct match
    if raw_lower in valid_intents:
        return raw_lower

    # Fuzzy match
    for intent in valid_intents:
        if intent in raw_lower:
            return intent

    return "greeting"  # Safe fallback


async def _handle_greeting(
    openai_client,
    user_name: str,
    today: str,
    history: List[Dict[str, Any]],
    message_text: str,
    telegram_chat_id: int,
    image_url: Optional[str] = None,
) -> str:
    """Handle greetings/general chat with no tools — fast response."""
    prompt = GREETING_PROMPT.format(today=today, user_name=user_name)

    messages = [{"role": "system", "content": prompt}]
    messages.extend(history[-6:])
    user_content = _build_user_content(message_text, image_url)
    messages.append({"role": "user", "content": user_content})

    response = await openai_client.client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.5,
        max_tokens=300,
    )

    content = response.choices[0].message.content or "Hola! En que te puedo ayudar?"
    await memory.save_message(telegram_chat_id, "user", message_text, intent="greeting")
    await memory.save_message(telegram_chat_id, "assistant", content, intent="greeting")
    return content


async def _run_specialist(
    openai_client,
    config: Dict[str, Any],
    user_id: str,
    user_name: str,
    telegram_chat_id: int,
    message_text: str,
    history: List[Dict[str, Any]],
    today: str,
    intent: str,
    image_url: Optional[str] = None,
) -> str:
    """Run a specialist agent with its focused tools and prompt."""
    tools = config["tools"]
    prompt_template = config["prompt"]

    # Build system prompt
    format_kwargs = {"today": today, "user_name": user_name}
    if "{table_list}" in prompt_template:
        format_kwargs["table_list"] = get_table_list_prompt()
    system_prompt = prompt_template.format(**format_kwargs)

    # Limit history based on agent type:
    # - orders: needs more history (multi-turn: client, date, products, confirm)
    # - query/summary: user's message is self-contained, history just confuses
    # - others: moderate history for context
    if intent in ("query", "summary"):
        recent = history[-2:]
    elif intent in ("orders", "modify_order"):
        recent = history[-10:]
    else:
        recent = history[-6:]

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(recent)
    user_content = _build_user_content(message_text, image_url)
    messages.append({"role": "user", "content": user_content})

    # Specialist OpenAI call with focused tools
    response = await openai_client.client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        tools=tools,
        tool_choice="auto",
        temperature=0.3,
        max_tokens=500,
    )

    choice = response.choices[0]

    # No tool call = specialist responded with text (asking for more info, etc.)
    if not choice.message.tool_calls:
        return choice.message.content or "No entendi tu mensaje. Escribe /ayuda para ver las opciones."

    tool_call = choice.message.tool_calls[0]
    function_name = tool_call.function.name
    arguments = json.loads(tool_call.function.arguments)

    logger.info(f"Specialist [{intent}] tool: {function_name}, args: {arguments}")

    # Handle query_data with two-turn flow (needs second call to format results)
    if function_name == "query_data":
        return await _handle_query_data(
            openai_client=openai_client,
            messages=messages,
            tool_call=tool_call,
            arguments=arguments,
            user_id=user_id,
        )

    # Execute all other tools directly
    return await execute_function(
        function_name=function_name,
        arguments=arguments,
        user_id=user_id,
        user_name=user_name,
        telegram_chat_id=telegram_chat_id,
    )


# ═══════════════════════════════════════════════════════════════
# Tool handlers
# ═══════════════════════════════════════════════════════════════

async def _resolve_client_names_in_query(question: str, user_id: str) -> str:
    """Resolve potential client names in a query question via RAG.

    Uses a lightweight LLM call to extract client names from the question,
    then resolves them with the RAG vector search (clientes_rag). Replaces
    typos/abbreviations with the real DB name so the SQL generator uses
    exact matches.

    Example: "cuanto me ha comprado conpensarrr este mes"
           → "cuanto me ha comprado CAJA DE COMPENSACION FAMILIAR COMPENSAR este mes"
    """
    from ..rag_sync import match_client as rag_match_client

    openai_client = get_openai_client()

    # Step 1: Ask LLM to extract and clean client names from the question
    extract_response = await openai_client.client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": (
                "Extrae nombres de clientes/empresas mencionados en la pregunta del usuario. "
                "CORRIGE errores de escritura al nombre mas probable (ej: 'conpensarrr' → 'Compensar', "
                "'doble tri' → 'Double Tree', 'bogota plasa' → 'Bogota Plaza'). "
                "Responde SOLO con los nombres corregidos separados por | o 'NINGUNO' si no hay. "
                "No incluyas palabras genericas como 'clientes', 'cliente'. "
                "Solo nombres propios de empresas/personas."
            )},
            {"role": "user", "content": question},
        ],
        temperature=0.0,
        max_tokens=50,
    )

    raw = (extract_response.choices[0].message.content or "").strip()
    if not raw or raw.upper() == "NINGUNO":
        return question

    # Step 2: Resolve each extracted name via RAG (global, not scoped to user)
    candidate_names = [n.strip() for n in raw.split("|") if n.strip()]
    resolved = []

    for candidate in candidate_names:
        rag_result = await rag_match_client(candidate)
        if rag_result and rag_result.get("matched_content"):
            real_name = rag_result["matched_content"]
            logger.info(
                f"Query client resolved: '{candidate}' → '{real_name}' "
                f"(sim={rag_result.get('similarity', 0):.3f})"
            )
            resolved.append(f'"{candidate}" = "{real_name}"')

    if resolved:
        # Append resolved names as hints for the SQL generator
        hints = ", ".join(resolved)
        enriched = f"{question} [Nota: {hints}]"
        logger.info(f"Query enriched: '{question}' → '{enriched}'")
        return enriched

    return question


async def _handle_query_data(
    openai_client,
    messages: List[Dict[str, Any]],
    tool_call,
    arguments: Dict[str, Any],
    user_id: str,
) -> str:
    """Handle the query_data tool with text-to-SQL pipeline.

    1. Resolve client names via RAG (handles typos like "conpensarrr" → "Compensar")
    2. Execute SQL pipeline (schema lookup -> generate SQL -> validate -> execute)
    3. Send results back to OpenAI for natural language formatting
    """
    question = arguments.get("question", "")
    tables = arguments.get("tables", [])

    # Filter to valid tables
    tables = [t for t in tables if t in AVAILABLE_TABLES]
    if not tables:
        tables = ["clients"]  # Fallback

    # Resolve client names via RAG before SQL generation
    question = await _resolve_client_names_in_query(question, user_id)

    # Execute text-to-SQL pipeline
    query_result = await generate_and_execute_query(
        question=question,
        tables=tables,
        user_id=user_id,
    )

    # Build tool result for second OpenAI call
    if query_result.get("error"):
        tool_result_content = json.dumps({
            "error": query_result["error"],
            "row_count": 0,
        }, ensure_ascii=False)
    else:
        tool_result_content = json.dumps({
            "rows": query_result["rows"],
            "row_count": query_result["row_count"],
        }, ensure_ascii=False, default=str)

    # Second OpenAI call: AI formats the query results into natural language
    messages_with_result = messages + [
        choice_to_message(tool_call),
        {
            "role": "tool",
            "tool_call_id": tool_call.id,
            "content": tool_result_content,
        },
    ]

    format_response = await openai_client.client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages_with_result,
        temperature=0.3,
        max_tokens=1500,
    )

    result = format_response.choices[0].message.content
    return result or "No se encontraron datos."


async def _handle_preview_order(
    user_id: str,
    telegram_chat_id: int,
    arguments: Dict[str, Any],
) -> str:
    """Handle preview_order: resolve names via RAG, convert units, show summary.

    Does NOT create the order. Stores the resolved data in telegram_conversations
    so confirm_order can create it without re-doing the work.

    Steps:
    1. Resolve client_name -> client_id (ilike + RAG fallback)
    2. Resolve branch (auto-select if one, match by name if provided)
    3. Resolve delivery_date -> YYYY-MM-DD
    4. Match each product name -> product_id + price (RAG search)
    5. Convert units -> packages if needed
    6. Store preview in conversation state and return formatted summary
    """
    from .conversation import _search_client, _parse_products, resolve_date
    from ...core.supabase import get_supabase_client

    import math

    client_name = arguments.get("client_name", "")
    branch_name = arguments.get("branch_name")
    delivery_date_raw = arguments.get("delivery_date", "")
    raw_items = arguments.get("items", [])
    unit_type = arguments.get("unit_type", "paquetes")

    # 1. Resolve client
    clients = await _search_client(user_id, client_name)
    if not clients:
        return f'No encontre el cliente "{client_name}". Verifica el nombre e intenta de nuevo.'
    if len(clients) > 1:
        names = ", ".join(c["name"] for c in clients[:5])
        return f"Encontre varios clientes: {names}. Cual es?"

    client = clients[0]
    client_id = client["id"]

    # 2. Resolve branch
    branches = await queries.get_branches_for_client(client_id)
    branch_id = None
    resolved_branch_name = None

    if branches:
        if len(branches) == 1:
            branch_id = branches[0]["id"]
            resolved_branch_name = branches[0]["name"]
        elif branch_name:
            matched = [
                b for b in branches
                if branch_name.lower() in b["name"].lower()
            ]
            if len(matched) == 1:
                branch_id = matched[0]["id"]
                resolved_branch_name = matched[0]["name"]
            else:
                branch_names = ", ".join(b["name"] for b in branches)
                return f"El cliente tiene varias sucursales: {branch_names}. Cual quieres?"
        else:
            branch_names = ", ".join(b["name"] for b in branches)
            return f"El cliente tiene varias sucursales: {branch_names}. Para cual es el pedido?"

    # 3. Resolve date
    resolved_date = resolve_date(delivery_date_raw)
    if not resolved_date:
        return f'No entendi la fecha "{delivery_date_raw}". Usa "hoy", "manana", o formato YYYY-MM-DD.'

    # 4. Match products via RAG
    if not raw_items:
        return "No se indicaron productos. Que productos y cantidades necesitas?"

    product_texts = ", ".join(f"{item['quantity']} {item['name']}" for item in raw_items)
    parsed_items, ambiguous_items = await _parse_products(product_texts, client_id=client_id)

    if not parsed_items and not ambiguous_items:
        names = ", ".join(item["name"] for item in raw_items)
        return f"No pude encontrar estos productos: {names}. Verifica los nombres."

    # If there are ambiguous products, ask the user to choose
    if ambiguous_items:
        lines = ["No estoy segura de algunos productos. Confirmame cual es:\n"]
        for amb in ambiguous_items:
            lines.append(f'Para *"{amb["query"]}"* ({amb["quantity"]} uds), puede ser:')
            for i, cand in enumerate(amb["candidates"], 1):
                lines.append(f"  {i}. {cand['matched_name']}")
            lines.append("")

        if parsed_items:
            confirmed_names = ", ".join(p["product_name"] for p in parsed_items)
            lines.append(f"_Ya identifique: {confirmed_names}_")

        lines.append("\nResponde con el numero o nombre del producto correcto.")
        return "\n".join(lines)

    # Check for unmatched items
    unmatched_names = []
    if len(parsed_items) < len(raw_items):
        matched_names = {p["product_name"].lower() for p in parsed_items}
        unmatched_names = [
            item["name"] for item in raw_items
            if not any(item["name"].lower() in mn for mn in matched_names)
        ]
        if unmatched_names:
            logger.warning(f"Unmatched products: {unmatched_names}")

    # 4b. Convert units -> packages if user gave quantities in "unidades"
    supabase = get_supabase_client()
    conversion_notes = []
    if unit_type == "unidades":
        product_ids = [p["product_id"] for p in parsed_items]
        pc_result = (
            supabase.table("product_config")
            .select("product_id, units_per_package")
            .in_("product_id", product_ids)
            .execute()
        )
        product_configs = {
            pc["product_id"]: pc["units_per_package"]
            for pc in (pc_result.data or [])
            if pc.get("units_per_package")
        }

        for item in parsed_items:
            pid = item["product_id"]
            if pid in product_configs:
                units_per_pkg = product_configs[pid]
                original_qty = item["quantity"]
                item["quantity"] = math.ceil(original_qty / units_per_pkg)
                conversion_notes.append(
                    f"{item['product_name']}: {original_qty} uds -> {item['quantity']} paq ({units_per_pkg} uds/paq)"
                )
                logger.info(
                    f"Unit conversion: {item['product_name']} "
                    f"{original_qty} units / {units_per_pkg} = {item['quantity']} packages"
                )
            else:
                logger.warning(
                    f"No units_per_package config for product {item['product_name']} ({pid}), "
                    f"keeping quantity as-is"
                )

    # 5. Store preview in conversation state for confirm_order
    preview_data = {
        "client_id": client_id,
        "client_name": client["name"],
        "branch_id": branch_id,
        "branch_name": resolved_branch_name,
        "resolved_date": resolved_date,
        "parsed_items": [
            {
                "product_id": item["product_id"],
                "product_name": item["product_name"],
                "quantity": item["quantity"],
                "unit_price": item["unit_price"],
            }
            for item in parsed_items
        ],
        "user_id": user_id,
    }

    await memory.create_conversation(
        telegram_chat_id=telegram_chat_id,
        flow_type="confirm_order",
        state="waiting_confirmation",
        context={"preview": preview_data},
    )

    # 6. Format preview summary
    total_value = sum(
        item["quantity"] * item["unit_price"] for item in parsed_items
    )
    branch_str = f" ({resolved_branch_name})" if resolved_branch_name else ""
    items_str = "\n".join(
        f"  - {item['product_name']}: {item['quantity']} paq x {formatters.format_currency(item['unit_price'])}"
        for item in parsed_items
    )
    conversion_str = ""
    if conversion_notes:
        conversion_str = "\n_Conversion:_\n" + "\n".join(f"  {n}" for n in conversion_notes) + "\n"
    unmatched_str = ""
    if unmatched_names:
        unmatched_str = "\n⚠️ No encontre: " + ", ".join(unmatched_names) + "\n"
    return (
        f"*Resumen del pedido:*\n"
        f"Cliente: {client['name']}{branch_str}\n"
        f"Entrega: {formatters.format_date(resolved_date)}\n"
        f"{items_str}\n"
        f"{conversion_str}"
        f"{unmatched_str}"
        f"*Total: {formatters.format_currency(total_value)}*\n\n"
        f"Confirmo el pedido?"
    )


async def _handle_confirm_order(
    user_id: str,
    telegram_chat_id: int,
) -> str:
    """Handle confirm_order: create the order from stored preview data."""
    from ...core.supabase import get_supabase_client

    # 1. Read preview from conversation state
    conversation = await memory.get_active_conversation(telegram_chat_id)
    if not conversation or conversation.get("flow_type") != "confirm_order":
        return "No hay un pedido pendiente de confirmar. Crea uno nuevo."

    preview = conversation.get("context", {}).get("preview")
    if not preview:
        await memory.delete_conversation(telegram_chat_id)
        return "Error: no se encontro la previsualizacion del pedido. Intenta crear uno nuevo."

    client_id = preview["client_id"]
    client_name = preview["client_name"]
    branch_id = preview.get("branch_id")
    resolved_branch_name = preview.get("branch_name")
    resolved_date = preview["resolved_date"]
    parsed_items = preview["parsed_items"]

    # 2. Create order in DB
    supabase = get_supabase_client()

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

    total_value = sum(
        item["quantity"] * item["unit_price"] for item in parsed_items
    )

    order_insert = {
        "order_number": next_number,
        "client_id": client_id,
        "expected_delivery_date": resolved_date,
        "total_value": total_value,
        "status": "received",
        "created_by": user_id,
    }
    if branch_id:
        order_insert["branch_id"] = branch_id

    order_result = supabase.table("orders").insert(order_insert).execute()
    if not order_result.data:
        return "Error al crear el pedido. Intenta de nuevo."

    order_id = order_result.data[0]["id"]

    # Insert items
    order_items = [
        {
            "order_id": order_id,
            "product_id": item["product_id"],
            "quantity_requested": item["quantity"],
            "unit_price": item["unit_price"],
            "availability_status": "pending",
            "quantity_available": 0,
            "quantity_missing": item["quantity"],
        }
        for item in parsed_items
    ]
    if order_items:
        supabase.table("order_items").insert(order_items).execute()

    # Audit event (fire-and-forget)
    try:
        supabase.table("order_events").insert({
            "order_id": order_id,
            "event_type": "created",
            "payload": {
                "order_number": next_number,
                "client_id": client_id,
                "items_count": len(order_items),
                "total_value": total_value,
                "via": "telegram",
            },
            "created_by": user_id,
        }).execute()
    except Exception:
        pass

    # Clean up conversation state
    await memory.delete_conversation(telegram_chat_id)

    # Format response
    branch_str = f" ({resolved_branch_name})" if resolved_branch_name else ""
    items_str = "\n".join(
        f"  - {item['product_name']}: {item['quantity']} paq x {formatters.format_currency(item['unit_price'])}"
        for item in parsed_items
    )
    return (
        f"Pedido *#{next_number}* creado!\n"
        f"Cliente: {client_name}{branch_str}\n"
        f"Entrega: {formatters.format_date(resolved_date)}\n"
        f"{items_str}\n"
        f"*Total: {formatters.format_currency(total_value)}*"
    )


async def _handle_reply_email(
    user_id: str,
    arguments: Dict[str, Any],
) -> str:
    """Handle reply_email: find the email and send a reply via MS Graph."""
    from ..microsoft_graph import get_graph_service
    from ...core.supabase import get_supabase_client
    from datetime import datetime as dt, timezone as tz, timedelta as td

    email_reference = arguments.get("email_reference", "")
    reply_text = arguments.get("reply_text", "")

    if not reply_text:
        return "No se indico el texto de respuesta. Que quieres responder?"

    # Get user's outlook_email
    supabase = get_supabase_client()
    user_result = (
        supabase.table("users")
        .select("outlook_email, name")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    if not user_result.data or not user_result.data[0].get("outlook_email"):
        return "No tienes un correo de Outlook vinculado. Contacta al administrador."

    outlook_email = user_result.data[0]["outlook_email"]

    graph = get_graph_service()

    # Fetch recent emails to find the one matching the reference
    recent_emails = await graph.list_emails(
        mailbox=outlook_email,
        since=dt.now(tz.utc) - td(days=3),
        top=30,
    )

    if not recent_emails:
        return "No encontre correos recientes en tu bandeja."

    # Build condensed list for matching
    email_list = []
    for e in recent_emails:
        from_addr = ""
        from_name = ""
        from_obj = e.get("from")
        if isinstance(from_obj, dict):
            addr_obj = from_obj.get("emailAddress")
            if isinstance(addr_obj, dict):
                from_addr = addr_obj.get("address", "")
                from_name = addr_obj.get("name", "")
        email_list.append({
            "id": e["id"],
            "subject": e.get("subject", ""),
            "from_name": from_name,
            "from_address": from_addr,
            "preview": (e.get("bodyPreview", ""))[:100],
        })

    openai_client = get_openai_client()
    match_prompt = (
        f'El usuario quiere responder a un correo. Su referencia es: "{email_reference}"\n\n'
        f"Correos recientes:\n{json.dumps(email_list, ensure_ascii=False)}\n\n"
        f'Responde SOLO el "id" del correo que mejor coincide, o "none" si ninguno coincide.'
    )

    match_response = await openai_client.chat_completion(
        messages=[{"role": "user", "content": match_prompt}],
        temperature=0.0,
        max_tokens=200,
    )

    matched_id = match_response.strip().strip('"')
    if matched_id == "none" or not matched_id:
        return (
            f'No encontre un correo que coincida con "{email_reference}". '
            "Puedes ser mas especifico? (nombre del remitente o asunto)"
        )

    matched_email = next((e for e in email_list if e["id"] == matched_id), None)
    if not matched_email:
        return "No pude identificar el correo. Intenta con el asunto exacto o el nombre del remitente."

    # Send reply
    try:
        await graph.send_reply(
            email_id=matched_id,
            reply_body=reply_text,
            mailbox=outlook_email,
        )
    except Exception as e:
        logger.error(f"Failed to send email reply: {e}")
        return "Error al enviar la respuesta. Intenta de nuevo."

    return (
        f"Respuesta enviada a *{matched_email['from_name']}* "
        f"({matched_email['from_address']})\n"
        f"Asunto: {matched_email['subject']}\n"
        f"Tu respuesta: _{reply_text}_"
    )


async def _handle_query_calendar(
    user_id: str,
    arguments: Dict[str, Any],
) -> str:
    """Handle query_calendar: list events from Outlook calendar."""
    from ..microsoft_graph import get_graph_service
    from ...core.supabase import get_supabase_client
    from datetime import datetime as dt

    start_date = arguments.get("start_date", today_bogota().isoformat())
    end_date = arguments.get("end_date", start_date)

    # Get user's outlook_email
    supabase = get_supabase_client()
    user_result = (
        supabase.table("users")
        .select("outlook_email, name")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    if not user_result.data or not user_result.data[0].get("outlook_email"):
        return "No tienes un correo de Outlook vinculado. Contacta al administrador."

    outlook_email = user_result.data[0]["outlook_email"]
    graph = get_graph_service()

    # Convert Bogota midnight boundaries to UTC for Graph API
    start_bog = dt.fromisoformat(f"{start_date}T00:00:00")
    end_bog = dt.fromisoformat(f"{end_date}T23:59:59")
    start_iso = (start_bog - BOG_OFFSET).strftime("%Y-%m-%dT%H:%M:%S")
    end_iso = (end_bog - BOG_OFFSET).strftime("%Y-%m-%dT%H:%M:%S")

    events = await graph.list_events(
        mailbox=outlook_email,
        start_date=start_iso,
        end_date=end_iso,
        top=50,
    )

    if not events:
        return f"No tienes eventos para el {start_date}."

    lines = [f"*Agenda para {start_date}:*\n"]
    for i, ev in enumerate(events, 1):
        subject = ev.get("subject", "(sin titulo)")
        is_all_day = ev.get("isAllDay", False)

        if is_all_day:
            time_str = "Todo el dia"
        else:
            s = ev.get("start", {}).get("dateTime", "")
            e = ev.get("end", {}).get("dateTime", "")
            try:
                s_dt = dt.fromisoformat(s.replace("Z", "+00:00"))
                e_dt = dt.fromisoformat(e.replace("Z", "+00:00"))
                time_str = f"{s_dt.strftime('%H:%M')} - {e_dt.strftime('%H:%M')}"
            except (ValueError, AttributeError):
                time_str = ""

        loc = ""
        loc_obj = ev.get("location")
        if isinstance(loc_obj, dict) and loc_obj.get("displayName"):
            loc = f" | {loc_obj['displayName']}"

        lines.append(f"{i}. *{subject}* — {time_str}{loc}")

    return "\n".join(lines)


async def _handle_create_event(
    user_id: str,
    arguments: Dict[str, Any],
) -> str:
    """Handle create_event: create an Outlook calendar event."""
    from ..microsoft_graph import get_graph_service
    from ...core.supabase import get_supabase_client

    subject = arguments.get("subject", "")
    start_datetime = arguments.get("start_datetime", "")
    end_datetime = arguments.get("end_datetime", "")
    location = arguments.get("location")
    attendees = arguments.get("attendees")

    if not subject or not start_datetime or not end_datetime:
        return "Faltan datos: necesito titulo, fecha/hora de inicio y fin."

    # Get user's outlook_email
    supabase = get_supabase_client()
    user_result = (
        supabase.table("users")
        .select("outlook_email, name")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    if not user_result.data or not user_result.data[0].get("outlook_email"):
        return "No tienes un correo de Outlook vinculado. Contacta al administrador."

    outlook_email = user_result.data[0]["outlook_email"]
    graph = get_graph_service()

    try:
        event = await graph.create_event(
            mailbox=outlook_email,
            subject=subject,
            start_dt=start_datetime,
            end_dt=end_datetime,
            location=location,
            attendees=attendees,
        )
    except Exception as e:
        logger.error(f"Failed to create calendar event: {e}")
        return "Error al crear el evento. Intenta de nuevo."

    # Format response
    lines = [f"Evento creado: *{subject}*"]
    lines.append(f"Inicio: {start_datetime}")
    lines.append(f"Fin: {end_datetime}")
    if location:
        lines.append(f"Lugar: {location}")
    if attendees:
        lines.append(f"Asistentes: {', '.join(attendees)}")

    return "\n".join(lines)


async def _handle_check_emails(user_id: str) -> str:
    """Handle check_emails: fetch new emails since last check, filter spam/promo."""
    from ..microsoft_graph import get_graph_service
    from ..email_summary import (
        get_last_summary_time,
        save_summary_tracking,
        classify_emails,
        _extract_from_address,
        _extract_from_name,
        _escape_md,
    )
    from ...core.supabase import get_supabase_client
    from datetime import datetime, timezone, timedelta

    supabase = get_supabase_client()
    user_result = (
        supabase.table("users")
        .select("outlook_email, name")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    if not user_result.data or not user_result.data[0].get("outlook_email"):
        return "No tienes un correo de Outlook vinculado. Contacta al administrador."

    outlook_email = user_result.data[0]["outlook_email"]

    # Get cutoff from last summary/check
    last_time = await get_last_summary_time(user_id, "CHECK")
    if not last_time:
        last_time = datetime.now(timezone.utc) - timedelta(hours=12)

    graph = get_graph_service()
    raw_emails = await graph.list_emails(
        mailbox=outlook_email,
        since=last_time,
        top=50,
    )

    if not raw_emails:
        return "No tienes correos nuevos."

    # Classify emails
    classified = await classify_emails(raw_emails)
    classified_map = {c["id"]: c for c in classified}

    important = []
    latest_received = last_time

    for email in raw_emails:
        eid = email["id"]
        received_str = email.get("receivedDateTime", "")
        try:
            received = datetime.fromisoformat(received_str.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            received = datetime.now(timezone.utc)

        if received > latest_received:
            latest_received = received

        info = classified_map.get(
            eid, {"category": "importante", "summary": email.get("subject", "")}
        )

        if info.get("category") == "importante":
            important.append({
                "subject": email.get("subject", "(sin asunto)"),
                "from_name": _extract_from_name(email),
                "from_addr": _extract_from_address(email),
                "summary": info.get("summary", ""),
            })

    # Save tracking so next check only shows newer emails
    await save_summary_tracking(user_id, "CHECK", latest_received, len(raw_emails))

    promo_count = len(raw_emails) - len(important)

    if not important:
        if promo_count > 0:
            return f"No tienes correos importantes nuevos. ({promo_count} promocionales filtrados)"
        return "No tienes correos nuevos."

    lines = [f"*Tienes {len(important)} correo(s) nuevo(s):*\n"]
    for i, e in enumerate(important, 1):
        sender = e["from_name"] or e["from_addr"]
        lines.append(f"{i}. *{_escape_md(sender)}*: {_escape_md(e['subject'])}")

    if promo_count > 0:
        lines.append(f"\n_({promo_count} promocionales filtrados)_")

    return "\n".join(lines)


async def _handle_send_email(
    user_id: str,
    arguments: Dict[str, Any],
) -> str:
    """Handle send_email: send a new email via MS Graph."""
    from ..microsoft_graph import get_graph_service
    from ...core.supabase import get_supabase_client

    to = arguments.get("to", "")
    subject = arguments.get("subject", "")
    body = arguments.get("body", "")

    if not to or not body:
        return "Faltan datos: necesito el destinatario y el mensaje."

    # Get user's outlook_email
    supabase = get_supabase_client()
    user_result = (
        supabase.table("users")
        .select("outlook_email, name")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    if not user_result.data or not user_result.data[0].get("outlook_email"):
        return "No tienes un correo de Outlook vinculado. Contacta al administrador."

    outlook_email = user_result.data[0]["outlook_email"]

    graph = get_graph_service()

    try:
        await graph.send_email(
            to=to,
            subject=subject,
            body=body,
            mailbox=outlook_email,
        )
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return "Error al enviar el correo. Intenta de nuevo."

    return (
        f"Correo enviado!\n"
        f"Para: {to}\n"
        f"Asunto: {subject}"
    )


def choice_to_message(tool_call) -> Dict[str, Any]:
    """Convert a tool call into the assistant message format for the messages array."""
    return {
        "role": "assistant",
        "tool_calls": [
            {
                "id": tool_call.id,
                "type": "function",
                "function": {
                    "name": tool_call.function.name,
                    "arguments": tool_call.function.arguments,
                },
            }
        ],
    }


async def execute_function(
    function_name: str,
    arguments: Dict[str, Any],
    user_id: str,
    user_name: str,
    telegram_chat_id: int,
) -> str:
    """Execute a structured function (mutations, summary, greeting)."""

    try:
        if function_name == "preview_order":
            return await _handle_preview_order(
                user_id=user_id,
                telegram_chat_id=telegram_chat_id,
                arguments=arguments,
            )

        elif function_name == "confirm_order":
            return await _handle_confirm_order(
                user_id=user_id,
                telegram_chat_id=telegram_chat_id,
            )

        elif function_name == "modify_order":
            from .conversation import start_modify_order_flow
            return await start_modify_order_flow(
                user_id=user_id,
                telegram_chat_id=telegram_chat_id,
                order_number=arguments.get("order_number"),
            )

        elif function_name == "create_activity":
            activity = await crm_queries.create_activity(
                user_id=user_id,
                client_name=arguments.get("client_name", ""),
                activity_type=arguments.get("activity_type", "call"),
                title=arguments.get("title"),
                description=arguments.get("description"),
            )
            if not activity:
                return "No encontre el cliente. Verifica el nombre."
            client_name = activity.get("client_name", "")
            act_type = formatters.ACTIVITY_TYPE_LABELS.get(
                activity.get("activity_type", ""), activity.get("activity_type", "")
            )
            return f"Actividad registrada: {act_type} con {client_name}"

        elif function_name == "complete_activity":
            completed = await crm_queries.complete_activity(
                user_id=user_id,
                client_name=arguments.get("client_name"),
                activity_type=arguments.get("activity_type"),
            )
            if not completed:
                return "No encontre actividad pendiente para completar."
            title = completed.get("title", "Actividad")
            return f"Completada: {title}"

        elif function_name == "daily_summary":
            return await generate_summary(user_id)

        elif function_name == "reply_email":
            return await _handle_reply_email(
                user_id=user_id,
                arguments=arguments,
            )

        elif function_name == "send_email":
            return await _handle_send_email(
                user_id=user_id,
                arguments=arguments,
            )

        elif function_name == "check_emails":
            return await _handle_check_emails(user_id=user_id)

        elif function_name == "query_calendar":
            return await _handle_query_calendar(
                user_id=user_id,
                arguments=arguments,
            )

        elif function_name == "create_event":
            return await _handle_create_event(
                user_id=user_id,
                arguments=arguments,
            )

        else:
            return "No entendi tu solicitud. Escribe /ayuda para ver las opciones."

    except Exception as e:
        logger.error(f"Function execution error ({function_name}): {e}", exc_info=True)
        return "Error al procesar la solicitud. Intenta de nuevo."


async def generate_summary(user_id: str, period: str = "AM") -> str:
    """Generate a daily summary for the commercial user."""
    today = today_bogota()
    tomorrow = today + timedelta(days=1)

    # Get order stats
    today_stats = await queries.get_orders_summary_for_date(user_id, today)
    tomorrow_stats = await queries.get_orders_summary_for_date(user_id, tomorrow)
    missing_count = await queries.get_orders_with_missing(user_id)

    # Get CRM stats
    crm_data = await crm_queries.get_crm_summary_data(user_id)

    summary_data = {
        "orders_today_count": today_stats["count"],
        "orders_today_total": today_stats["total"],
        "orders_by_status": today_stats["by_status"],
        "orders_today_list": today_stats.get("order_list", []),
        "orders_with_missing": missing_count,
        "orders_tomorrow_count": tomorrow_stats["count"],
        "orders_tomorrow_total": tomorrow_stats["total"],
        "orders_tomorrow_list": tomorrow_stats.get("order_list", []),
        **crm_data,
    }

    return formatters.format_daily_summary(summary_data, period)


def get_help_text() -> str:
    """Return help text showing available commands."""
    return (
        "*Hola! Soy Geraldine, tu asistente comercial* 💼\n\n"
        "*Pedidos:*\n"
        '  "Pedidos de hoy"\n'
        '  "Pedidos de [cliente] para manana"\n'
        '  "Como va el pedido 000234?"\n'
        '  "Hacer pedido para [cliente] manana"\n'
        '  "Modificar pedido 000234"\n\n'
        "*Clientes y Datos:*\n"
        '  "Mis clientes"\n'
        '  "Frecuencias de [cliente]"\n'
        '  "Cuanto vendi este mes?"\n'
        '  "Cual cliente tiene mas pedidos?"\n\n'
        "*CRM:*\n"
        '  "Mis leads"\n'
        '  "Mis oportunidades"\n'
        '  "Actividades pendientes"\n'
        '  "Registrar llamada con [cliente]"\n'
        '  "Complete la visita a [cliente]"\n\n'
        "*Correo:*\n"
        '  "Enviale un correo a [email] diciendo [mensaje]"\n'
        '  "Responde al correo de [remitente] diciendo [mensaje]"\n\n'
        "*Calendario:*\n"
        '  "Que tengo hoy?"\n'
        '  "Mi agenda de manana"\n'
        '  "Agenda reunion manana a las 10"\n'
        '  "Crear evento el viernes a las 3pm"\n\n'
        "*Comandos:*\n"
        "  /resumen - Resumen del dia\n"
        "  /ayuda - Ver esta ayuda\n"
    )
