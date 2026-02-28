"""AI Agent: OpenAI function calling with dynamic SQL query skill.

Architecture:
- 7 tools (down from 14): query_data + 6 structured tools
- query_data uses a text-to-SQL pipeline: schema on-demand → generate SQL → execute → AI formats
- Mutations (create_order, modify_order, create_activity, complete_activity) stay as structured tools
- System prompt is short (no schema) - schema is loaded inside query_data only when needed
"""

import json
import logging
from typing import Dict, Any, List
from datetime import date, timedelta

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
            "name": "create_order",
            "description": "Iniciar flujo para crear un nuevo pedido. Inicia conversacion multi-paso.",
            "parameters": {
                "type": "object",
                "properties": {
                    "client_name": {
                        "type": "string",
                        "description": "Nombre del cliente"
                    },
                    "delivery_date": {
                        "type": "string",
                        "description": "Fecha de entrega deseada: 'manana', 'hoy', o fecha especifica"
                    }
                },
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
            "name": "greeting_or_help",
            "description": "Responder a saludos, preguntas generales, agradecimientos, o mostrar ayuda sobre el bot.",
            "parameters": {
                "type": "object",
                "properties": {
                    "message_type": {
                        "type": "string",
                        "description": "'greeting', 'help', or 'other'"
                    }
                },
                "required": []
            }
        }
    },
]

SYSTEM_PROMPT = """Eres el asistente comercial de Pastry Chef (panaderia industrial). Ayudas a {user_name} a gestionar sus pedidos, clientes y CRM.

Fecha de hoy: {today}

Tablas disponibles para consultas:
{table_list}

Reglas:
- Responde siempre en español colombiano, informal pero profesional
- Para CUALQUIER consulta de datos (pedidos, clientes, leads, oportunidades, actividades, frecuencias, productos, analisis), usa query_data
- Para crear pedidos usa create_order, para modificar usa modify_order
- Para registrar llamada/visita/reunion usa create_activity, para completar usa complete_activity
- Para resumen del dia usa daily_summary
- Para saludos, agradecimientos, o preguntas sobre que puedes hacer usa greeting_or_help
- Usa el contexto de mensajes anteriores para entender referencias implicitas
- Cuando llames query_data, incluye en question todo el contexto necesario (nombres de clientes, fechas, etc)
- Selecciona solo las tablas necesarias para la consulta"""


async def process_message(
    user_id: str,
    user_name: str,
    telegram_chat_id: int,
    message_text: str,
) -> str:
    """Process a natural language message using OpenAI function calling.

    Two-turn flow for query_data:
    1. First call: AI classifies and calls tool
    2. For query_data: execute SQL pipeline, then second call for AI to format results
    3. For other tools: execute directly (single turn)
    """
    openai_client = get_openai_client()

    # Get conversation history for context
    history = await memory.get_recent_messages(telegram_chat_id)

    # Build messages array
    system_prompt = SYSTEM_PROMPT.format(
        user_name=user_name,
        today=date.today().isoformat(),
        table_list=get_table_list_prompt(),
    )

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(history)
    messages.append({"role": "user", "content": message_text})

    try:
        # First OpenAI call: classify intent and call tool
        response = await openai_client.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            tools=TOOLS,
            tool_choice="required",
            temperature=0.1,
            max_tokens=500,
        )

        choice = response.choices[0]

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

        # Save to conversation history
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
        if function_name == "create_order":
            from .conversation import start_create_order_flow
            return await start_create_order_flow(
                user_id=user_id,
                telegram_chat_id=telegram_chat_id,
                client_name=arguments.get("client_name"),
                delivery_date=arguments.get("delivery_date"),
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

        elif function_name == "greeting_or_help":
            msg_type = arguments.get("message_type", "greeting")
            if msg_type == "help":
                return get_help_text()
            return (
                f"Hola {user_name}! Soy tu asistente comercial.\n\n"
                "Puedes preguntarme por tus pedidos, clientes, leads, "
                "o escribir /ayuda para ver todo lo que puedo hacer."
            )

        else:
            return "No entendi tu solicitud. Escribe /ayuda para ver las opciones."

    except Exception as e:
        logger.error(f"Function execution error ({function_name}): {e}", exc_info=True)
        return "Error al procesar la solicitud. Intenta de nuevo."


async def generate_summary(user_id: str, period: str = "AM") -> str:
    """Generate a daily summary for the commercial user."""
    today = date.today()
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
        "orders_with_missing": missing_count,
        "orders_tomorrow_count": tomorrow_stats["count"],
        "orders_tomorrow_total": tomorrow_stats["total"],
        **crm_data,
    }

    return formatters.format_daily_summary(summary_data, period)


def get_help_text() -> str:
    """Return help text showing available commands."""
    return (
        "*Que puedo hacer:*\n\n"
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
        "*Comandos:*\n"
        "  /resumen - Resumen del dia\n"
        "  /ayuda - Ver esta ayuda\n"
    )
