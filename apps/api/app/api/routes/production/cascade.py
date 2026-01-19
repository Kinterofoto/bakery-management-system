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
    """Distribute total units into batches of minimum size."""
    if total_units <= 0:
        return [0]
    if lote_minimo <= 0:
        lote_minimo = 100  # Default

    num_batches = max(1, math.ceil(total_units / lote_minimo))
    batch_size = total_units / num_batches

    # Create list of batch sizes (all equal)
    return [batch_size] * num_batches


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
    if source_productivity.get("usa_tiempo_fijo"):
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
        is_parallel = is_parallel_processing(wc)
        processing_type = ProcessingType.PARALLEL if is_parallel else ProcessingType.SEQUENTIAL

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

        # For SEQUENTIAL work centers with previous batches, use queue recalculation
        if not is_parallel and previous_batch_schedules and week_start_datetime and week_end_datetime:
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

                # Calculate arrival time from previous step
                prev_schedule = previous_batch_schedules[batch_idx]
                prev_end = prev_schedule["end_date"]
                if isinstance(prev_end, str):
                    prev_end = prev_end.replace("+00:00", "").replace("Z", "")
                    prev_end = datetime.fromisoformat(prev_end)
                elif prev_end.tzinfo is not None:
                    prev_end = prev_end.replace(tzinfo=None)

                arrival_time = prev_end + timedelta(hours=rest_time_hours)

                new_batches.append({
                    "id": None,  # Will be generated
                    "is_existing": False,
                    "arrival_time": arrival_time,
                    "duration_minutes": batch_duration_minutes,
                    "batch_number": batch_number,
                    "batch_size": batch_size,
                    "cascade_source_id": prev_schedule["id"],
                })

            # Combine existing and new, then recalculate
            all_schedules = existing_schedules + new_batches
            recalculated = recalculate_queue_times(all_schedules)

            # IMPORTANT: Process in two passes to avoid overlap constraint violations
            # Pass 1: Update ALL existing schedules first (move them to new positions)
            # Update in DESCENDING order of new_start_date to avoid conflicts
            # (last one first, so it moves out of the way)
            if create_in_db:
                existing_to_update = [
                    s for s in recalculated
                    if s.get("is_existing") and (
                        s["new_start_date"] != s["start_date"] or
                        s["new_end_date"] != s["end_date"]
                    )
                ]
                # Sort by new_start_date descending (last first)
                existing_to_update.sort(key=lambda x: x["new_start_date"], reverse=True)

                for schedule in existing_to_update:
                    batch_start = schedule["new_start_date"]
                    batch_end = schedule["new_end_date"]
                    supabase.schema("produccion").table(
                        "production_schedules"
                    ).update({
                        "start_date": batch_start.isoformat(),
                        "end_date": batch_end.isoformat(),
                    }).eq("id", schedule["id"]).execute()
                    logger.info(f"Updated existing schedule {schedule['id']} to {batch_start} - {batch_end}")

            # Pass 2: Insert all new schedules
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
