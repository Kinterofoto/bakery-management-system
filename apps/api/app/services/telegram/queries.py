"""Supabase queries used by conversation flows and daily summaries.

Note: General read queries (orders list, clients, leads, etc.) are now handled
by the dynamic SQL query skill in sql_executor.py. This file only contains
queries needed by structured flows (create/modify order) and daily summaries.
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import date, timedelta

from ...core.supabase import get_supabase_client

logger = logging.getLogger(__name__)


async def query_order_detail(
    user_id: str,
    order_number: Optional[str] = None,
    order_id: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Get detailed order with items, scoped to user's clients."""
    supabase = get_supabase_client()

    # Verify client ownership
    clients_result = (
        supabase.table("clients")
        .select("id")
        .eq("assigned_user_id", user_id)
        .execute()
    )
    client_ids = [c["id"] for c in (clients_result.data or [])]
    if not client_ids:
        return None

    # Get order
    query = (
        supabase.table("orders")
        .select("*, clients(name), branches(name)")
        .in_("client_id", client_ids)
    )

    if order_number:
        query = query.eq("order_number", order_number)
    elif order_id:
        query = query.eq("id", order_id)
    else:
        return None

    result = query.limit(1).execute()
    if not result.data:
        return None

    order = result.data[0]
    order["client_name"] = order.get("clients", {}).get("name", "N/A") if isinstance(order.get("clients"), dict) else "N/A"
    order["branch_name"] = order.get("branches", {}).get("name", "") if isinstance(order.get("branches"), dict) else ""

    # Get items
    items_result = (
        supabase.table("order_items")
        .select("*, products(name, codigo_wo)")
        .eq("order_id", order["id"])
        .execute()
    )
    items = items_result.data or []
    for item in items:
        if isinstance(item.get("products"), dict):
            item["product_name"] = item["products"].get("name", "")
            item["product_code"] = item["products"].get("codigo_wo", "")

    order["items"] = items
    return order


async def search_client_by_name(user_id: str, name: str) -> List[Dict[str, Any]]:
    """Search clients by name (fuzzy), scoped to user."""
    supabase = get_supabase_client()
    result = (
        supabase.table("clients")
        .select("id, name, category")
        .eq("assigned_user_id", user_id)
        .eq("is_active", True)
        .ilike("name", f"%{name}%")
        .limit(5)
        .execute()
    )
    return result.data or []


async def get_branches_for_client(client_id: str) -> List[Dict[str, Any]]:
    """Get all branches for a client."""
    supabase = get_supabase_client()
    result = (
        supabase.table("branches")
        .select("id, name, address")
        .eq("client_id", client_id)
        .execute()
    )
    return result.data or []


async def search_products(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    """Search products by name (fuzzy match)."""
    supabase = get_supabase_client()
    result = (
        supabase.table("products")
        .select("id, name, codigo_wo, price")
        .ilike("name", f"%{query}%")
        .eq("is_active", True)
        .limit(limit)
        .execute()
    )
    return result.data or []


async def get_orders_summary_for_date(
    user_id: str,
    target_date: date,
) -> Dict[str, Any]:
    """Get order summary stats for a specific date."""
    supabase = get_supabase_client()

    # Get user's clients
    clients_result = (
        supabase.table("clients")
        .select("id")
        .eq("assigned_user_id", user_id)
        .execute()
    )
    client_ids = [c["id"] for c in (clients_result.data or [])]
    if not client_ids:
        return {"count": 0, "total": 0, "by_status": {}}

    result = (
        supabase.table("orders")
        .select("id, status, total_value")
        .in_("client_id", client_ids)
        .eq("expected_delivery_date", target_date.isoformat())
        .execute()
    )

    orders = result.data or []
    by_status: Dict[str, int] = {}
    total = 0.0
    for o in orders:
        status = o.get("status", "unknown")
        by_status[status] = by_status.get(status, 0) + 1
        total += o.get("total_value", 0) or 0

    return {
        "count": len(orders),
        "total": total,
        "by_status": by_status,
    }


async def get_orders_with_missing(user_id: str) -> int:
    """Count orders with pending missing items for user's clients."""
    supabase = get_supabase_client()

    clients_result = (
        supabase.table("clients")
        .select("id")
        .eq("assigned_user_id", user_id)
        .execute()
    )
    client_ids = [c["id"] for c in (clients_result.data or [])]
    if not client_ids:
        return 0

    result = (
        supabase.table("orders")
        .select("id", count="exact")
        .in_("client_id", client_ids)
        .eq("has_pending_missing", True)
        .execute()
    )
    return result.count or 0
