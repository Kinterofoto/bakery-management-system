"""Master data endpoints - clients, products, branches, etc.

These endpoints provide reference data for order management UI.
Optimized for fast loading with minimal data transfer.
"""

import logging
from fastapi import APIRouter, BackgroundTasks

from ...core.supabase import get_supabase_client
from ...services.rag_sync import sync_client_to_rag

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/masterdata", tags=["masterdata"])


@router.get("/clients")
async def get_clients():
    """Get all clients ordered by name."""
    logger.info("Fetching clients")
    supabase = get_supabase_client()

    try:
        result = (
            supabase.table("clients")
            .select("*")
            .order("name", desc=False)
            .execute()
        )
        return {"clients": result.data or []}
    except Exception as e:
        logger.error(f"Error fetching clients: {e}")
        return {"clients": []}


@router.get("/products")
async def get_products(active_only: bool = True, category: str = None):
    """Get products with optional filters."""
    logger.info(f"Fetching products: active_only={active_only}, category={category}")
    supabase = get_supabase_client()

    try:
        query = supabase.table("products").select("*")

        if active_only:
            query = query.eq("is_active", True)

        if category:
            # Support comma-separated categories like "PT,PP"
            categories = [c.strip() for c in category.split(",")]
            query = query.in_("category", categories)

        result = query.order("name", desc=False).execute()
        return {"products": result.data or []}
    except Exception as e:
        logger.error(f"Error fetching products: {e}")
        return {"products": []}


@router.get("/branches")
async def get_branches():
    """Get all branches with client info."""
    logger.info("Fetching branches")
    supabase = get_supabase_client()

    try:
        result = (
            supabase.table("branches")
            .select("*, client:clients(id, name)")
            .order("created_at", desc=True)
            .execute()
        )
        return {"branches": result.data or []}
    except Exception as e:
        logger.error(f"Error fetching branches: {e}")
        return {"branches": []}


@router.get("/receiving-schedules")
async def get_receiving_schedules():
    """Get receiving schedules ordered by day and time."""
    logger.info("Fetching receiving schedules")
    supabase = get_supabase_client()

    try:
        result = (
            supabase.table("receiving_schedules")
            .select("*")
            .order("day_of_week", desc=False)
            .order("start_time", desc=False)
            .execute()
        )
        return {"schedules": result.data or []}
    except Exception as e:
        logger.error(f"Error fetching receiving schedules: {e}")
        return {"schedules": []}


@router.get("/product-configs")
async def get_product_configs():
    """Get product configurations with product details."""
    logger.info("Fetching product configs")
    supabase = get_supabase_client()

    try:
        result = (
            supabase.table("product_config")
            .select("*, product:products!product_config_product_id_fkey(id, name, description, weight, price)")
            .order("created_at", desc=True)
            .execute()
        )
        return {"configs": result.data or []}
    except Exception as e:
        logger.error(f"Error fetching product configs: {e}")
        return {"configs": []}


@router.get("/client-frequencies")
async def get_client_frequencies():
    """Get active client delivery frequencies."""
    logger.info("Fetching client frequencies")
    supabase = get_supabase_client()

    try:
        result = (
            supabase.table("client_frequencies")
            .select("*")
            .eq("is_active", True)
            .execute()
        )
        return {"frequencies": result.data or []}
    except Exception as e:
        logger.error(f"Error fetching client frequencies: {e}")
        return {"frequencies": []}


@router.get("/vehicles")
async def get_vehicles():
    """Get all vehicles."""
    logger.info("Fetching vehicles")
    supabase = get_supabase_client()

    try:
        result = (
            supabase.table("vehicles")
            .select("*")
            .order("vehicle_code", desc=False)
            .execute()
        )
        return {"vehicles": result.data or []}
    except Exception as e:
        logger.error(f"Error fetching vehicles: {e}")
        return {"vehicles": []}


@router.get("/drivers")
async def get_drivers():
    """Get all users with driver role."""
    logger.info("Fetching drivers")
    supabase = get_supabase_client()

    try:
        # Get users with driver role and active status
        result = (
            supabase.table("users")
            .select("id, name, email, cedula")
            .eq("role", "driver")
            .eq("status", "active")
            .order("name", desc=False)
            .execute()
        )
        logger.info(f"Found {len(result.data or [])} drivers")
        return {"drivers": result.data or []}
    except Exception as e:
        logger.error(f"Error fetching drivers: {e}")
        return {"drivers": []}


@router.post("/clients/{client_id}/sync-rag")
async def sync_client_rag(client_id: str, background_tasks: BackgroundTasks):
    """Sync a client to the vector search table. Call after create/update."""
    background_tasks.add_task(sync_client_to_rag, client_id)
    return {"status": "queued", "client_id": client_id}


@router.post("/clients/sync-rag-all")
async def sync_all_clients_rag():
    """Sync ALL clients to the vector search table."""
    logger.info("Syncing all clients to RAG")
    supabase = get_supabase_client()

    try:
        result = supabase.table("clients").select("id").execute()
        clients = result.data or []

        results = []
        for client in clients:
            try:
                r = await sync_client_to_rag(client["id"])
                results.append(r)
            except Exception as e:
                logger.error(f"Failed to sync client {client['id']}: {e}")
                results.append({"status": "error", "client_id": client["id"], "error": str(e)})

        synced = sum(1 for r in results if r.get("status") == "synced")
        errors = sum(1 for r in results if r.get("status") == "error")

        return {
            "status": "completed",
            "total": len(clients),
            "synced": synced,
            "errors": errors,
        }
    except Exception as e:
        logger.error(f"Error syncing all clients: {e}")
        return {"status": "error", "message": str(e)}
