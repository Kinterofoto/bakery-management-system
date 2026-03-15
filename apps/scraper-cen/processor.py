"""PDF processing, RAG matching, and order creation for scraped CEN Carvajal orders."""

import base64
import io
import json
import logging
import math
import re
import uuid
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import Optional

import fitz  # PyMuPDF
import httpx
from openai import AsyncOpenAI
from PIL import Image
from supabase import create_client
from tenacity import retry, stop_after_attempt, wait_exponential

from config import settings
from scraper import ScrapedOrder

logger = logging.getLogger(__name__)

# ── Supabase client ────────────────────────────────────────────────────────────

_supabase = None


def get_supabase():
    global _supabase
    if _supabase is None:
        _supabase = create_client(settings.supabase_url, settings.supabase_service_key)
    return _supabase


# ── OpenAI client ──────────────────────────────────────────────────────────────

_openai = None


def get_openai() -> AsyncOpenAI:
    global _openai
    if _openai is None:
        _openai = AsyncOpenAI(api_key=settings.openai_api_key)
    return _openai


# ── Result types ───────────────────────────────────────────────────────────────


@dataclass
class ProcessedProduct:
    producto: str  # raw name from PDF
    cantidad: int
    precio: float | None
    fecha_entrega: date | None
    producto_id: str | None = None  # matched product UUID
    producto_nombre: str | None = None  # matched product name
    confidence_score: float = 0.0


@dataclass
class ProcessResult:
    doc_number: str
    status: str  # "approved", "processed", "error", "skipped"
    order_number: str | None = None
    message: str = ""
    products_matched: int = 0
    products_total: int = 0


# ── PDF Extraction (OpenAI) ────────────────────────────────────────────────────

EXTRACTION_PROMPT = """Analiza este PDF de orden de compra de CEN Carvajal / OXXO y devuélveme los datos en formato JSON.

Extrae:
- CLIENTE: Siempre es "Cadena Comercial Oxxo Colombia S A S" (el emisor)
- SUCURSAL: El "Punto de venta" o "Lugar de entrega" (ejemplo: "CEDIS FRIO BOGOTA - FUNZA")
- OC: Número de documento (N° de documento)
- FECHA DE ENTREGA: La "Fecha máxima de entrega" en formato AAAA-MM-DD
- PRODUCTOS: Array de productos de la tabla
- DIRECCIÓN: Dirección del "Sitio de entrega (Factura)"
- OBSERVACIONES: Campo "Observaciones" si existe

Para cada producto en la tabla, extrae:
- PRODUCTO: El código del producto (columna "Producto", ejemplo: "51380")
- CANTIDAD SOLICITADA: La cantidad de la columna "Pedida" (como entero, sin decimales)
- PRECIO: El "Precio neto" unitario (sin símbolos ni separadores de miles)

{
  "CLIENTE": "Cadena Comercial Oxxo Colombia S A S",
  "SUCURSAL": "nombre del punto de venta / lugar de entrega",
  "OC": "número de documento",
  "FECHA DE ENTREGA": "AAAA-MM-DD",
  "PRODUCTOS": [
    {
      "PRODUCTO": "código del producto",
      "CANTIDAD SOLICITADA": 0,
      "PRECIO": 0
    }
  ],
  "DIRECCIÓN": "dirección de entrega",
  "OBSERVACIONES": "observaciones si existen"
}

Responde ÚNICAMENTE con el JSON, sin texto adicional."""


def _pdf_to_image_urls(pdf_content: bytes, dpi: int = 200) -> list[str]:
    """Convert PDF pages to base64 PNG data URLs for vision API."""
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


def _extract_json_from_response(response: str) -> dict:
    """Extract JSON from response, handling markdown code blocks."""
    json_match = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", response)
    if json_match:
        return json.loads(json_match.group(1))
    try:
        return json.loads(response)
    except json.JSONDecodeError:
        pass
    json_match = re.search(r"\{[\s\S]*\}", response)
    if json_match:
        return json.loads(json_match.group(0))
    raise ValueError("Could not extract JSON from response")


def _parse_date(date_str: str | None) -> date | None:
    """Parse date string to date object."""
    if not date_str:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d-%m-%Y %H:%M"):
        try:
            return datetime.strptime(date_str.strip(), fmt).date()
        except ValueError:
            continue
    return None


def _parse_price(price_value) -> float | None:
    """Parse price value to float."""
    if price_value is None:
        return None
    if isinstance(price_value, (int, float)):
        return float(price_value)
    if isinstance(price_value, str):
        cleaned = re.sub(r"[^\d.,]", "", price_value)
        if "," in cleaned and "." in cleaned:
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


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def extract_from_pdf(pdf_bytes: bytes, filename: str) -> dict:
    """Extract order data from PDF using OpenAI Vision."""
    logger.info(f"Extracting data from PDF: {filename}")
    client = get_openai()

    # Try file upload first
    try:
        file_obj = await client.files.create(
            file=(filename, pdf_bytes),
            purpose="assistants",
        )

        async with httpx.AsyncClient(timeout=120.0) as http:
            resp = await http.post(
                "https://api.openai.com/v1/responses",
                headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                json={
                    "model": "gpt-4.1",
                    "input": [
                        {
                            "role": "user",
                            "content": [
                                {"type": "input_file", "file_id": file_obj.id},
                                {"type": "input_text", "text": EXTRACTION_PROMPT},
                            ],
                        }
                    ],
                },
            )
            resp.raise_for_status()
            data = resp.json()

            # Extract text from nested output
            for item in data.get("output", []):
                if item.get("type") == "message":
                    for content in item.get("content", []):
                        if content.get("type") == "output_text":
                            return _extract_json_from_response(content["text"])

    except Exception as e:
        logger.warning(f"File upload method failed: {e}, trying vision fallback")

    # Fallback: convert to images
    image_urls = _pdf_to_image_urls(pdf_bytes)
    if not image_urls:
        raise ValueError("Could not convert PDF to images")

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": image_urls[0]}},
                {"type": "text", "text": EXTRACTION_PROMPT},
            ],
        }],
        max_tokens=4000,
        temperature=0.1,
    )

    return _extract_json_from_response(response.choices[0].message.content)


# ── Storage Upload ─────────────────────────────────────────────────────────────


async def upload_pdf_to_storage(pdf_bytes: bytes, filename: str) -> dict:
    """Upload PDF to Supabase Storage."""
    supabase = get_supabase()
    bucket = settings.supabase_storage_bucket

    now = datetime.now()
    sanitized = re.sub(r"[^a-z0-9\-._]", "", filename.lower().replace(" ", "-"))
    if len(sanitized) > 50:
        sanitized = sanitized[:50]
    storage_filename = f"{now.strftime('%Y-%m-%d')}_{int(now.timestamp())}_{uuid.uuid4().hex[:9]}_{sanitized}"
    if not storage_filename.endswith(".pdf"):
        storage_filename += ".pdf"
    path = f"oc/{storage_filename}"

    logger.info(f"Uploading to storage: {path}")
    supabase.storage.from_(bucket).upload(
        path=path,
        file=pdf_bytes,
        file_options={"content-type": "application/pdf"},
    )
    url = supabase.storage.from_(bucket).get_public_url(path)

    return {"path": path, "url": url, "filename": storage_filename}


# ── RAG Matching ───────────────────────────────────────────────────────────────


async def generate_embedding(text: str) -> list[float]:
    """Generate embedding vector using OpenAI."""
    client = get_openai()
    response = await client.embeddings.create(
        input=text,
        model="text-embedding-3-small",
    )
    return response.data[0].embedding


async def generate_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """Generate embedding vectors for multiple texts in a single API call."""
    if not texts:
        return []
    client = get_openai()
    response = await client.embeddings.create(
        input=texts,
        model="text-embedding-3-small",
    )
    # Sort by index to maintain order
    sorted_data = sorted(response.data, key=lambda x: x.index)
    return [item.embedding for item in sorted_data]


OXXO_CLIENT_NAME = "OXXO"
PRODUCT_MATCH_THRESHOLD = 0.45
ALIAS_VECTOR_THRESHOLD = 0.90
RERANK_THRESHOLD = 0.70


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(x * x for x in b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


async def match_oxxo_client() -> dict | None:
    """Find OXXO client in the database (we know it's always OXXO)."""
    supabase = get_supabase()

    # Try direct name search first
    for search_term in ["OXXO", "Oxxo", "Cadena Comercial Oxxo"]:
        result = (
            supabase.schema("public").table("clients")
            .select("id, name")
            .ilike("name", f"%{search_term}%")
            .limit(1)
            .execute()
        )
        if result.data:
            client = result.data[0]
            logger.info(f"Matched OXXO client: {client['name']} ({client['id']})")
            return {"client_id": client["id"], "client_name": client["name"]}

    # Fallback: try razon_social
    result = (
        supabase.schema("public").table("clients")
        .select("id, name, razon_social")
        .ilike("razon_social", "%oxxo%")
        .limit(1)
        .execute()
    )
    if result.data:
        client = result.data[0]
        return {"client_id": client["id"], "client_name": client["name"]}

    logger.error("OXXO client not found in database!")
    return None


async def match_branch(client_id: str, sucursal_text: str | None, direccion_text: str | None) -> dict | None:
    """Match extracted branch info against the client's branches."""
    if not client_id:
        return None

    supabase = get_supabase()
    result = (
        supabase.schema("public").table("branches")
        .select("id, name, address, is_main")
        .eq("client_id", client_id)
        .order("is_main", desc=True)
        .execute()
    )
    branches = result.data or []

    if not branches:
        return None

    if len(branches) == 1:
        b = branches[0]
        return {"branch_id": b["id"], "branch_name": b["name"], "similarity": 1.0}

    # Multiple branches - match using embeddings
    query_parts = []
    if sucursal_text and sucursal_text.strip():
        query_parts.append(sucursal_text.strip())
    if direccion_text and direccion_text.strip():
        query_parts.append(direccion_text.strip())

    if not query_parts:
        main = next((b for b in branches if b.get("is_main")), branches[0])
        return {"branch_id": main["id"], "branch_name": main["name"], "similarity": 0.0}

    query_text = " | ".join(query_parts)

    # Build texts for all branches, then embed in one batch call
    branch_texts = []
    branch_indices = []
    for i, b in enumerate(branches):
        parts = [p for p in [b.get("name"), b.get("address")] if p and p.strip()]
        if parts:
            branch_texts.append(" | ".join(parts))
            branch_indices.append(i)

    if not branch_texts:
        main = next((b for b in branches if b.get("is_main")), branches[0])
        return {"branch_id": main["id"], "branch_name": main["name"], "similarity": 0.0}

    all_embeddings = await generate_embeddings_batch([query_text] + branch_texts)
    query_emb = all_embeddings[0]
    branch_embs = all_embeddings[1:]

    best_branch = None
    best_sim = -1.0
    for idx, branch_emb in zip(branch_indices, branch_embs):
        sim = _cosine_similarity(query_emb, branch_emb)
        if sim > best_sim:
            best_sim = sim
            best_branch = branches[idx]

    if best_branch and best_sim >= 0.40:
        return {"branch_id": best_branch["id"], "branch_name": best_branch["name"], "similarity": round(best_sim, 4)}

    main = next((b for b in branches if b.get("is_main")), branches[0])
    return {"branch_id": main["id"], "branch_name": main["name"], "similarity": 0.0}


async def match_product(extracted_name: str, client_id: str | None = None, precio: float | None = None) -> dict | None:
    """Match extracted product code/name against aliases and productos_rag."""
    if not extracted_name or not extracted_name.strip():
        return None

    extracted_upper = extracted_name.strip().upper()
    supabase = get_supabase()

    # Step 1: Alias exact match (OXXO uses PLU codes like "51380")
    if client_id:
        aliases_result = (
            supabase.schema("public").table("product_aliases")
            .select("product_id, client_alias, real_product_name")
            .eq("client_id", client_id)
            .execute()
        )
        aliases = aliases_result.data or []

        if aliases:
            for alias in aliases:
                alias_text = (alias.get("client_alias") or "").strip().upper()
                if alias_text and alias_text == extracted_upper:
                    logger.info(f"Alias exact match: '{extracted_name}' -> '{alias['real_product_name']}'")
                    return {
                        "product_id": alias["product_id"],
                        "matched_name": alias.get("real_product_name") or alias.get("client_alias"),
                        "source": "alias_exact",
                        "similarity": 1.0,
                    }

            # Step 2: Alias vector match (batch all aliases in one API call)
            alias_texts = []
            alias_refs = []
            for alias in aliases:
                alias_text = alias.get("client_alias")
                if alias_text and alias_text.strip():
                    alias_texts.append(alias_text.strip())
                    alias_refs.append(alias)

            if alias_texts:
                all_embs = await generate_embeddings_batch([extracted_name.strip()] + alias_texts)
                query_emb = all_embs[0]
                alias_embs = all_embs[1:]

                best_alias = None
                best_sim = -1.0
                for alias, alias_emb in zip(alias_refs, alias_embs):
                    sim = _cosine_similarity(query_emb, alias_emb)
                    if sim > best_sim:
                        best_sim = sim
                        best_alias = alias

                if best_alias and best_sim >= ALIAS_VECTOR_THRESHOLD:
                    return {
                        "product_id": best_alias["product_id"],
                        "matched_name": best_alias.get("real_product_name") or best_alias.get("client_alias"),
                        "source": "alias_vector",
                        "similarity": round(best_sim, 4),
                    }

    # Step 3: RAG matching
    embedding = await generate_embedding(extracted_name.strip())
    result = supabase.rpc("match_productos", {
        "query_embedding": embedding,
        "match_count": 5,
        "filter": {},
    }).execute()

    candidates = [r for r in (result.data or []) if r["similarity"] >= PRODUCT_MATCH_THRESHOLD]

    if not candidates:
        return None

    best = candidates[0]
    product_id = best["metadata"].get("product_id")
    content = best.get("content", "")
    matched_name = content.split(" | ")[0] if content else content

    return {
        "product_id": product_id,
        "matched_name": matched_name,
        "source": "rag",
        "similarity": round(best["similarity"], 4),
    }


# ── Dedup Check ────────────────────────────────────────────────────────────────


def is_already_processed(doc_number: str) -> bool:
    """Check if this OC number already exists in workflows.ordenes_compra."""
    supabase = get_supabase()
    result = (
        supabase.schema("workflows")
        .table("ordenes_compra")
        .select("id")
        .eq("oc_number", doc_number)
        .limit(1)
        .execute()
    )
    return bool(result.data)


# ── Order Creation (Approval Logic) ────────────────────────────────────────────


async def create_order_from_oc(oc_id: str) -> dict:
    """Create a real order from an approved ordenes_compra record.

    Replicates the approval logic from email_processing.py.
    """
    supabase = get_supabase()

    # Fetch OC
    oc = (
        supabase.schema("workflows")
        .table("ordenes_compra")
        .select("*")
        .eq("id", oc_id)
        .single()
        .execute()
    ).data

    if not oc:
        return {"status": "error", "message": "OC not found"}

    if oc["status"] == "approved":
        return {"status": "already_approved", "order_number": oc.get("order_number")}

    client_id = oc.get("cliente_id")
    if not client_id or not oc.get("fecha_entrega"):
        return {"status": "error", "message": "Missing cliente_id or fecha_entrega"}

    # Fetch matched products
    products = (
        supabase.schema("workflows")
        .table("ordenes_compra_productos")
        .select("*")
        .eq("orden_compra_id", oc_id)
        .not_.is_("producto_id", "null")
        .execute()
    ).data or []

    if not products:
        return {"status": "error", "message": "No matched products"}

    # Fetch product prices
    product_ids = [p["producto_id"] for p in products]
    prices_data = (
        supabase.schema("public").table("products")
        .select("id, price")
        .in_("id", product_ids)
        .execute()
    ).data or []
    product_prices = {p["id"]: p["price"] for p in prices_data if p.get("price") is not None}

    # Check client config for units conversion
    config_result = (
        supabase.schema("public").table("client_config")
        .select("orders_by_units")
        .eq("client_id", client_id)
        .maybe_single()
        .execute()
    )
    orders_by_units = (config_result.data or {}).get("orders_by_units", False)

    product_configs = {}
    if orders_by_units:
        pc_result = (
            supabase.schema("public").table("product_config")
            .select("product_id, units_per_package")
            .in_("product_id", product_ids)
            .execute()
        )
        product_configs = {
            pc["product_id"]: pc["units_per_package"]
            for pc in (pc_result.data or [])
            if pc.get("units_per_package")
        }

    # Generate next order_number
    last_order = (
        supabase.schema("public").table("orders")
        .select("order_number")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    next_number = 1
    if last_order.data:
        try:
            next_number = int(last_order.data[0]["order_number"]) + 1
        except (ValueError, KeyError):
            pass
    order_number = str(next_number).zfill(6)

    # Insert order
    order_insert = {
        "order_number": order_number,
        "client_id": client_id,
        "branch_id": oc.get("sucursal_id"),
        "expected_delivery_date": oc["fecha_entrega"],
        "purchase_order_number": oc.get("oc_number"),
        "observations": oc.get("observaciones"),
        "pdf_filename": oc.get("pdf_filename"),
        "status": "received",
    }
    order_result = supabase.schema("public").table("orders").insert(order_insert).execute()
    new_order_id = order_result.data[0]["id"]

    # Insert order_items
    order_items = []
    for prod in products:
        pid = prod["producto_id"]
        price = float(product_prices.get(pid) or 0)
        qty = prod.get("cantidad") or 0

        if orders_by_units and pid in product_configs:
            qty = math.ceil(qty / product_configs[pid])

        order_items.append({
            "order_id": new_order_id,
            "product_id": pid,
            "quantity_requested": qty,
            "unit_price": price,
            "availability_status": "pending",
            "quantity_available": 0,
            "quantity_missing": qty,
            "quantity_dispatched": 0,
            "quantity_delivered": 0,
            "quantity_returned": 0,
            "quantity_completed": 0,
        })

    supabase.schema("public").table("order_items").insert(order_items).execute()

    # Calculate total
    try:
        supabase.rpc("calculate_order_total", {"order_uuid": new_order_id}).execute()
    except Exception as e:
        logger.warning(f"calculate_order_total failed: {e}")

    # Update OC status
    (
        supabase.schema("workflows")
        .table("ordenes_compra")
        .update({"status": "approved", "order_number": order_number})
        .eq("id", oc_id)
        .execute()
    )

    logger.info(f"Order created: #{order_number} from OC {oc.get('oc_number')}")
    return {
        "status": "approved",
        "order_number": order_number,
        "order_id": new_order_id,
        "items_created": len(order_items),
    }


# ── Main Processing Pipeline ──────────────────────────────────────────────────


async def process_order(order: ScrapedOrder) -> ProcessResult:
    """Process a single scraped order: extract, match, save, and optionally auto-approve."""
    doc_number = order.doc_number
    logger.info(f"Processing order {doc_number}")

    # Dedup check
    if is_already_processed(doc_number):
        logger.info(f"Order {doc_number} already processed, skipping")
        return ProcessResult(doc_number=doc_number, status="skipped", message="Already processed")

    try:
        # 1. Upload PDF to storage
        storage_info = await upload_pdf_to_storage(order.pdf_bytes, order.pdf_filename)
        logger.info(f"PDF uploaded: {storage_info['path']}")

        # 2. Extract data from PDF
        extracted = await extract_from_pdf(order.pdf_bytes, order.pdf_filename)
        logger.info(f"Extracted: OC={extracted.get('OC')}, Products={len(extracted.get('PRODUCTOS', []))}")

        # 3. Match client (always OXXO)
        client_match = await match_oxxo_client()
        if not client_match:
            return ProcessResult(
                doc_number=doc_number, status="error",
                message="OXXO client not found in database",
            )
        client_id = client_match["client_id"]

        # 4. Match branch
        branch_match = await match_branch(
            client_id,
            extracted.get("SUCURSAL"),
            extracted.get("DIRECCIÓN") or extracted.get("DIRECCION"),
        )

        # 5. Parse delivery date
        fecha_entrega = _parse_date(extracted.get("FECHA DE ENTREGA"))
        if not fecha_entrega:
            fecha_entrega = date.today() + timedelta(days=3)
            logger.warning(f"No delivery date found for {doc_number}, using fallback")

        # 6. Save to workflows.ordenes_compra
        supabase = get_supabase()
        oc_insert = {
            "email_id": f"scraper-cen-{doc_number}",
            "received_at": datetime.now().isoformat(),
            "oc_number": extracted.get("OC") or doc_number,
            "cliente": client_match["client_name"],
            "cliente_id": client_id,
            "sucursal": extracted.get("SUCURSAL"),
            "sucursal_id": branch_match["branch_id"] if branch_match else None,
            "fecha_entrega": fecha_entrega.isoformat(),
            "fecha_orden": _parse_date(order.doc_date)
            .isoformat() if _parse_date(order.doc_date) else None,
            "pdf_url": storage_info["url"],
            "pdf_filename": storage_info["filename"],
            "observaciones": extracted.get("OBSERVACIONES"),
            "status": "pending",
            "email_from": "scraper-cen@pastrychef.com.co",
            "email_subject": f"OC OXXO {doc_number}",
        }
        oc_result = (
            supabase.schema("workflows")
            .table("ordenes_compra")
            .insert(oc_insert)
            .execute()
        )
        oc_id = oc_result.data[0]["id"]

        # 7. Match and save products
        productos_raw = extracted.get("PRODUCTOS", [])
        matched_count = 0
        product_inserts = []

        for prod in productos_raw:
            producto_name = str(prod.get("PRODUCTO", ""))
            cantidad = int(prod.get("CANTIDAD SOLICITADA", 0))
            precio = _parse_price(prod.get("PRECIO"))

            # Match product
            product_match = await match_product(producto_name, client_id, precio)

            product_insert = {
                "orden_compra_id": oc_id,
                "producto": producto_name,
                "cantidad": cantidad,
                "precio": precio,
                "precio_unitario": precio,
                "fecha_entrega": fecha_entrega.isoformat(),
            }

            if product_match:
                product_insert["producto_id"] = product_match["product_id"]
                product_insert["producto_nombre"] = product_match["matched_name"]
                product_insert["confidence_score"] = product_match.get("similarity", 0)
                matched_count += 1

            product_inserts.append(product_insert)

        if product_inserts:
            (
                supabase.schema("workflows")
                .table("ordenes_compra_productos")
                .insert(product_inserts)
                .execute()
            )

        # Update OC status based on matching results
        total_products = len(productos_raw)
        all_matched = matched_count == total_products and total_products > 0

        # Update to "processed"
        (
            supabase.schema("workflows")
            .table("ordenes_compra")
            .update({"status": "processed"})
            .eq("id", oc_id)
            .execute()
        )

        # 8. Auto-approve if all products matched
        if all_matched:
            logger.info(f"All {matched_count} products matched for {doc_number}, auto-approving")
            approval = await create_order_from_oc(oc_id)
            return ProcessResult(
                doc_number=doc_number,
                status=approval["status"],
                order_number=approval.get("order_number"),
                message=f"Auto-approved: {approval.get('items_created', 0)} items",
                products_matched=matched_count,
                products_total=total_products,
            )
        else:
            logger.info(
                f"Partial match for {doc_number}: {matched_count}/{total_products} products. "
                "Left in 'processed' status for manual review."
            )
            return ProcessResult(
                doc_number=doc_number,
                status="processed",
                message=f"Partial match: {matched_count}/{total_products} products matched",
                products_matched=matched_count,
                products_total=total_products,
            )

    except Exception as e:
        logger.error(f"Failed to process order {doc_number}: {e}", exc_info=True)
        return ProcessResult(
            doc_number=doc_number,
            status="error",
            message=str(e),
        )
