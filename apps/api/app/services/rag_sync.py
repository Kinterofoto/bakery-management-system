"""Service for syncing entities to RAG (vector) tables."""

import logging
import uuid

from ..core.config import get_settings
from ..core.supabase import get_supabase_client
from .openai_client import get_openai_client

logger = logging.getLogger(__name__)


async def generate_embedding(text: str) -> list[float]:
    """Generate an embedding vector using OpenAI."""
    openai = get_openai_client()

    response = await openai.client.embeddings.create(
        input=text,
        model="text-embedding-3-small",
    )

    return response.data[0].embedding


async def _upsert_rag_entry(supabase, client_id: str, content: str, entry_type: str) -> str:
    """Upsert a single RAG entry. Returns the rag_id."""
    embedding = await generate_embedding(content)

    metadata = {
        "client_id": client_id,
        "type": entry_type,
        "source": "api_sync",
    }

    # Check if entry already exists for this client + type
    existing = (
        supabase.table("clientes_rag")
        .select("id")
        .contains("metadata", {"client_id": client_id, "type": entry_type})
        .execute()
    )

    if existing.data:
        rag_id = existing.data[0]["id"]
        supabase.table("clientes_rag").update({
            "content": content,
            "embedding": embedding,
            "metadata": metadata,
        }).eq("id", rag_id).execute()
        return rag_id
    else:
        rag_id = str(uuid.uuid4())
        supabase.table("clientes_rag").insert({
            "id": rag_id,
            "content": content,
            "embedding": embedding,
            "metadata": metadata,
        }).execute()
        return rag_id


async def sync_client_to_rag(client_id: str) -> dict:
    """Sync a client to clientes_rag.

    Creates separate entries for name and razón social so either one
    can match from a PDF (which may contain one or the other).
    """
    logger.info(f"Syncing client {client_id} to RAG")
    supabase = get_supabase_client()

    result = supabase.table("clients").select("*").eq("id", client_id).single().execute()
    client = result.data

    if not client:
        return {"status": "error", "message": f"Client {client_id} not found"}

    entries = []

    # Always create entry for name
    rag_id = await _upsert_rag_entry(supabase, client_id, client["name"], "name")
    entries.append({"type": "name", "rag_id": rag_id, "content": client["name"]})

    # Create entry for razón social if it exists and is different from name
    razon = client.get("razon_social")
    if razon and razon.strip().upper() != client["name"].strip().upper():
        rag_id = await _upsert_rag_entry(supabase, client_id, razon, "razon_social")
        entries.append({"type": "razon_social", "rag_id": rag_id, "content": razon})
    else:
        # Clean up old razon_social entry if name and razon are now the same
        old = (
            supabase.table("clientes_rag")
            .select("id")
            .contains("metadata", {"client_id": client_id, "type": "razon_social"})
            .execute()
        )
        if old.data:
            supabase.table("clientes_rag").delete().eq("id", old.data[0]["id"]).execute()

    logger.info(f"Synced client {client_id}: {len(entries)} entries")
    return {"status": "synced", "client_id": client_id, "entries": entries}


MATCH_THRESHOLD = 0.50


async def match_client(extracted_name: str) -> dict | None:
    """Match an extracted client name against clientes_rag using vector similarity.

    Returns the best match if above threshold, or None.
    """
    if not extracted_name or not extracted_name.strip():
        return None

    supabase = get_supabase_client()
    embedding = await generate_embedding(extracted_name.strip())

    result = supabase.rpc("match_clientes", {
        "query_embedding": embedding,
        "match_count": 1,
        "filter": {},
    }).execute()

    if not result.data:
        logger.info(f"No RAG match found for '{extracted_name}'")
        return None

    best = result.data[0]
    similarity = best["similarity"]
    client_id = best["metadata"].get("client_id")
    match_type = best["metadata"].get("type")

    if similarity < MATCH_THRESHOLD:
        logger.info(
            f"RAG match below threshold for '{extracted_name}': "
            f"'{best['content']}' ({similarity:.4f} < {MATCH_THRESHOLD})"
        )
        return None

    logger.info(
        f"RAG match for '{extracted_name}': "
        f"'{best['content']}' [{match_type}] (similarity={similarity:.4f})"
    )
    return {
        "client_id": client_id,
        "matched_content": best["content"],
        "match_type": match_type,
        "similarity": similarity,
    }


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(x * x for x in b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


BRANCH_MATCH_THRESHOLD = 0.40


async def match_branch(
    client_id: str,
    sucursal_text: str | None,
    direccion_text: str | None,
) -> dict | None:
    """Match extracted branch info against the client's branches.

    Returns the best match or None if no client_id or no branches.
    """
    if not client_id:
        return None

    supabase = get_supabase_client()
    result = (
        supabase.table("branches")
        .select("id, name, address, is_main")
        .eq("client_id", client_id)
        .order("is_main", desc=True)
        .execute()
    )
    branches = result.data or []

    if not branches:
        logger.info(f"No branches found for client {client_id}")
        return None

    # Single branch → auto-assign
    if len(branches) == 1:
        b = branches[0]
        logger.info(f"Auto-assigned single branch '{b['name']}' for client {client_id}")
        return {
            "branch_id": b["id"],
            "branch_name": b["name"],
            "confidence": "auto_single",
            "similarity": 1.0,
        }

    # Multiple branches → match using embeddings
    query_parts = []
    if sucursal_text and sucursal_text.strip():
        query_parts.append(sucursal_text.strip())
    if direccion_text and direccion_text.strip():
        query_parts.append(direccion_text.strip())

    if not query_parts:
        # No extracted info to match — pick main branch
        main = next((b for b in branches if b.get("is_main")), branches[0])
        logger.info(f"No branch text to match, defaulting to main branch '{main['name']}'")
        return {
            "branch_id": main["id"],
            "branch_name": main["name"],
            "confidence": "default_main",
            "similarity": 0.0,
        }

    query_text = " | ".join(query_parts)
    query_emb = await generate_embedding(query_text)

    best_branch = None
    best_sim = -1.0

    for b in branches:
        parts = [p for p in [b.get("name"), b.get("address")] if p and p.strip()]
        if not parts:
            continue
        branch_emb = await generate_embedding(" | ".join(parts))
        sim = _cosine_similarity(query_emb, branch_emb)
        if sim > best_sim:
            best_sim = sim
            best_branch = b

    if best_branch and best_sim >= BRANCH_MATCH_THRESHOLD:
        logger.info(
            f"Branch match for '{query_text}': "
            f"'{best_branch['name']}' (similarity={best_sim:.4f})"
        )
        return {
            "branch_id": best_branch["id"],
            "branch_name": best_branch["name"],
            "confidence": "matched",
            "similarity": round(best_sim, 4),
        }

    # Below threshold — fallback to main
    main = next((b for b in branches if b.get("is_main")), branches[0])
    logger.info(
        f"Branch match below threshold ({best_sim:.4f}), defaulting to main '{main['name']}'"
    )
    return {
        "branch_id": main["id"],
        "branch_name": main["name"],
        "confidence": "default_main",
        "similarity": round(best_sim, 4) if best_sim >= 0 else 0.0,
    }


PRODUCT_MATCH_THRESHOLD = 0.50
ALIAS_VECTOR_THRESHOLD = 0.60
RERANK_THRESHOLD = 0.70  # Below this, use LLM reranker on top-5 candidates
RERANK_CANDIDATE_COUNT = 5


async def sync_product_to_rag(product_id: str) -> dict:
    """Sync a product to productos_rag.

    Creates a single entry with content: name | description.
    Only syncs active PT (producto terminado) products.
    """
    logger.info(f"Syncing product {product_id} to RAG")
    supabase = get_supabase_client()

    result = (
        supabase.table("products")
        .select("id, name, description, is_active, category")
        .eq("id", product_id)
        .single()
        .execute()
    )
    product = result.data

    if not product:
        return {"status": "error", "message": f"Product {product_id} not found"}

    if not product.get("is_active") or product.get("category") != "PT":
        # Remove from RAG if it exists but is no longer eligible
        await delete_product_from_rag(product_id)
        return {"status": "skipped", "product_id": product_id, "reason": "not active PT"}

    # Build content: name | description
    parts = [product["name"]]
    if product.get("description"):
        parts.append(product["description"])
    content = " | ".join(parts)

    embedding = await generate_embedding(content)
    metadata = {
        "product_id": product_id,
        "source": "api_sync",
    }

    # Upsert: check existing by product_id
    existing = (
        supabase.table("productos_rag")
        .select("id")
        .contains("metadata", {"product_id": product_id})
        .execute()
    )

    if existing.data:
        rag_id = existing.data[0]["id"]
        supabase.table("productos_rag").update({
            "content": content,
            "embedding": embedding,
            "metadata": metadata,
        }).eq("id", rag_id).execute()
    else:
        rag_id = str(uuid.uuid4())
        supabase.table("productos_rag").insert({
            "id": rag_id,
            "content": content,
            "embedding": embedding,
            "metadata": metadata,
        }).execute()

    logger.info(f"Synced product {product_id}: '{content}'")
    return {"status": "synced", "product_id": product_id, "rag_id": rag_id, "content": content}


async def delete_product_from_rag(product_id: str) -> dict:
    """Remove RAG entry for a product."""
    supabase = get_supabase_client()

    existing = (
        supabase.table("productos_rag")
        .select("id")
        .contains("metadata", {"product_id": product_id})
        .execute()
    )

    if existing.data:
        for entry in existing.data:
            supabase.table("productos_rag").delete().eq("id", entry["id"]).execute()
        logger.info(f"Deleted {len(existing.data)} RAG entries for product {product_id}")
        return {"status": "deleted", "product_id": product_id, "count": len(existing.data)}

    return {"status": "not_found", "product_id": product_id}


async def _rerank_products(
    extracted_name: str,
    candidates: list[dict],
    precio: float | None = None,
) -> dict | None:
    """Use LLM to pick the best product match from RAG candidates.

    Called when vector similarity is between PRODUCT_MATCH_THRESHOLD and RERANK_THRESHOLD.
    Returns the best match dict or None if the LLM determines no candidate fits.
    """
    if not candidates:
        return None

    openai = get_openai_client()

    # Build candidate list with full content (name + description)
    candidate_lines = []
    for i, c in enumerate(candidates):
        content = c.get("content") or ""
        candidate_lines.append(f"{i + 1}. {content}")

    candidates_text = "\n".join(candidate_lines)

    # Build context about the extracted product
    context_parts = [f'Nombre extraído de la orden: "{extracted_name}"']
    if precio is not None:
        context_parts.append(f"Precio unitario en la orden: ${precio:,.2f}")

    context_text = "\n".join(context_parts)

    prompt = f"""Eres un experto en productos de panadería industrial. Tu tarea es determinar cuál producto del catálogo corresponde al nombre extraído de una orden de compra.

{context_text}

Candidatos del catálogo (nombre | descripción):
{candidates_text}

Reglas de análisis (aplica en orden de prioridad):

1. LIMPIEZA: Ignora códigos numéricos al inicio del nombre extraído (son códigos del cliente). Ignora diferencias de formato en peso (*20gr = 20g = 20 g).

2. COINCIDENCIA DE PALABRAS CLAVE (MÁS IMPORTANTE): Extrae las palabras descriptivas del nombre (sin códigos, sin peso). Compara contra cada candidato:
   - Si el nombre extraído dice "Croissant europa", el candidato DEBE contener "europa".
   - Si dice "Croissant multicereal", DEBE contener "multicereal".
   - Si dice solo "Croissant" sin ningún calificativo adicional, busca la versión más básica/simple — "Europa" es la versión clásica/estándar del croissant de panadería.

3. PRINCIPIO DE EXCLUSIÓN: Si el nombre extraído NO menciona una característica específica (multicereal, integral, bicolor, almendras, frutos rojos, queso, etc.), DESCARTA candidatos que tengan esas características. Elige el candidato con menos calificativos extra.

4. PESO: Si varios candidatos sobreviven, usa el peso/gramaje para desempatar.

5. PRECIO: Si se proporciona precio, úsalo como confirmación adicional.

6. Si ningún candidato corresponde al producto extraído, responde "0".

Responde SOLO con el número del candidato correcto (1-{len(candidates)}) o "0" si ninguno aplica. Sin explicación."""

    try:
        response = await openai.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            model="gpt-4o-mini",
            temperature=0.0,
            max_tokens=5,
        )

        choice = response.strip().strip(".")
        if not choice.isdigit():
            logger.warning(f"Reranker returned non-numeric response: '{response}'")
            return None

        idx = int(choice)
        if idx == 0 or idx > len(candidates):
            # Reranker rejected all — fall back to top-1 RAG result
            logger.info(f"Reranker rejected all candidates for '{extracted_name}', using top-1 RAG fallback")
            best = candidates[0]
            product_id = best["metadata"].get("product_id")
            matched_name = best["content"].split(" | ")[0] if best.get("content") else best["content"]
            return {
                "product_id": product_id,
                "matched_name": matched_name,
                "source": "rag",
                "similarity": round(best["similarity"], 4),
            }

        selected = candidates[idx - 1]
        product_id = selected["metadata"].get("product_id")
        matched_name = selected["content"].split(" | ")[0] if selected.get("content") else selected["content"]

        return {
            "product_id": product_id,
            "matched_name": matched_name,
            "source": "rag_reranked",
            "similarity": round(selected["similarity"], 4),
        }

    except Exception as e:
        logger.error(f"Reranker failed for '{extracted_name}': {e}")
        # Fall back to top-1 from vector search
        best = candidates[0]
        product_id = best["metadata"].get("product_id")
        matched_name = best["content"].split(" | ")[0] if best.get("content") else best["content"]
        return {
            "product_id": product_id,
            "matched_name": matched_name,
            "source": "rag",
            "similarity": round(best["similarity"], 4),
        }


async def match_product(
    extracted_name: str,
    client_id: str | None = None,
    precio: float | None = None,
) -> dict | None:
    """Match an extracted product name against aliases and productos_rag.

    Strategy:
    1. Alias exact match (if client_id provided): free, instant
    2. Alias vector match (if client_id provided and aliases exist): embedding similarity
    3. RAG fallback: match_productos RPC on productos_rag (reranker if score < 0.70)

    Returns {product_id, matched_name, source, similarity} or None.
    """
    if not extracted_name or not extracted_name.strip():
        return None

    extracted_upper = extracted_name.strip().upper()
    supabase = get_supabase_client()

    # Step 1 & 2: Alias matching (only if we have a client_id)
    if client_id:
        aliases_result = (
            supabase.table("product_aliases")
            .select("product_id, client_alias, real_product_name")
            .eq("client_id", client_id)
            .execute()
        )
        aliases = aliases_result.data or []

        if aliases:
            # Step 1: Exact match
            for alias in aliases:
                alias_text = (alias.get("client_alias") or "").strip().upper()
                if alias_text and alias_text == extracted_upper:
                    logger.info(
                        f"Alias exact match for '{extracted_name}': "
                        f"'{alias['real_product_name']}' (product={alias['product_id']})"
                    )
                    return {
                        "product_id": alias["product_id"],
                        "matched_name": alias.get("real_product_name") or alias.get("client_alias"),
                        "source": "alias_exact",
                        "similarity": 1.0,
                    }

            # Step 2: Alias vector match
            query_emb = await generate_embedding(extracted_name.strip())
            best_alias = None
            best_sim = -1.0

            for alias in aliases:
                alias_text = alias.get("client_alias")
                if not alias_text or not alias_text.strip():
                    continue
                alias_emb = await generate_embedding(alias_text.strip())
                sim = _cosine_similarity(query_emb, alias_emb)
                if sim > best_sim:
                    best_sim = sim
                    best_alias = alias

            if best_alias and best_sim >= ALIAS_VECTOR_THRESHOLD:
                logger.info(
                    f"Alias vector match for '{extracted_name}': "
                    f"'{best_alias['client_alias']}' -> '{best_alias['real_product_name']}' "
                    f"(similarity={best_sim:.4f})"
                )
                return {
                    "product_id": best_alias["product_id"],
                    "matched_name": best_alias.get("real_product_name") or best_alias.get("client_alias"),
                    "source": "alias_vector",
                    "similarity": round(best_sim, 4),
                }

    # Step 3: RAG fallback (get top-5 for potential reranking)
    embedding = await generate_embedding(extracted_name.strip())

    result = supabase.rpc("match_productos", {
        "query_embedding": embedding,
        "match_count": RERANK_CANDIDATE_COUNT,
        "filter": {},
    }).execute()

    if not result.data:
        logger.info(f"No product match found for '{extracted_name}'")
        return None

    best = result.data[0]
    similarity = best["similarity"]

    if similarity < PRODUCT_MATCH_THRESHOLD:
        logger.info(
            f"Product RAG match below threshold for '{extracted_name}': "
            f"'{best['content']}' ({similarity:.4f} < {PRODUCT_MATCH_THRESHOLD})"
        )
        return None

    # High confidence → use directly
    if similarity >= RERANK_THRESHOLD:
        product_id = best["metadata"].get("product_id")
        matched_name = best["content"].split(" | ")[0] if best.get("content") else best["content"]
        logger.info(
            f"Product RAG match (high confidence) for '{extracted_name}': "
            f"'{matched_name}' (similarity={similarity:.4f})"
        )
        return {
            "product_id": product_id,
            "matched_name": matched_name,
            "source": "rag",
            "similarity": round(similarity, 4),
        }

    # Low confidence → rerank with LLM
    candidates = [
        r for r in result.data if r["similarity"] >= PRODUCT_MATCH_THRESHOLD
    ]
    reranked = await _rerank_products(extracted_name.strip(), candidates, precio=precio)

    if reranked:
        logger.info(
            f"Product reranked match for '{extracted_name}': "
            f"'{reranked['matched_name']}' (similarity={reranked['similarity']})"
        )
        return reranked

    # Reranker rejected all candidates
    logger.info(f"Reranker found no good match for '{extracted_name}'")
    return None


async def delete_client_from_rag(client_id: str) -> dict:
    """Remove all RAG entries for a client."""
    supabase = get_supabase_client()

    existing = (
        supabase.table("clientes_rag")
        .select("id")
        .contains("metadata", {"client_id": client_id})
        .execute()
    )

    if existing.data:
        for entry in existing.data:
            supabase.table("clientes_rag").delete().eq("id", entry["id"]).execute()
        logger.info(f"Deleted {len(existing.data)} RAG entries for client {client_id}")
        return {"status": "deleted", "client_id": client_id, "count": len(existing.data)}

    return {"status": "not_found", "client_id": client_id}
