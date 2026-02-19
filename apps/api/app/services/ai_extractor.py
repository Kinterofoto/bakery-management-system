"""PDF extraction service using OpenAI."""

import base64
import io
import json
import logging
import re
from datetime import date, datetime
from functools import lru_cache
from typing import Optional

import fitz  # PyMuPDF
from PIL import Image

from ..models.purchase_order import ExtractionResult, ProductoExtraido
from .openai_client import OpenAIClient, get_openai_client

logger = logging.getLogger(__name__)

# Extraction prompt from existing Trigger.dev implementation
EXTRACTION_PROMPT = """Analiza este PDF y devuélveme los datos en formato JSON con una tabla estructurada. El siguiente texto es una orden de compra. Extrae y estructura la siguiente información: CLIENTE (Nunca puede ser: PASTRY CHEF PASTELERIA Y COCINA GOURMET SAS), SUCURSAL, OC (número de orden de compra), FECHA DE ENTREGA (a nivel de orden), PRODUCTO, CANTIDAD SOLICITADA, PRECIO y DIRECCIÓN.

Reglas importantes:
1. La orden puede tener múltiples productos/líneas.
2. Extrae el nombre completo del producto, incluyendo todos los detalles.
3. El CLIENTE NUNCA puede ser: "PASTRY CHEF PASTELERIA Y COCINA GOURMET SAS". Siempre elige la otra empresa presente en el texto y extrae TODOS los nombres que consideres que tienen que ver con la empresa (razones sociales y nombres comerciales) y únelos todos en el campo de cliente.
4. La CANTIDAD SOLICITADA siempre debe extraerse únicamente de la columna de cantidad que aparece separada en la orden. ⚠️ Nunca confundirla con los números dentro de la descripción del producto (gramos, peso, presentaciones, unidades por paquete u otras cifras). Solo esa columna independiente representa la cantidad solicitada.
5. FECHA DE ENTREGA: Busca la fecha de entrega en TODO el documento (encabezado, columnas, pie de página). Si hay una fecha de entrega general para toda la orden, úsala en el campo "FECHA DE ENTREGA" del nivel principal. Si cada producto tiene su propia fecha, inclúyela también a nivel de producto.
6. Estructura la respuesta en JSON con los siguientes campos:

{
  "CLIENTE": "Nombre de la empresa",
  "SUCURSAL": "Nombre de la sucursal (extrae toda la información relacionada y únela)",
  "OC": "Número de orden de compra",
  "FECHA DE ENTREGA": "AAAA-MM-DD",
  "PRODUCTOS": [
    {
      "PRODUCTO": "Nombre completo del producto",
      "FECHA DE ENTREGA": "AAAA-MM-DD",
      "CANTIDAD SOLICITADA": 0,
      "PRECIO": 0
    }
  ],
  "DIRECCIÓN": "Dirección de entrega"
}

Formato para FECHA DE ENTREGA (ISO 8601):
- Siempre convertir cualquier formato de entrada a AAAA-MM-DD.
- Ejemplos: 28/11/2024 → 2024-11-28; noviembre 28, 2024 → 2024-11-28; 28-11 → usar año actual.
- Si la entrada no incluye el año, asumir el año actual.
- Busca la fecha en: campos de "Fecha de entrega", "Fecha requerida", "Fecha de despacho", "Delivery date", columnas de fecha en la tabla de productos, o cualquier referencia a cuándo se necesita la entrega.
- Si no encuentras ninguna fecha explícita de entrega, deja el campo como null.

Formato para PRECIO:
- Extraer únicamente el precio unitario, ignorar precios totales.
- Ignorar símbolos y separadores de miles (ejemplo: "$25,000" → 25000).
- Si el precio tiene decimales, mantenerlos.

Formato para DIRECCIÓN:
- Extraer la dirección más probable, incluyendo calle, número y ciudad.

Responde ÚNICAMENTE con el JSON, sin texto adicional."""


def _build_extraction_prompt(email_body: str | None = None) -> str:
    """Build the extraction prompt, optionally including email body context."""
    if not email_body or not email_body.strip():
        return EXTRACTION_PROMPT

    return (
        f"CONTEXTO DEL CORREO ELECTRÓNICO (usa esta información para complementar la extracción, "
        f"especialmente para encontrar la FECHA DE ENTREGA si no aparece en el PDF):\n"
        f'"""\n{email_body.strip()}\n"""\n\n'
        f"{EXTRACTION_PROMPT}"
    )


class PDFExtractor:
    """Service for extracting data from PDFs using OpenAI Vision."""

    def __init__(self, openai_client: OpenAIClient):
        self.client = openai_client
        self.vision_model = "gpt-4o"

    def _parse_date(self, date_str: Optional[str]) -> Optional[date]:
        """Parse date string to date object."""
        if not date_str:
            return None

        try:
            # Try ISO format first
            return datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            pass

        try:
            # Try DD/MM/YYYY
            return datetime.strptime(date_str, "%d/%m/%Y").date()
        except ValueError:
            pass

        try:
            # Try DD-MM-YYYY
            return datetime.strptime(date_str, "%d-%m-%Y").date()
        except ValueError:
            pass

        return None

    def _parse_price(self, price_value) -> Optional[float]:
        """Parse price value to float."""
        if price_value is None:
            return None

        if isinstance(price_value, (int, float)):
            return float(price_value)

        if isinstance(price_value, str):
            # Remove currency symbols and thousands separators
            cleaned = re.sub(r"[^\d.,]", "", price_value)
            # Handle both . and , as decimal separators
            if "," in cleaned and "." in cleaned:
                # Assume format like 1,234.56 or 1.234,56
                if cleaned.rfind(",") > cleaned.rfind("."):
                    cleaned = cleaned.replace(".", "").replace(",", ".")
                else:
                    cleaned = cleaned.replace(",", "")
            elif "," in cleaned:
                cleaned = cleaned.replace(",", ".")

            try:
                return float(cleaned)
            except ValueError:
                return None

        return None

    def _extract_json_from_response(self, response: str) -> dict:
        """Extract JSON from response, handling markdown code blocks."""
        # Try to find JSON in markdown code block
        json_match = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", response)
        if json_match:
            return json.loads(json_match.group(1))

        # Try parsing raw response
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            pass

        # Try to find JSON object in response
        json_match = re.search(r"\{[\s\S]*\}", response)
        if json_match:
            return json.loads(json_match.group(0))

        raise ValueError("Could not extract JSON from response")

    async def extract_from_pdf_bytes(
        self, pdf_content: bytes, filename: str, email_body: str | None = None,
    ) -> ExtractionResult:
        """
        Extract purchase order data from PDF bytes using Vision API.

        Args:
            pdf_content: PDF file content as bytes
            filename: Original filename
            email_body: Optional email body text for additional context (e.g. delivery dates)

        Returns:
            ExtractionResult with extracted data
        """
        logger.info(f"Extracting data from PDF: {filename}")
        prompt = _build_extraction_prompt(email_body)

        try:
            # First, try using the file upload + responses API
            file_id = await self.client.upload_file(pdf_content, filename)

            response = await self.client.extract_from_pdf_file(
                file_id=file_id,
                prompt=prompt,
            )

            return self._parse_extraction_response(response)

        except Exception as e:
            logger.warning(f"File upload method failed: {e}, trying PDF-to-image vision fallback")

            # Fallback: Convert PDF pages to PNG images and send to vision API
            image_urls = self._pdf_to_image_urls(pdf_content)
            if not image_urls:
                raise ValueError("Could not convert PDF to images for vision fallback")

            logger.info(f"Converted PDF to {len(image_urls)} page image(s)")

            # Send first page (most purchase orders are single-page)
            response = await self.client.vision_completion(
                prompt=prompt,
                image_url=image_urls[0],
            )

            return self._parse_extraction_response(response)

    @staticmethod
    def _pdf_to_image_urls(pdf_content: bytes, dpi: int = 200) -> list[str]:
        """Convert PDF pages to base64-encoded PNG data URLs for the vision API."""
        image_urls = []
        try:
            doc = fitz.open(stream=pdf_content, filetype="pdf")
            for page in doc:
                mat = fitz.Matrix(dpi / 72, dpi / 72)
                pix = page.get_pixmap(matrix=mat)
                img = Image.open(io.BytesIO(pix.tobytes("png")))
                buf = io.BytesIO()
                img.save(buf, format="PNG")
                b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
                image_urls.append(f"data:image/png;base64,{b64}")
            doc.close()
        except Exception as e:
            logger.error(f"PDF to image conversion failed: {e}")
        return image_urls

    def _parse_extraction_response(self, response: str) -> ExtractionResult:
        """Parse the extraction response into structured data."""
        logger.info("Parsing extraction response")

        try:
            data = self._extract_json_from_response(response)

            # Extract products
            productos = []
            for prod in data.get("PRODUCTOS", []):
                productos.append(
                    ProductoExtraido(
                        producto=prod.get("PRODUCTO", ""),
                        cantidad_solicitada=int(prod.get("CANTIDAD SOLICITADA", 1)),
                        fecha_entrega=self._parse_date(prod.get("FECHA DE ENTREGA")),
                        precio=self._parse_price(prod.get("PRECIO")),
                    )
                )

            # Extract global delivery date
            global_fecha = self._parse_date(data.get("FECHA DE ENTREGA"))

            # If no global date, try to infer from products (use most common one)
            if not global_fecha:
                product_dates = [p.fecha_entrega for p in productos if p.fecha_entrega]
                if product_dates:
                    global_fecha = max(set(product_dates), key=product_dates.count)

            # Propagate global date to products that don't have one
            if global_fecha:
                for p in productos:
                    if not p.fecha_entrega:
                        p.fecha_entrega = global_fecha

            result = ExtractionResult(
                cliente=data.get("CLIENTE", ""),
                sucursal=data.get("SUCURSAL"),
                oc_number=str(data.get("OC", "")),
                direccion=data.get("DIRECCIÓN") or data.get("DIRECCION"),
                fecha_entrega=global_fecha,
                productos=productos,
                raw_response=response,
                confidence_score=0.9,
            )

            logger.info(
                f"Extraction successful. Cliente: {result.cliente}, "
                f"OC: {result.oc_number}, Products: {len(productos)}"
            )

            return result

        except Exception as e:
            logger.error(f"Failed to parse extraction response: {e}")
            logger.debug(f"Raw response: {response}")
            raise ValueError(f"Failed to parse extraction response: {e}")


@lru_cache()
def get_extractor() -> PDFExtractor:
    """Get cached PDFExtractor instance."""
    openai_client = get_openai_client()
    return PDFExtractor(openai_client)
