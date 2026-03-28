"""WhatsApp Cloud API service for sending template messages."""

import httpx
import logging
from ..core.config import get_settings

logger = logging.getLogger(__name__)

GRAPH_API_BASE = "https://graph.facebook.com/v25.0"


async def send_template_message(
    to: str,
    template_name: str,
    language: str,
    components: list[dict],
) -> dict:
    """Send a WhatsApp template message via the Cloud API.

    Args:
        to: Phone number in international format (e.g. '573001234567')
        template_name: Name of the approved template
        language: Language code (e.g. 'es')
        components: Template components with parameters

    Returns:
        API response dict
    """
    settings = get_settings()
    phone_number_id = settings.whatsapp_phone_number_id
    token = settings.whatsapp_access_token

    url = f"{GRAPH_API_BASE}/{phone_number_id}/messages"

    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": language},
            "components": components,
        },
    }

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            url,
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
        )

    result = response.json()

    if response.status_code != 200:
        logger.error(f"WhatsApp send failed to {to}: {result}")
    else:
        msg_id = result.get("messages", [{}])[0].get("id", "unknown")
        logger.info(f"WhatsApp sent to {to} (msg: {msg_id})")

    return result
