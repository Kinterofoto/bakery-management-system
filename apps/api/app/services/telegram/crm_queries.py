"""CRM mutation queries and summary data.

Note: Read-only CRM queries (leads, pipeline, activities) are now handled
by the dynamic SQL query skill in sql_executor.py. This file only contains
mutation operations and summary aggregations.
"""

import logging
from typing import Dict, Any, Optional
from datetime import date, datetime, timedelta

from ...core.supabase import get_supabase_client

logger = logging.getLogger(__name__)


async def create_activity(
    user_id: str,
    client_name: str,
    activity_type: str = "call",
    title: Optional[str] = None,
    description: Optional[str] = None,
    scheduled_date: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Create a new CRM activity."""
    supabase = get_supabase_client()

    # Find client by name
    clients_result = (
        supabase.table("clients")
        .select("id, name")
        .eq("assigned_user_id", user_id)
        .ilike("name", f"%{client_name}%")
        .limit(1)
        .execute()
    )
    if not clients_result.data:
        return None

    client = clients_result.data[0]

    # Map activity type
    type_map = {
        "llamada": "call",
        "call": "call",
        "email": "email",
        "correo": "email",
        "reunion": "meeting",
        "meeting": "meeting",
        "visita": "meeting",
        "nota": "note",
        "note": "note",
        "propuesta": "proposal",
        "proposal": "proposal",
        "seguimiento": "follow_up",
        "follow_up": "follow_up",
    }
    normalized_type = type_map.get(activity_type.lower(), "call")

    if not title:
        title = f"{normalized_type.capitalize()} con {client['name']}"

    insert_data = {
        "client_id": client["id"],
        "user_id": user_id,
        "activity_type": normalized_type,
        "title": title,
        "status": "pending",
    }
    if description:
        insert_data["description"] = description
    if scheduled_date:
        insert_data["scheduled_date"] = scheduled_date
    else:
        insert_data["scheduled_date"] = datetime.now().isoformat()

    result = (
        supabase.table("lead_activities")
        .insert(insert_data)
        .execute()
    )

    if result.data:
        activity = result.data[0]
        activity["client_name"] = client["name"]
        return activity
    return None


async def complete_activity(
    user_id: str,
    client_name: Optional[str] = None,
    activity_type: Optional[str] = None,
    activity_id: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Mark an activity as completed."""
    supabase = get_supabase_client()

    if activity_id:
        # Direct by ID
        result = (
            supabase.table("lead_activities")
            .update({
                "status": "completed",
                "completed_date": datetime.now().isoformat(),
            })
            .eq("id", activity_id)
            .eq("user_id", user_id)
            .execute()
        )
        if result.data:
            return result.data[0]
        return None

    # Find by client name and optionally activity type
    query = (
        supabase.table("lead_activities")
        .select("*, clients(name)")
        .eq("user_id", user_id)
        .eq("status", "pending")
        .order("scheduled_date", desc=False)
    )

    if client_name:
        clients_result = (
            supabase.table("clients")
            .select("id")
            .eq("assigned_user_id", user_id)
            .ilike("name", f"%{client_name}%")
            .execute()
        )
        if clients_result.data:
            client_ids = [c["id"] for c in clients_result.data]
            query = query.in_("client_id", client_ids)

    if activity_type:
        type_map = {
            "llamada": "call", "call": "call",
            "visita": "meeting", "meeting": "meeting", "reunion": "meeting",
            "email": "email", "correo": "email",
        }
        normalized = type_map.get(activity_type.lower(), activity_type.lower())
        query = query.eq("activity_type", normalized)

    result = query.limit(1).execute()
    if not result.data:
        return None

    activity = result.data[0]

    # Mark as completed
    update_result = (
        supabase.table("lead_activities")
        .update({
            "status": "completed",
            "completed_date": datetime.now().isoformat(),
        })
        .eq("id", activity["id"])
        .execute()
    )

    if update_result.data:
        completed = update_result.data[0]
        if isinstance(activity.get("clients"), dict):
            completed["client_name"] = activity["clients"].get("name", "")
        return completed
    return None


async def get_crm_summary_data(user_id: str) -> Dict[str, Any]:
    """Get CRM summary data for daily summaries."""
    supabase = get_supabase_client()
    today = date.today()
    now = datetime.now()

    # Pending activities for today
    pending_result = (
        supabase.table("lead_activities")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .eq("status", "pending")
        .gte("scheduled_date", today.isoformat())
        .lt("scheduled_date", (today + timedelta(days=1)).isoformat())
        .execute()
    )

    # Overdue activities
    overdue_result = (
        supabase.table("lead_activities")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .eq("status", "pending")
        .lt("scheduled_date", now.isoformat())
        .execute()
    )

    # Completed today
    completed_result = (
        supabase.table("lead_activities")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .eq("status", "completed")
        .gte("completed_date", today.isoformat())
        .execute()
    )

    # Leads needing follow-up
    leads_result = (
        supabase.table("clients")
        .select("id", count="exact")
        .eq("assigned_user_id", user_id)
        .eq("is_active", True)
        .neq("lead_status", "client")
        .neq("lead_status", "closed_won")
        .neq("lead_status", "closed_lost")
        .execute()
    )

    return {
        "pending_activities": pending_result.count or 0,
        "overdue_activities": overdue_result.count or 0,
        "completed_activities_today": completed_result.count or 0,
        "leads_needing_followup": leads_result.count or 0,
    }
