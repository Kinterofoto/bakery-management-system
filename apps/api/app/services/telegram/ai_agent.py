"""AI Agent: OpenAI function calling with dynamic SQL query skill.

Architecture:
- Tools: query_data, preview_order, confirm_order, modify_order, create_activity, complete_activity, daily_summary
- query_data uses a text-to-SQL pipeline: schema on-demand → generate SQL → execute → AI formats
- preview_order resolves product names via RAG and converts units; confirm_order creates the order
- tool_choice="auto" so AI can respond naturally without calling a tool (greetings, questions, etc)
- System prompt is short (no schema) - schema is loaded inside query_data only when needed
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

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "query_data",
            "description": (
                "Consultar datos del sistema. Usa esto para CUALQUIER pregunta sobre "
                "pedidos, clientes, leads, oportunidades, actividades, frecuencias, "
                "productos, analisis de ventas, o datos en general."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "question": {
                        "type": "string",
                        "description": "La pregunta del usuario en lenguaje natural, con todo el contexto necesario"
                    },
                    "tables": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": (
                            "Tablas necesarias para responder. Opciones: "
                            "orders, order_items, clients, branches, products, "
                            "client_frequencies, sales_opportunities, pipeline_stages, lead_activities"
                        ),
                    },
                },
                "required": ["question", "tables"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "preview_order",
            "description": (
                "Previsualizar un pedido ANTES de crearlo. Resuelve nombres de productos "
                "con busqueda inteligente y convierte unidades a paquetes si aplica. "
                "Usa esto cuando tengas TODOS los datos: cliente, fecha, productos y tipo de unidad. "
                "Muestra el resumen al usuario y espera confirmacion."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "client_name": {
                        "type": "string",
                        "description": "Nombre del cliente"
                    },
                    "branch_name": {
                        "type": "string",
                        "description": "Nombre de la sucursal (opcional si el cliente tiene una sola)"
                    },
                    "delivery_date": {
                        "type": "string",
                        "description": "Fecha de entrega: 'hoy', 'manana', o YYYY-MM-DD"
                    },
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {
                                    "type": "string",
                                    "description": "Nombre del producto"
                                },
                                "quantity": {
                                    "type": "integer",
                                    "description": "Cantidad"
                                }
                            },
                            "required": ["name", "quantity"]
                        },
                        "description": "Lista de productos con nombre y cantidad"
                    },
                    "unit_type": {
                        "type": "string",
                        "enum": ["paquetes", "unidades"],
                        "description": "Si las cantidades son en paquetes o unidades. SIEMPRE preguntar al usuario."
                    }
                },
                "required": ["client_name", "delivery_date", "items", "unit_type"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "confirm_order",
            "description": (
                "Confirmar y crear el pedido previamente previsualizado con preview_order. "
                "Usa SOLO despues de que el usuario confirme el resumen del pedido."
            ),
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "modify_order",
            "description": "Iniciar flujo para modificar un pedido existente.",
            "parameters": {
                "type": "object",
                "properties": {
                    "order_number": {
                        "type": "string",
                        "description": "Numero de pedido a modificar"
                    }
                },
                "required": ["order_number"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_activity",
            "description": "Registrar una nueva actividad CRM (llamada, visita, reunion, etc).",
            "parameters": {
                "type": "object",
                "properties": {
                    "client_name": {
                        "type": "string",
                        "description": "Nombre del cliente"
                    },
                    "activity_type": {
                        "type": "string",
                        "description": "Tipo: llamada, visita, reunion, email, propuesta, seguimiento"
                    },
                    "title": {
                        "type": "string",
                        "description": "Titulo o descripcion breve de la actividad"
                    },
                    "description": {
                        "type": "string",
                        "description": "Descripcion detallada opcional"
                    }
                },
                "required": ["client_name", "activity_type"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "complete_activity",
            "description": "Marcar una actividad CRM como completada.",
            "parameters": {
                "type": "object",
                "properties": {
                    "client_name": {
                        "type": "string",
                        "description": "Nombre del cliente"
                    },
                    "activity_type": {
                        "type": "string",
                        "description": "Tipo de actividad a completar"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "daily_summary",
            "description": "Generar resumen diario del comercial (pedidos, CRM, actividades).",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "reply_email",
            "description": (
                "Responder a un correo existente. SOLO llamar cuando el usuario "
                "ya CONFIRMO que quiere enviar. Antes de llamar, muestra un resumen "
                "y pide confirmacion."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "email_reference": {
                        "type": "string",
                        "description": (
                            "Referencia al correo: nombre del remitente, asunto, "
                            "o descripcion para identificar el correo"
                        ),
                    },
                    "reply_text": {
                        "type": "string",
                        "description": "El texto de la respuesta a enviar"
                    },
                },
                "required": ["email_reference", "reply_text"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "send_email",
            "description": (
                "Enviar un correo nuevo a cualquier direccion. SOLO llamar cuando "
                "el usuario ya CONFIRMO que quiere enviar. Antes de llamar, muestra "
                "un resumen y pide confirmacion."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "to": {
                        "type": "string",
                        "description": "Direccion de correo del destinatario"
                    },
                    "subject": {
                        "type": "string",
                        "description": "Asunto del correo"
                    },
                    "body": {
                        "type": "string",
                        "description": "Cuerpo del correo en texto plano"
                    },
                },
                "required": ["to", "subject", "body"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "check_emails",
            "description": (
                "Revisar correos nuevos del usuario. Usa esto cuando pregunte "
                "por correos nuevos, que correos le llegaron, o su bandeja de entrada."
            ),
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "query_calendar",
            "description": (
                "Consultar eventos del calendario de Outlook. Usa esto cuando el "
                "usuario pregunte por su agenda, reuniones, citas, o eventos."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {
                        "type": "string",
                        "description": "Fecha inicio en formato YYYY-MM-DD (default: hoy)"
                    },
                    "end_date": {
                        "type": "string",
                        "description": "Fecha fin en formato YYYY-MM-DD (default: mismo dia que start_date)"
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_event",
            "description": (
                "Crear un evento en el calendario de Outlook. SOLO llamar cuando "
                "el usuario ya CONFIRMO que quiere crear el evento. Antes de llamar, "
                "muestra un resumen y pide confirmacion."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "subject": {
                        "type": "string",
                        "description": "Titulo del evento"
                    },
                    "start_datetime": {
                        "type": "string",
                        "description": "Fecha y hora de inicio: YYYY-MM-DDTHH:MM:SS"
                    },
                    "end_datetime": {
                        "type": "string",
                        "description": "Fecha y hora de fin: YYYY-MM-DDTHH:MM:SS"
                    },
                    "location": {
                        "type": "string",
                        "description": "Lugar del evento (opcional)"
                    },
                    "attendees": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Lista de correos de los asistentes (opcional)"
                    },
                },
                "required": ["subject", "start_datetime", "end_datetime"],
            },
        },
    },
]

SYSTEM_PROMPT = """Eres Geraldine, la asistente comercial de Pastry Chef (panaderia industrial). Ayudas a {user_name} a gestionar sus pedidos, clientes y CRM.

Tu personalidad:
- Eres joven, energica y alegre. Transmites buena energia en cada mensaje.
- Usas un tono cercano y amigable, como una compañera de trabajo con la que da gusto hablar.
- Puedes usar expresiones colombianas naturales ("listo!", "dale!", "con toda!", "super", "genial").
- Eres proactiva: si ves algo importante, lo mencionas sin que te pregunten.
- Mantienes la profesionalidad sin ser rigida. Eres eficiente pero calida.
- Puedes usar uno que otro emoji cuando sea natural (no en exceso).

Fecha de hoy: {today}

Tablas disponibles para consultas:
{table_list}

Reglas:
- Responde siempre en español colombiano, informal pero profesional
- Para CUALQUIER consulta de datos (pedidos, clientes, leads, oportunidades, actividades, frecuencias, productos, analisis), usa query_data
- Para modificar pedidos usa modify_order
- Para registrar llamada/visita/reunion usa create_activity, para completar usa complete_activity
- Para resumen del dia usa daily_summary
- Para saludos, agradecimientos o preguntas generales, responde directamente con texto (NO necesitas llamar ninguna herramienta)
- Usa el contexto de mensajes anteriores para entender referencias implicitas
- Cuando llames query_data, incluye en question todo el contexto necesario (nombres de clientes, fechas, etc)
- Selecciona solo las tablas necesarias para la consulta

Para crear pedidos (CRITICO - LEE ESTO CON MUCHA ATENCION):

REGLA ABSOLUTA: NUNCA escribas listas de productos, cantidades, conversiones o resumenes de pedidos como texto.
Tu NO conoces los nombres reales de los productos ni las conversiones de unidades a paquetes.
SOLO preview_order puede hacer eso porque busca en la base de datos.

Pasos:
1. Si falta el cliente, pregunta: "Para que cliente?"
2. Si falta la fecha, pregunta: "Para que fecha?" (si no la mencionan, asume "mañana")
3. Si faltan los productos, pregunta: "Que productos y cantidades?"
4. Si no sabes si son paquetes o unidades, pregunta: "Las cantidades son en paquetes o unidades?"
5. Cuando tengas cliente + fecha + productos + tipo de unidad → llama preview_order INMEDIATAMENTE
6. Si el usuario da todos los datos en un solo mensaje (ej: "pedido para X, mañana, 50 croissants, unidades") → llama preview_order DE UNA VEZ sin preguntas adicionales
7. Cuando el usuario confirme ("si"/"dale"/"confirma") → llama confirm_order

PROHIBIDO:
- NO repitas la lista de productos del usuario como texto
- NO hagas conversiones de unidades a paquetes tu mismo
- NO escribas resumenes tipo "1. Producto X — N unidades (M paquetes)"
- Si tienes los 4 datos, tu UNICA respuesta valida es llamar preview_order

Notas:
- El usuario puede dar varios datos en un solo mensaje
- Recuerda datos de mensajes anteriores - NO vuelvas a pedirlos
- Si el usuario cambia de opinion, adaptate naturalmente

Para revisar correos:
- Cuando el usuario pregunte "que correos nuevos tengo", "que me llego", "correos nuevos", usa check_emails
- check_emails muestra SOLO correos importantes (filtra promociones, LinkedIn, publicidad, newsletters)
- Muestra los correos de forma concisa: remitente y asunto, con un mini resumen solo si es necesario

Para enviar/responder correos (MUY IMPORTANTE - SIEMPRE pide confirmacion):
- Para enviar correo nuevo: usa send_email (necesitas: destinatario, asunto, cuerpo)
- Para responder correo existente: usa reply_email (necesitas: referencia al correo, texto respuesta)
- NUNCA llames send_email o reply_email sin confirmacion del usuario
- Cuando el usuario pida enviar o responder un correo, redacta el mensaje y muestra un resumen asi:
  "Voy a enviar esto:
  Para: destinatario@email.com
  Asunto: ...
  Mensaje: ...
  Confirmo el envio?"
- SOLO cuando el usuario diga "si"/"dale"/"confirma"/"envialo", llama la herramienta
- Si el usuario quiere enviar un correo nuevo (no responder), usa send_email
- Si quiere responder a un correo que recibio, usa reply_email

Para calendario (Outlook):
- Para consultar agenda: usa query_calendar con las fechas apropiadas
- Para crear eventos: usa create_event (SIEMPRE pide confirmacion primero)
- Cuando el usuario diga "que tengo hoy", "mi agenda", "mis reuniones", usa query_calendar
- Cuando pida "agenda reunion manana a las 10", redacta el evento y pide confirmacion
- Muestra un resumen asi:
  "Voy a crear este evento:
  Titulo: ...
  Fecha: ...
  Hora: HH:MM - HH:MM
  Lugar: ... (si aplica)
  Asistentes: ... (si aplica)
  Confirmo?"
- SOLO cuando confirme, llama create_event
- Si no dice hora de fin, asume 1 hora de duracion
- Usa la fecha de hoy ({today}) como referencia para "hoy", "manana", etc."""


async def process_message(
    user_id: str,
    user_name: str,
    telegram_chat_id: int,
    message_text: str,
    history: List[Dict[str, Any]] = None,
) -> str:
    """Process a natural language message using OpenAI function calling.

    Two-turn flow for query_data:
    1. First call: AI classifies and calls tool
    2. For query_data: execute SQL pipeline, then second call for AI to format results
    3. For other tools: execute directly (single turn)
    """
    openai_client = get_openai_client()

    # Use pre-fetched history or fetch if not provided
    if history is None:
        history = await memory.get_recent_messages(telegram_chat_id)

    # Build messages array
    system_prompt = SYSTEM_PROMPT.format(
        user_name=user_name,
        today=today_bogota().isoformat(),
        table_list=get_table_list_prompt(),
    )

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(history)
    messages.append({"role": "user", "content": message_text})

    try:
        # First OpenAI call: classify intent and optionally call tool
        response = await openai_client.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
            temperature=0.3,
            max_tokens=500,
        )

        choice = response.choices[0]

        # No tool call = AI responded with text (greeting, question, conversation)
        if not choice.message.tool_calls:
            content = choice.message.content or "No entendi tu mensaje. Escribe /ayuda para ver las opciones."
            await memory.save_message(telegram_chat_id, "user", message_text)
            await memory.save_message(telegram_chat_id, "assistant", content)
            return content

        tool_call = choice.message.tool_calls[0]
        function_name = tool_call.function.name
        arguments = json.loads(tool_call.function.arguments)

        logger.info(f"AI intent: {function_name}, args: {arguments}")

        # Handle query_data with two-turn flow
        if function_name == "query_data":
            result = await _handle_query_data(
                openai_client=openai_client,
                messages=messages,
                tool_call=tool_call,
                arguments=arguments,
                user_id=user_id,
            )
        else:
            # Execute structured tools directly
            result = await execute_function(
                function_name=function_name,
                arguments=arguments,
                user_id=user_id,
                user_name=user_name,
                telegram_chat_id=telegram_chat_id,
            )

        # Save to conversation history (await to ensure history is complete for next turn)
        await memory.save_message(
            telegram_chat_id=telegram_chat_id,
            role="user",
            content=message_text,
            intent=function_name,
            metadata=arguments,
        )
        await memory.save_message(
            telegram_chat_id=telegram_chat_id,
            role="assistant",
            content=result,
            intent=function_name,
        )

        return result

    except Exception as e:
        logger.error(f"AI agent error: {e}", exc_info=True)
        return "Hubo un error procesando tu mensaje. Intenta de nuevo."


async def _handle_query_data(
    openai_client,
    messages: List[Dict[str, Any]],
    tool_call,
    arguments: Dict[str, Any],
    user_id: str,
) -> str:
    """Handle the query_data tool with text-to-SQL pipeline.

    1. Execute SQL pipeline (schema lookup → generate SQL → validate → execute)
    2. Send results back to OpenAI for natural language formatting
    """
    question = arguments.get("question", "")
    tables = arguments.get("tables", [])

    # Filter to valid tables
    tables = [t for t in tables if t in AVAILABLE_TABLES]
    if not tables:
        tables = ["clients"]  # Fallback

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
    1. Resolve client_name → client_id (ilike + RAG fallback)
    2. Resolve branch (auto-select if one, match by name if provided)
    3. Resolve delivery_date → YYYY-MM-DD
    4. Match each product name → product_id + price (RAG search)
    5. Convert units → packages if needed
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
    parsed_items = await _parse_products(product_texts, client_id=client_id)

    if not parsed_items:
        names = ", ".join(item["name"] for item in raw_items)
        return f"No pude encontrar estos productos: {names}. Verifica los nombres."

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

    # 4b. Convert units → packages if user gave quantities in "unidades"
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
