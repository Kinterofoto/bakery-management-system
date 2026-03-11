"""End-to-end integration test for audit user tracking.

Tests the FULL order lifecycle against real Supabase to verify that
every operation correctly records the user in audit logs.

Flow tested:
  1. Create order          → audit should have user
  2. Full update (edit)    → audit should have user
  3. Transition statuses   → audit should have user
  4. Batch update items    → audit should have user
  5. Cleanup test data

Run with:  python3 test_audit_integration.py
Requires:  API server running on localhost:8000 (or set API_URL env var)
"""

import os
import sys
import time
import json
import requests
import jwt as pyjwt
from datetime import datetime, timedelta
from supabase import create_client

# ============================================================
# Config
# ============================================================

API_URL = os.environ.get("API_URL", "http://localhost:8000")
SUPABASE_URL = "https://khwcknapjnhpxfodsahb.supabase.co"
SUPABASE_KEY = os.environ.get(
    "SUPABASE_SERVICE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtod2NrbmFwam5ocHhmb2RzYWhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjUzMTk4NywiZXhwIjoyMDY4MTA3OTg3fQ.-qZa2anhBkOjRF4V8Anr5kFT05StD3vBeYwOpATTZ44"
)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ============================================================
# Test data - uses real IDs from the database
# ============================================================

TEST_USER_ID = None  # Will be fetched
TEST_USER_NAME = None
TEST_CLIENT_ID = None
TEST_PRODUCTS = []  # [{id, name, price}]


def setup_test_data():
    """Fetch real entities to use in the test."""
    global TEST_USER_ID, TEST_USER_NAME, TEST_CLIENT_ID, TEST_PRODUCTS

    users = supabase.table("users").select("id, name").limit(1).execute()
    assert users.data, "No users found in database"
    TEST_USER_ID = users.data[0]["id"]
    TEST_USER_NAME = users.data[0]["name"]

    clients = supabase.table("clients").select("id").limit(1).execute()
    assert clients.data, "No clients found in database"
    TEST_CLIENT_ID = clients.data[0]["id"]

    products = (
        supabase.table("products")
        .select("id, name, price")
        .eq("is_active", True)
        .eq("category", "PT")
        .limit(3)
        .execute()
    )
    assert len(products.data) >= 2, "Need at least 2 active PT products"
    TEST_PRODUCTS = products.data


def make_auth_header() -> dict:
    """Create a fake JWT with the test user's sub claim."""
    token = pyjwt.encode(
        {"sub": TEST_USER_ID, "role": "authenticated"},
        "fake-secret",
        algorithm="HS256",
    )
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    }


# ============================================================
# Helpers
# ============================================================

def check_audit(order_id: str, table: str, expected_user_id: str, action: str = None, description: str = ""):
    """Check that recent audit entries for an order have the expected user."""
    cutoff = (datetime.now(tz=None) - timedelta(seconds=30)).isoformat()

    query = (
        supabase.table(table)
        .select("id, action, changed_by, changed_at")
        .eq("order_id", order_id)
        .gte("changed_at", cutoff)
    )
    if action:
        query = query.eq("action", action)

    result = query.order("changed_at", desc=True).execute()

    entries = result.data or []
    if not entries:
        print(f"  FAIL: No audit entries found in {table} for {description}")
        return False

    all_ok = True
    for entry in entries:
        if entry["changed_by"] == expected_user_id:
            print(f"  OK: {table} {entry['action']} -> {TEST_USER_NAME} ({entry['changed_by'][:12]}...)")
        elif entry["changed_by"] is None:
            print(f"  FAIL: {table} {entry['action']} -> NULL (Usuario desconocido!) at {entry['changed_at']}")
            all_ok = False
        else:
            print(f"  WARN: {table} {entry['action']} -> {entry['changed_by'][:12]}... (different user)")

    return all_ok


def cleanup_order(order_id: str):
    """Delete test order and all related data (order matters for FK constraints)."""
    try:
        # 1. Delete audit tables first (they reference orders via FK)
        supabase.table("order_item_deliveries_audit").delete().eq("order_id", order_id).execute()
        supabase.table("order_items_audit").delete().eq("order_id", order_id).execute()
        supabase.table("orders_audit").delete().eq("order_id", order_id).execute()

        # 2. Delete events
        supabase.table("order_events").delete().eq("order_id", order_id).execute()

        # 3. Delete delivery records
        items = supabase.table("order_items").select("id").eq("order_id", order_id).execute()
        for item in (items.data or []):
            supabase.table("order_item_deliveries").delete().eq("order_item_id", item["id"]).execute()

        # 4. Delete items then order (triggers will try to create audit entries,
        #    but we already deleted them - the FK error is harmless)
        try:
            supabase.table("order_items").delete().eq("order_id", order_id).execute()
        except Exception:
            pass
        try:
            supabase.table("orders").delete().eq("id", order_id).execute()
        except Exception:
            pass
        print(f"\n  Cleanup: order {order_id} deleted")
    except Exception as e:
        print(f"\n  Cleanup warning: {e}")


# ============================================================
# Test steps
# ============================================================

def test_create_order() -> str:
    """Step 1: Create an order and verify audit has the user."""
    print("\n=== STEP 1: Create Order ===")

    payload = {
        "client_id": TEST_CLIENT_ID,
        "expected_delivery_date": (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d"),
        "items": [
            {
                "product_id": TEST_PRODUCTS[0]["id"],
                "quantity_requested": 10,
                "unit_price": TEST_PRODUCTS[0]["price"],
            },
            {
                "product_id": TEST_PRODUCTS[1]["id"],
                "quantity_requested": 5,
                "unit_price": TEST_PRODUCTS[1]["price"],
            },
        ],
    }

    resp = requests.post(f"{API_URL}/api/orders/", json=payload, headers=make_auth_header())
    assert resp.status_code == 200, f"Create failed: {resp.status_code} {resp.text}"

    data = resp.json()
    order_id = data["id"]
    print(f"  Created order {data['order_number']} (id: {order_id[:12]}...)")

    # Wait briefly for triggers to fire
    time.sleep(1)

    ok1 = check_audit(order_id, "orders_audit", TEST_USER_ID, "INSERT", "order creation")
    ok2 = check_audit(order_id, "order_items_audit", TEST_USER_ID, "INSERT", "items creation")

    assert ok1, "Order creation audit missing user!"
    assert ok2, "Item creation audit missing user!"

    return order_id


def test_full_update(order_id: str):
    """Step 2: Full update (add/remove items, change date) and verify audit."""
    print("\n=== STEP 2: Full Update (Edit Order) ===")

    # Get current items to keep one and add a new one
    items_resp = (
        supabase.table("order_items")
        .select("id, product_id, quantity_requested, unit_price")
        .eq("order_id", order_id)
        .execute()
    )
    current_items = items_resp.data

    # Keep first item (modified qty), drop second, add third product
    payload = {
        "expected_delivery_date": (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d"),
        "observations": "Test audit - full update",
        "items": [
            {
                "id": current_items[0]["id"],
                "product_id": current_items[0]["product_id"],
                "quantity_requested": 20,  # changed from 10
                "unit_price": current_items[0]["unit_price"],
            },
            {
                "product_id": TEST_PRODUCTS[2]["id"] if len(TEST_PRODUCTS) > 2 else TEST_PRODUCTS[0]["id"],
                "quantity_requested": 8,
                "unit_price": TEST_PRODUCTS[2]["price"] if len(TEST_PRODUCTS) > 2 else 5000,
            },
        ],
    }

    resp = requests.put(
        f"{API_URL}/api/orders/{order_id}/full",
        json=payload,
        headers=make_auth_header(),
    )
    assert resp.status_code == 200, f"Full update failed: {resp.status_code} {resp.text}"

    data = resp.json()
    print(f"  Updated: {data.get('items_created', 0)} created, {data.get('items_updated', 0)} updated, {data.get('items_deleted', 0)} deleted")

    time.sleep(1)

    ok1 = check_audit(order_id, "orders_audit", TEST_USER_ID, "UPDATE", "order update")
    ok2 = check_audit(order_id, "order_items_audit", TEST_USER_ID, description="items changes")

    assert ok1, "Order update audit missing user!"
    assert ok2, "Item changes audit missing user!"


def test_status_transitions(order_id: str):
    """Step 3: Transition through statuses and verify audit."""
    print("\n=== STEP 3: Status Transitions ===")

    transitions = [
        "review_area1",
        "review_area2",
        "ready_dispatch",
    ]

    for new_status in transitions:
        resp = requests.patch(
            f"{API_URL}/api/orders/{order_id}/transition",
            json={"new_status": new_status},
            headers=make_auth_header(),
        )
        assert resp.status_code == 200, f"Transition to {new_status} failed: {resp.status_code} {resp.text}"
        print(f"  Transitioned to: {new_status}")

    time.sleep(1)

    ok = check_audit(order_id, "orders_audit", TEST_USER_ID, "UPDATE", "status transitions")
    assert ok, "Status transition audit missing user!"


def test_batch_update_items(order_id: str):
    """Step 4: Batch update items (availability) and verify audit."""
    print("\n=== STEP 4: Batch Update Items ===")

    # Get current items
    items_resp = (
        supabase.table("order_items")
        .select("id, quantity_requested")
        .eq("order_id", order_id)
        .execute()
    )
    items = items_resp.data
    assert items, "No items found for batch update"

    updates = [
        {
            "item_id": item["id"],
            "quantity_available": item["quantity_requested"],
            "availability_status": "available",
        }
        for item in items
    ]

    resp = requests.patch(
        f"{API_URL}/api/orders/{order_id}/items",
        json={"updates": updates},
        headers=make_auth_header(),
    )
    assert resp.status_code == 200, f"Batch update failed: {resp.status_code} {resp.text}"

    data = resp.json()
    print(f"  Updated {data.get('updated_count', 0)} items")

    time.sleep(1)

    ok = check_audit(order_id, "order_items_audit", TEST_USER_ID, "UPDATE", "batch item updates")
    assert ok, "Batch item update audit missing user!"


# ============================================================
# Main
# ============================================================

def main():
    print("=" * 60)
    print("AUDIT USER TRACKING - INTEGRATION TEST")
    print(f"API: {API_URL}")
    print(f"Supabase: {SUPABASE_URL}")
    print("=" * 60)

    # Check API is reachable
    try:
        health = requests.get(f"{API_URL}/health", timeout=5)
        print(f"API health: {health.status_code}")
    except requests.ConnectionError:
        print(f"\nERROR: API not reachable at {API_URL}")
        print("Start the API server first: cd apps/api && uvicorn app:app --reload")
        sys.exit(1)

    setup_test_data()
    print(f"\nTest user: {TEST_USER_NAME} ({TEST_USER_ID[:12]}...)")
    print(f"Test client: {TEST_CLIENT_ID[:12]}...")
    print(f"Test products: {len(TEST_PRODUCTS)}")

    order_id = None
    all_passed = True

    try:
        # Step 1: Create
        order_id = test_create_order()

        # Step 2: Full update
        test_full_update(order_id)

        # Step 3: Status transitions
        test_status_transitions(order_id)

        # Step 4: Batch update items
        test_batch_update_items(order_id)

    except AssertionError as e:
        print(f"\n  ASSERTION FAILED: {e}")
        all_passed = False
    except Exception as e:
        print(f"\n  ERROR: {e}")
        all_passed = False
    finally:
        # Cleanup
        if order_id:
            cleanup_order(order_id)

    print("\n" + "=" * 60)
    if all_passed:
        print("RESULT: ALL TESTS PASSED - No 'Usuario desconocido' in any step")
    else:
        print("RESULT: SOME TESTS FAILED - Check output above")
    print("=" * 60)

    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
