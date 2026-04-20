"""Supplier documents reminder job.

Twice a week (Mon/Thu 8 AM COL) checks every active supplier for the 8 required
documents in compras.supplier_documents. If any are missing, emails the supplier
from calidad@pastrychef.com.co listing the pending documents.
"""

import logging
from typing import Optional

from ..core.supabase import get_supabase_client
from ..services.microsoft_graph import get_graph_service

logger = logging.getLogger(__name__)

QUALITY_MAILBOX = "calidad@pastrychef.com.co"
PORTAL_BASE_URL = "https://soypastry.app"

REQUIRED_DOCUMENT_CATEGORIES: list[tuple[str, str]] = [
    ("registro_sanitario", "Registro / Notificación Sanitaria"),
    ("analisis_microbiologico", "Análisis Microbiológicos"),
    ("concepto_sanitario_vehiculo", "Concepto Sanitario del Vehículo"),
    ("carne_manipulador_alimentos", "Carné de Manipulador de Alimentos"),
    ("concepto_sanitario", "Concepto Sanitario"),
    ("rut", "RUT"),
    ("camara_comercio", "Cámara de Comercio"),
    ("certificacion_bancaria", "Certificación Bancaria"),
]


def _build_email_body(
    contact_name: Optional[str],
    company_name: str,
    missing_labels: list[str],
    portal_url: Optional[str],
) -> tuple[str, str]:
    greeting_name = contact_name.strip() if contact_name and contact_name.strip() else company_name
    bullet_list = "\n".join(f"- {label}" for label in missing_labels)
    subject = f"Documentos pendientes por cargar - {company_name}"

    portal_section = (
        f"Puede cargarlos directamente en su portal de proveedor:\n{portal_url}\n\n"
        if portal_url
        else ""
    )

    body = (
        f"Hola {greeting_name},\n\n"
        f"Desde el área de calidad de Pastry Chef le escribimos para recordarle que, "
        f"de acuerdo con nuestra plataforma de proveedores, los siguientes documentos "
        f"se encuentran pendientes por cargar:\n\n"
        f"{bullet_list}\n\n"
        f"{portal_section}"
        f"Agradecemos cargarlos lo antes posible para mantener al día la documentación "
        f"de {company_name}.\n\n"
        f"Si ya los cargó o considera que este mensaje es un error, por favor responda a "
        f"este correo.\n\n"
        f"Gracias por su colaboración.\n\n"
        f"Área de Calidad\n"
        f"Pastry Chef"
    )
    return subject, body


async def run_supplier_documents_reminder(supplier_ids: Optional[list[str]] = None) -> dict:
    """Send reminder emails to suppliers missing required documents.

    Args:
        supplier_ids: Optional list to restrict the run to specific suppliers (for testing).

    Returns:
        Summary dict with counts.
    """
    logger.info("Starting supplier documents reminder job (filter=%s)", supplier_ids or "all active")
    supabase = get_supabase_client()

    suppliers_query = (
        supabase.schema("compras")
        .from_("suppliers")
        .select("id, company_name, contact_person_name, contact_email, status, access_token")
    )
    if supplier_ids:
        suppliers_query = suppliers_query.in_("id", supplier_ids)
    else:
        suppliers_query = suppliers_query.eq("status", "active")

    suppliers_result = suppliers_query.execute()
    suppliers = suppliers_result.data or []
    logger.info("Fetched %s supplier(s)", len(suppliers))

    summary = {
        "total_suppliers": len(suppliers),
        "emails_sent": 0,
        "skipped_no_email": 0,
        "skipped_no_missing_docs": 0,
        "errors": 0,
        "details": [],
    }

    if not suppliers:
        return summary

    graph = get_graph_service()

    for supplier in suppliers:
        supplier_id = supplier["id"]
        company_name = supplier.get("company_name") or "(sin nombre)"
        contact_email = (supplier.get("contact_email") or "").strip()
        contact_name = supplier.get("contact_person_name")
        access_token = supplier.get("access_token")
        portal_url = f"{PORTAL_BASE_URL}/portal-proveedor/{access_token}" if access_token else None

        docs_result = (
            supabase.schema("compras")
            .from_("supplier_documents")
            .select("category")
            .eq("supplier_id", supplier_id)
            .execute()
        )
        existing_categories = {row["category"] for row in (docs_result.data or [])}

        missing = [
            (key, label)
            for key, label in REQUIRED_DOCUMENT_CATEGORIES
            if key not in existing_categories
        ]

        if not missing:
            summary["skipped_no_missing_docs"] += 1
            summary["details"].append({"supplier": company_name, "status": "complete"})
            continue

        if not contact_email:
            summary["skipped_no_email"] += 1
            summary["details"].append({
                "supplier": company_name,
                "status": "skipped_no_email",
                "missing": [label for _, label in missing],
            })
            logger.warning("Supplier %s has missing docs but no contact_email; skipped", company_name)
            continue

        subject, body = _build_email_body(
            contact_name=contact_name,
            company_name=company_name,
            missing_labels=[label for _, label in missing],
            portal_url=portal_url,
        )

        try:
            await graph.send_email(
                to=contact_email,
                subject=subject,
                body=body,
                mailbox=QUALITY_MAILBOX,
            )
            summary["emails_sent"] += 1
            summary["details"].append({
                "supplier": company_name,
                "status": "sent",
                "to": contact_email,
                "missing": [label for _, label in missing],
            })
            logger.info(
                "Reminder email sent to %s (%s) with %s missing doc(s)",
                contact_email,
                company_name,
                len(missing),
            )
        except Exception as e:
            summary["errors"] += 1
            summary["details"].append({
                "supplier": company_name,
                "status": "error",
                "error": str(e),
            })
            logger.error("Failed to send reminder to %s: %s", contact_email, e, exc_info=True)

    logger.info(
        "Supplier documents reminder finished: sent=%s, complete=%s, no_email=%s, errors=%s",
        summary["emails_sent"],
        summary["skipped_no_missing_docs"],
        summary["skipped_no_email"],
        summary["errors"],
    )
    return summary
