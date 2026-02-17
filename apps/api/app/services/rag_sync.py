"""Service for syncing entities to RAG (vector) tables."""

import logging
import uuid
from typing import Optional

from ..core.config import get_settings
from ..core.supabase import get_supabase_client
from .openai_client import get_openai_client

logger = logging.getLogger(__name__)


def build_client_content(client: dict) -> str:
    """Build the text content for a client's RAG entry.

    Only the client name — razón social and contact info dilute similarity scores.
    """
    return client["name"]


async def generate_embedding(text: str) -> list[float]:
    """Generate an embedding vector using OpenAI."""
    settings = get_settings()
    openai = get_openai_client()

    response = await openai.client.embeddings.create(
        input=text,
        model="text-embedding-3-small",
    )

    return response.data[0].embedding


async def sync_client_to_rag(client_id: str) -> dict:
    """Sync a single client to the clientes_rag table.

    Fetches the client, generates embedding, and upserts into clientes_rag.
    """
    logger.info(f"Syncing client {client_id} to RAG")
    supabase = get_supabase_client()

    # Fetch client data
    result = supabase.table("clients").select("*").eq("id", client_id).single().execute()
    client = result.data

    if not client:
        return {"status": "error", "message": f"Client {client_id} not found"}

    content = build_client_content(client)

    # Generate embedding
    embedding = await generate_embedding(content)

    metadata = {
        "client_id": client_id,
        "source": "api_sync",
        "blobType": "text/plain",
    }

    # Check if entry already exists for this client
    existing = (
        supabase.table("clientes_rag")
        .select("id")
        .contains("metadata", {"client_id": client_id})
        .execute()
    )

    if existing.data:
        # Update existing entry
        rag_id = existing.data[0]["id"]
        supabase.table("clientes_rag").update({
            "content": content,
            "embedding": embedding,
            "metadata": metadata,
        }).eq("id", rag_id).execute()
        logger.info(f"Updated RAG entry {rag_id} for client {client_id}")
        return {"status": "updated", "rag_id": rag_id, "client_id": client_id}
    else:
        # Insert new entry
        rag_id = str(uuid.uuid4())
        supabase.table("clientes_rag").insert({
            "id": rag_id,
            "content": content,
            "embedding": embedding,
            "metadata": metadata,
        }).execute()
        logger.info(f"Created RAG entry {rag_id} for client {client_id}")
        return {"status": "created", "rag_id": rag_id, "client_id": client_id}


async def delete_client_from_rag(client_id: str) -> dict:
    """Remove a client's RAG entry."""
    supabase = get_supabase_client()

    existing = (
        supabase.table("clientes_rag")
        .select("id")
        .contains("metadata", {"client_id": client_id})
        .execute()
    )

    if existing.data:
        rag_id = existing.data[0]["id"]
        supabase.table("clientes_rag").delete().eq("id", rag_id).execute()
        logger.info(f"Deleted RAG entry for client {client_id}")
        return {"status": "deleted", "client_id": client_id}

    return {"status": "not_found", "client_id": client_id}
