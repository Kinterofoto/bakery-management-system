"""Master data endpoints - clients, products, branches, etc.

These endpoints provide reference data for order management UI.
Optimized for fast loading with minimal data transfer.
"""

import logging
from fastapi import APIRouter

from ...core.supabase import get_supabase_client

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
