"""Email processor orchestrator service."""

import logging
import time
from datetime import datetime
from functools import lru_cache
from typing import List, Optional

from supabase import Client

from ..core.supabase import get_supabase_client
from ..models.email import EmailAttachment, EmailMessage
from ..models.purchase_order import (
    ClassificationType,
    ProcessingResult,
    PurchaseOrderCreate,
)
from .ai_classifier import EmailClassifier, get_classifier
from .ai_extractor import PDFExtractor, get_extractor
from .microsoft_graph import MicrosoftGraphService, get_graph_service
from .storage import StorageService, get_storage_service

logger = logging.getLogger(__name__)


class EmailProcessor:
    """
    Main orchestrator for email processing workflow.

    Flow:
    1. Get email from Microsoft Graph
    2. Classify email (purchase order or other)
    3. If purchase order, get attachments
    4. Filter PDF attachments
    5. For each PDF:
       a. Upload to Supabase Storage
       b. Extract data using OpenAI
       c. Save to database
    """

    def __init__(
        self,
        graph_service: MicrosoftGraphService,
        classifier: EmailClassifier,
        extractor: PDFExtractor,
        storage: StorageService,
        supabase: Client,
    ):
        self.graph = graph_service
        self.classifier = classifier
        self.extractor = extractor
        self.storage = storage
        self.supabase = supabase

    async def process_email(self, email_id: str) -> ProcessingResult:
        """
        Process a single email by ID.

        Args:
            email_id: Microsoft Graph email ID

        Returns:
            ProcessingResult with processing details
        """
        start_time = time.time()
        processing_logs = []

        try:
            # Step 1: Get email details
            logger.info(f"Processing email: {email_id}")
            processing_logs.append({
                "step": "fetch_email",
                "timestamp": datetime.now().isoformat(),
                "status": "started",
            })

            email = await self.graph.get_email(email_id)

            processing_logs.append({
                "step": "fetch_email",
                "timestamp": datetime.now().isoformat(),
                "status": "completed",
                "subject": email.subject,
                "from": email.from_address,
            })

            # Step 2: Classify email
            logger.info(f"Classifying email: {email.subject}")
            processing_logs.append({
                "step": "classify",
                "timestamp": datetime.now().isoformat(),
                "status": "started",
            })

            classification = await self.classifier.classify(
                subject=email.subject,
                body_preview=email.bodyPreview,
            )

            processing_logs.append({
                "step": "classify",
                "timestamp": datetime.now().isoformat(),
                "status": "completed",
                "classification": classification.classification.value,
                "confidence": classification.confidence,
            })

            # If not a purchase order, stop here
            if classification.classification != ClassificationType.PURCHASE_ORDER:
                logger.info(f"Email classified as '{classification.classification.value}', skipping")
                return ProcessingResult(
                    email_id=email_id,
                    success=True,
                    classification=classification.classification,
                    orders_created=0,
                    processing_time_ms=int((time.time() - start_time) * 1000),
                    details={"logs": processing_logs},
                )

            # Step 3: Get attachments if it's a purchase order
            if not email.hasAttachments:
                logger.info("Email has no attachments")
                return ProcessingResult(
                    email_id=email_id,
                    success=True,
                    classification=classification.classification,
                    orders_created=0,
                    error_message="No attachments found",
                    processing_time_ms=int((time.time() - start_time) * 1000),
                    details={"logs": processing_logs},
                )

            processing_logs.append({
                "step": "fetch_attachments",
                "timestamp": datetime.now().isoformat(),
                "status": "started",
            })

            attachments = await self.graph.get_attachments(email_id)

            # Filter PDF attachments
            pdf_attachments = self._filter_pdf_attachments(attachments)

            processing_logs.append({
                "step": "fetch_attachments",
                "timestamp": datetime.now().isoformat(),
                "status": "completed",
                "total_attachments": len(attachments),
                "pdf_attachments": len(pdf_attachments),
            })

            if not pdf_attachments:
                logger.info("No PDF attachments found")
                return ProcessingResult(
                    email_id=email_id,
                    success=True,
                    classification=classification.classification,
                    orders_created=0,
                    error_message="No PDF attachments found",
                    processing_time_ms=int((time.time() - start_time) * 1000),
                    details={"logs": processing_logs},
                )

            # Step 4: Process each PDF
            orders_created = 0
            for attachment in pdf_attachments:
                try:
                    order_id = await self._process_pdf_attachment(
                        email=email,
                        attachment=attachment,
                        processing_logs=processing_logs,
                    )
                    if order_id:
                        orders_created += 1
                except Exception as e:
                    logger.error(f"Failed to process attachment {attachment.name}: {e}")
                    processing_logs.append({
                        "step": "process_attachment",
                        "timestamp": datetime.now().isoformat(),
                        "status": "error",
                        "attachment": attachment.name,
                        "error": str(e),
                    })

            return ProcessingResult(
                email_id=email_id,
                success=True,
                classification=classification.classification,
                orders_created=orders_created,
                processing_time_ms=int((time.time() - start_time) * 1000),
                details={"logs": processing_logs},
            )

        except Exception as e:
            logger.error(f"Email processing failed: {e}")
            return ProcessingResult(
                email_id=email_id,
                success=False,
                classification=ClassificationType.OTHER,
                orders_created=0,
                error_message=str(e),
                processing_time_ms=int((time.time() - start_time) * 1000),
                details={"logs": processing_logs},
            )

    def _filter_pdf_attachments(
        self, attachments: List[EmailAttachment]
    ) -> List[EmailAttachment]:
        """Filter attachments to only include PDFs."""
        pdf_types = ["application/pdf", "application/octet-stream"]
        pdfs = []

        for att in attachments:
            if att.contentType in pdf_types:
                pdfs.append(att)
            elif att.name.lower().endswith(".pdf"):
                pdfs.append(att)

        return pdfs

    async def _process_pdf_attachment(
        self,
        email: EmailMessage,
        attachment: EmailAttachment,
        processing_logs: list,
    ) -> Optional[str]:
        """
        Process a single PDF attachment.

        Returns:
            Order ID if successful, None otherwise
        """
        logger.info(f"Processing PDF: {attachment.name}")

        # Download attachment
        processing_logs.append({
            "step": "download_attachment",
            "timestamp": datetime.now().isoformat(),
            "status": "started",
            "attachment": attachment.name,
        })

        pdf_content = await self.graph.download_attachment(
            email_id=email.id,
            attachment_id=attachment.id,
        )

        processing_logs.append({
            "step": "download_attachment",
            "timestamp": datetime.now().isoformat(),
            "status": "completed",
            "size_bytes": len(pdf_content),
        })

        # Upload to storage
        processing_logs.append({
            "step": "upload_storage",
            "timestamp": datetime.now().isoformat(),
            "status": "started",
        })

        storage_result = await self.storage.upload_pdf(
            content=pdf_content,
            original_name=attachment.name,
        )

        processing_logs.append({
            "step": "upload_storage",
            "timestamp": datetime.now().isoformat(),
            "status": "completed",
            "path": storage_result["path"],
        })

        # Extract data from PDF
        processing_logs.append({
            "step": "extract_data",
            "timestamp": datetime.now().isoformat(),
            "status": "started",
        })

        extraction = await self.extractor.extract_from_pdf_bytes(
            pdf_content=pdf_content,
            filename=attachment.name,
        )

        processing_logs.append({
            "step": "extract_data",
            "timestamp": datetime.now().isoformat(),
            "status": "completed",
            "cliente": extraction.cliente,
            "oc_number": extraction.oc_number,
            "products_count": len(extraction.productos),
        })

        # Save to database
        processing_logs.append({
            "step": "save_database",
            "timestamp": datetime.now().isoformat(),
            "status": "started",
        })

        order_id = await self._save_to_database(
            email=email,
            storage_result=storage_result,
            extraction=extraction,
            processing_logs=processing_logs,
        )

        processing_logs.append({
            "step": "save_database",
            "timestamp": datetime.now().isoformat(),
            "status": "completed",
            "order_id": order_id,
        })

        return order_id

    async def _save_to_database(
        self,
        email: EmailMessage,
        storage_result: dict,
        extraction,
        processing_logs: list,
    ) -> str:
        """Save extracted data to database."""
        logger.info(f"Saving order to database: {extraction.oc_number}")

        # Insert main order record
        order_data = {
            "email_id": email.id,
            "email_subject": email.subject,
            "email_from": email.from_address,
            "email_body_preview": email.bodyPreview,
            "received_at": email.receivedDateTime.isoformat(),
            "pdf_url": storage_result["url"],
            "pdf_filename": storage_result["filename"],
            "cliente": extraction.cliente,
            "sucursal": extraction.sucursal,
            "oc_number": extraction.oc_number,
            "direccion": extraction.direccion,
            "status": "processed",
            "processing_logs": processing_logs,
        }

        result = self.supabase.schema("workflows").table("ordenes_compra").insert(
            order_data
        ).execute()

        order_id = result.data[0]["id"]

        # Insert products
        if extraction.productos:
            products_data = []
            for prod in extraction.productos:
                products_data.append({
                    "orden_compra_id": order_id,
                    "producto": prod.producto,
                    "cantidad_solicitada": prod.cantidad_solicitada,
                    "fecha_entrega": prod.fecha_entrega.isoformat() if prod.fecha_entrega else None,
                    "precio": prod.precio,
                })

            self.supabase.schema("workflows").table(
                "ordenes_compra_productos"
            ).insert(products_data).execute()

        logger.info(f"Order saved with ID: {order_id}")
        return order_id


@lru_cache()
def get_email_processor() -> EmailProcessor:
    """Get cached EmailProcessor instance."""
    return EmailProcessor(
        graph_service=get_graph_service(),
        classifier=get_classifier(),
        extractor=get_extractor(),
        storage=get_storage_service(),
        supabase=get_supabase_client(),
    )
