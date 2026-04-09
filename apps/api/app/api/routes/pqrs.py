"""PQRS resolution email endpoint."""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ...services.microsoft_graph import get_graph_service
from ...core.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/pqrs", tags=["pqrs"])

QUALITY_MAILBOX = "calidad@pastrychef.com.co"


class SendResolutionRequest(BaseModel):
    client_name: str
    client_email: str
    pqrs_type: str
    product_name: str | None = None
    product_lot: str | None = None
    description: str
    resolution_notes: str
    resolution_method: str
    action_plan: str | None = None
    pqrs_id: str


def build_resolution_html(data: SendResolutionRequest) -> str:
    """Build HTML email body for PQRS resolution."""
    type_labels = {
        "peticion": "Peticion",
        "queja": "Queja",
        "reclamo": "Reclamo",
        "sugerencia": "Sugerencia",
    }
    pqrs_label = type_labels.get(data.pqrs_type, data.pqrs_type)

    product_section = ""
    if data.product_name:
        product_section = f"""
        <tr>
          <td style="padding: 8px 16px; color: #6b7280; font-size: 14px; border-bottom: 1px solid #f3f4f6;">Producto</td>
          <td style="padding: 8px 16px; color: #111827; font-size: 14px; border-bottom: 1px solid #f3f4f6;">{data.product_name}{f' | Lote: {data.product_lot}' if data.product_lot else ''}</td>
        </tr>"""

    action_section = ""
    if data.action_plan:
        action_section = f"""
        <div style="margin-top: 20px;">
          <h3 style="color: #374151; font-size: 15px; margin-bottom: 8px;">Plan de Accion</h3>
          <p style="color: #4b5563; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">{data.action_plan}</p>
        </div>"""

    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #ef4444, #dc2626); border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 600;">Pastry</h1>
      <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Sistema de Gestion de Calidad</p>
    </div>

    <!-- Content -->
    <div style="background: white; padding: 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
      <p style="color: #111827; font-size: 16px; margin-top: 0;">Estimado/a <strong>{data.client_name}</strong>,</p>
      <p style="color: #4b5563; font-size: 14px; line-height: 1.6;">
        Le informamos que su {pqrs_label.lower()} ha sido revisada y resuelta por nuestro equipo de calidad.
        A continuacion encontrara los detalles de la resolucion:
      </p>

      <!-- PQRS Details -->
      <div style="background: #f9fafb; border-radius: 12px; overflow: hidden; margin: 24px 0;">
        <div style="background: #f3f4f6; padding: 12px 16px;">
          <strong style="color: #374151; font-size: 14px;">Detalles de su {pqrs_label}</strong>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 16px; color: #6b7280; font-size: 14px; border-bottom: 1px solid #f3f4f6; width: 120px;">Tipo</td>
            <td style="padding: 8px 16px; color: #111827; font-size: 14px; border-bottom: 1px solid #f3f4f6;">{pqrs_label}</td>
          </tr>
          <tr>
            <td style="padding: 8px 16px; color: #6b7280; font-size: 14px; border-bottom: 1px solid #f3f4f6;">Referencia</td>
            <td style="padding: 8px 16px; color: #111827; font-size: 14px; border-bottom: 1px solid #f3f4f6;">#{data.pqrs_id[:8]}</td>
          </tr>{product_section}
        </table>
      </div>

      <!-- Resolution -->
      <div style="border-left: 4px solid #22c55e; padding-left: 16px; margin: 24px 0;">
        <h3 style="color: #374151; font-size: 15px; margin: 0 0 8px;">Resolucion</h3>
        <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px;"><strong>Metodo:</strong> {data.resolution_method}</p>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">{data.resolution_notes}</p>
      </div>

      {action_section}

      <!-- Footer message -->
      <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 13px; line-height: 1.6;">
          Si tiene alguna pregunta adicional, no dude en contactarnos respondiendo a este correo o al telefono de nuestra linea de calidad.
        </p>
        <p style="color: #6b7280; font-size: 13px;">
          Cordialmente,<br>
          <strong style="color: #374151;">Equipo de Calidad</strong><br>
          Pastry
        </p>
      </div>
    </div>

    <!-- Footer -->
    <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px;">
      Este correo fue enviado desde el Sistema de Gestion de Calidad de Pastry.
    </p>
  </div>
</body>
</html>
"""


@router.post("/send-resolution")
async def send_resolution_email(request: SendResolutionRequest):
    """Send PQRS resolution email to client from calidad@pastrychef.com.co."""
    try:
        graph = get_graph_service()

        type_labels = {
            "peticion": "Peticion",
            "queja": "Queja",
            "reclamo": "Reclamo",
            "sugerencia": "Sugerencia",
        }
        pqrs_label = type_labels.get(request.pqrs_type, request.pqrs_type)
        subject = f"Resolucion de {pqrs_label} #{request.pqrs_id[:8]} - Pastry Calidad"

        html_body = build_resolution_html(request)

        # Override send_email to use HTML content type
        target = QUALITY_MAILBOX
        endpoint = f"/users/{target}/sendMail"
        payload = {
            "message": {
                "subject": subject,
                "body": {
                    "contentType": "HTML",
                    "content": html_body,
                },
                "toRecipients": [
                    {"emailAddress": {"address": request.client_email}}
                ],
            },
            "saveToSentItems": True,
        }

        await graph._make_request("POST", endpoint, json_data=payload)

        logger.info(
            f"PQRS resolution email sent to {request.client_email} for PQRS {request.pqrs_id}"
        )
        return {"status": "sent", "to": request.client_email}

    except Exception as e:
        logger.error(f"Failed to send PQRS resolution email: {e}")
        raise HTTPException(status_code=500, detail=str(e))
