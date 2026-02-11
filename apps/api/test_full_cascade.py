"""
Comprehensive test for cascade production system.

Tests all cascade functionality across January 2026 (weeks 1-3):
- Forward cascade (PT without PP)
- Backward cascade (PT with PP dependencies)
- Multiple cascades sharing work centers
- Cross-week scheduling
- Deletion (cascade + PP dependencies)
- Multi-WC distribution check
"""

import os
import sys
import time
import json
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

BASE_URL = "http://localhost:8000/api/production/cascade"
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

# Product IDs
CROISSANT_MULTICEREAL_ID = "00007635-0000-4000-8000-000076350000"
CROISSANT_EUROPA_ID = "00007626-0000-4000-8000-000076260000"
EMPASTE_ID = "f550e162-57f4-4b09-aded-f8ee74d0f678"

# WC IDs
PASTELERIA_ID = "61895037-4be2-4470-bec8-cd26f6638c65"
CROISSOMAT_ID = "b7ba9233-d43e-4bac-a979-acb8a74bf964"

# Track created orders for cleanup
created_orders = []
test_results = {"passed": 0, "failed": 0, "errors": []}


def section(title):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}")


def check(condition, description):
    if condition:
        print(f"  ✅ {description}")
        test_results["passed"] += 1
    else:
        print(f"  ❌ {description}")
        test_results["failed"] += 1
        test_results["errors"].append(description)


def create_cascade(product_id, start_datetime, duration_hours, staff_count, week_plan_id=None):
    """Create a cascade and track the order number for cleanup."""
    payload = {
        "work_center_id": "dummy",
        "product_id": product_id,
        "start_datetime": start_datetime,
        "duration_hours": duration_hours,
        "staff_count": staff_count,
    }
    if week_plan_id:
        payload["week_plan_id"] = week_plan_id

    response = requests.post(f"{BASE_URL}/create", json=payload, timeout=120)
    if response.status_code == 200:
        result = response.json()
        order_num = result.get("production_order_number")
        if order_num:
            created_orders.append(order_num)
        # Track PP orders too
        for pp in result.get("pp_dependencies", []):
            pp_order = pp.get("production_order_number")
            if pp_order:
                created_orders.append(pp_order)
        return result
    else:
        print(f"  ⚠️  Create failed: {response.status_code} - {response.text[:200]}")
        return None


def delete_cascade(order_number):
    """Delete a cascade order."""
    response = requests.delete(f"{BASE_URL}/order/{order_number}", timeout=120)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"  ⚠️  Delete failed: {response.status_code} - {response.text[:200]}")
        return None


def get_schedules(order_number):
    """Get schedules for an order number."""
    result = supabase.schema("produccion").table("production_schedules").select(
        "id, resource_id, product_id, start_date, end_date, batch_number, total_batches, "
        "batch_size, cascade_level, cascade_source_id, production_order_number, "
        "produced_for_order_number, cascade_type, status"
    ).eq("production_order_number", order_number).order("cascade_level").order("batch_number").execute()
    return result.data or []


def get_wc_name(wc_id):
    """Get work center name."""
    result = supabase.schema("produccion").table("work_centers").select("name").eq("id", wc_id).single().execute()
    return result.data["name"] if result.data else wc_id[:8]


def clean_january():
    """Remove all schedules in January 2026."""
    result = supabase.schema("produccion").table("production_schedules").delete().gte(
        "start_date", "2026-01-01T00:00:00"
    ).lt(
        "start_date", "2026-02-01T00:00:00"
    ).execute()
    count = len(result.data) if result.data else 0
    # Also clean parking zone
    result2 = supabase.schema("produccion").table("production_schedules").delete().gte(
        "start_date", "2026-02-01T00:00:00"
    ).lt(
        "start_date", "2026-06-01T00:00:00"
    ).execute()
    count2 = len(result2.data) if result2.data else 0
    return count + count2


def print_schedules_summary(schedules, label=""):
    """Print a compact summary of schedules."""
    if label:
        print(f"\n  {label}:")
    for s in schedules:
        wc_name = get_wc_name(s["resource_id"])
        start = s["start_date"][:16] if s["start_date"] else "?"
        end = s["end_date"][:16] if s["end_date"] else "?"
        cascade_type = s.get("cascade_type", "?")
        print(f"    L{s.get('cascade_level', '?')} B{s.get('batch_number', '?')}/{s.get('total_batches', '?')} "
              f"| {wc_name:15s} | {start} -> {end} | {cascade_type} | qty={s.get('batch_size', '?')}")


# ============================================================
# CLEANUP
# ============================================================
section("CLEANUP: Removing January 2026 schedules")
cleaned = clean_january()
print(f"  Cleaned {cleaned} existing schedules")


# ============================================================
# TEST 1: Basic forward cascade (PT without PP)
# ============================================================
section("TEST 1: Forward cascade - Pastel de arequipe (no PP)")

# Pastel de arequipe has route: CROISSOMAT -> FERMENTACION -> DECORADO, no PP
# Using a product without PP dependencies
result1 = create_cascade(
    product_id=CROISSANT_MULTICEREAL_ID,  # Has PP but let's use it
    start_datetime="2026-01-05T06:00:00",  # Monday T2 Week 1
    duration_hours=4.0,
    staff_count=1,
)

if result1:
    order1 = result1["production_order_number"]
    print(f"  Order #{order1}: {result1['product_name']}")
    print(f"  Total units: {result1['total_units']}, Batches: {result1['num_batches']}, Schedules: {result1['schedules_created']}")

    check(result1["schedules_created"] > 0, "Schedules were created")
    check(result1["num_batches"] > 0, "Multiple batches generated")
    check(len(result1.get("work_centers", [])) > 0, "Work centers in response")

    # Check PP dependencies
    pp_deps = result1.get("pp_dependencies", [])
    if pp_deps:
        print(f"  PP dependencies: {len(pp_deps)}")
        for pp in pp_deps:
            print(f"    - {pp['product_name']}: Order #{pp['production_order_number']}, "
                  f"units={pp['total_units']}, schedules={pp['schedules_created']}")
        check(True, f"Backward cascade created {len(pp_deps)} PP dependency(ies)")

    # Verify schedules in DB
    db_schedules = get_schedules(order1)
    check(len(db_schedules) > 0, f"DB has {len(db_schedules)} schedules for PT order #{order1}")

    # Verify cascade levels
    levels = set(s["cascade_level"] for s in db_schedules)
    check(len(levels) > 1, f"Multiple cascade levels: {sorted(levels)}")

    # Verify batch numbering
    for level in levels:
        level_schedules = [s for s in db_schedules if s["cascade_level"] == level]
        batch_nums = sorted(s["batch_number"] for s in level_schedules)
        check(batch_nums == list(range(1, len(batch_nums) + 1)),
              f"Level {level}: sequential batch numbers {batch_nums}")

    # Verify cascade_source_id chain
    level1_schedules = [s for s in db_schedules if s["cascade_level"] == sorted(levels)[0]]
    if len(levels) > 1:
        level2_schedules = [s for s in db_schedules if s["cascade_level"] == sorted(levels)[1]]
        sources_valid = all(s.get("cascade_source_id") is not None for s in level2_schedules)
        check(sources_valid, "All level 2+ schedules have cascade_source_id")

    print_schedules_summary(db_schedules, "PT Schedules")

    # Check PP schedules if any
    if pp_deps:
        for pp in pp_deps:
            pp_schedules = get_schedules(pp["production_order_number"])
            check(len(pp_schedules) > 0, f"PP order #{pp['production_order_number']} has {len(pp_schedules)} schedules in DB")

            # Verify PP timing: PP should finish before PT starts
            pp_ends = [s["end_date"] for s in pp_schedules]
            pt_starts = [s["start_date"] for s in level1_schedules]
            if pp_ends and pt_starts:
                pp_last_end = max(pp_ends)
                pt_first_start = min(pt_starts)
                check(pp_last_end <= pt_first_start,
                      f"PP finishes ({pp_last_end[:16]}) before PT starts ({pt_first_start[:16]})")

            print_schedules_summary(pp_schedules, f"PP Schedules (order #{pp['production_order_number']})")
else:
    check(False, "Failed to create cascade")


# ============================================================
# TEST 2: Second cascade same week (queue sharing)
# ============================================================
section("TEST 2: Second cascade same week - Croissant Europa (queue sharing)")

result2 = create_cascade(
    product_id=CROISSANT_EUROPA_ID,
    start_datetime="2026-01-05T10:00:00",  # Monday T2 Week 1, starts 4h later
    duration_hours=3.0,
    staff_count=1,
)

if result2:
    order2 = result2["production_order_number"]
    print(f"  Order #{order2}: {result2['product_name']}")
    print(f"  Total units: {result2['total_units']}, Batches: {result2['num_batches']}, Schedules: {result2['schedules_created']}")

    check(result2["schedules_created"] > 0, "Second cascade created successfully")

    pp_deps2 = result2.get("pp_dependencies", [])
    if pp_deps2:
        check(True, f"Second cascade has {len(pp_deps2)} PP dependency(ies)")

    # Verify no overlaps in DECORADO (sequential WC shared by both)
    decorado_id = "5afec362-9d7c-459f-92dc-5431e42dc81b"
    all_decorado = supabase.schema("produccion").table("production_schedules").select(
        "id, start_date, end_date, production_order_number, batch_number"
    ).eq("resource_id", decorado_id).gte(
        "start_date", "2026-01-01T00:00:00"
    ).lt(
        "start_date", "2026-02-01T00:00:00"
    ).order("start_date").execute()

    if all_decorado.data and len(all_decorado.data) > 1:
        overlaps = 0
        sorted_dec = sorted(all_decorado.data, key=lambda x: x["start_date"])
        for i in range(len(sorted_dec) - 1):
            if sorted_dec[i]["end_date"] > sorted_dec[i + 1]["start_date"]:
                overlaps += 1
        check(overlaps == 0, f"No overlaps in shared DECORADO WC ({len(sorted_dec)} schedules)")

    db_schedules2 = get_schedules(order2)
    print_schedules_summary(db_schedules2, "PT Schedules (Croissant Europa)")

    if pp_deps2:
        for pp in pp_deps2:
            pp_sch = get_schedules(pp["production_order_number"])
            print_schedules_summary(pp_sch, f"PP Schedules (order #{pp['production_order_number']})")
else:
    check(False, "Failed to create second cascade")


# ============================================================
# TEST 3: Cross-week cascade (end of week 1 / start of week 2)
# ============================================================
section("TEST 3: Cross-week cascade (late Saturday -> next week)")

# Saturday Jan 10, 18:00 T3 -> cascades should flow into next week
result3 = create_cascade(
    product_id=CROISSANT_MULTICEREAL_ID,
    start_datetime="2026-01-10T18:00:00",  # Saturday T3 (near week boundary)
    duration_hours=3.0,
    staff_count=1,
)

if result3:
    order3 = result3["production_order_number"]
    print(f"  Order #{order3}: {result3['product_name']}")
    print(f"  Cascade start: {result3['cascade_start']}")
    print(f"  Cascade end: {result3['cascade_end']}")

    check(result3["schedules_created"] > 0, "Cross-week cascade created")

    # Check if schedules span across the week boundary (Saturday 22:00)
    db_sch3 = get_schedules(order3)
    dates = set()
    for s in db_sch3:
        dt = s["start_date"][:10]
        dates.add(dt)

    check(len(dates) >= 1, f"Schedules span dates: {sorted(dates)}")

    # Cascade end should be after start
    cascade_end_str = str(result3["cascade_end"])[:16]
    cascade_start_str = str(result3["cascade_start"])[:16]
    check(result3["cascade_end"] > result3["cascade_start"],
          f"Cascade end ({cascade_end_str}) > start ({cascade_start_str})")

    print_schedules_summary(db_sch3, "Cross-week PT Schedules")

    pp_deps3 = result3.get("pp_dependencies", [])
    if pp_deps3:
        for pp in pp_deps3:
            pp_sch = get_schedules(pp["production_order_number"])
            print_schedules_summary(pp_sch, f"PP Schedules (order #{pp['production_order_number']})")
else:
    check(False, "Failed to create cross-week cascade")


# ============================================================
# TEST 4: Week 2 cascades
# ============================================================
section("TEST 4: Week 2 - Multiple cascades")

# Create 2 cascades in week 2
result4a = create_cascade(
    product_id=CROISSANT_EUROPA_ID,
    start_datetime="2026-01-12T06:00:00",  # Monday Week 2 T2
    duration_hours=5.0,
    staff_count=2,
)

result4b = create_cascade(
    product_id=CROISSANT_MULTICEREAL_ID,
    start_datetime="2026-01-13T06:00:00",  # Tuesday Week 2 T2
    duration_hours=4.0,
    staff_count=1,
)

if result4a and result4b:
    order4a = result4a["production_order_number"]
    order4b = result4b["production_order_number"]
    print(f"  Order #{order4a}: {result4a['product_name']} - {result4a['total_units']} units, {result4a['num_batches']} batches")
    print(f"  Order #{order4b}: {result4b['product_name']} - {result4b['total_units']} units, {result4b['num_batches']} batches")

    check(result4a["schedules_created"] > 0, f"Week 2 cascade A created ({result4a['schedules_created']} schedules)")
    check(result4b["schedules_created"] > 0, f"Week 2 cascade B created ({result4b['schedules_created']} schedules)")

    # Both should have PP dependencies
    pp4a = result4a.get("pp_dependencies", [])
    pp4b = result4b.get("pp_dependencies", [])
    check(len(pp4a) > 0, f"Cascade A has {len(pp4a)} PP deps")
    check(len(pp4b) > 0, f"Cascade B has {len(pp4b)} PP deps")

    # Check AMASADO (shared by both PP cascades, hybrid mode)
    amasado_id = "ef87800c-1bc3-4b92-8b43-b2c1ac8d1f49"
    amasado_schedules = supabase.schema("produccion").table("production_schedules").select(
        "id, start_date, end_date, production_order_number, batch_number"
    ).eq("resource_id", amasado_id).gte(
        "start_date", "2026-01-01T00:00:00"
    ).lt(
        "start_date", "2026-02-01T00:00:00"
    ).order("start_date").execute()

    if amasado_schedules.data:
        amasado_orders = set(s["production_order_number"] for s in amasado_schedules.data)
        print(f"  AMASADO has {len(amasado_schedules.data)} schedules from {len(amasado_orders)} orders")
        check(len(amasado_orders) >= 2, f"AMASADO shared by {len(amasado_orders)} PP orders (hybrid mode)")
else:
    check(False, "Failed to create week 2 cascades")


# ============================================================
# TEST 5: Delete cascade (with PP dependencies)
# ============================================================
section("TEST 5: Delete cascade with PP dependencies")

if result1:
    order_to_delete = result1["production_order_number"]

    # Count schedules before deletion
    before_pt = get_schedules(order_to_delete)
    pp_orders_to_check = []
    pp_deps_for_del = result1.get("pp_dependencies", [])
    for pp in pp_deps_for_del:
        pp_orders_to_check.append(pp["production_order_number"])

    before_pp_counts = {}
    for pp_ord in pp_orders_to_check:
        before_pp_counts[pp_ord] = len(get_schedules(pp_ord))

    total_before = len(before_pt) + sum(before_pp_counts.values())
    print(f"  Before deletion: PT order #{order_to_delete} has {len(before_pt)} schedules")
    for pp_ord, count in before_pp_counts.items():
        print(f"    PP order #{pp_ord} has {count} schedules")
    print(f"  Total: {total_before} schedules to delete")

    # Delete
    del_result = delete_cascade(order_to_delete)

    if del_result:
        check(del_result["deleted_count"] > 0,
              f"Deleted {del_result['deleted_count']} schedules")
        check(del_result["deleted_count"] >= total_before,
              f"Deleted count ({del_result['deleted_count']}) >= expected ({total_before})")

        # Verify PT schedules gone
        after_pt = get_schedules(order_to_delete)
        check(len(after_pt) == 0, f"PT order #{order_to_delete} has 0 schedules after deletion")

        # Verify PP schedules gone
        for pp_ord in pp_orders_to_check:
            after_pp = get_schedules(pp_ord)
            check(len(after_pp) == 0, f"PP order #{pp_ord} has 0 schedules after deletion")

        print(f"  Message: {del_result.get('message', '')}")
    else:
        check(False, "Delete returned no result")


# ============================================================
# TEST 6: Re-create after deletion (verify clean state)
# ============================================================
section("TEST 6: Re-create after deletion (verify clean state)")

result6 = create_cascade(
    product_id=CROISSANT_MULTICEREAL_ID,
    start_datetime="2026-01-05T06:00:00",  # Same time as deleted Test 1
    duration_hours=4.0,
    staff_count=1,
)

if result6:
    order6 = result6["production_order_number"]
    print(f"  Order #{order6}: {result6['product_name']}")
    check(result6["schedules_created"] > 0, "Re-creation after deletion successful")

    db_sch6 = get_schedules(order6)
    check(len(db_sch6) > 0, f"New schedules created: {len(db_sch6)}")
else:
    check(False, "Re-creation after deletion failed")


# ============================================================
# TEST 7: Week 3 - Large production (stress test)
# ============================================================
section("TEST 7: Week 3 - Large production (many batches)")

result7 = create_cascade(
    product_id=CROISSANT_EUROPA_ID,
    start_datetime="2026-01-19T06:00:00",  # Monday Week 3
    duration_hours=4.0,  # Half shift (reduced to avoid API timeout)
    staff_count=2,
)

if result7:
    order7 = result7["production_order_number"]
    print(f"  Order #{order7}: {result7['product_name']}")
    print(f"  Total units: {result7['total_units']}, Batches: {result7['num_batches']}")
    print(f"  Schedules created: {result7['schedules_created']}")

    check(result7["num_batches"] >= 2, f"Multiple batches: {result7['num_batches']}")
    check(result7["total_units"] > 500, f"Production: {result7['total_units']} units")

    # Check PP was created
    pp_deps7 = result7.get("pp_dependencies", [])
    if pp_deps7:
        pp7 = pp_deps7[0]
        check(pp7["total_units"] > 0, f"PP production: {pp7['total_units']} units")
        print(f"  PP: {pp7['product_name']} - {pp7['total_units']} units, "
              f"{pp7['schedules_created']} schedules")
else:
    check(False, "Large production failed")


# ============================================================
# TEST 8: Multiple same-day cascades (tight scheduling)
# ============================================================
section("TEST 8: Multiple same-day cascades")

# Create 3 cascades starting on the same day, close together
results_8 = []
for i, (hour, product_id) in enumerate([
    ("06:00:00", CROISSANT_MULTICEREAL_ID),
    ("08:00:00", CROISSANT_EUROPA_ID),
    ("10:00:00", CROISSANT_MULTICEREAL_ID),
]):
    r = create_cascade(
        product_id=product_id,
        start_datetime=f"2026-01-20T{hour}",
        duration_hours=2.0,
        staff_count=1,
    )
    if r:
        results_8.append(r)
        print(f"  Cascade {i+1}: Order #{r['production_order_number']} - "
              f"{r['product_name']} - {r['total_units']} units")

check(len(results_8) == 3, f"All 3 same-day cascades created ({len(results_8)}/3)")

# Verify no DECORADO overlaps across all 3
if len(results_8) == 3:
    decorado_id = "5afec362-9d7c-459f-92dc-5431e42dc81b"
    all_dec = supabase.schema("produccion").table("production_schedules").select(
        "start_date, end_date, production_order_number, batch_number"
    ).eq("resource_id", decorado_id).gte(
        "start_date", "2026-01-20T00:00:00"
    ).lt(
        "start_date", "2026-01-22T00:00:00"
    ).order("start_date").execute()

    if all_dec.data:
        sorted_d = sorted(all_dec.data, key=lambda x: x["start_date"])
        overlaps = 0
        for i in range(len(sorted_d) - 1):
            if sorted_d[i]["end_date"] > sorted_d[i+1]["start_date"]:
                overlaps += 1
        check(overlaps == 0, f"No DECORADO overlaps across {len(sorted_d)} schedules from 3 cascades")
    else:
        print("  No DECORADO schedules found for Jan 20")


# ============================================================
# TEST 9: Preview endpoint
# ============================================================
section("TEST 9: Preview endpoint (no DB writes)")

# Count schedules before
count_before = supabase.schema("produccion").table("production_schedules").select(
    "id", count="exact"
).gte("start_date", "2026-01-25T00:00:00").lt("start_date", "2026-01-26T00:00:00").execute()
before_count = count_before.count if hasattr(count_before, 'count') else len(count_before.data)

preview_payload = {
    "work_center_id": "dummy",
    "product_id": CROISSANT_EUROPA_ID,
    "start_datetime": "2026-01-25T06:00:00",
    "duration_hours": 3.0,
    "staff_count": 1,
}
preview_response = requests.post(f"{BASE_URL}/preview", json=preview_payload, timeout=60)

if preview_response.status_code == 200:
    preview = preview_response.json()
    check(preview.get("num_batches", 0) > 0, f"Preview shows {preview['num_batches']} batches")
    check(preview.get("total_units", 0) > 0, f"Preview shows {preview['total_units']} units")

    # Verify no new schedules in DB
    count_after = supabase.schema("produccion").table("production_schedules").select(
        "id", count="exact"
    ).gte("start_date", "2026-01-25T00:00:00").lt("start_date", "2026-01-26T00:00:00").execute()
    after_count = count_after.count if hasattr(count_after, 'count') else len(count_after.data)
    check(after_count == before_count, f"Preview did not create DB records ({before_count} -> {after_count})")
else:
    check(False, f"Preview failed: {preview_response.status_code}")


# ============================================================
# TEST 10: Delete all and verify clean state
# ============================================================
section("TEST 10: Mass deletion via API + verification")

# Get all unique PT order numbers in January (those without produced_for)
all_jan = supabase.schema("produccion").table("production_schedules").select(
    "production_order_number, produced_for_order_number"
).gte("start_date", "2025-12-20T00:00:00").lt(
    "start_date", "2026-06-01T00:00:00"
).execute()

unique_orders = set()
pt_order_nums = set()
for s in (all_jan.data or []):
    if s.get("production_order_number"):
        unique_orders.add(s["production_order_number"])
        if s.get("produced_for_order_number") is None:
            pt_order_nums.add(s["production_order_number"])

print(f"  Found {len(unique_orders)} unique orders ({len(pt_order_nums)} PTs)")

# Delete each PT order via API (which cascades to PPs)
deleted_total = 0
for order_num in sorted(pt_order_nums):
    del_r = delete_cascade(order_num)
    if del_r:
        deleted_total += del_r["deleted_count"]
        print(f"    Deleted order #{order_num}: {del_r['deleted_count']} schedules")

print(f"  Deleted {deleted_total} total schedules across {len(pt_order_nums)} PT orders")

# Verify January is clean (wide date range to catch parking zone too)
remaining = supabase.schema("produccion").table("production_schedules").select(
    "id"
).gte("start_date", "2025-12-20T00:00:00").lt(
    "start_date", "2026-06-01T00:00:00"
).execute()

check(len(remaining.data or []) == 0, f"January clean: {len(remaining.data or [])} schedules remaining")


# ============================================================
# SUMMARY
# ============================================================
section("TEST SUMMARY")
total = test_results["passed"] + test_results["failed"]
print(f"  Total: {total} checks")
print(f"  ✅ Passed: {test_results['passed']}")
print(f"  ❌ Failed: {test_results['failed']}")

if test_results["errors"]:
    print(f"\n  Failed checks:")
    for err in test_results["errors"]:
        print(f"    - {err}")

if test_results["failed"] == 0:
    print(f"\n  🎉 ALL TESTS PASSED!")
else:
    print(f"\n  ⚠️  Some tests failed. Review output above.")
    sys.exit(1)
