from supabase import create_client, Client
from functools import lru_cache
from typing import Optional
import logging

from .config import get_settings

logger = logging.getLogger(__name__)


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

    When using service_role, auth.uid() is NULL. This sets app.current_user_id
    so audit triggers can correctly attribute changes to the real user.
    Call this BEFORE any insert/update/delete on orders/order_items.
    """
    if not user_id:
        return
    try:
        supabase.rpc("set_audit_context", {"p_user_id": user_id}).execute()
    except Exception as e:
        logger.warning(f"Failed to set audit user: {e}")
