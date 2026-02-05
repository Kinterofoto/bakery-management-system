"""Production cascade endpoints for creating cascaded production schedules."""

import logging
import math
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Header

from ....core.supabase import get_supabase_client
from ....models.production import (
    CreateCascadeRequest,
    CascadePreviewRequest,
    CascadeScheduleResponse,
    CascadePreviewResponse,
    ProductionOrderDetail,
    DeleteCascadeResponse,
    BatchInfo,
    WorkCenterSchedule,
    ProcessingType,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def get_user_id_from_token(authorization: Optional[str]) -> Optional[str]:
    """Extract user_id from JWT token."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        import jwt
        token = authorization.replace("Bearer ", "")
        decoded = jwt.decode(token, options={"verify_signature": False})
        return decoded.get("sub")
    except Exception:
        return None


def is_parallel_processing(work_center: dict) -> bool:
    """Determine if a work center uses parallel processing based on cart capacity."""
    tipo_capacidad = work_center.get("tipo_capacidad")
    capacidad_carros = work_center.get("capacidad_maxima_carros") or 0
    return tipo_capacidad == "carros" and capacidad_carros > 1


def is_hybrid_processing(work_center: dict) -> bool:
    """Determine if a work center uses hybrid processing.

    Hybrid mode: sequential within same reference, parallel between references.
    Only applies to non-parallel work centers with permite_paralelo_por_referencia=True.
    """
    if is_parallel_processing(work_center):
        return False  # Already fully parallel, no need for hybrid
    return bool(work_center.get("permite_paralelo_por_referencia"))


def get_processing_mode(work_center: dict) -> str:
    """Get the processing mode for a work center.

    Returns: 'parallel', 'hybrid', or 'sequential'
    """
    if is_parallel_processing(work_center):
        return "parallel"
    if is_hybrid_processing(work_center):
        return "hybrid"
    return "sequential"


def calculate_batch_duration_minutes(
    productivity: Optional[dict],
    batch_size: float,
    default_minutes: float = 60
) -> float:
    """Calculate how long a batch takes to process at a work center."""
    if not productivity:
        return default_minutes

    if productivity.get("usa_tiempo_fijo"):
        return float(productivity.get("tiempo_minimo_fijo") or default_minutes)

    units_per_hour = float(productivity.get("units_per_hour") or 1)
    if units_per_hour <= 0:
        return default_minutes

    hours = batch_size / units_per_hour
    return hours * 60


def distribute_units_into_batches(total_units: float, lote_minimo: float) -> List[float]:
    """Distribute total units into batches, using full lote_minimo sizes.

    Creates batches of lote_minimo size, with remainder in the last batch.
    Example: total_units=250, lote_minimo=100 -> [100, 100, 50]
    """
    if total_units <= 0:
        return [0]
    if lote_minimo <= 0:
        lote_minimo = 100  # Default

    # Calculate full batches and remainder
    num_full_batches = int(total_units // lote_minimo)
    remainder = total_units % lote_minimo

    # Create batches: full batches + remainder if exists
    batches = [lote_minimo] * num_full_batches
    if remainder > 0:
        batches.append(remainder)

    # Edge case: if total_units < lote_minimo, return single batch
    if not batches:
        batches = [total_units]

    return batches


async def get_product_route(supabase, product_id: str) -> List[dict]:
    """Get production route for a product, ordered by sequence."""
    result = supabase.schema("produccion").table("production_routes").select(
        "*, work_center:work_centers(*)"
    ).eq("product_id", product_id).eq("is_active", True).order("sequence_order").execute()

    return result.data or []


async def get_productivity(
    supabase,
    product_id: str,
    work_center_id: str,
    operation_id: Optional[str] = None
) -> Optional[dict]:
    """Get productivity parameters for a product at a work center.

    Productivity can be defined by:
    1. product_id + work_center_id (direct mapping)
    2. product_id + operation_id (via work center's operation)
    """
    # First try direct work_center_id match
    result = supabase.schema("produccion").table("production_productivity").select(
        "*"
    ).eq("product_id", product_id).eq("work_center_id", work_center_id).execute()

    if result.data:
        return result.data[0]

    # If no direct match and we have operation_id, try by operation
    if operation_id:
        result = supabase.schema("produccion").table("production_productivity").select(
            "*"
        ).eq("product_id", product_id).eq("operation_id", operation_id).execute()

        if result.data:
            return result.data[0]

    return None


def parse_datetime_str(dt_str: str) -> datetime:
    """Parse datetime string, removing timezone suffix."""
    if dt_str.endswith('+00:00'):
        dt_str = dt_str.replace('+00:00', '')
    elif dt_str.endswith('Z'):
        dt_str = dt_str.replace('Z', '')
    return datetime.fromisoformat(dt_str)


async def get_existing_schedules_with_arrival(
    supabase,
    work_center_id: str,
    week_start_datetime: datetime,
    week_end_datetime: datetime
) -> List[dict]:
    """Get all existing schedules in a work center with their arrival times.

    For each schedule, fetches the cascade_source to calculate arrival time.
    Arrival time = source schedule end_date + rest_time (from BOM).
    Returns schedules with arrival_time for queue recalculation.
    """
    # Get schedules with their source info
    result = supabase.schema("produccion").table("production_schedules").select(
        "id, start_date, end_date, cascade_source_id, product_id, quantity, "
        "cascade_level, batch_number, total_batches, batch_size, status, "
        "production_order_number, week_plan_id"
    ).eq(
        "resource_id", work_center_id
    ).gte(
        "start_date", week_start_datetime.isoformat()
    ).lt(
        "start_date", week_end_datetime.isoformat()
    ).execute()

    schedules = []
    for s in (result.data or []):
        schedule = {
            "id": s["id"],
            "start_date": parse_datetime_str(s["start_date"]),
            "end_date": parse_datetime_str(s["end_date"]),
            "cascade_source_id": s.get("cascade_source_id"),
            "product_id": s["product_id"],
            "quantity": s["quantity"],
            "cascade_level": s.get("cascade_level", 0),
            "batch_number": s.get("batch_number"),
            "total_batches": s.get("total_batches"),
            "batch_size": s.get("batch_size"),
            "status": s.get("status"),
            "production_order_number": s.get("production_order_number"),
            "week_plan_id": s.get("week_plan_id"),
            "is_existing": True,
            "duration_minutes": (parse_datetime_str(s["end_date"]) - parse_datetime_str(s["start_date"])).total_seconds() / 60,
        }

        # Calculate arrival time from source schedule
        if s.get("cascade_source_id"):
            # Get source schedule with its work center info
            source_result = supabase.schema("produccion").table("production_schedules").select(
                "end_date, resource_id"
            ).eq("id", s["cascade_source_id"]).single().execute()

            if source_result.data:
                source_end = parse_datetime_str(source_result.data["end_date"])
                source_wc_id = source_result.data["resource_id"]

                # Get operation_id from source work center to look up rest_time
                rest_time_hours = 0.0
                wc_result = supabase.schema("produccion").table("work_centers").select(
                    "operation_id"
                ).eq("id", source_wc_id).single().execute()

                if wc_result.data and wc_result.data.get("operation_id"):
                    # Get rest_time from BOM for this product/operation
                    bom_result = supabase.schema("produccion").table("bill_of_materials").select(
                        "tiempo_reposo_horas"
                    ).eq("product_id", s["product_id"]).eq(
                        "operation_id", wc_result.data["operation_id"]
                    ).not_.is_("tiempo_reposo_horas", "null").execute()

                    if bom_result.data:
                        rest_time_hours = float(bom_result.data[0].get("tiempo_reposo_horas") or 0)

                schedule["arrival_time"] = source_end + timedelta(hours=rest_time_hours)
            else:
                # Source not found, use current start as arrival
                schedule["arrival_time"] = schedule["start_date"]
        else:
            # No source (first step), arrival = start
            schedule["arrival_time"] = schedule["start_date"]

        schedules.append(schedule)

    return schedules


def recalculate_queue_times(
    all_schedules: List[dict],
) -> List[dict]:
    """Recalculate start/end times for all schedules based on arrival order.

    Sorts all schedules by arrival_time and assigns sequential processing times.
    Returns the schedules with updated start_date and end_date.
    """
    if not all_schedules:
        return []

    # Sort by arrival time
    sorted_schedules = sorted(all_schedules, key=lambda x: x["arrival_time"])

    # Assign times sequentially
    queue_end = None
    for schedule in sorted_schedules:
        arrival = schedule["arrival_time"]
        duration = schedule["duration_minutes"]

        # Start time is max(arrival, queue_end)
        if queue_end is None or arrival >= queue_end:
            start_time = arrival
        else:
            start_time = queue_end

        end_time = start_time + timedelta(minutes=duration)

        schedule["new_start_date"] = start_time
        schedule["new_end_date"] = end_time
        queue_end = end_time

    return sorted_schedules


def recalculate_queue_times_hybrid(
    all_schedules: List[dict],
) -> List[dict]:
    """Recalculate times with per-reference sequential, inter-reference parallel.

    Within the same production_order_number: batches process sequentially (FIFO).
    Between different production_order_numbers: batches can overlap (parallel).
    """
    if not all_schedules:
        return []

    # Group schedules by production_order_number
    groups: Dict[Any, List[dict]] = {}
    for schedule in all_schedules:
        key = schedule.get("production_order_number")
        if key not in groups:
            groups[key] = []
        groups[key].append(schedule)

    # Within each group, sort by arrival_time and assign sequential times
    for key, group_schedules in groups.items():
        sorted_group = sorted(group_schedules, key=lambda x: x["arrival_time"])
        queue_end = None
        for schedule in sorted_group:
            arrival = schedule["arrival_time"]
            duration = schedule["duration_minutes"]

            # Start time is max(arrival, queue_end)
            if queue_end is None or arrival >= queue_end:
                start_time = arrival
            else:
                start_time = queue_end

            end_time = start_time + timedelta(minutes=duration)

            schedule["new_start_date"] = start_time
            schedule["new_end_date"] = end_time
            queue_end = end_time

    # Sort by new_start_date for consistent ordering
    result = sorted(all_schedules, key=lambda x: x["new_start_date"])
    return result


async def get_rest_time_hours(supabase, product_id: str, operation_id: str) -> float:
    """Get rest time from BOM for an operation (tiempo_reposo_horas)."""
    if not operation_id:
        return 0

    result = supabase.schema("produccion").table("bill_of_materials").select(
        "tiempo_reposo_horas"
    ).eq("product_id", product_id).eq(
        "operation_id", operation_id
    ).not_.is_("tiempo_reposo_horas", "null").execute()

    if result.data:
        return float(result.data[0].get("tiempo_reposo_horas") or 0)
    return 0


# === BACKWARD CASCADE FUNCTIONS (NEW - DO NOT MODIFY FORWARD CASCADE) ===


async def get_rest_time_from_route(supabase, product_id: str, work_center_id: str) -> float:
    """Get rest time from production_routes for this work center.

    This is a NEW function for backward cascade. Forward cascade continues
    using get_rest_time_hours() which reads from BOM.
    """
    result = supabase.schema("produccion").table("production_routes").select(
        "tiempo_reposo_horas"
    ).eq("product_id", product_id).eq("work_center_id", work_center_id).execute()

    if result.data and len(result.data) > 0:
        return float(result.data[0].get("tiempo_reposo_horas") or 0)
    return 0


async def get_pp_ingredients(supabase, product_id: str) -> List[dict]:
    """Get PP ingredients from BOM for a product.

    Returns list of PP materials with their quantities and operations.
    """
    # Get BOM entries
    result = supabase.schema("produccion").table("bill_of_materials").select(
        "material_id, quantity_needed, operation_id, tiempo_reposo_horas"
    ).eq("product_id", product_id).eq("is_active", True).execute()

    pp_materials = []
    for item in (result.data or []):
        # Fetch material info separately
        material = supabase.table("products").select(
            "id, name, category, lote_minimo"
        ).eq("id", item["material_id"]).single().execute()

        if material.data and material.data.get("category") == "PP":
            item["material"] = material.data
            pp_materials.append(item)

    return pp_materials


def calculate_pp_quantity(pt_batch_size: float, bom_quantity: float) -> float:
    """Calculate how much PP is needed for a PT batch.

    Args:
        pt_batch_size: Number of PT units in batch
        bom_quantity: Quantity from BOM (normalized if recipe_by_grams)

    Returns:
        Required PP units
    """
    return pt_batch_size * bom_quantity


def check_circular_dependency(supabase, product_id: str, visited: set = None) -> bool:
    """Check if product has circular PP dependencies.

    Args:
        supabase: Supabase client
        product_id: Product to check
        visited: Set of already visited product IDs

    Returns:
        True if circular dependency detected, False otherwise
    """
    if visited is None:
        visited = set()

    if product_id in visited:
        return True

    visited.add(product_id)

    # Get PP ingredients synchronously (not async)
    import asyncio
    pp_ingredients = asyncio.run(get_pp_ingredients(supabase, product_id))

    for pp in pp_ingredients:
        if check_circular_dependency(supabase, pp["material"]["id"], visited.copy()):
            return True

    return False


async def get_product(supabase, product_id: str) -> dict:
    """Get product information by ID."""
    result = supabase.table("products").select(
        "id, name, category, lote_minimo, is_recipe_by_grams"
    ).eq("id", product_id).single().execute()

    if not result.data:
        raise HTTPException(404, f"Product {product_id} not found")

    return result.data


async def calculate_pp_start_time(
    supabase,
    pt_product_id: str,
    pt_start_datetime: datetime,
    pt_duration_hours: float,
    pt_staff_count: int,
    pt_lote_minimo: float,
    pp_material: dict,
    pp_route: List[dict],
    required_pp_quantity: float,
) -> datetime:
    """Calculate when PP production should start for just-in-time delivery.

    Logic:
    1. PT batches are distributed over pt_duration_hours
    2. PP batches are produced continuously
    3. Last PP batch (+rest) must arrive exactly when last PT batch needs it
    4. This accounts for different production rates (PP vs PT consumption)

    Args:
        supabase: Supabase client
        pt_product_id: The PT product ID
        pt_start_datetime: When PT production starts
        pt_duration_hours: How long PT produces
        pt_staff_count: Staff count on PT
        pt_lote_minimo: PT batch size
        pp_material: PP material info from BOM
        pp_route: Production route for PP
        required_pp_quantity: Total PP units needed

    Returns:
        Calculated start datetime for PP production
    """
    # 1. Calculate PT timeline
    # Get PT productivity to calculate total units
    pt_route = await get_product_route(supabase, pt_product_id)
    if not pt_route:
        raise HTTPException(400, f"No production route for PT product {pt_product_id}")

    first_wc = pt_route[0].get("work_center") or {}
    pt_productivity = await get_productivity(
        supabase, pt_product_id, pt_route[0]["work_center_id"], first_wc.get("operation_id")
    )

    if not pt_productivity:
        raise HTTPException(400, f"No productivity for PT product {pt_product_id}")

    # Calculate PT total units
    if pt_productivity.get("usa_tiempo_fijo"):
        pt_total_units = pt_lote_minimo * pt_staff_count * pt_duration_hours
    else:
        units_per_hour = float(pt_productivity.get("units_per_hour") or 1)
        pt_total_units = units_per_hour * pt_staff_count * pt_duration_hours

    # Split PT into batches
    pt_batches = distribute_units_into_batches(pt_total_units, pt_lote_minimo)
    pt_num_batches = len(pt_batches)

    # Time when LAST PT batch starts (distributed over duration_hours)
    if pt_num_batches > 1:
        pt_last_batch_offset = (pt_duration_hours / pt_num_batches) * (pt_num_batches - 1)
    else:
        pt_last_batch_offset = 0

    pt_last_batch_start = pt_start_datetime + timedelta(hours=pt_last_batch_offset)

    # 2. Calculate PP timeline
    pp_product = await get_product(supabase, pp_material["material"]["id"])
    pp_lote_minimo = float(pp_product.get("lote_minimo") or 100)
    pp_batches = distribute_units_into_batches(required_pp_quantity, pp_lote_minimo)

    # Calculate total time for PP from first batch start to last batch end
    pp_total_time = timedelta(0)

    for operation in pp_route:
        # Time for all batches in this operation
        for batch_size in pp_batches:
            productivity = await get_productivity(
                supabase, pp_product["id"], operation["work_center_id"]
            )
            batch_duration = calculate_batch_duration_minutes(productivity, batch_size)
            pp_total_time += timedelta(minutes=batch_duration)

        # Add rest time after this operation (NEW: from production_routes)
        rest_time_hours = await get_rest_time_from_route(
            supabase, pp_product["id"], operation["work_center_id"]
        )
        pp_total_time += timedelta(hours=rest_time_hours)

    # 3. Get final rest time before PT can use PP
    # This is the tiempo_reposo from PT's BOM for the operation that consumes this PP
    final_rest_time_hours = float(pp_material.get("tiempo_reposo_horas") or 0)

    # 4. Calculate PP start time
    # FORMULA: PP_last_batch_END + rest_time = PT_last_batch_START
    # Therefore: PP_last_batch_END = PT_last_batch_START - rest_time
    # And: PP_start = PP_last_batch_END - pp_total_time
    # Simplified: PP_start = PT_last_batch_START - rest_time - pp_total_time
    pp_start_datetime = pt_last_batch_start - timedelta(hours=final_rest_time_hours) - pp_total_time

    logger.info(
        f"PP sync calculation: PT last batch @ {pt_last_batch_start}, "
        f"PP total time {pp_total_time}, rest {final_rest_time_hours}h, "
        f"PP starts @ {pp_start_datetime}"
    )

    return pp_start_datetime


async def generate_backward_cascade_recursive(
    supabase,
    pp_material_id: str,
    required_quantity: float,
    parent_start_datetime: datetime,
    parent_duration_hours: float,
    parent_staff_count: int,
    parent_lote_minimo: float,
    parent_total_units: float,
    bom_rest_time_hours: float,
    create_in_db: bool = True,
    depth: int = 0,
    max_depth: int = 10,
    week_start_datetime: Optional[datetime] = None,
    week_end_datetime: Optional[datetime] = None,
    produced_for_order_number: Optional[int] = None,
    week_plan_id: Optional[str] = None,
    parent_last_batch_start_actual: Optional[datetime] = None,
) -> List[dict]:
    """Recursively generate backward cascades for PP dependencies.

    Uses batch-by-batch synchronization: last PP batch must be ready
    exactly when parent's last batch needs it.

    Args:
        pp_material_id: The PP product to produce
        required_quantity: Total PP units needed
        parent_start_datetime: When parent production starts
        parent_duration_hours: How long parent produces (for batch timing)
        parent_staff_count: Staff on parent (affects batch distribution)
        parent_lote_minimo: Parent's batch size
        parent_total_units: Parent's total production
        bom_rest_time_hours: Rest time between PP finish and parent use
        produced_for_order_number: PT order number (for tracking)
        create_in_db: Whether to create schedules in DB
        depth: Current recursion depth
        max_depth: Maximum recursion depth
        week_start_datetime: Week boundary start
        week_end_datetime: Week boundary end
        week_plan_id: Optional week plan ID

    Returns:
        List of all created cascade results (for PP and nested PPs)
    """
    if depth > max_depth:
        raise HTTPException(400, f"Max recursion depth exceeded (possible circular dependency)")

    logger.info(f"[Depth {depth}] Generating backward cascade for PP {pp_material_id}, qty {required_quantity}")

    # 1. Get PP route and product info
    pp_route = await get_product_route(supabase, pp_material_id)
    if not pp_route:
        raise HTTPException(400, f"No production route for PP product {pp_material_id}")

    pp_product = await get_product(supabase, pp_material_id)
    pp_lote_minimo = float(pp_product.get("lote_minimo") or 100)

    # 2. Calculate PP start time: synchronize with LAST batch of parent
    # The last PP batch should finish when the last parent batch starts

    # Use actual parent_last_batch_start if provided (from DB after PT creation)
    # Otherwise calculate it (fallback for nested PP recursion)
    if parent_last_batch_start_actual is not None:
        parent_last_batch_start = parent_last_batch_start_actual
        parent_batches = distribute_units_into_batches(parent_total_units, parent_lote_minimo)
        parent_num_batches = len(parent_batches)
        logger.info(
            f"[Depth {depth}] Using actual parent last batch start: {parent_last_batch_start}"
        )
    else:
        # Fallback: calculate based on distribution (for nested PP recursion)
        parent_batches = distribute_units_into_batches(parent_total_units, parent_lote_minimo)
        parent_num_batches = len(parent_batches)

        if parent_num_batches > 1:
            # Parent batches are distributed over parent_duration_hours
            parent_last_batch_offset = (parent_duration_hours / parent_num_batches) * (parent_num_batches - 1)
        else:
            parent_last_batch_offset = 0

        parent_last_batch_start = parent_start_datetime + timedelta(hours=parent_last_batch_offset)

        logger.info(
            f"[Depth {depth}] Parent has {parent_num_batches} batches, "
            f"last batch starts at {parent_last_batch_start} (calculated)"
        )

    # Calculate total time needed for PP production with queue simulation
    # For SEQUENTIAL work centers, batches queue up and we need to track actual end times
    pp_batches_temp = distribute_units_into_batches(required_quantity, pp_lote_minimo)
    num_pp_batches = len(pp_batches_temp)

    # Track when each batch finishes at each work center (relative to pp_start)
    # Initialize with zeros for "arrival" at first work center
    batch_finish_times = [timedelta(0)] * num_pp_batches

    pp_total_processing_time = timedelta(0)  # Just processing, no rest
    total_rest_time = timedelta(0)

    for idx, operation in enumerate(pp_route):
        wc = operation.get("work_center") or {}
        is_parallel = is_parallel_processing(wc)
        productivity = await get_productivity(
            supabase, pp_material_id, operation["work_center_id"], wc.get("operation_id")
        )

        # Calculate batch durations at this work center
        batch_durations = [
            timedelta(minutes=calculate_batch_duration_minutes(productivity, size))
            for size in pp_batches_temp
        ]

        if is_parallel:
            # PARALLEL: batches process simultaneously, only longest batch matters
            max_duration = max(batch_durations)
            for i in range(num_pp_batches):
                # All batches arrive at prev finish time, all finish after max_duration
                batch_finish_times[i] = batch_finish_times[i] + max_duration
        else:
            # SEQUENTIAL: batches queue and process one at a time
            queue_end = timedelta(0)  # Track when the machine becomes free
            new_finish_times = []
            for i in range(num_pp_batches):
                arrival = batch_finish_times[i]  # When batch arrives from previous WC
                # Batch starts when machine is free AND batch has arrived
                start = max(arrival, queue_end)
                finish = start + batch_durations[i]
                new_finish_times.append(finish)
                queue_end = finish  # Machine busy until this batch finishes
            batch_finish_times = new_finish_times

        # Get rest time after this operation
        rest_time_hours = await get_rest_time_from_route(
            supabase, pp_material_id, operation["work_center_id"]
        )
        rest_delta = timedelta(hours=rest_time_hours)
        total_rest_time += rest_delta

        # Add rest time to all batch finish times (they need to rest before next WC)
        batch_finish_times = [t + rest_delta for t in batch_finish_times]

        logger.debug(
            f"[Depth {depth}] WC {wc.get('name', 'unknown')} ({'PARALLEL' if is_parallel else 'SEQUENTIAL'}): "
            f"last batch finishes at {batch_finish_times[-1]}"
        )

    # Total time is when the LAST batch finishes (including all rest times)
    pp_total_time = batch_finish_times[-1]

    # Add final rest time before parent can use PP (from BOM)
    pp_total_time += timedelta(hours=bom_rest_time_hours)

    # PP must finish before parent's LAST batch starts
    # FORMULA: PP_end + rest_time = parent_last_batch_start
    # Therefore: PP_start = parent_last_batch_start - pp_total_time
    pp_start_datetime = parent_last_batch_start - pp_total_time

    logger.info(
        f"[Depth {depth}] PP total time: {pp_total_time} (queue-simulated for {num_pp_batches} batches), "
        f"PP starts at {pp_start_datetime} to finish before parent last batch at {parent_last_batch_start}"
    )

    # 3. Check if this PP has nested PP ingredients
    nested_pp_ingredients = await get_pp_ingredients(supabase, pp_material_id)

    # 4. If nested PPs exist, recurse first
    nested_results = []
    if nested_pp_ingredients:
        logger.info(f"[Depth {depth}] PP {pp_product['name']} has {len(nested_pp_ingredients)} nested PP ingredients")

        # For recursion: this PP becomes the "parent"
        # Calculate PP's production parameters
        first_wc_productivity = await get_productivity(
            supabase, pp_material_id, pp_route[0]["work_center_id"]
        )

        pp_staff_count = 1  # Default

        # Calculate duration for THIS PP based on its required quantity
        if first_wc_productivity and first_wc_productivity.get("usa_tiempo_fijo"):
            num_batches = math.ceil(required_quantity / pp_lote_minimo)
            tiempo_fijo = float(first_wc_productivity.get("tiempo_minimo_fijo") or 60)
            pp_duration_hours = (num_batches * tiempo_fijo) / 60.0
        elif first_wc_productivity:
            units_per_hour = float(first_wc_productivity.get("units_per_hour") or 1)
            pp_duration_hours = required_quantity / (units_per_hour * pp_staff_count)
        else:
            pp_duration_hours = 2.0  # Fallback

        for nested_pp in nested_pp_ingredients:
            nested_quantity = calculate_pp_quantity(required_quantity, nested_pp["quantity_needed"])
            nested_rest_time = float(nested_pp.get("tiempo_reposo_horas") or 0)

            nested_cascade = await generate_backward_cascade_recursive(
                supabase=supabase,
                pp_material_id=nested_pp["material"]["id"],
                required_quantity=nested_quantity,
                parent_start_datetime=pp_start_datetime,
                parent_duration_hours=pp_duration_hours,
                parent_staff_count=pp_staff_count,
                parent_lote_minimo=pp_lote_minimo,
                parent_total_units=required_quantity,
                bom_rest_time_hours=nested_rest_time,
                create_in_db=create_in_db,
                depth=depth + 1,
                max_depth=max_depth,
                week_start_datetime=week_start_datetime,
                week_end_datetime=week_end_datetime,
                produced_for_order_number=produced_for_order_number,
                week_plan_id=week_plan_id,
            )
            nested_results.extend(nested_cascade)

    # 5. Calculate PP duration based on required quantity
    # Get productivity for first work center of PP
    first_wc_productivity = await get_productivity(
        supabase, pp_material_id, pp_route[0]["work_center_id"]
    )

    pp_staff_count = 1  # Default, could be parameterized

    # Calculate duration needed to produce required_quantity
    if first_wc_productivity and first_wc_productivity.get("usa_tiempo_fijo"):
        # Fixed time: duration depends on number of batches
        num_batches = math.ceil(required_quantity / pp_lote_minimo)
        tiempo_fijo = float(first_wc_productivity.get("tiempo_minimo_fijo") or 60)
        pp_duration_hours = (num_batches * tiempo_fijo) / 60.0
    elif first_wc_productivity:
        # Variable time: duration = quantity / (productivity × staff)
        units_per_hour = float(first_wc_productivity.get("units_per_hour") or 1)
        pp_duration_hours = required_quantity / (units_per_hour * pp_staff_count)
    else:
        # No productivity configured - estimate based on required quantity
        # Assume 1 batch per hour
        num_batches = math.ceil(required_quantity / pp_lote_minimo)
        pp_duration_hours = num_batches * 1.0
        logger.warning(f"No productivity for PP {pp_product['name']}, using fallback: {pp_duration_hours}h")

    logger.info(
        f"[Depth {depth}] Creating forward cascade for PP {pp_product['name']} "
        f"starting at {pp_start_datetime}, required qty: {required_quantity}, duration: {pp_duration_hours}h"
    )

    pp_cascade_result = await generate_cascade_schedules(
        supabase=supabase,
        product_id=pp_material_id,
        product_name=pp_product["name"],
        start_datetime=pp_start_datetime,
        duration_hours=pp_duration_hours,
        staff_count=pp_staff_count,
        lote_minimo=pp_lote_minimo,
        production_route=pp_route,
        create_in_db=create_in_db,
        week_start_datetime=week_start_datetime,
        week_end_datetime=week_end_datetime,
        produced_for_order_number=produced_for_order_number,
        week_plan_id=week_plan_id,
        fixed_total_units=required_quantity,  # Use exact quantity needed
    )

    # 7. Return all results (nested + current)
    return nested_results + [pp_cascade_result]


async def generate_cascade_schedules(
    supabase,
    product_id: str,
    product_name: str,
    start_datetime: datetime,
    duration_hours: float,
    staff_count: int,
    lote_minimo: float,
    production_route: List[dict],
    create_in_db: bool = True,
    week_plan_id: Optional[str] = None,
    week_start_datetime: Optional[datetime] = None,
    week_end_datetime: Optional[datetime] = None,
    produced_for_order_number: Optional[int] = None,
    fixed_total_units: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Generate cascade schedules for a product through all work centers.

    Args:
        supabase: Supabase client
        product_id: Product to produce
        product_name: Product name for response
        start_datetime: When to start production
        duration_hours: How long to produce at source
        staff_count: Number of staff available
        lote_minimo: Minimum batch size
        production_route: Ordered list of work centers
        create_in_db: Whether to actually insert schedules
        week_plan_id: Optional weekly plan ID
        week_start_datetime: Start of week boundary for queue calculations
        week_end_datetime: End of week boundary for queue calculations
        fixed_total_units: If provided, use this instead of calculating from productivity

    Returns:
        Dictionary with cascade results
    """
    if not production_route:
        raise HTTPException(400, f"No production route defined for product {product_id}")

    # Ensure start_datetime is timezone-naive to avoid comparison issues
    if start_datetime.tzinfo is not None:
        start_datetime = start_datetime.replace(tzinfo=None)

    # Get first work center (source - typically Armado)
    first_step = production_route[0]
    source_wc = first_step.get("work_center") or {}
    source_wc_id = first_step["work_center_id"]

    # Get productivity for source work center
    source_productivity = await get_productivity(
        supabase, product_id, source_wc_id, source_wc.get("operation_id")
    )
    if not source_productivity:
        raise HTTPException(
            400,
            f"No productivity parameters for product at work center {source_wc.get('name', source_wc_id)}"
        )

    # Calculate total units to produce
    if fixed_total_units is not None:
        # Use fixed quantity (for backward cascade with required quantity)
        total_units = fixed_total_units
    elif source_productivity.get("usa_tiempo_fijo"):
        # Fixed time operation - calculate based on cycles possible
        total_units = lote_minimo * staff_count * (duration_hours / 1)  # Simplified
    else:
        units_per_hour = float(source_productivity.get("units_per_hour") or 1)
        total_units = units_per_hour * staff_count * duration_hours

    # Split into batches
    batch_sizes = distribute_units_into_batches(total_units, lote_minimo)
    num_batches = len(batch_sizes)

    # Get next production order number if creating
    production_order_number = None
    if create_in_db:
        order_result = supabase.schema("produccion").rpc(
            "get_next_production_order_number", {}
        ).execute()
        production_order_number = order_result.data

    # Track all created schedules by work center
    work_center_schedules: Dict[str, WorkCenterSchedule] = {}
    previous_batch_schedules: List[dict] = []
    all_batches: List[BatchInfo] = []
    total_schedules_created = 0
    cascade_start = start_datetime
    cascade_end = start_datetime

    # Process each work center in the route
    for route_step in production_route:
        wc = route_step.get("work_center") or {}
        wc_id = route_step["work_center_id"]
        wc_name = wc.get("name", f"WC-{wc_id[:8]}")
        cascade_level = route_step["sequence_order"]

        # Determine processing type
        processing_mode = get_processing_mode(wc)
        is_parallel = processing_mode == "parallel"
        is_hybrid = processing_mode == "hybrid"
        if processing_mode == "parallel":
            processing_type = ProcessingType.PARALLEL
        elif processing_mode == "hybrid":
            processing_type = ProcessingType.HYBRID
        else:
            processing_type = ProcessingType.SEQUENTIAL

        # Get productivity for this work center (by operation_id)
        wc_productivity = await get_productivity(
            supabase, product_id, wc_id, wc.get("operation_id")
        )

        # Get rest time from BOM
        rest_time_hours = await get_rest_time_hours(
            supabase, product_id, wc.get("operation_id")
        )

        # Initialize work center schedule tracking
        wc_batches: List[BatchInfo] = []
        current_batch_schedules: List[dict] = []
        wc_earliest_start = None
        wc_latest_end = None

        # For SEQUENTIAL or HYBRID work centers, use queue recalculation
        # SEQUENTIAL: global FIFO queue (all batches share one queue)
        # HYBRID: per-reference queue (batches from different references run in parallel)
        if (not is_parallel) and week_start_datetime and week_end_datetime:
            # Get existing schedules with their arrival times
            existing_schedules = await get_existing_schedules_with_arrival(
                supabase, wc_id, week_start_datetime, week_end_datetime
            )
            logger.info(f"Work center {wc_name} has {len(existing_schedules)} existing schedules")

            # Prepare new batches with their arrival times
            new_batches = []
            for batch_idx, batch_size in enumerate(batch_sizes):
                batch_number = batch_idx + 1
                batch_duration_minutes = calculate_batch_duration_minutes(
                    wc_productivity, batch_size
                )

                # Calculate arrival time
                if previous_batch_schedules:
                    # From previous step
                    prev_schedule = previous_batch_schedules[batch_idx]
                    prev_end = prev_schedule["end_date"]
                    if isinstance(prev_end, str):
                        prev_end = prev_end.replace("+00:00", "").replace("Z", "")
                        prev_end = datetime.fromisoformat(prev_end)
                    elif prev_end.tzinfo is not None:
                        prev_end = prev_end.replace(tzinfo=None)

                    arrival_time = prev_end + timedelta(hours=rest_time_hours)
                    cascade_source_id = prev_schedule["id"]
                else:
                    # First work center SEQUENTIAL: all batches arrive at start_datetime
                    # They will queue sequentially
                    arrival_time = start_datetime
                    cascade_source_id = None

                new_batches.append({
                    "id": None,  # Will be generated
                    "is_existing": False,
                    "arrival_time": arrival_time,
                    "duration_minutes": batch_duration_minutes,
                    "batch_number": batch_number,
                    "batch_size": batch_size,
                    "cascade_source_id": cascade_source_id,
                    "production_order_number": production_order_number,  # For hybrid mode grouping
                })

            # Combine existing and new, then recalculate
            all_schedules = existing_schedules + new_batches
            if is_hybrid:
                # HYBRID: per-reference queue (different references run in parallel)
                recalculated = recalculate_queue_times_hybrid(all_schedules)
                logger.info(f"Work center {wc_name} using HYBRID mode - per-reference queue")
            else:
                # SEQUENTIAL: global FIFO queue
                recalculated = recalculate_queue_times(all_schedules)

            # FOUR-PHASE UPDATE to avoid overlap constraint violations:
            # Phase 0: Clean parking area (remove schedules left from failed attempts)
            # Phase 1: Park existing schedules outside the week temporarily (week_end + 1 day)
            # Phase 2: Insert all new schedules at their correct positions
            # Phase 3: Move existing schedules from parking back to their final positions
            if create_in_db:
                existing_to_update = [
                    s for s in recalculated
                    if s.get("is_existing") and (
                        s["new_start_date"] != s["start_date"] or
                        s["new_end_date"] != s["end_date"]
                    )
                ]

                # Phase 0: Clean parking area first (remove any schedules left from failed attempts)
                # Delete any schedules in this work center that are after week_end
                supabase.schema("produccion").table("production_schedules").delete().eq(
                    "resource_id", wc_id
                ).gte(
                    "start_date", week_end_datetime.isoformat()
                ).execute()
                logger.info(f"Phase 0: Cleaned parking area for work center {wc_name}")

                # Phase 1: Park existing schedules just after the week end (out of the way)
                # Use week_end + 1 day as parking area to avoid overlap during reorganization
                parking_start = week_end_datetime + timedelta(days=1)
                for schedule in existing_to_update:
                    parking_end = parking_start + timedelta(minutes=schedule["duration_minutes"])
                    supabase.schema("produccion").table(
                        "production_schedules"
                    ).update({
                        "start_date": parking_start.isoformat(),
                        "end_date": parking_end.isoformat(),
                    }).eq("id", schedule["id"]).execute()
                    logger.info(f"Phase 1: Parked schedule {schedule['id']} at {parking_start}")
                    # Next schedule starts where this one ended
                    parking_start = parking_end

            # Phase 2: Insert all new schedules at their correct positions
            for schedule in recalculated:
                if not schedule.get("is_existing"):
                    batch_start = schedule["new_start_date"]
                    batch_end = schedule["new_end_date"]
                    batch_number = schedule["batch_number"]
                    batch_size = schedule["batch_size"]
                    batch_duration_minutes = schedule["duration_minutes"]

                    schedule_data = {
                        "production_order_number": production_order_number,
                        "resource_id": wc_id,
                        "product_id": product_id,
                        "quantity": int(batch_size),
                        "start_date": batch_start.isoformat(),
                        "end_date": batch_end.isoformat(),
                        "cascade_level": cascade_level,
                        "cascade_source_id": schedule["cascade_source_id"],
                        "batch_number": batch_number,
                        "total_batches": num_batches,
                        "batch_size": float(batch_size),
                        "status": "scheduled",
                        "produced_for_order_number": produced_for_order_number,
                        "cascade_type": "backward" if produced_for_order_number else "forward",
                    }

                    if week_plan_id:
                        schedule_data["week_plan_id"] = week_plan_id

                    if create_in_db:
                        schedule_id = str(uuid.uuid4())
                        schedule_data["id"] = schedule_id
                        supabase.schema("produccion").table(
                            "production_schedules"
                        ).insert(schedule_data).execute()
                        total_schedules_created += 1
                    else:
                        schedule_data["id"] = f"preview-{wc_id}-{batch_number}"

                    current_batch_schedules.append(schedule_data)

                    # Track earliest/latest
                    if wc_earliest_start is None or batch_start < wc_earliest_start:
                        wc_earliest_start = batch_start
                    if wc_latest_end is None or batch_end > wc_latest_end:
                        wc_latest_end = batch_end
                    if batch_end > cascade_end:
                        cascade_end = batch_end

                    # Create BatchInfo
                    batch_info = BatchInfo(
                        batch_number=batch_number,
                        batch_size=float(batch_size),
                        start_date=batch_start,
                        end_date=batch_end,
                        work_center_id=wc_id,
                        work_center_name=wc_name,
                        cascade_level=cascade_level,
                        processing_type=processing_type,
                        duration_minutes=batch_duration_minutes,
                    )
                    wc_batches.append(batch_info)
                    all_batches.append(batch_info)

            # Phase 3: Move existing schedules from parking to their final positions
            if create_in_db and existing_to_update:
                for schedule in existing_to_update:
                    batch_start = schedule["new_start_date"]
                    batch_end = schedule["new_end_date"]
                    supabase.schema("produccion").table(
                        "production_schedules"
                    ).update({
                        "start_date": batch_start.isoformat(),
                        "end_date": batch_end.isoformat(),
                    }).eq("id", schedule["id"]).execute()
                    logger.info(f"Phase 3: Moved schedule {schedule['id']} to final position {batch_start}")

        else:
            # Original logic for first work center or parallel processing
            for batch_idx, batch_size in enumerate(batch_sizes):
                batch_number = batch_idx + 1

                # Calculate batch duration
                batch_duration_minutes = calculate_batch_duration_minutes(
                    wc_productivity, batch_size
                )

                # Determine start time
                if not previous_batch_schedules:
                    # First operation (source) - distribute batches across duration
                    batch_offset_hours = (duration_hours / num_batches) * batch_idx
                    batch_start = start_datetime + timedelta(hours=batch_offset_hours)
                else:
                    # Parallel processing - start immediately on arrival
                    prev_schedule = previous_batch_schedules[batch_idx]
                    prev_end = prev_schedule["end_date"]
                    if isinstance(prev_end, str):
                        prev_end = prev_end.replace("+00:00", "").replace("Z", "")
                        prev_end = datetime.fromisoformat(prev_end)
                    elif prev_end.tzinfo is not None:
                        prev_end = prev_end.replace(tzinfo=None)
                    batch_start = prev_end + timedelta(hours=rest_time_hours)

                batch_end = batch_start + timedelta(minutes=batch_duration_minutes)

                # Track earliest/latest for work center
                if wc_earliest_start is None or batch_start < wc_earliest_start:
                    wc_earliest_start = batch_start
                if wc_latest_end is None or batch_end > wc_latest_end:
                    wc_latest_end = batch_end

                # Track overall cascade timing
                if batch_end > cascade_end:
                    cascade_end = batch_end

                # Create schedule data
                schedule_data = {
                    "production_order_number": production_order_number,
                    "resource_id": wc_id,
                    "product_id": product_id,
                    "quantity": int(batch_size),
                    "start_date": batch_start.isoformat(),
                    "end_date": batch_end.isoformat(),
                    "cascade_level": cascade_level,
                    "cascade_source_id": previous_batch_schedules[batch_idx]["id"] if previous_batch_schedules else None,
                    "batch_number": batch_number,
                    "total_batches": num_batches,
                    "batch_size": float(batch_size),
                    "status": "scheduled",
                    "produced_for_order_number": produced_for_order_number,
                    "cascade_type": "backward" if produced_for_order_number else "forward",
                }

                if week_plan_id:
                    schedule_data["week_plan_id"] = week_plan_id

                # Insert if creating
                if create_in_db:
                    # Generate UUID for the schedule
                    schedule_id = str(uuid.uuid4())
                    schedule_data["id"] = schedule_id

                    supabase.schema("produccion").table(
                        "production_schedules"
                    ).insert(schedule_data).execute()
                    total_schedules_created += 1
                else:
                    # Generate fake ID for preview
                    schedule_data["id"] = f"preview-{wc_id}-{batch_number}"

                current_batch_schedules.append(schedule_data)

                # Create BatchInfo for response
                batch_info = BatchInfo(
                    batch_number=batch_number,
                    batch_size=float(batch_size),
                    start_date=batch_start,
                    end_date=batch_end,
                    work_center_id=wc_id,
                    work_center_name=wc_name,
                    cascade_level=cascade_level,
                    processing_type=processing_type,
                    duration_minutes=batch_duration_minutes,
                )
                wc_batches.append(batch_info)
                all_batches.append(batch_info)

        # Store work center schedule
        wc_total_duration = sum(b.duration_minutes for b in wc_batches)
        work_center_schedules[wc_id] = WorkCenterSchedule(
            work_center_id=wc_id,
            work_center_name=wc_name,
            cascade_level=cascade_level,
            processing_type=processing_type,
            batches=wc_batches,
            total_duration_minutes=wc_total_duration,
            earliest_start=wc_earliest_start,
            latest_end=wc_latest_end,
        )

        # Update previous for next iteration
        previous_batch_schedules = current_batch_schedules

    return {
        "production_order_number": production_order_number,
        "product_id": product_id,
        "product_name": product_name,
        "total_units": total_units,
        "lote_minimo": lote_minimo,
        "num_batches": num_batches,
        "schedules_created": total_schedules_created,
        "work_centers": list(work_center_schedules.values()),
        "cascade_start": cascade_start,
        "cascade_end": cascade_end,
        "all_batches": all_batches,
    }


@router.post("/create", response_model=CascadeScheduleResponse)
async def create_cascade_production(
    request: CreateCascadeRequest,
    authorization: Optional[str] = Header(None),
):
    """
    Create a cascaded production schedule.

    Uses the product's production_routes to determine all work centers.
    The cascade always starts from the FIRST work center in the route,
    regardless of which work_center_id is passed in the request.

    The production quantity is calculated as: units_per_hour × staff_count × duration_hours
    Then split into minimum batches (lote_minimo) which cascade through the route.
    """
    logger.info(f"Creating cascade production for product {request.product_id}")
    supabase = get_supabase_client()
    user_id = get_user_id_from_token(authorization)

    try:
        # Get product with lote_minimo
        product_result = supabase.table("products").select(
            "id, name, lote_minimo"
        ).eq("id", request.product_id).single().execute()

        if not product_result.data:
            raise HTTPException(404, f"Product {request.product_id} not found")

        product = product_result.data
        lote_minimo = float(product.get("lote_minimo") or 100)

        # Get production route - this defines ALL work centers for the cascade
        production_route = await get_product_route(supabase, request.product_id)

        if not production_route:
            raise HTTPException(
                400,
                f"No production route defined for product {product['name']}. "
                "Please configure production routes first."
            )

        # Log the route being used
        route_names = [step.get("work_center", {}).get("name", "?") for step in production_route]
        logger.info(f"Using production route: {' -> '.join(route_names)}")

        # Calculate week boundaries (Saturday 22:00 to Saturday 22:00)
        # Production week starts Saturday at 22:00 (T1 of Sunday starts then)
        start_dt = request.start_datetime
        if start_dt.tzinfo is not None:
            start_dt = start_dt.replace(tzinfo=None)
        # Find the Saturday at 22:00 that starts this week
        # weekday(): Monday=0, Saturday=5, Sunday=6
        days_since_saturday = (start_dt.weekday() - 5) % 7  # Days since last Saturday
        week_start = start_dt - timedelta(days=days_since_saturday)
        week_start = week_start.replace(hour=22, minute=0, second=0, microsecond=0)
        # If start_datetime is before 22:00 on Saturday, go back to previous Saturday
        if start_dt < week_start:
            week_start = week_start - timedelta(days=7)
        week_end = week_start + timedelta(days=7)

        # Generate cascade schedules (starts from first work center in route)
        result = await generate_cascade_schedules(
            supabase=supabase,
            product_id=request.product_id,
            product_name=product["name"],
            start_datetime=request.start_datetime,
            duration_hours=request.duration_hours,
            staff_count=request.staff_count,
            lote_minimo=lote_minimo,
            production_route=production_route,
            create_in_db=True,
            week_plan_id=request.week_plan_id,
            week_start_datetime=week_start,
            week_end_datetime=week_end,
        )

        logger.info(
            f"Created cascade order #{result['production_order_number']} "
            f"with {result['schedules_created']} schedules"
        )

        # NEW: After PT cascade is created, check for PP dependencies
        pp_ingredients = await get_pp_ingredients(supabase, request.product_id)

        pp_cascades = []
        if pp_ingredients:
            logger.info(f"Found {len(pp_ingredients)} PP ingredients, generating backward cascades")

            # Get the ACTUAL start_date of the last batch of PT's first work center
            # This is more accurate than calculating with uniform distribution
            first_wc_id = production_route[0]["work_center_id"]
            pt_last_batch_query = supabase.schema("produccion").table("production_schedules").select(
                "start_date, batch_number"
            ).eq(
                "production_order_number", result["production_order_number"]
            ).eq(
                "resource_id", first_wc_id
            ).order("batch_number", desc=True).limit(1).execute()

            pt_last_batch_start_actual = None
            if pt_last_batch_query.data:
                pt_last_batch_start_str = pt_last_batch_query.data[0]["start_date"]
                pt_last_batch_start_actual = parse_datetime_str(pt_last_batch_start_str)
                logger.info(f"PT last batch (first WC) actual start: {pt_last_batch_start_actual}")

            for pp_material in pp_ingredients:
                try:
                    # Calculate required PP quantity (total for all PT batches)
                    required_pp_quantity = calculate_pp_quantity(
                        result["total_units"], pp_material["quantity_needed"]
                    )

                    # Get rest time from BOM
                    bom_rest_time_hours = float(pp_material.get("tiempo_reposo_horas") or 0)

                    logger.info(
                        f"Creating backward cascade for PP {pp_material['material']['name']}, "
                        f"qty {required_pp_quantity}"
                    )

                    # Generate recursive backward cascade for this PP
                    pp_cascade_results = await generate_backward_cascade_recursive(
                        supabase=supabase,
                        pp_material_id=pp_material["material"]["id"],
                        required_quantity=required_pp_quantity,
                        parent_start_datetime=request.start_datetime,
                        parent_duration_hours=request.duration_hours,
                        parent_staff_count=request.staff_count,
                        parent_lote_minimo=lote_minimo,
                        parent_total_units=result["total_units"],
                        bom_rest_time_hours=bom_rest_time_hours,
                        create_in_db=True,
                        week_start_datetime=week_start,
                        week_end_datetime=week_end,
                        produced_for_order_number=result["production_order_number"],
                        week_plan_id=request.week_plan_id,
                        parent_last_batch_start_actual=pt_last_batch_start_actual,
                    )
                    pp_cascades.extend(pp_cascade_results)

                    logger.info(
                        f"Successfully created backward cascade for PP {pp_material['material']['name']}"
                    )

                except Exception as e:
                    logger.warning(
                        f"Failed to create PP cascade for {pp_material['material']['name']}: {e}",
                        exc_info=True
                    )
                    # Continue with other PPs even if one fails

        # Include PP cascade info in response
        result["pp_dependencies"] = pp_cascades

        return CascadeScheduleResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to create cascade production")
        raise HTTPException(500, f"Failed to create cascade: {str(e)}")


@router.post("/preview", response_model=CascadePreviewResponse)
async def preview_cascade_production(request: CascadePreviewRequest):
    """
    Preview a cascade without creating schedules.

    Returns what schedules would be created, allowing the user
    to validate before committing.
    """
    logger.info(f"Previewing cascade for product {request.product_id}")
    supabase = get_supabase_client()

    try:
        # Get product
        product_result = supabase.table("products").select(
            "id, name, lote_minimo"
        ).eq("id", request.product_id).single().execute()

        if not product_result.data:
            raise HTTPException(404, f"Product {request.product_id} not found")

        product = product_result.data
        lote_minimo = float(product.get("lote_minimo") or 100)

        # Get production route
        production_route = await get_product_route(supabase, request.product_id)

        warnings = []
        if not production_route:
            warnings.append("No production route defined - using default single work center")

        # Calculate week boundaries (Saturday 22:00 to Saturday 22:00)
        start_dt = request.start_datetime
        if start_dt.tzinfo is not None:
            start_dt = start_dt.replace(tzinfo=None)
        days_since_saturday = (start_dt.weekday() - 5) % 7
        week_start = start_dt - timedelta(days=days_since_saturday)
        week_start = week_start.replace(hour=22, minute=0, second=0, microsecond=0)
        if start_dt < week_start:
            week_start = week_start - timedelta(days=7)
        week_end = week_start + timedelta(days=7)

        # Generate preview (no DB insert)
        result = await generate_cascade_schedules(
            supabase=supabase,
            product_id=request.product_id,
            product_name=product["name"],
            start_datetime=request.start_datetime,
            duration_hours=request.duration_hours,
            staff_count=request.staff_count,
            lote_minimo=lote_minimo,
            production_route=production_route,
            create_in_db=False,
            week_start_datetime=week_start,
            week_end_datetime=week_end,
        )

        return CascadePreviewResponse(
            product_id=result["product_id"],
            product_name=result["product_name"],
            total_units=result["total_units"],
            lote_minimo=result["lote_minimo"],
            num_batches=result["num_batches"],
            work_centers=result["work_centers"],
            cascade_start=result["cascade_start"],
            cascade_end=result["cascade_end"],
            warnings=warnings,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to preview cascade")
        raise HTTPException(500, f"Failed to preview: {str(e)}")


@router.get("/order/{order_number}", response_model=ProductionOrderDetail)
async def get_cascade_order(order_number: int):
    """
    Get all schedules for a production order.

    Returns the complete cascade tree for visualization.
    """
    logger.info(f"Getting cascade order #{order_number}")
    supabase = get_supabase_client()

    try:
        # Use the RPC function
        result = supabase.schema("produccion").rpc(
            "get_production_order_schedules",
            {"p_order_number": order_number}
        ).execute()

        if not result.data:
            raise HTTPException(404, f"Production order #{order_number} not found")

        schedules = result.data

        # Extract summary info from first schedule
        first_schedule = schedules[0]
        total_units = sum(s.get("quantity", 0) for s in schedules if s.get("cascade_level") == 0)
        num_batches = max(s.get("batch_number", 1) for s in schedules)

        return ProductionOrderDetail(
            production_order_number=order_number,
            product_id=first_schedule.get("product_id", ""),
            product_name=first_schedule.get("product_name"),
            total_units=float(total_units),
            num_batches=num_batches,
            status=first_schedule.get("status", "scheduled"),
            schedules=schedules,
            created_at=first_schedule.get("start_date"),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to get cascade order #{order_number}")
        raise HTTPException(500, f"Failed to get order: {str(e)}")


@router.delete("/order/{order_number}", response_model=DeleteCascadeResponse)
async def delete_cascade_order(
    order_number: int,
    authorization: Optional[str] = Header(None),
):
    """
    Delete all schedules for a production order.

    Removes the entire cascade tree.
    """
    logger.info(f"Deleting cascade order #{order_number}")
    supabase = get_supabase_client()
    user_id = get_user_id_from_token(authorization)

    try:
        # Use the existing delete function
        result = supabase.schema("produccion").rpc(
            "delete_production_order",
            {"order_number": order_number}
        ).execute()

        deleted_count = result.data if result.data else 0

        if deleted_count == 0:
            raise HTTPException(404, f"Production order #{order_number} not found or already deleted")

        logger.info(f"Deleted {deleted_count} schedules for order #{order_number}")

        return DeleteCascadeResponse(
            production_order_number=order_number,
            deleted_count=deleted_count,
            message=f"Successfully deleted {deleted_count} schedules"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to delete cascade order #{order_number}")
        raise HTTPException(500, f"Failed to delete order: {str(e)}")
