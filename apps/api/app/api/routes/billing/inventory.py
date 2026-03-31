"""Shared inventory deduction logic for billing and remision flows."""

import logging
from typing import List, Optional

logger = logging.getLogger(__name__)


def deduct_inventory_for_order(
    supabase,
    order_id: str,
    order_number: str,
    items: List[dict],
    user_id: Optional[str],
    notes: str = "",
) -> dict:
    """
    Deduct inventory for an order by calling perform_batch_dispatch_movements.

    Checks the inventory_deducted flag on the order first to prevent double deduction.

    Args:
        supabase: Supabase client instance
        order_id: The order UUID
        order_number: The order number string
        items: List of dicts with product_id and quantity (in packages)
        user_id: The user performing the action
        notes: Optional notes for the inventory movement

    Returns:
        dict with keys: success (bool), errors (list), skipped (bool)
    """
    result = {"success": False, "errors": [], "skipped": False}

    try:
        # Check if inventory was already deducted for this order
        order_check = (
            supabase.table("orders")
            .select("inventory_deducted")
            .eq("id", order_id)
            .single()
            .execute()
        )

        if order_check.data and order_check.data.get("inventory_deducted"):
            logger.info(f"Inventory already deducted for order {order_number}, skipping")
            result["success"] = True
            result["skipped"] = True
            return result

        # Get dispatch config for default location
        config_result = (
            supabase.table("dispatch_inventory_config")
            .select("default_dispatch_location_id")
            .eq("id", "00000000-0000-0000-0000-000000000000")
            .single()
            .execute()
        )

        default_location_id = (
            config_result.data.get("default_dispatch_location_id")
            if config_result.data
            else None
        )

        if not default_location_id:
            result["errors"].append("No default dispatch location configured")
            return result

        if not items:
            logger.info(f"No items to deduct for order {order_number}")
            result["success"] = True
            result["skipped"] = True
            return result

        # Call batch dispatch function
        rpc_result = (
            supabase.schema("inventario")
            .rpc(
                "perform_batch_dispatch_movements",
                {
                    "p_order_id": order_id,
                    "p_order_number": order_number,
                    "p_items": items,
                    "p_location_id_from": default_location_id,
                    "p_notes": notes,
                    "p_recorded_by": user_id,
                },
            )
            .execute()
        )

        if rpc_result.data:
            result_data = rpc_result.data
            if isinstance(result_data, dict):
                if result_data.get("success"):
                    result["success"] = True
                else:
                    result["errors"] = result_data.get("errors", [])
            else:
                result["success"] = True

        # Mark order as inventory_deducted
        if result["success"]:
            supabase.table("orders").update(
                {"inventory_deducted": True}
            ).eq("id", order_id).execute()
            logger.info(f"Inventory deducted for order {order_number}")

    except Exception as e:
        logger.error(f"Error deducting inventory for order {order_number}: {e}")
        result["errors"].append(str(e))

    return result


def prepare_order_items_for_deduction(order_items: List[dict]) -> List[dict]:
    """
    Convert order_items to the format expected by perform_batch_dispatch_movements.

    Filters out unavailable items and uses quantity_available (falling back to quantity_requested).

    Args:
        order_items: List of order item dicts from the database

    Returns:
        List of dicts with product_id and quantity keys
    """
    items = []
    for item in order_items:
        # Skip unavailable items
        if item.get("availability_status") == "unavailable":
            continue

        qty = item.get("quantity_available") or item.get("quantity_requested")
        if not qty or qty <= 0:
            continue

        items.append({
            "product_id": item["product_id"],
            "quantity": qty,
        })
    return items
