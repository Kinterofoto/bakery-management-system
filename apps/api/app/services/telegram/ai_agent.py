"""AI Agent: OpenAI function calling with conversational memory."""

import json
import logging
from typing import Dict, Any, Optional, List
from datetime import date, timedelta

from ...services.openai_client import get_openai_client
from . import memory, queries, crm_queries, formatters

logger = logging.getLogger(__name__)

# OpenAI function definitions for the commercial assistant
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "query_orders",
            "description": "Consultar pedidos del comercial. Puede filtrar por cliente, fecha (hoy, manana, semana, fecha especifica) y estado.",
            "parameters": {
                "type": "object",
                "properties": {
                    "client_name": {
                        "type": "string",
                        "description": "Nombre del cliente (parcial o completo)"
                    },
                    "date_filter": {
                        "type": "string",
                        "description": "Filtro de fecha: 'today', 'tomorrow', 'week', o fecha YYYY-MM-DD"
                    },
                    "status_filter": {
                        "type": "string",
                        "description": "Estado del pedido: received, review_area1, review_area2, ready_dispatch, dispatched, in_delivery, delivered"
                    },
                    "order_number": {
                        "type": "string",
                        "description": "Numero de pedido especifico (ej: 000234)"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "query_delivery_status",
            "description": "Consultar estado de entrega de un pedido especifico con detalle de items.",
            "parameters": {
                "type": "object",
                "properties": {
                    "order_number": {
                        "type": "string",
                        "description": "Numero de pedido"
                    }
                },
                "required": ["order_number"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "query_clients",
            "description": "Listar los clientes asignados al comercial.",
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
            "name": "query_frequencies",
            "description": "Consultar frecuencias/dias de entrega de un cliente y sus sucursales.",
            "parameters": {
                "type": "object",
                "properties": {
                    "client_name": {
                        "type": "string",
                        "description": "Nombre del cliente"
                    }
                },
                "required": []
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
            "name": "query_leads",
            "description": "Consultar leads/prospectos del comercial agrupados por estado.",
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
            "name": "query_pipeline",
            "description": "Consultar oportunidades de venta en el pipeline del comercial.",
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
            "name": "query_activities",
            "description": "Consultar actividades CRM del comercial (pendientes, vencidas, etc).",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "description": "'pending', 'completed', or 'overdue'"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "query_opportunities",
            "description": "Consultar detalle de una oportunidad de venta especifica.",
            "parameters": {
                "type": "object",
                "properties": {
                    "client_name": {
                        "type": "string",
                        "description": "Nombre del cliente de la oportunidad"
                    }
                },
                "required": []
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
            "description": "Responder a saludos, preguntas generales, o mostrar ayuda sobre el bot.",
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

SYSTEM_PROMPT = """Eres el asistente comercial de Panaderia Industrial (Pastry Chef). Tu trabajo es ayudar al comercial {user_name} a gestionar sus pedidos, clientes y actividades CRM.

Fecha de hoy: {today}

Reglas:
- Responde siempre en español colombiano, informal pero profesional
- Siempre clasifica el mensaje del usuario en una funcion disponible
- Si el usuario menciona "hoy" usa date_filter "today", "manana" usa "tomorrow"
- Si mencionan un cliente por nombre, usa el parametro client_name
- Si dicen "resumen" o "como voy", usa daily_summary
- Si saludan o preguntan que puedes hacer, usa greeting_or_help
- Si piden crear un pedido, usa create_order
- Si piden modificar un pedido, usa modify_order
- Si mencionan leads, prospectos, pipeline, oportunidades, usa las funciones CRM
- Si mencionan registrar llamada/visita/reunion, usa create_activity
- Si mencionan completar/terminar una actividad, usa complete_activity
- Usa el contexto de mensajes anteriores para entender referencias implicitas (ej: "sus pedidos" refiere al ultimo cliente mencionado)"""


async def process_message(
    user_id: str,
    user_name: str,
    telegram_chat_id: int,
    message_text: str,
) -> str:
    """
    Process a natural language message using OpenAI function calling.

    Returns the formatted response text to send back.
    """
    openai_client = get_openai_client()

    # Get conversation history for context
    history = await memory.get_recent_messages(telegram_chat_id)

    # Build messages array
    system_prompt = SYSTEM_PROMPT.format(
        user_name=user_name,
        today=date.today().isoformat(),
    )

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(history)
    messages.append({"role": "user", "content": message_text})

    try:
        # Call OpenAI with function calling
        response = await openai_client.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            tools=TOOLS,
            tool_choice="required",
            temperature=0.1,
            max_tokens=500,
        )

        choice = response.choices[0]

        # If model wants to call a function
        if choice.message.tool_calls:
            tool_call = choice.message.tool_calls[0]
            function_name = tool_call.function.name
            arguments = json.loads(tool_call.function.arguments)

            logger.info(f"AI intent: {function_name}, args: {arguments}")

            # Execute the function and get result
            result = await execute_function(
                function_name=function_name,
                arguments=arguments,
                user_id=user_id,
                user_name=user_name,
                telegram_chat_id=telegram_chat_id,
            )

            # Save intent in history
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

        # Fallback: direct text response
        content = choice.message.content or "No entendi tu mensaje. Escribe /ayuda para ver las opciones."
        await memory.save_message(telegram_chat_id, "user", message_text)
        await memory.save_message(telegram_chat_id, "assistant", content)
        return content

    except Exception as e:
        logger.error(f"AI agent error: {e}")
        return "Hubo un error procesando tu mensaje. Intenta de nuevo."


async def execute_function(
    function_name: str,
    arguments: Dict[str, Any],
    user_id: str,
    user_name: str,
    telegram_chat_id: int,
) -> str:
    """Execute a classified function and return formatted text."""

    try:
        if function_name == "query_orders":
            orders = await queries.query_orders(
                user_id=user_id,
                client_name=arguments.get("client_name"),
                date_filter=arguments.get("date_filter"),
                status_filter=arguments.get("status_filter"),
                order_number=arguments.get("order_number"),
            )
            return formatters.format_orders_list(orders)

        elif function_name == "query_delivery_status":
            order = await queries.query_order_detail(
                user_id=user_id,
                order_number=arguments.get("order_number"),
            )
            if not order:
                return "No encontre ese pedido o no tienes acceso."
            return formatters.format_order_detail(order, order.get("items", []))

        elif function_name == "query_clients":
            clients = await queries.query_clients(user_id)
            return formatters.format_clients_list(clients)

        elif function_name == "query_frequencies":
            freqs = await queries.query_frequencies(
                user_id=user_id,
                client_name=arguments.get("client_name"),
            )
            return formatters.format_frequencies(
                freqs,
                client_name=arguments.get("client_name", ""),
            )

        elif function_name == "create_order":
            # Start the create order conversation flow
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

        elif function_name == "query_leads":
            leads = await crm_queries.query_leads(user_id)
            return formatters.format_leads_summary(leads)

        elif function_name == "query_pipeline":
            opportunities = await crm_queries.query_pipeline(user_id)
            return formatters.format_pipeline(opportunities)

        elif function_name == "query_activities":
            status = arguments.get("status")
            if status == "overdue":
                activities = await crm_queries.query_activities(
                    user_id, include_overdue=True
                )
                return formatters.format_activities(activities, "Actividades Vencidas")
            else:
                activities = await crm_queries.query_activities(
                    user_id, status_filter=status
                )
                title = "Actividades"
                if status == "pending":
                    title = "Actividades Pendientes"
                elif status == "completed":
                    title = "Actividades Completadas"
                return formatters.format_activities(activities, title)

        elif function_name == "query_opportunities":
            opp = await crm_queries.query_opportunity_detail(
                user_id=user_id,
                client_name=arguments.get("client_name"),
            )
            if not opp:
                return "No encontre esa oportunidad."
            return formatters.format_pipeline([opp])

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
        logger.error(f"Function execution error ({function_name}): {e}")
        return f"Error al procesar la solicitud. Intenta de nuevo."


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
        "*Clientes:*\n"
        '  "Mis clientes"\n'
        '  "Frecuencias de [cliente]"\n\n'
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
