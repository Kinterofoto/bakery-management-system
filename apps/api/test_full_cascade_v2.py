"""
Comprehensive test for cascade V2 (PL/pgSQL) production system.

Same tests as test_full_cascade.py but using the V2 RPC function directly
instead of FastAPI endpoints. Validates that V2 produces correct results.

Tests all cascade functionality across January 2026 (weeks 1-3):
- Forward cascade (PT with PP dependencies)
- Multiple cascades sharing work centers
- Cross-week scheduling
- Deletion (cascade + PP dependencies)
- Multiple same-day cascades
- Preview mode (no DB writes)
"""

import os
import sys
import time
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

# Product IDs
CROISSANT_MULTICEREAL_ID = "00007635-0000-4000-8000-000076350000"
CROISSANT_EUROPA_ID = "00007626-0000-4000-8000-000076260000"
EMPASTE_ID = "f550e162-57f4-4b09-aded-f8ee74d0f678"

# Track created orders for cleanup
created_orders = []
test_results = {"passed": 0, "failed": 0, "errors": []}
total_v2_time_ms = 0
total_v2_calls = 0


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


def create_cascade_v2(product_id, start_datetime, duration_hours, staff_count, week_plan_id=None, create_in_db=True):
    """Create a cascade via V2 RPC and track the order number for cleanup."""
    global total_v2_time_ms, total_v2_calls

    start = time.time()
    result = supabase.schema("produccion").rpc("generate_cascade_v2", {
        "p_product_id": product_id,
        "p_start_datetime": start_datetime,
        "p_duration_hours": duration_hours,
        "p_staff_count": staff_count,
        "p_week_plan_id": week_plan_id,
        "p_create_in_db": create_in_db,
    }).execute()
    elapsed_ms = int((time.time() - start) * 1000)
    total_v2_time_ms += elapsed_ms
    total_v2_calls += 1

    if result.data:
        data = result.data
        print(f"  ⏱️  V2 RPC: {elapsed_ms}ms")
        if create_in_db:
            order_num = data.get("production_order_number")
            if order_num:
                created_orders.append(order_num)
            for pp in data.get("pp_dependencies", []):
                pp_order = pp.get("production_order_number")
                if pp_order:
                    created_orders.append(pp_order)
        return data
    else:
        print(f"  ⚠️  V2 RPC failed: {result}")
        return None


def delete_cascade(order_number):
    """Delete a cascade order. Uses direct DB delete (no FastAPI needed for V2 tests)."""
    return delete_cascade_direct(order_number)


def delete_cascade_direct(order_number):
    """Delete cascade directly from DB."""
    # Find all related orders (PP dependencies)
    all_related = supabase.schema("produccion").table("production_schedules").select(
        "production_order_number, produced_for_order_number"
    ).eq("produced_for_order_number", order_number).execute()

    pp_orders = set(s["production_order_number"] for s in (all_related.data or []))

    # Nullify cascade_source_id to avoid FK issues
    for ord_num in pp_orders | {order_number}:
        supabase.schema("produccion").table("production_schedules").update(
            {"cascade_source_id": None}
        ).eq("production_order_number", ord_num).execute()

    # Delete PP orders first, then PT
    total_deleted = 0
    for pp_ord in pp_orders:
        r = supabase.schema("produccion").table("production_schedules").delete().eq(
            "production_order_number", pp_ord
        ).execute()
        total_deleted += len(r.data or [])

    r = supabase.schema("produccion").table("production_schedules").delete().eq(
        "production_order_number", order_number
    ).execute()
    total_deleted += len(r.data or [])

    return {"deleted_count": total_deleted, "message": f"Deleted {total_deleted} schedules (direct)"}


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
    """Remove all schedules in January 2026 only (preserves February+)."""
    result = supabase.schema("produccion").table("production_schedules").delete().gte(
        "start_date", "2026-01-01T00:00:00"
    ).lt(
        "start_date", "2026-02-01T00:00:00"
    ).execute()
    count = len(result.data) if result.data else 0
    return count


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
# TEST 1: Basic forward cascade (PT with PP)
# ============================================================
section("TEST 1: Forward cascade - Croissant Multicereal (with PP)")

result1 = create_cascade_v2(
    product_id=CROISSANT_MULTICEREAL_ID,
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

result2 = create_cascade_v2(
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

result3 = create_cascade_v2(
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

    # Check if schedules span across dates
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

result4a = create_cascade_v2(
    product_id=CROISSANT_EUROPA_ID,
    start_datetime="2026-01-12T06:00:00",  # Monday Week 2 T2
    duration_hours=5.0,
    staff_count=2,
)

result4b = create_cascade_v2(
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

result6 = create_cascade_v2(
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
# TEST 7: Large production (stress test)
# ============================================================
section("TEST 7: Week 3 - Large production (many batches)")

result7 = create_cascade_v2(
    product_id=CROISSANT_EUROPA_ID,
    start_datetime="2026-01-19T06:00:00",  # Monday Week 3
    duration_hours=4.0,
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

results_8 = []
for i, (hour, product_id) in enumerate([
    ("06:00:00", CROISSANT_MULTICEREAL_ID),
    ("08:00:00", CROISSANT_EUROPA_ID),
    ("10:00:00", CROISSANT_MULTICEREAL_ID),
]):
    r = create_cascade_v2(
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
# TEST 9: Preview endpoint (no DB writes)
# ============================================================
section("TEST 9: Preview mode (no DB writes)")

# Count schedules before
count_before = supabase.schema("produccion").table("production_schedules").select(
    "id", count="exact"
).gte("start_date", "2026-01-25T00:00:00").lt("start_date", "2026-01-26T00:00:00").execute()
before_count = count_before.count if hasattr(count_before, 'count') else len(count_before.data)

preview = create_cascade_v2(
    product_id=CROISSANT_EUROPA_ID,
    start_datetime="2026-01-25T06:00:00",
    duration_hours=3.0,
    staff_count=1,
    create_in_db=False,  # PREVIEW MODE
)

if preview:
    check(preview.get("num_batches", 0) > 0, f"Preview shows {preview['num_batches']} batches")
    check(preview.get("total_units", 0) > 0, f"Preview shows {preview['total_units']} units")

    # Verify no new schedules in DB
    count_after = supabase.schema("produccion").table("production_schedules").select(
        "id", count="exact"
    ).gte("start_date", "2026-01-25T00:00:00").lt("start_date", "2026-01-26T00:00:00").execute()
    after_count = count_after.count if hasattr(count_after, 'count') else len(count_after.data)
    check(after_count == before_count, f"Preview did not create DB records ({before_count} -> {after_count})")
else:
    check(False, "Preview failed")


# ============================================================
# TEST 10: Staff count affects batch speed (not quantity)
# ============================================================
section("TEST 10: Staff count affects speed — more staff = faster batches")

# Create same product at same time with staff_count=1 (preview mode to not interfere)
preview_staff1 = create_cascade_v2(
    product_id=CROISSANT_EUROPA_ID,
    start_datetime="2026-01-26T06:00:00",
    duration_hours=4.0,
    staff_count=1,
    create_in_db=False,
)

preview_staff2 = create_cascade_v2(
    product_id=CROISSANT_EUROPA_ID,
    start_datetime="2026-01-26T06:00:00",
    duration_hours=4.0,
    staff_count=2,
    create_in_db=False,
)

preview_staff4 = create_cascade_v2(
    product_id=CROISSANT_EUROPA_ID,
    start_datetime="2026-01-26T06:00:00",
    duration_hours=4.0,
    staff_count=4,
    create_in_db=False,
)

if preview_staff1 and preview_staff2 and preview_staff4:
    # Same total units: total_units = uph × staff × duration (this hasn't changed)
    units1 = preview_staff1["total_units"]
    units2 = preview_staff2["total_units"]
    units4 = preview_staff4["total_units"]
    print(f"  Staff=1: {units1} units, Staff=2: {units2} units, Staff=4: {units4} units")
    check(units2 > units1, f"More staff = more units ({units2} > {units1})")
    check(units4 > units2, f"Staff=4 units > Staff=2 ({units4} > {units2})")

    # More batches with more staff (because more total units)
    batches1 = preview_staff1["num_batches"]
    batches2 = preview_staff2["num_batches"]
    batches4 = preview_staff4["num_batches"]
    print(f"  Staff=1: {batches1} batches, Staff=2: {batches2} batches, Staff=4: {batches4} batches")
    check(batches2 >= batches1, f"Staff=2 batches >= Staff=1 ({batches2} >= {batches1})")

    # Note: cascade_end times differ because more staff = more units = more batches
    # queuing in downstream WCs. The KEY test is batch duration (TEST 11).
    # Here we verify the formula: total_units scales linearly with staff
    check(units2 == units1 * 2, f"Staff=2 units = 2x Staff=1 ({units2} == {units1 * 2})")
    check(units4 == units1 * 4, f"Staff=4 units = 4x Staff=1 ({units4} == {units1 * 4})")
else:
    check(False, "Failed to create staff comparison previews")


# ============================================================
# TEST 11: Staff count makes individual batches faster
# ============================================================
section("TEST 11: Staff count — batch duration verification via DB")

# Create two real cascades with different staff counts at different times to compare
result_s1 = create_cascade_v2(
    product_id=CROISSANT_EUROPA_ID,
    start_datetime="2026-01-26T06:00:00",
    duration_hours=2.0,
    staff_count=1,
    create_in_db=True,
)

result_s2 = create_cascade_v2(
    product_id=CROISSANT_EUROPA_ID,
    start_datetime="2026-01-27T06:00:00",
    duration_hours=2.0,
    staff_count=3,
    create_in_db=True,
)

if result_s1 and result_s2:
    order_s1 = result_s1["production_order_number"]
    order_s2 = result_s2["production_order_number"]

    sch_s1 = get_schedules(order_s1)
    sch_s2 = get_schedules(order_s2)

    # Compare batch durations at the FIRST cascade level (ARMADO, non-fixed-time)
    # Staff=3 batches should be ~3x shorter than Staff=1 batches
    level1_s1 = [s for s in sch_s1 if s["cascade_level"] == 1 and s.get("batch_number") == 1]
    level1_s2 = [s for s in sch_s2 if s["cascade_level"] == 1 and s.get("batch_number") == 1]

    if level1_s1 and level1_s2:
        from datetime import datetime

        def parse_dt(s):
            return datetime.fromisoformat(s.replace('Z', '+00:00').replace('+00:00', ''))

        dur_s1 = (parse_dt(level1_s1[0]["end_date"]) - parse_dt(level1_s1[0]["start_date"])).total_seconds() / 60
        dur_s2 = (parse_dt(level1_s2[0]["end_date"]) - parse_dt(level1_s2[0]["start_date"])).total_seconds() / 60

        print(f"  Staff=1 batch 1 duration: {dur_s1:.1f} min")
        print(f"  Staff=3 batch 1 duration: {dur_s2:.1f} min")

        # batch_duration = batch_size / (uph × staff) × 60
        # Normalize by batch_size to get per-unit rate, then compare
        bs1 = level1_s1[0].get("batch_size", level1_s1[0].get("quantity", 1))
        bs2 = level1_s2[0].get("batch_size", level1_s2[0].get("quantity", 1))
        rate_s1 = dur_s1 / float(bs1) if bs1 else dur_s1  # min per unit
        rate_s2 = dur_s2 / float(bs2) if bs2 else dur_s2
        print(f"  Batch sizes: staff=1 → {bs1}, staff=3 → {bs2}")
        print(f"  Per-unit rate: staff=1 → {rate_s1:.4f} min/u, staff=3 → {rate_s2:.4f} min/u")
        if rate_s1 > 0 and rate_s2 > 0:
            ratio = rate_s1 / rate_s2
            print(f"  Per-unit rate ratio (staff1/staff3): {ratio:.2f}x (expected ~3.0x)")
            check(ratio > 2.5, f"Staff=3 per-unit ~3x faster: ratio={ratio:.2f}x (>2.5 threshold)")
            check(ratio < 4.0, f"Ratio within reasonable bounds: {ratio:.2f}x (<4.0)")
        else:
            check(False, f"Invalid durations: s1={dur_s1}, s2={dur_s2}")
    else:
        print(f"  Level 1 schedules: s1={len(level1_s1)}, s2={len(level1_s2)}")
        check(False, "Could not find level 1 batch 1 for comparison")

    # Check that fixed-time operations are NOT affected by staff
    # Find a schedule at a level that uses usa_tiempo_fijo (e.g., FERMENTACION)
    # Both should have same duration at fixed-time WCs regardless of staff
    fermentacion_id = "24ca8a6a-dbad-4543-8750-3f3ac1b2b764"
    ferm_s1 = [s for s in sch_s1 if s["resource_id"] == fermentacion_id and s.get("batch_number") == 1]
    ferm_s2 = [s for s in sch_s2 if s["resource_id"] == fermentacion_id and s.get("batch_number") == 1]

    if ferm_s1 and ferm_s2:
        dur_ferm_s1 = (parse_dt(ferm_s1[0]["end_date"]) - parse_dt(ferm_s1[0]["start_date"])).total_seconds() / 60
        dur_ferm_s2 = (parse_dt(ferm_s2[0]["end_date"]) - parse_dt(ferm_s2[0]["start_date"])).total_seconds() / 60
        print(f"  FERMENTACION staff=1: {dur_ferm_s1:.1f} min")
        print(f"  FERMENTACION staff=3: {dur_ferm_s2:.1f} min")
        check(abs(dur_ferm_s1 - dur_ferm_s2) < 1.0,
              f"Fixed-time WC unaffected by staff ({dur_ferm_s1:.1f} vs {dur_ferm_s2:.1f} min)")
    else:
        print(f"  Fermentacion schedules: s1={len(ferm_s1)}, s2={len(ferm_s2)}")
        print("  (Skipping fixed-time check - FERMENTACION not found for this product)")

    print_schedules_summary(sch_s1, f"Staff=1 schedules (order #{order_s1})")
    print_schedules_summary(sch_s2, f"Staff=3 schedules (order #{order_s2})")
else:
    check(False, "Failed to create staff comparison cascades")


# ============================================================
# TEST 12: Delete all and verify clean state
# ============================================================
section("TEST 12: Mass deletion + verification")

# Get all unique PT order numbers in January only
all_jan = supabase.schema("produccion").table("production_schedules").select(
    "production_order_number, produced_for_order_number"
).gte("start_date", "2026-01-01T00:00:00").lt(
    "start_date", "2026-02-01T00:00:00"
).execute()

unique_orders = set()
pt_order_nums = set()
for s in (all_jan.data or []):
    if s.get("production_order_number"):
        unique_orders.add(s["production_order_number"])
        if s.get("produced_for_order_number") is None:
            pt_order_nums.add(s["production_order_number"])

print(f"  Found {len(unique_orders)} unique orders ({len(pt_order_nums)} PTs)")

# Delete each PT order
deleted_total = 0
for order_num in sorted(pt_order_nums):
    del_r = delete_cascade(order_num)
    if del_r:
        deleted_total += del_r["deleted_count"]
        print(f"    Deleted order #{order_num}: {del_r['deleted_count']} schedules")

print(f"  Deleted {deleted_total} total schedules across {len(pt_order_nums)} PT orders")

# Verify clean (January only)
remaining = supabase.schema("produccion").table("production_schedules").select(
    "id"
).gte("start_date", "2026-01-01T00:00:00").lt(
    "start_date", "2026-02-01T00:00:00"
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

print(f"\n  ⏱️  V2 Performance:")
print(f"    Total V2 RPC calls: {total_v2_calls}")
print(f"    Total V2 time: {total_v2_time_ms}ms")
if total_v2_calls > 0:
    print(f"    Average per call: {total_v2_time_ms // total_v2_calls}ms")

if test_results["failed"] == 0:
    print(f"\n  🎉 ALL V2 TESTS PASSED!")
else:
    print(f"\n  ⚠️  Some tests failed. Review output above.")
    sys.exit(1)
