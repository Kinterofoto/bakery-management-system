"""Supabase queries for orders, clients, and frequencies - scoped to commercial user."""

import logging
from typing import List, Dict, Any, Optional
from datetime import date, timedelta

from ...core.supabase import get_supabase_client

logger = logging.getLogger(__name__)


async def query_orders(
    user_id: str,
    client_name: Optional[str] = None,
    date_filter: Optional[str] = None,
    status_filter: Optional[str] = None,
    order_number: Optional[str] = None,
    limit: int = 20,
) -> List[Dict[str, Any]]:
    """
    Query orders scoped to the commercial user's assigned clients.

    date_filter: 'today', 'tomorrow', 'week', or a specific date string 'YYYY-MM-DD'
    """
    supabase = get_supabase_client()

    # First get the user's client IDs
    clients_result = (
        supabase.table("clients")
        .select("id, name")
        .eq("assigned_user_id", user_id)
        .execute()
    )
    if not clients_result.data:
        return []

    client_ids = [c["id"] for c in clients_result.data]
    client_name_map = {c["id"]: c["name"] for c in clients_result.data}

    # Build orders query
    query = (
        supabase.table("orders")
        .select("id, order_number, client_id, branch_id, expected_delivery_date, status, total_value, created_at, branches(name)")
        .in_("client_id", client_ids)
        .order("expected_delivery_date", desc=True)
        .limit(limit)
    )

    # Filter by client name (fuzzy match in our client list)
    if client_name:
        matching_ids = [
            cid for cid, cname in client_name_map.items()
            if client_name.lower() in cname.lower()
        ]
        if not matching_ids:
            return []
        query = query.in_("client_id", matching_ids)

    # Filter by date
    today = date.today()
    if date_filter == "today":
        query = query.eq("expected_delivery_date", today.isoformat())
    elif date_filter == "tomorrow":
        tomorrow = today + timedelta(days=1)
        query = query.eq("expected_delivery_date", tomorrow.isoformat())
    elif date_filter == "week":
        # Monday to Sunday of current week
        start = today - timedelta(days=today.weekday())
        end = start + timedelta(days=6)
        query = query.gte("expected_delivery_date", start.isoformat())
        query = query.lte("expected_delivery_date", end.isoformat())
    elif date_filter and date_filter not in ("today", "tomorrow", "week"):
        # Specific date
        query = query.eq("expected_delivery_date", date_filter)

    # Filter by status
    if status_filter:
        query = query.eq("status", status_filter)

    # Filter by order number
    if order_number:
        query = query.eq("order_number", order_number)

    result = query.execute()
    orders = result.data or []

    # Enrich with client names
    for order in orders:
        order["client_name"] = client_name_map.get(order.get("client_id"), "N/A")
        if isinstance(order.get("branches"), dict):
            order["branch_name"] = order["branches"].get("name", "")

    return orders


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


async def query_clients(user_id: str) -> List[Dict[str, Any]]:
    """Get all clients assigned to user."""
    supabase = get_supabase_client()
    result = (
        supabase.table("clients")
        .select("id, name, category, lead_status, phone, email, is_active")
        .eq("assigned_user_id", user_id)
        .eq("is_active", True)
        .order("name")
        .execute()
    )
    return result.data or []


async def query_frequencies(
    user_id: str,
    client_name: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Get delivery frequencies for user's clients."""
    supabase = get_supabase_client()

    # Get user's clients
    clients_query = (
        supabase.table("clients")
        .select("id, name")
        .eq("assigned_user_id", user_id)
        .eq("is_active", True)
    )
    if client_name:
        clients_query = clients_query.ilike("name", f"%{client_name}%")

    clients_result = clients_query.execute()
    if not clients_result.data:
        return []

    client_ids = [c["id"] for c in clients_result.data]

    # Get branches for these clients
    branches_result = (
        supabase.table("branches")
        .select("id, name, client_id")
        .in_("client_id", client_ids)
        .execute()
    )
    if not branches_result.data:
        return []

    branch_ids = [b["id"] for b in branches_result.data]
    branch_map = {b["id"]: b for b in branches_result.data}
    client_map = {c["id"]: c["name"] for c in clients_result.data}

    # Get frequencies
    freq_result = (
        supabase.table("client_frequencies")
        .select("*")
        .in_("branch_id", branch_ids)
        .eq("is_active", True)
        .execute()
    )

    frequencies = freq_result.data or []

    # Enrich with branch and client names
    for f in frequencies:
        branch = branch_map.get(f.get("branch_id"), {})
        f["branch_name"] = branch.get("name", "")
        f["client_name"] = client_map.get(branch.get("client_id"), "")

    return frequencies


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
