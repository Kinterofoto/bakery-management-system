from supabase import create_client, Client
from functools import lru_cache
from typing import Optional, List
from datetime import datetime, timedelta, timezone
import logging

from .config import get_settings

logger = logging.getLogger(__name__)

# All audit tables that track order-related changes
ALL_AUDIT_TABLES = ["orders_audit", "order_items_audit", "order_item_deliveries_audit"]


@lru_cache()
def get_supabase_client() -> Client:
    """Get cached Supabase client instance."""
    settings = get_settings()
    return create_client(
        settings.supabase_url,
        settings.supabase_service_key
    )


def get_supabase() -> Client:
    """Dependency for FastAPI routes."""
    return get_supabase_client()


def set_audit_user(supabase: Client, user_id: Optional[str]) -> None:
    """Set the current user ID in the PostgreSQL session for audit triggers.

    NOTE: This is unreliable with Supabase REST API due to connection pooling.
    Each HTTP request may use a different PostgreSQL connection, so the session
    variable set here may not be visible to subsequent write operations.
    Use backfill_audit_user() AFTER writes as the reliable alternative.
    Kept for backward compatibility and as best-effort for same-connection cases.
    """
    if not user_id:
        return
    try:
        supabase.rpc("set_audit_context", {"p_user_id": user_id}).execute()
    except Exception as e:
        logger.warning(f"Failed to set audit user: {e}")


def backfill_audit_user(
    supabase: Client,
    user_id: Optional[str],
    order_id: str,
    tables: Optional[List[str]] = None,
    since_seconds: int = 10,
) -> None:
    """Backfill changed_by on audit entries created with NULL user attribution.

    Call this AFTER write operations to fix audit entries that the PostgreSQL
    triggers couldn't attribute due to connection pooling (set_config is
    transaction-local and lost between separate Supabase REST API calls).

    Args:
        supabase: Supabase client instance
        user_id: The UUID of the user who performed the changes
        order_id: The order ID to scope the backfill to
        tables: List of audit tables to update (defaults to all order audit tables)
        since_seconds: Only update entries created within this many seconds
    """
    if not user_id or not order_id:
        return

    if tables is None:
        tables = ALL_AUDIT_TABLES

    cutoff = (datetime.now(timezone.utc) - timedelta(seconds=since_seconds)).isoformat()

    for table in tables:
        try:
            supabase.table(table) \
                .update({"changed_by": user_id}) \
                .eq("order_id", order_id) \
                .is_("changed_by", "null") \
                .gte("changed_at", cutoff) \
                .execute()
        except Exception as e:
            logger.warning(f"Failed to backfill audit user in {table}: {e}")
