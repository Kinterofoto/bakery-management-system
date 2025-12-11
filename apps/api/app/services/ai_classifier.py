"""Email classification service using OpenAI."""

import logging
from functools import lru_cache

from ..models.purchase_order import ClassificationResult, ClassificationType
from .openai_client import OpenAIClient, get_openai_client

logger = logging.getLogger(__name__)

# Classification prompt from existing Trigger.dev implementation
CLASSIFICATION_PROMPT = """Eres un clasificador de emails. Tu tarea es determinar si un email es una "Orden de compra" o "Otro".

Una orden de compra contiene textos similares a:
- "orden compra", "OC", "purchase order", "PO"
- "solicitud de compra", "pedido de compra", "requisición de compra"
- "programación", "Programación Pastry Chef"
- "documento de orden de compra", "confirmación de compra"
- "número de orden de compra", "documento OC"
- "pedido", "PEDIDO", "order", "ORDEN DE COMPRA"

Responde ÚNICAMENTE con una de estas dos opciones:
- "Orden de compra"
- "Otro"

No incluyas explicaciones ni texto adicional."""


class EmailClassifier:
    """Service for classifying emails using OpenAI."""

    def __init__(self, openai_client: OpenAIClient):
        self.client = openai_client
        self.model = "gpt-4o-mini"

    async def classify(
        self, subject: str, body_preview: str
    ) -> ClassificationResult:
        """
        Classify an email as purchase order or other.

        Args:
            subject: Email subject
            body_preview: Email body preview/snippet

        Returns:
            ClassificationResult with classification and confidence
        """
        logger.info(f"Classifying email: {subject[:50]}...")

        # Combine subject and body for classification
        input_text = f"{subject}\n\n{body_preview}"

        try:
            response = await self.client.chat_completion(
                messages=[
                    {"role": "system", "content": CLASSIFICATION_PROMPT},
                    {"role": "user", "content": input_text},
                ],
                model=self.model,
                temperature=0.1,
                max_tokens=50,
            )

            # Parse response
            response_text = response.strip()

            if "Orden de compra" in response_text:
                classification = ClassificationType.PURCHASE_ORDER
                confidence = 0.95
            else:
                classification = ClassificationType.OTHER
                confidence = 0.90

            logger.info(
                f"Email classified as: {classification.value} "
                f"(confidence: {confidence})"
            )

            return ClassificationResult(
                classification=classification,
                confidence=confidence,
                reason=response_text,
            )

        except Exception as e:
            logger.error(f"Classification failed: {e}")
            # Default to OTHER on error to avoid false positives
            return ClassificationResult(
                classification=ClassificationType.OTHER,
                confidence=0.5,
                reason=f"Error during classification: {str(e)}",
            )


@lru_cache()
def get_classifier() -> EmailClassifier:
    """Get cached EmailClassifier instance."""
    openai_client = get_openai_client()
    return EmailClassifier(openai_client)
