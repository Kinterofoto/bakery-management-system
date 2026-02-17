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
