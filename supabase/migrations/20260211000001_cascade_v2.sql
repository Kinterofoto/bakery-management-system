-- Migration: Cascade V2 - Full PL/pgSQL port of cascade.py
-- Moves all cascade logic server-side for ~25x performance improvement
-- V1 (Python/FastAPI) remains as fallback

-- ============================================================
-- HELPER 1: Distribute units into batches
-- Equivalent to Python: distribute_units_into_batches()
-- ============================================================
CREATE OR REPLACE FUNCTION produccion._cascade_v2_distribute_batches(
    p_total numeric,
    p_lote_minimo numeric
) RETURNS numeric[]
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
    v_lote numeric;
    v_num_full int;
    v_remainder numeric;
    v_batches numeric[];
BEGIN
    IF p_total <= 0 THEN
        RETURN ARRAY[0::numeric];
    END IF;

    v_lote := CASE WHEN p_lote_minimo <= 0 THEN 100 ELSE p_lote_minimo END;
    v_num_full := floor(p_total / v_lote)::int;
    v_remainder := p_total - (v_num_full * v_lote);

    -- Build array of full batches
    IF v_num_full > 0 THEN
        SELECT array_agg(v_lote) INTO v_batches
        FROM generate_series(1, v_num_full);
    ELSE
        v_batches := ARRAY[]::numeric[];
    END IF;

    -- Add remainder if exists
    IF v_remainder > 0 THEN
        v_batches := v_batches || v_remainder;
    END IF;

    -- Edge case: empty array means total < lote_minimo
    IF array_length(v_batches, 1) IS NULL OR array_length(v_batches, 1) = 0 THEN
        v_batches := ARRAY[p_total];
    END IF;

    RETURN v_batches;
END;
$$;

-- ============================================================
-- HELPER 2: Calculate batch duration in minutes
-- Equivalent to Python: calculate_batch_duration_minutes() + get_productivity()
-- ============================================================
CREATE OR REPLACE FUNCTION produccion._cascade_v2_batch_duration(
    p_product_id text,
    p_wc_id text,
    p_operation_id uuid,
    p_batch_size numeric,
    p_default_minutes numeric DEFAULT 60
) RETURNS numeric
LANGUAGE plpgsql STABLE
AS $$
DECLARE
    v_prod record;
    v_uph numeric;
BEGIN
    -- Try direct work_center_id match first
    SELECT usa_tiempo_fijo, tiempo_minimo_fijo, units_per_hour
    INTO v_prod
    FROM produccion.production_productivity
    WHERE product_id::text = p_product_id
      AND work_center_id::text = p_wc_id
    LIMIT 1;

    -- Fallback to operation_id match
    IF v_prod IS NULL AND p_operation_id IS NOT NULL THEN
        SELECT usa_tiempo_fijo, tiempo_minimo_fijo, units_per_hour
        INTO v_prod
        FROM produccion.production_productivity
        WHERE product_id::text = p_product_id
          AND operation_id = p_operation_id
        LIMIT 1;
    END IF;

    IF v_prod IS NULL THEN
        RETURN p_default_minutes;
    END IF;

    IF v_prod.usa_tiempo_fijo THEN
        RETURN COALESCE(v_prod.tiempo_minimo_fijo, p_default_minutes);
    END IF;

    v_uph := COALESCE(v_prod.units_per_hour, 1);
    IF v_uph <= 0 THEN
        RETURN p_default_minutes;
    END IF;

    RETURN (p_batch_size / v_uph) * 60;
END;
$$;

-- ============================================================
-- HELPER 3: Get blocked periods as datetime ranges
-- Equivalent to Python: get_blocked_shifts()
-- Returns parallel arrays for start/end times
-- ============================================================
CREATE OR REPLACE FUNCTION produccion._cascade_v2_blocked_periods(
    p_wc_id text,
    p_start_date timestamptz,
    p_end_date timestamptz,
    OUT block_starts timestamptz[],
    OUT block_ends timestamptz[]
) RETURNS record
LANGUAGE plpgsql STABLE
AS $$
DECLARE
    r record;
    v_base date;
    v_s timestamptz;
    v_e timestamptz;
    v_starts timestamptz[] := ARRAY[]::timestamptz[];
    v_ends timestamptz[] := ARRAY[]::timestamptz[];
BEGIN
    FOR r IN
        SELECT sb.date, sb.shift_number
        FROM produccion.shift_blocking sb
        WHERE sb.work_center_id::text = p_wc_id
          AND sb.date >= (p_start_date::date - 1)
          AND sb.date <= (p_end_date::date + 1)
        ORDER BY sb.date, sb.shift_number
    LOOP
        v_base := r.date;
        IF r.shift_number = 1 THEN
            -- T1: previous day 22:00 -> this day 06:00
            v_s := (v_base - interval '1 day')::date + interval '22 hours';
            v_e := v_base::timestamptz + interval '6 hours';
        ELSIF r.shift_number = 2 THEN
            -- T2: 06:00 -> 14:00
            v_s := v_base::timestamptz + interval '6 hours';
            v_e := v_base::timestamptz + interval '14 hours';
        ELSE
            -- T3: 14:00 -> 22:00
            v_s := v_base::timestamptz + interval '14 hours';
            v_e := v_base::timestamptz + interval '22 hours';
        END IF;
        v_starts := v_starts || v_s;
        v_ends := v_ends || v_e;
    END LOOP;

    block_starts := v_starts;
    block_ends := v_ends;
END;
$$;

-- ============================================================
-- HELPER 4: Skip blocked periods
-- Equivalent to Python: skip_blocked_periods()
-- ============================================================
CREATE OR REPLACE FUNCTION produccion._cascade_v2_skip_blocked(
    p_start_ts timestamptz,
    p_duration_min numeric,
    p_block_starts timestamptz[],
    p_block_ends timestamptz[]
) RETURNS timestamptz
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
    v_start timestamptz := p_start_ts;
    v_end timestamptz;
    v_moved boolean;
    v_max_iter int;
    v_iter int := 0;
    v_len int;
    i int;
BEGIN
    IF p_block_starts IS NULL OR array_length(p_block_starts, 1) IS NULL THEN
        RETURN v_start;
    END IF;

    v_len := array_length(p_block_starts, 1);
    v_max_iter := v_len * 2 + 1;
    v_end := v_start + (p_duration_min * interval '1 minute');

    WHILE v_iter < v_max_iter LOOP
        v_moved := false;
        FOR i IN 1..v_len LOOP
            -- If start is inside blocked period
            IF p_block_starts[i] <= v_start AND v_start < p_block_ends[i] THEN
                v_start := p_block_ends[i];
                v_end := v_start + (p_duration_min * interval '1 minute');
                v_moved := true;
                EXIT;
            END IF;
            -- If batch spans into blocked period
            IF v_start < p_block_starts[i] AND p_block_starts[i] < v_end THEN
                v_start := p_block_ends[i];
                v_end := v_start + (p_duration_min * interval '1 minute');
                v_moved := true;
                EXIT;
            END IF;
        END LOOP;

        IF NOT v_moved THEN
            EXIT;
        END IF;
        v_iter := v_iter + 1;
    END LOOP;

    RETURN v_start;
END;
$$;

-- ============================================================
-- HELPER 5: Recalculate queue times (sequential + hybrid)
-- Equivalent to Python: recalculate_queue_times() and recalculate_queue_times_hybrid()
-- Input/output as jsonb arrays of schedule objects
-- ============================================================
CREATE OR REPLACE FUNCTION produccion._cascade_v2_recalculate_queue(
    p_schedules jsonb,
    p_block_starts timestamptz[],
    p_block_ends timestamptz[],
    p_is_hybrid boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_result jsonb := '[]'::jsonb;
    v_sorted jsonb;
    v_schedule jsonb;
    v_arrival timestamptz;
    v_duration numeric;
    v_start timestamptz;
    v_end timestamptz;
    v_queue_end timestamptz;
    v_key text;
    v_groups jsonb := '{}'::jsonb;
    v_group_keys text[];
    v_group_schedules jsonb;
    i int;
BEGIN
    IF p_schedules IS NULL OR jsonb_array_length(p_schedules) = 0 THEN
        RETURN '[]'::jsonb;
    END IF;

    IF p_is_hybrid THEN
        -- HYBRID: group by production_order_number, sequential within group
        -- Build groups
        FOR i IN 0..jsonb_array_length(p_schedules) - 1 LOOP
            v_schedule := p_schedules->i;
            v_key := COALESCE(v_schedule->>'production_order_number', '__null__');
            IF v_groups ? v_key THEN
                v_groups := jsonb_set(v_groups, ARRAY[v_key],
                    (v_groups->v_key) || jsonb_build_array(v_schedule));
            ELSE
                v_groups := jsonb_set(v_groups, ARRAY[v_key],
                    jsonb_build_array(v_schedule));
            END IF;
        END LOOP;

        -- Process each group sequentially
        FOR v_key IN SELECT jsonb_object_keys(v_groups) LOOP
            -- Sort group by arrival_time
            SELECT jsonb_agg(elem ORDER BY (elem->>'arrival_time')::timestamptz)
            INTO v_group_schedules
            FROM jsonb_array_elements(v_groups->v_key) elem;

            v_queue_end := NULL;
            FOR i IN 0..jsonb_array_length(v_group_schedules) - 1 LOOP
                v_schedule := v_group_schedules->i;
                v_arrival := (v_schedule->>'arrival_time')::timestamptz;
                v_duration := (v_schedule->>'duration_minutes')::numeric;

                IF v_queue_end IS NULL OR v_arrival >= v_queue_end THEN
                    v_start := v_arrival;
                ELSE
                    v_start := v_queue_end;
                END IF;

                -- Skip blocked periods
                IF p_block_starts IS NOT NULL AND array_length(p_block_starts, 1) > 0 THEN
                    v_start := produccion._cascade_v2_skip_blocked(
                        v_start, v_duration, p_block_starts, p_block_ends);
                END IF;

                v_end := v_start + (v_duration * interval '1 minute');

                v_schedule := v_schedule || jsonb_build_object(
                    'new_start_date', v_start::text,
                    'new_end_date', v_end::text
                );
                v_result := v_result || jsonb_build_array(v_schedule);
                v_queue_end := v_end;
            END LOOP;
        END LOOP;

        -- Sort final result by new_start_date
        SELECT jsonb_agg(elem ORDER BY (elem->>'new_start_date')::timestamptz)
        INTO v_result
        FROM jsonb_array_elements(v_result) elem;

    ELSE
        -- SEQUENTIAL: global FIFO by arrival_time
        SELECT jsonb_agg(elem ORDER BY (elem->>'arrival_time')::timestamptz)
        INTO v_sorted
        FROM jsonb_array_elements(p_schedules) elem;

        v_queue_end := NULL;
        FOR i IN 0..jsonb_array_length(v_sorted) - 1 LOOP
            v_schedule := v_sorted->i;
            v_arrival := (v_schedule->>'arrival_time')::timestamptz;
            v_duration := (v_schedule->>'duration_minutes')::numeric;

            IF v_queue_end IS NULL OR v_arrival >= v_queue_end THEN
                v_start := v_arrival;
            ELSE
                v_start := v_queue_end;
            END IF;

            -- Skip blocked periods
            IF p_block_starts IS NOT NULL AND array_length(p_block_starts, 1) > 0 THEN
                v_start := produccion._cascade_v2_skip_blocked(
                    v_start, v_duration, p_block_starts, p_block_ends);
            END IF;

            v_end := v_start + (v_duration * interval '1 minute');

            v_schedule := v_schedule || jsonb_build_object(
                'new_start_date', v_start::text,
                'new_end_date', v_end::text
            );
            v_result := v_result || jsonb_build_array(v_schedule);
            v_queue_end := v_end;
        END LOOP;
    END IF;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- ============================================================
-- HELPER 6: Simulate finish time for a WC
-- Equivalent to Python: simulate_wc_finish_time()
-- ============================================================
CREATE OR REPLACE FUNCTION produccion._cascade_v2_simulate_finish(
    p_new_batches jsonb,
    p_existing jsonb,
    p_block_starts timestamptz[],
    p_block_ends timestamptz[],
    p_is_hybrid boolean
) RETURNS timestamptz
LANGUAGE plpgsql
AS $$
DECLARE
    v_all jsonb;
    v_recalculated jsonb;
    v_elem jsonb;
    v_last_finish timestamptz := NULL;
    v_end timestamptz;
    i int;
BEGIN
    IF p_new_batches IS NULL OR jsonb_array_length(p_new_batches) = 0 THEN
        RETURN NULL;
    END IF;

    v_all := COALESCE(p_existing, '[]'::jsonb) || p_new_batches;
    v_recalculated := produccion._cascade_v2_recalculate_queue(
        v_all, p_block_starts, p_block_ends, p_is_hybrid);

    FOR i IN 0..jsonb_array_length(v_recalculated) - 1 LOOP
        v_elem := v_recalculated->i;
        IF (v_elem->>'is_existing')::boolean IS NOT TRUE AND v_elem ? 'new_end_date' THEN
            v_end := (v_elem->>'new_end_date')::timestamptz;
            IF v_last_finish IS NULL OR v_end > v_last_finish THEN
                v_last_finish := v_end;
            END IF;
        END IF;
    END LOOP;

    RETURN v_last_finish;
END;
$$;

-- ============================================================
-- HELPER 7: Distribute batches to multiple work centers
-- Equivalent to Python: distribute_batches_to_work_centers()
-- ============================================================
CREATE OR REPLACE FUNCTION produccion._cascade_v2_distribute_to_wcs(
    p_new_batches jsonb,
    p_wc_contexts jsonb,
    p_deadline timestamptz,
    p_is_hybrid boolean
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_num_wcs int;
    v_primary_id text;
    v_distribution jsonb := '{}'::jsonb;
    v_ctx jsonb;
    v_wc_id text;
    v_source_idx int := 0;
    v_target_idx int;
    v_source_id text;
    v_target_id text;
    v_batch jsonb;
    v_source_batches jsonb;
    v_target_batches jsonb;
    v_source_finish timestamptz;
    v_target_finish timestamptz;
    v_source_ok boolean;
    v_target_ok boolean;
    i int;
BEGIN
    IF p_new_batches IS NULL OR jsonb_array_length(p_new_batches) = 0
       OR p_wc_contexts IS NULL OR jsonb_array_length(p_wc_contexts) = 0 THEN
        RETURN '{}'::jsonb;
    END IF;

    v_num_wcs := jsonb_array_length(p_wc_contexts);
    v_primary_id := p_wc_contexts->0->>'wc_id';

    -- Initialize: all batches to primary, empty arrays for rest
    FOR i IN 0..v_num_wcs - 1 LOOP
        v_wc_id := p_wc_contexts->i->>'wc_id';
        IF v_wc_id = v_primary_id THEN
            v_distribution := jsonb_set(v_distribution, ARRAY[v_wc_id], p_new_batches);
        ELSE
            v_distribution := jsonb_set(v_distribution, ARRAY[v_wc_id], '[]'::jsonb);
        END IF;
    END LOOP;

    -- If no deadline or only 1 WC, keep all in primary
    IF p_deadline IS NULL OR v_num_wcs <= 1 THEN
        RETURN v_distribution;
    END IF;

    -- Check if primary meets deadline
    v_source_finish := produccion._cascade_v2_simulate_finish(
        v_distribution->v_primary_id,
        p_wc_contexts->0->'existing_schedules',
        ARRAY(SELECT jsonb_array_elements_text(p_wc_contexts->0->'block_starts')::timestamptz),
        ARRAY(SELECT jsonb_array_elements_text(p_wc_contexts->0->'block_ends')::timestamptz),
        p_is_hybrid
    );

    IF v_source_finish IS NULL OR v_source_finish <= p_deadline THEN
        RETURN v_distribution;
    END IF;

    -- Overflow: move batches from source end to target
    v_source_idx := 0;
    FOR v_target_idx IN 1..v_num_wcs - 1 LOOP
        v_source_id := p_wc_contexts->v_source_idx->>'wc_id';
        v_target_id := p_wc_contexts->v_target_idx->>'wc_id';

        WHILE jsonb_array_length(v_distribution->v_source_id) > 0 LOOP
            -- Pop last batch from source
            v_source_batches := v_distribution->v_source_id;
            v_batch := v_source_batches->(jsonb_array_length(v_source_batches) - 1);
            v_source_batches := v_source_batches - (jsonb_array_length(v_source_batches) - 1);
            v_distribution := jsonb_set(v_distribution, ARRAY[v_source_id], v_source_batches);

            -- Prepend to target
            v_target_batches := jsonb_build_array(v_batch) || (v_distribution->v_target_id);
            v_distribution := jsonb_set(v_distribution, ARRAY[v_target_id], v_target_batches);

            -- Simulate both
            v_source_finish := produccion._cascade_v2_simulate_finish(
                v_distribution->v_source_id,
                p_wc_contexts->v_source_idx->'existing_schedules',
                ARRAY(SELECT jsonb_array_elements_text(p_wc_contexts->v_source_idx->'block_starts')::timestamptz),
                ARRAY(SELECT jsonb_array_elements_text(p_wc_contexts->v_source_idx->'block_ends')::timestamptz),
                p_is_hybrid
            );
            v_target_finish := produccion._cascade_v2_simulate_finish(
                v_distribution->v_target_id,
                p_wc_contexts->v_target_idx->'existing_schedules',
                ARRAY(SELECT jsonb_array_elements_text(p_wc_contexts->v_target_idx->'block_starts')::timestamptz),
                ARRAY(SELECT jsonb_array_elements_text(p_wc_contexts->v_target_idx->'block_ends')::timestamptz),
                p_is_hybrid
            );

            v_source_ok := v_source_finish IS NULL OR v_source_finish <= p_deadline;
            v_target_ok := v_target_finish IS NULL OR v_target_finish <= p_deadline;

            IF v_source_ok AND v_target_ok THEN
                RETURN v_distribution;
            END IF;
        END LOOP;

        -- Source emptied, target becomes new source
        v_source_idx := v_target_idx;
    END LOOP;

    -- Best effort
    RETURN v_distribution;
END;
$$;

-- ============================================================
-- HELPER 8: Get existing schedules with arrival_time
-- Equivalent to Python: get_existing_schedules_with_arrival()
-- Uses JOINs instead of N+1 queries
-- ============================================================
CREATE OR REPLACE FUNCTION produccion._cascade_v2_get_existing_with_arrival(
    p_wc_id text,
    p_context_start timestamptz,
    p_context_end timestamptz
) RETURNS jsonb
LANGUAGE plpgsql STABLE
AS $$
DECLARE
    v_result jsonb := '[]'::jsonb;
    r record;
BEGIN
    FOR r IN
        SELECT
            ps.id,
            ps.start_date,
            ps.end_date,
            ps.cascade_source_id,
            ps.product_id,
            ps.quantity,
            ps.cascade_level,
            ps.batch_number,
            ps.total_batches,
            ps.batch_size,
            ps.status,
            ps.production_order_number,
            ps.week_plan_id,
            -- Calculate arrival_time via JOINs
            CASE
                WHEN ps.cascade_source_id IS NOT NULL THEN
                    src.end_date + COALESCE(
                        (SELECT bom.tiempo_reposo_horas * interval '1 hour'
                         FROM produccion.bill_of_materials bom
                         WHERE bom.product_id::text = ps.product_id
                           AND bom.operation_id = src_wc.operation_id
                           AND bom.tiempo_reposo_horas IS NOT NULL
                         LIMIT 1),
                        interval '0 hours'
                    )
                ELSE ps.start_date
            END AS arrival_time,
            EXTRACT(EPOCH FROM (ps.end_date - ps.start_date)) / 60.0 AS duration_minutes
        FROM produccion.production_schedules ps
        LEFT JOIN produccion.production_schedules src ON src.id = ps.cascade_source_id
        LEFT JOIN produccion.work_centers src_wc ON src_wc.id::text = src.resource_id
        WHERE ps.resource_id = p_wc_id
          AND ps.start_date >= p_context_start
          AND ps.start_date < p_context_end
        ORDER BY ps.start_date
    LOOP
        v_result := v_result || jsonb_build_array(jsonb_build_object(
            'id', r.id,
            'start_date', r.start_date,
            'end_date', r.end_date,
            'cascade_source_id', r.cascade_source_id,
            'product_id', r.product_id,
            'quantity', r.quantity,
            'cascade_level', r.cascade_level,
            'batch_number', r.batch_number,
            'total_batches', r.total_batches,
            'batch_size', r.batch_size,
            'status', r.status,
            'production_order_number', r.production_order_number,
            'week_plan_id', r.week_plan_id,
            'arrival_time', r.arrival_time,
            'duration_minutes', r.duration_minutes,
            'is_existing', true
        ));
    END LOOP;

    RETURN v_result;
END;
$$;

-- ============================================================
-- MAIN FUNCTION: generate_cascade_v2
-- Complete 1:1 port of cascade.py logic
-- ============================================================
CREATE OR REPLACE FUNCTION produccion.generate_cascade_v2(
    p_product_id        text,
    p_start_datetime    timestamptz,
    p_duration_hours    numeric,
    p_staff_count       integer DEFAULT 1,
    p_week_plan_id      uuid DEFAULT NULL,
    p_create_in_db      boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    -- Product info
    v_product_id text;
    v_product_name text;
    v_product_category text;
    v_lote_minimo numeric;

    -- Route
    v_route jsonb;
    v_route_step jsonb;
    v_route_len int;

    -- Week boundaries
    v_start_dt timestamp;
    v_days_since_sat int;
    v_week_start timestamp;
    v_week_end timestamp;
    v_context_start timestamp;
    v_context_end timestamp;

    -- Source productivity
    v_source_wc_id text;
    v_source_operation_id uuid;
    v_source_prod record;

    -- Batch calculation
    v_total_units numeric;
    v_batch_sizes numeric[];
    v_num_batches int;
    v_production_order_number int;

    -- Forward cascade loop
    v_step_idx int;
    v_wc record;
    v_wc_id text;
    v_wc_name text;
    v_cascade_level int;
    v_processing_mode text;
    v_is_parallel boolean;
    v_is_hybrid boolean;
    v_wc_productivity record;
    v_rest_time_hours numeric;
    v_operation_id uuid;

    -- Batch processing
    v_batch_idx int;
    v_batch_size numeric;
    v_batch_duration numeric;
    v_batch_start timestamp;
    v_batch_end timestamp;
    v_batch_offset_hours numeric;
    v_arrival_time timestamp;
    v_cascade_source_id uuid;
    v_schedule_id uuid;

    -- Previous step tracking
    v_previous_schedules jsonb := '[]'::jsonb;
    v_current_schedules jsonb;

    -- Queue recalculation
    v_existing_schedules jsonb;
    v_new_batches jsonb;
    v_all_schedules jsonb;
    v_recalculated jsonb;
    v_block_starts timestamptz[];
    v_block_ends timestamptz[];
    v_blocked record;

    -- Four-phase update
    v_existing_to_update jsonb;
    v_bulk_insert jsonb;
    v_parking_start timestamp;
    v_parking_end timestamp;
    v_schedule jsonb;
    v_elem jsonb;

    -- Multi-WC
    v_use_multi_wc boolean;
    v_alt_wcs jsonb;
    v_staffed_wc_ids text[];
    v_wc_contexts jsonb;
    v_distribution jsonb;
    v_first_arrival timestamp;
    v_target_date date;
    v_target_shift int;
    v_assigned_batches jsonb;
    v_multi_created jsonb;

    -- WC tracking for response
    v_wc_schedules jsonb := '{}'::jsonb;
    v_wc_batches jsonb;
    v_wc_earliest timestamp;
    v_wc_latest timestamp;

    -- Cascade timing
    v_cascade_start timestamp;
    v_cascade_end timestamp;
    v_total_created int := 0;

    -- PP backward cascade
    v_pp_ingredients jsonb;
    v_pp_mat jsonb;
    v_pp_material record;
    v_pp_route jsonb;
    v_pp_product record;
    v_pp_required_qty numeric;
    v_pp_rest_time numeric;
    v_pp_cascades jsonb := '[]'::jsonb;
    v_pp_result jsonb;
    v_pt_last_batch_start timestamp;

    -- Response
    v_response jsonb;

    -- Temp vars
    v_prev_end timestamp;
    v_tmp_text text;
    i int;
BEGIN
    -- ========================================
    -- SETUP
    -- ========================================

    -- 1. Fetch product
    SELECT id::text, name, COALESCE(lote_minimo, 100)::numeric, category
    INTO v_product_id, v_product_name, v_lote_minimo, v_product_category
    FROM public.products
    WHERE id::text = p_product_id;

    IF v_product_id IS NULL THEN
        RAISE EXCEPTION 'Product % not found', p_product_id;
    END IF;

    -- 2. Fetch production route with work centers
    SELECT jsonb_agg(
        jsonb_build_object(
            'work_center_id', pr.work_center_id::text,
            'sequence_order', pr.sequence_order,
            'wc_name', wc.name,
            'wc_operation_id', wc.operation_id,
            'wc_tipo_capacidad', wc.tipo_capacidad,
            'wc_capacidad_carros', COALESCE(wc.capacidad_maxima_carros, 0),
            'wc_permite_paralelo', COALESCE(wc.permite_paralelo_por_referencia, false)
        ) ORDER BY pr.sequence_order
    )
    INTO v_route
    FROM produccion.production_routes pr
    JOIN produccion.work_centers wc ON wc.id = pr.work_center_id
    WHERE pr.product_id::text = p_product_id
      AND pr.is_active = true;

    IF v_route IS NULL OR jsonb_array_length(v_route) = 0 THEN
        RAISE EXCEPTION 'No production route for product %', v_product_name;
    END IF;
    v_route_len := jsonb_array_length(v_route);

    -- 3. Calculate week boundaries (Saturday 22:00)
    v_start_dt := p_start_datetime AT TIME ZONE 'UTC';
    -- weekday: 0=Mon, 5=Sat, 6=Sun
    v_days_since_sat := ((EXTRACT(DOW FROM v_start_dt)::int + 1) % 7 - 6 + 7) % 7;
    -- Actually use Python's convention: Monday=0, Saturday=5
    v_days_since_sat := ((EXTRACT(ISODOW FROM v_start_dt)::int - 6 + 7) % 7);
    v_week_start := date_trunc('day', v_start_dt - (v_days_since_sat * interval '1 day'))
                    + interval '22 hours';
    IF v_start_dt < v_week_start THEN
        v_week_start := v_week_start - interval '7 days';
    END IF;
    v_week_end := v_week_start + interval '7 days';

    -- Context window ±1 week
    v_context_start := v_week_start - interval '7 days';
    v_context_end := v_week_end + interval '7 days';

    -- 4. Get source productivity
    v_source_wc_id := v_route->0->>'work_center_id';
    v_source_operation_id := (v_route->0->>'wc_operation_id')::uuid;

    -- Try direct WC match
    SELECT usa_tiempo_fijo, tiempo_minimo_fijo, units_per_hour
    INTO v_source_prod
    FROM produccion.production_productivity
    WHERE product_id::text = p_product_id
      AND work_center_id::text = v_source_wc_id
    LIMIT 1;

    IF v_source_prod IS NULL AND v_source_operation_id IS NOT NULL THEN
        SELECT usa_tiempo_fijo, tiempo_minimo_fijo, units_per_hour
        INTO v_source_prod
        FROM produccion.production_productivity
        WHERE product_id::text = p_product_id
          AND operation_id = v_source_operation_id
        LIMIT 1;
    END IF;

    IF v_source_prod IS NULL THEN
        RAISE EXCEPTION 'No productivity for product at work center %',
            (v_route->0->>'wc_name');
    END IF;

    -- 5. Calculate total units
    IF v_source_prod.usa_tiempo_fijo THEN
        v_total_units := v_lote_minimo * p_staff_count * p_duration_hours;
    ELSE
        v_total_units := COALESCE(v_source_prod.units_per_hour, 1) * p_staff_count * p_duration_hours;
    END IF;

    -- 6. Distribute into batches
    v_batch_sizes := produccion._cascade_v2_distribute_batches(v_total_units, v_lote_minimo);
    v_num_batches := array_length(v_batch_sizes, 1);

    -- 7. Get production order number
    v_production_order_number := NULL;
    IF p_create_in_db THEN
        SELECT COALESCE(MAX(production_order_number), 0) + 1
        INTO v_production_order_number
        FROM produccion.production_schedules;
    END IF;

    -- Disable conflict trigger for bulk operations
    IF p_create_in_db THEN
        ALTER TABLE produccion.production_schedules DISABLE TRIGGER check_schedule_conflict;
    END IF;

    v_cascade_start := v_start_dt;
    v_cascade_end := v_start_dt;

    -- ========================================
    -- FORWARD CASCADE
    -- ========================================

    BEGIN  -- Exception block to re-enable trigger on error

    FOR v_step_idx IN 0..v_route_len - 1 LOOP
        v_route_step := v_route->v_step_idx;
        v_wc_id := v_route_step->>'work_center_id';
        v_wc_name := v_route_step->>'wc_name';
        v_cascade_level := (v_route_step->>'sequence_order')::int;
        v_operation_id := (v_route_step->>'wc_operation_id')::uuid;

        -- Determine processing mode
        IF (v_route_step->>'wc_tipo_capacidad') = 'carros'
           AND (v_route_step->>'wc_capacidad_carros')::int > 1 THEN
            v_processing_mode := 'parallel';
        ELSIF (v_route_step->>'wc_permite_paralelo')::boolean THEN
            v_processing_mode := 'hybrid';
        ELSE
            v_processing_mode := 'sequential';
        END IF;
        v_is_parallel := (v_processing_mode = 'parallel');
        v_is_hybrid := (v_processing_mode = 'hybrid');

        -- Get rest time from BOM
        v_rest_time_hours := 0;
        IF v_operation_id IS NOT NULL THEN
            SELECT COALESCE(bom.tiempo_reposo_horas, 0)
            INTO v_rest_time_hours
            FROM produccion.bill_of_materials bom
            WHERE bom.product_id::text = p_product_id
              AND bom.operation_id = v_operation_id
              AND bom.tiempo_reposo_horas IS NOT NULL
            LIMIT 1;
            v_rest_time_hours := COALESCE(v_rest_time_hours, 0);
        END IF;

        v_current_schedules := '[]'::jsonb;
        v_wc_batches := '[]'::jsonb;
        v_wc_earliest := NULL;
        v_wc_latest := NULL;
        v_use_multi_wc := false;

        -- ---- SEQUENTIAL / HYBRID PATH ----
        IF NOT v_is_parallel THEN

            -- Get existing schedules with arrival times
            v_existing_schedules := produccion._cascade_v2_get_existing_with_arrival(
                v_wc_id, v_context_start::timestamptz, v_context_end::timestamptz);

            -- Build new batches
            v_new_batches := '[]'::jsonb;
            FOR v_batch_idx IN 1..v_num_batches LOOP
                v_batch_size := v_batch_sizes[v_batch_idx];
                v_batch_duration := produccion._cascade_v2_batch_duration(
                    p_product_id, v_wc_id, v_operation_id, v_batch_size);

                -- Calculate arrival time
                IF jsonb_array_length(v_previous_schedules) > 0 THEN
                    v_prev_end := (v_previous_schedules->(v_batch_idx - 1)->>'end_date')::timestamp;
                    v_arrival_time := v_prev_end + (v_rest_time_hours * interval '1 hour');
                    v_cascade_source_id := (v_previous_schedules->(v_batch_idx - 1)->>'id')::uuid;
                ELSE
                    v_arrival_time := v_start_dt;
                    v_cascade_source_id := NULL;
                END IF;

                v_new_batches := v_new_batches || jsonb_build_array(jsonb_build_object(
                    'id', NULL,
                    'is_existing', false,
                    'arrival_time', v_arrival_time,
                    'duration_minutes', v_batch_duration,
                    'batch_number', v_batch_idx,
                    'batch_size', v_batch_size,
                    'cascade_source_id', v_cascade_source_id,
                    'production_order_number', v_production_order_number
                ));
            END LOOP;

            -- Get blocked periods
            SELECT bp.block_starts, bp.block_ends
            INTO v_block_starts, v_block_ends
            FROM produccion._cascade_v2_blocked_periods(
                v_wc_id, v_context_start::timestamptz, v_context_end::timestamptz) bp;

            -- TODO: Multi-WC check (deadline_datetime not passed in top-level call,
            -- only in backward cascade via internal recursion)

            -- Combine and recalculate queue
            v_all_schedules := v_existing_schedules || v_new_batches;
            v_recalculated := produccion._cascade_v2_recalculate_queue(
                v_all_schedules, v_block_starts, v_block_ends, v_is_hybrid);

            -- Identify existing schedules that moved
            v_existing_to_update := '[]'::jsonb;
            v_bulk_insert := '[]'::jsonb;

            FOR i IN 0..jsonb_array_length(v_recalculated) - 1 LOOP
                v_elem := v_recalculated->i;

                IF (v_elem->>'is_existing')::boolean THEN
                    -- Check if times changed
                    IF (v_elem->>'new_start_date')::timestamptz != (v_elem->>'start_date')::timestamptz
                       OR (v_elem->>'new_end_date')::timestamptz != (v_elem->>'end_date')::timestamptz THEN
                        v_existing_to_update := v_existing_to_update || jsonb_build_array(v_elem);
                    END IF;
                ELSE
                    -- New schedule
                    v_batch_start := (v_elem->>'new_start_date')::timestamp;
                    v_batch_end := (v_elem->>'new_end_date')::timestamp;

                    IF p_create_in_db THEN
                        v_schedule_id := gen_random_uuid();
                    ELSE
                        v_schedule_id := gen_random_uuid(); -- preview still needs unique ids
                    END IF;

                    v_schedule := jsonb_build_object(
                        'id', v_schedule_id,
                        'production_order_number', v_production_order_number,
                        'resource_id', v_wc_id,
                        'product_id', p_product_id,
                        'quantity', (v_elem->>'batch_size')::numeric::int,
                        'start_date', v_batch_start,
                        'end_date', v_batch_end,
                        'cascade_level', v_cascade_level,
                        'cascade_source_id', v_elem->>'cascade_source_id',
                        'batch_number', (v_elem->>'batch_number')::numeric::int,
                        'total_batches', v_num_batches,
                        'batch_size', (v_elem->>'batch_size')::numeric,
                        'status', 'scheduled',
                        'produced_for_order_number', NULL,
                        'cascade_type', 'forward'
                    );

                    IF p_week_plan_id IS NOT NULL THEN
                        v_schedule := v_schedule || jsonb_build_object('week_plan_id', p_week_plan_id);
                    END IF;

                    v_bulk_insert := v_bulk_insert || jsonb_build_array(v_schedule);
                    v_current_schedules := v_current_schedules || jsonb_build_array(v_schedule);

                    -- Track WC timing
                    IF v_wc_earliest IS NULL OR v_batch_start < v_wc_earliest THEN
                        v_wc_earliest := v_batch_start;
                    END IF;
                    IF v_wc_latest IS NULL OR v_batch_end > v_wc_latest THEN
                        v_wc_latest := v_batch_end;
                    END IF;
                    IF v_batch_end > v_cascade_end THEN
                        v_cascade_end := v_batch_end;
                    END IF;

                    -- Track batch info for response
                    v_wc_batches := v_wc_batches || jsonb_build_array(jsonb_build_object(
                        'batch_number', (v_elem->>'batch_number')::numeric::int,
                        'batch_size', (v_elem->>'batch_size')::numeric,
                        'start_date', v_batch_start,
                        'end_date', v_batch_end,
                        'work_center_id', v_wc_id,
                        'work_center_name', v_wc_name,
                        'cascade_level', v_cascade_level,
                        'processing_type', v_processing_mode,
                        'duration_minutes', (v_elem->>'duration_minutes')::numeric
                    ));
                END IF;
            END LOOP;

            -- Execute four-phase update
            IF p_create_in_db AND (jsonb_array_length(v_bulk_insert) > 0
                                    OR jsonb_array_length(v_existing_to_update) > 0) THEN
                v_parking_start := v_context_end + interval '30 days';
                v_parking_end := v_context_end + interval '32 days';

                -- Park existing that need to move
                FOR i IN 0..jsonb_array_length(v_existing_to_update) - 1 LOOP
                    v_elem := v_existing_to_update->i;
                    UPDATE produccion.production_schedules
                    SET start_date = v_parking_start + (i * interval '1 day'),
                        end_date = v_parking_start + (i * interval '1 day')
                                 + ((v_elem->>'duration_minutes')::numeric * interval '1 minute')
                    WHERE id = (v_elem->>'id')::uuid;
                END LOOP;

                -- Insert new schedules
                FOR i IN 0..jsonb_array_length(v_bulk_insert) - 1 LOOP
                    v_elem := v_bulk_insert->i;
                    INSERT INTO produccion.production_schedules (
                        id, production_order_number, resource_id, product_id, quantity,
                        start_date, end_date, cascade_level, cascade_source_id,
                        batch_number, total_batches, batch_size, status,
                        produced_for_order_number, cascade_type, week_plan_id
                    ) VALUES (
                        (v_elem->>'id')::uuid,
                        v_production_order_number,
                        v_wc_id,
                        p_product_id,
                        (v_elem->>'quantity')::numeric::int,
                        (v_elem->>'start_date')::timestamptz,
                        (v_elem->>'end_date')::timestamptz,
                        v_cascade_level,
                        CASE WHEN v_elem->>'cascade_source_id' IS NOT NULL
                             THEN (v_elem->>'cascade_source_id')::uuid ELSE NULL END,
                        (v_elem->>'batch_number')::numeric::int,
                        v_num_batches,
                        (v_elem->>'batch_size')::numeric,
                        'scheduled',
                        NULL,
                        'forward',
                        CASE WHEN v_elem ? 'week_plan_id'
                             THEN (v_elem->>'week_plan_id')::uuid ELSE NULL END
                    );
                    v_total_created := v_total_created + 1;
                END LOOP;

                -- Move parked back to final positions
                FOR i IN 0..jsonb_array_length(v_existing_to_update) - 1 LOOP
                    v_elem := v_existing_to_update->i;
                    UPDATE produccion.production_schedules
                    SET start_date = (v_elem->>'new_start_date')::timestamptz,
                        end_date = (v_elem->>'new_end_date')::timestamptz
                    WHERE id = (v_elem->>'id')::uuid;
                END LOOP;
            END IF;

        -- ---- PARALLEL PATH ----
        ELSE
            -- Get blocked periods for parallel WC
            SELECT bp.block_starts, bp.block_ends
            INTO v_block_starts, v_block_ends
            FROM produccion._cascade_v2_blocked_periods(
                v_wc_id, v_context_start::timestamptz, v_context_end::timestamptz) bp;

            v_bulk_insert := '[]'::jsonb;

            FOR v_batch_idx IN 1..v_num_batches LOOP
                v_batch_size := v_batch_sizes[v_batch_idx];
                v_batch_duration := produccion._cascade_v2_batch_duration(
                    p_product_id, v_wc_id, v_operation_id, v_batch_size);

                -- Determine start time
                IF jsonb_array_length(v_previous_schedules) = 0 THEN
                    -- Source WC: distribute evenly
                    v_batch_offset_hours := (p_duration_hours / v_num_batches) * (v_batch_idx - 1);
                    v_batch_start := v_start_dt + (v_batch_offset_hours * interval '1 hour');
                ELSE
                    -- Parallel: start on arrival
                    v_prev_end := (v_previous_schedules->(v_batch_idx - 1)->>'end_date')::timestamp;
                    v_batch_start := v_prev_end + (v_rest_time_hours * interval '1 hour');
                END IF;

                -- Skip blocked
                IF v_block_starts IS NOT NULL AND array_length(v_block_starts, 1) > 0 THEN
                    v_batch_start := produccion._cascade_v2_skip_blocked(
                        v_batch_start, v_batch_duration, v_block_starts, v_block_ends);
                END IF;

                v_batch_end := v_batch_start + (v_batch_duration * interval '1 minute');

                IF p_create_in_db THEN
                    v_schedule_id := gen_random_uuid();
                ELSE
                    v_schedule_id := gen_random_uuid();
                END IF;

                v_schedule := jsonb_build_object(
                    'id', v_schedule_id,
                    'production_order_number', v_production_order_number,
                    'resource_id', v_wc_id,
                    'product_id', p_product_id,
                    'quantity', v_batch_size::numeric::int,
                    'start_date', v_batch_start,
                    'end_date', v_batch_end,
                    'cascade_level', v_cascade_level,
                    'cascade_source_id',
                        CASE WHEN jsonb_array_length(v_previous_schedules) > 0
                             THEN v_previous_schedules->(v_batch_idx - 1)->>'id'
                             ELSE NULL END,
                    'batch_number', v_batch_idx,
                    'total_batches', v_num_batches,
                    'batch_size', v_batch_size,
                    'status', 'scheduled',
                    'produced_for_order_number', NULL,
                    'cascade_type', 'forward'
                );

                IF p_week_plan_id IS NOT NULL THEN
                    v_schedule := v_schedule || jsonb_build_object('week_plan_id', p_week_plan_id);
                END IF;

                v_bulk_insert := v_bulk_insert || jsonb_build_array(v_schedule);
                v_current_schedules := v_current_schedules || jsonb_build_array(v_schedule);

                IF v_wc_earliest IS NULL OR v_batch_start < v_wc_earliest THEN
                    v_wc_earliest := v_batch_start;
                END IF;
                IF v_wc_latest IS NULL OR v_batch_end > v_wc_latest THEN
                    v_wc_latest := v_batch_end;
                END IF;
                IF v_batch_end > v_cascade_end THEN
                    v_cascade_end := v_batch_end;
                END IF;

                v_wc_batches := v_wc_batches || jsonb_build_array(jsonb_build_object(
                    'batch_number', v_batch_idx,
                    'batch_size', v_batch_size,
                    'start_date', v_batch_start,
                    'end_date', v_batch_end,
                    'work_center_id', v_wc_id,
                    'work_center_name', v_wc_name,
                    'cascade_level', v_cascade_level,
                    'processing_type', v_processing_mode,
                    'duration_minutes', v_batch_duration
                ));
            END LOOP;

            -- Bulk insert
            IF p_create_in_db AND jsonb_array_length(v_bulk_insert) > 0 THEN
                FOR i IN 0..jsonb_array_length(v_bulk_insert) - 1 LOOP
                    v_elem := v_bulk_insert->i;
                    INSERT INTO produccion.production_schedules (
                        id, production_order_number, resource_id, product_id, quantity,
                        start_date, end_date, cascade_level, cascade_source_id,
                        batch_number, total_batches, batch_size, status,
                        produced_for_order_number, cascade_type, week_plan_id
                    ) VALUES (
                        (v_elem->>'id')::uuid,
                        v_production_order_number,
                        v_wc_id,
                        p_product_id,
                        (v_elem->>'quantity')::numeric::int,
                        (v_elem->>'start_date')::timestamptz,
                        (v_elem->>'end_date')::timestamptz,
                        v_cascade_level,
                        CASE WHEN v_elem->>'cascade_source_id' IS NOT NULL
                             THEN (v_elem->>'cascade_source_id')::uuid ELSE NULL END,
                        (v_elem->>'batch_number')::numeric::int,
                        v_num_batches,
                        (v_elem->>'batch_size')::numeric,
                        'scheduled',
                        NULL,
                        'forward',
                        CASE WHEN v_elem ? 'week_plan_id'
                             THEN (v_elem->>'week_plan_id')::uuid ELSE NULL END
                    );
                    v_total_created := v_total_created + 1;
                END LOOP;
            END IF;
        END IF; -- END parallel/sequential branch

        -- Store WC schedule info
        IF jsonb_array_length(v_wc_batches) > 0 THEN
            v_wc_schedules := jsonb_set(v_wc_schedules, ARRAY[v_wc_id], jsonb_build_object(
                'work_center_id', v_wc_id,
                'work_center_name', v_wc_name,
                'cascade_level', v_cascade_level,
                'processing_type', v_processing_mode,
                'batches', v_wc_batches,
                'total_duration_minutes', (
                    SELECT COALESCE(sum((b->>'duration_minutes')::numeric), 0)
                    FROM jsonb_array_elements(v_wc_batches) b
                ),
                'earliest_start', v_wc_earliest,
                'latest_end', v_wc_latest
            ));
        END IF;

        -- Update previous for next step
        v_previous_schedules := v_current_schedules;

    END LOOP; -- END forward cascade loop

    -- ========================================
    -- BACKWARD CASCADE (PP dependencies)
    -- ========================================

    -- Get PP ingredients from BOM
    v_pp_ingredients := '[]'::jsonb;
    FOR v_pp_material IN
        SELECT bom.material_id, bom.quantity_needed, bom.operation_id,
               bom.tiempo_reposo_horas,
               p.id AS pp_id, p.name AS pp_name, p.category AS pp_category,
               p.lote_minimo AS pp_lote_minimo
        FROM produccion.bill_of_materials bom
        JOIN public.products p ON p.id = bom.material_id
        WHERE bom.product_id::text = p_product_id
          AND bom.is_active = true
          AND p.category = 'PP'
    LOOP
        v_pp_ingredients := v_pp_ingredients || jsonb_build_array(jsonb_build_object(
            'material_id', v_pp_material.pp_id::text,
            'material_name', v_pp_material.pp_name,
            'quantity_needed', v_pp_material.quantity_needed,
            'operation_id', v_pp_material.operation_id,
            'tiempo_reposo_horas', COALESCE(v_pp_material.tiempo_reposo_horas, 0),
            'lote_minimo', COALESCE(v_pp_material.pp_lote_minimo, 100)
        ));
    END LOOP;

    IF jsonb_array_length(v_pp_ingredients) > 0 AND p_create_in_db THEN
        -- Get actual last batch start of PT's first WC
        SELECT ps.start_date INTO v_pt_last_batch_start
        FROM produccion.production_schedules ps
        WHERE ps.production_order_number = v_production_order_number
          AND ps.resource_id = v_source_wc_id
        ORDER BY ps.batch_number DESC
        LIMIT 1;
    END IF;

    FOR i IN 0..jsonb_array_length(v_pp_ingredients) - 1 LOOP
        v_pp_mat := v_pp_ingredients->i;
        v_pp_required_qty := v_total_units * (v_pp_mat->>'quantity_needed')::numeric;
        v_pp_rest_time := (v_pp_mat->>'tiempo_reposo_horas')::numeric;

        BEGIN
            v_pp_result := produccion._cascade_v2_backward_cascade(
                p_pp_material_id := v_pp_mat->>'material_id',
                p_required_quantity := v_pp_required_qty,
                p_parent_start_datetime := p_start_datetime,
                p_parent_duration_hours := p_duration_hours,
                p_parent_staff_count := p_staff_count,
                p_parent_lote_minimo := v_lote_minimo,
                p_parent_total_units := v_total_units,
                p_bom_rest_time_hours := v_pp_rest_time,
                p_create_in_db := p_create_in_db,
                p_depth := 0,
                p_week_start := v_week_start::timestamptz,
                p_week_end := v_week_end::timestamptz,
                p_context_start := v_context_start::timestamptz,
                p_context_end := v_context_end::timestamptz,
                p_produced_for_order_number := v_production_order_number,
                p_week_plan_id := p_week_plan_id,
                p_parent_last_batch_start := COALESCE(v_pt_last_batch_start, v_start_dt)::timestamptz
            );

            IF v_pp_result IS NOT NULL THEN
                -- pp_result is an array of cascade results
                IF jsonb_typeof(v_pp_result) = 'array' THEN
                    v_pp_cascades := v_pp_cascades || v_pp_result;
                ELSE
                    v_pp_cascades := v_pp_cascades || jsonb_build_array(v_pp_result);
                END IF;
                -- Count created schedules from PP
                FOR v_pp_result IN SELECT * FROM jsonb_array_elements(
                    CASE WHEN jsonb_typeof(v_pp_result) = 'array'
                         THEN v_pp_result ELSE jsonb_build_array(v_pp_result) END
                ) LOOP
                    v_total_created := v_total_created +
                        COALESCE((v_pp_result.value->>'schedules_created')::int, 0);
                END LOOP;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Continue with other PPs even if one fails (matches V1 behavior)
            RAISE WARNING 'PP cascade failed for %: %', v_pp_mat->>'material_name', SQLERRM;
        END;
    END LOOP;

    -- Re-enable trigger
    IF p_create_in_db THEN
        ALTER TABLE produccion.production_schedules ENABLE TRIGGER check_schedule_conflict;
    END IF;

    EXCEPTION WHEN OTHERS THEN
        -- Re-enable trigger on any error
        IF p_create_in_db THEN
            ALTER TABLE produccion.production_schedules ENABLE TRIGGER check_schedule_conflict;
        END IF;
        RAISE;
    END;

    -- ========================================
    -- BUILD RESPONSE
    -- ========================================
    v_response := jsonb_build_object(
        'production_order_number', v_production_order_number,
        'product_id', p_product_id,
        'product_name', v_product_name,
        'total_units', v_total_units,
        'lote_minimo', v_lote_minimo,
        'num_batches', v_num_batches,
        'schedules_created', v_total_created,
        'work_centers', (
            SELECT COALESCE(jsonb_agg(v_wc_schedules->key ORDER BY (v_wc_schedules->key->>'cascade_level')::int), '[]'::jsonb)
            FROM jsonb_object_keys(v_wc_schedules) key
        ),
        'cascade_start', v_cascade_start,
        'cascade_end', v_cascade_end,
        'pp_dependencies', v_pp_cascades
    );

    RETURN v_response;
END;
$$;

-- ============================================================
-- BACKWARD CASCADE helper (recursive via stack)
-- Called internally by generate_cascade_v2
-- ============================================================
CREATE OR REPLACE FUNCTION produccion._cascade_v2_backward_cascade(
    p_pp_material_id text,
    p_required_quantity numeric,
    p_parent_start_datetime timestamptz,
    p_parent_duration_hours numeric,
    p_parent_staff_count int,
    p_parent_lote_minimo numeric,
    p_parent_total_units numeric,
    p_bom_rest_time_hours numeric,
    p_create_in_db boolean DEFAULT true,
    p_depth int DEFAULT 0,
    p_max_depth int DEFAULT 10,
    p_week_start timestamptz DEFAULT NULL,
    p_week_end timestamptz DEFAULT NULL,
    p_context_start timestamptz DEFAULT NULL,
    p_context_end timestamptz DEFAULT NULL,
    p_produced_for_order_number int DEFAULT NULL,
    p_week_plan_id uuid DEFAULT NULL,
    p_parent_last_batch_start timestamptz DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_pp_product_id text;
    v_pp_product_name text;
    v_pp_product_category text;
    v_pp_lote_minimo numeric;
    v_pp_route jsonb;
    v_pp_route_len int;
    v_pp_batches numeric[];
    v_num_pp_batches int;

    -- Queue simulation for PP total time
    v_batch_finish_times interval[];
    v_new_finish_times interval[];
    v_batch_durations interval[];
    v_max_dur interval;
    v_queue_end_iv interval;
    v_arrival_iv interval;
    v_start_iv interval;
    v_finish_iv interval;
    v_rest_delta interval;
    v_pp_total_time interval;

    -- Blocked shift adjustment
    v_pp_start timestamptz;
    v_abs_batch_times timestamptz[];
    v_new_abs_times timestamptz[];
    v_simulated_end timestamptz;
    v_gap interval;
    v_pp_wc_blocked record;
    v_has_blockings boolean;

    -- Per-WC simulation data
    v_sim_data jsonb := '[]'::jsonb;
    v_sim_entry jsonb;

    -- Variables for forward cascade of PP
    v_pp_order_number int;
    v_pp_deadline timestamptz;
    v_pp_cascade_result jsonb;

    -- Nested PP
    v_nested_pp jsonb := '[]'::jsonb;
    v_nested_results jsonb := '[]'::jsonb;
    v_nested_pp_mat jsonb;
    v_nested_quantity numeric;
    v_nested_rest numeric;
    v_nested_result jsonb;

    -- PP duration calculation
    v_first_wc_prod record;
    v_pp_duration_hours numeric;
    v_pp_staff_count int := 1;

    -- Parent batch calculation
    v_parent_batches numeric[];
    v_parent_num_batches int;
    v_parent_last_batch_start timestamptz;
    v_parent_last_batch_offset numeric;

    -- Loop vars
    v_op jsonb;
    v_wc_id text;
    v_is_par boolean;
    v_prod_rec record;
    v_batch_dur interval;
    v_rest_hours numeric;
    v_query_start timestamptz;
    v_query_end timestamptz;
    i int;
    j int;
    v_iter int;
    v_dur_min numeric;
    v_block_starts timestamptz[];
    v_block_ends timestamptz[];
    v_batch_start timestamptz;
    v_batch_end timestamptz;
BEGIN
    v_query_start := COALESCE(p_context_start, p_week_start);
    v_query_end := COALESCE(p_context_end, p_week_end);

    IF p_depth > p_max_depth THEN
        RAISE EXCEPTION 'Max recursion depth exceeded (possible circular dependency)';
    END IF;

    -- 1. Get PP product and route
    SELECT id::text, name, COALESCE(lote_minimo, 100)::numeric, category
    INTO v_pp_product_id, v_pp_product_name, v_pp_lote_minimo, v_pp_product_category
    FROM public.products
    WHERE id::text = p_pp_material_id;

    IF v_pp_product_id IS NULL THEN
        RAISE EXCEPTION 'PP product % not found', p_pp_material_id;
    END IF;

    SELECT jsonb_agg(
        jsonb_build_object(
            'work_center_id', pr.work_center_id::text,
            'sequence_order', pr.sequence_order,
            'wc_name', wc.name,
            'wc_operation_id', wc.operation_id,
            'wc_tipo_capacidad', wc.tipo_capacidad,
            'wc_capacidad_carros', COALESCE(wc.capacidad_maxima_carros, 0),
            'wc_permite_paralelo', COALESCE(wc.permite_paralelo_por_referencia, false),
            'tiempo_reposo_horas', COALESCE(pr.tiempo_reposo_horas, 0)
        ) ORDER BY pr.sequence_order
    )
    INTO v_pp_route
    FROM produccion.production_routes pr
    JOIN produccion.work_centers wc ON wc.id = pr.work_center_id
    WHERE pr.product_id::text = p_pp_material_id
      AND pr.is_active = true;

    IF v_pp_route IS NULL OR jsonb_array_length(v_pp_route) = 0 THEN
        RAISE EXCEPTION 'No production route for PP product %', p_pp_material_id;
    END IF;
    v_pp_route_len := jsonb_array_length(v_pp_route);

    -- 2. Calculate PP start time using queue simulation
    v_parent_batches := produccion._cascade_v2_distribute_batches(p_parent_total_units, p_parent_lote_minimo);
    v_parent_num_batches := array_length(v_parent_batches, 1);

    -- Use actual parent_last_batch_start if provided
    IF p_parent_last_batch_start IS NOT NULL THEN
        v_parent_last_batch_start := p_parent_last_batch_start;
    ELSE
        IF v_parent_num_batches > 1 THEN
            v_parent_last_batch_offset := (p_parent_duration_hours / v_parent_num_batches)
                                          * (v_parent_num_batches - 1);
        ELSE
            v_parent_last_batch_offset := 0;
        END IF;
        v_parent_last_batch_start := p_parent_start_datetime
            + (v_parent_last_batch_offset * interval '1 hour');
    END IF;

    -- Distribute PP into batches
    v_pp_batches := produccion._cascade_v2_distribute_batches(p_required_quantity, v_pp_lote_minimo);
    v_num_pp_batches := array_length(v_pp_batches, 1);

    -- Initialize batch finish times (relative to PP start)
    v_batch_finish_times := ARRAY[]::interval[];
    FOR i IN 1..v_num_pp_batches LOOP
        v_batch_finish_times := v_batch_finish_times || interval '0';
    END LOOP;

    -- Simulate through PP route
    FOR j IN 0..v_pp_route_len - 1 LOOP
        v_op := v_pp_route->j;
        v_wc_id := v_op->>'work_center_id';
        v_is_par := (v_op->>'wc_tipo_capacidad') = 'carros'
                    AND (v_op->>'wc_capacidad_carros')::int > 1;

        -- Get productivity and calculate batch durations
        v_batch_durations := ARRAY[]::interval[];
        FOR i IN 1..v_num_pp_batches LOOP
            v_dur_min := produccion._cascade_v2_batch_duration(
                p_pp_material_id, v_wc_id, (v_op->>'wc_operation_id')::uuid, v_pp_batches[i]);
            v_batch_durations := v_batch_durations || (v_dur_min * interval '1 minute');
        END LOOP;

        IF v_is_par THEN
            -- Parallel: all batches process simultaneously
            v_max_dur := v_batch_durations[1];
            FOR i IN 2..v_num_pp_batches LOOP
                IF v_batch_durations[i] > v_max_dur THEN
                    v_max_dur := v_batch_durations[i];
                END IF;
            END LOOP;
            FOR i IN 1..v_num_pp_batches LOOP
                v_batch_finish_times[i] := v_batch_finish_times[i] + v_max_dur;
            END LOOP;
        ELSE
            -- Sequential: queue simulation
            v_queue_end_iv := interval '0';
            v_new_finish_times := ARRAY[]::interval[];
            FOR i IN 1..v_num_pp_batches LOOP
                v_arrival_iv := v_batch_finish_times[i];
                IF v_arrival_iv > v_queue_end_iv THEN
                    v_start_iv := v_arrival_iv;
                ELSE
                    v_start_iv := v_queue_end_iv;
                END IF;
                v_finish_iv := v_start_iv + v_batch_durations[i];
                v_new_finish_times := v_new_finish_times || v_finish_iv;
                v_queue_end_iv := v_finish_iv;
            END LOOP;
            v_batch_finish_times := v_new_finish_times;
        END IF;

        -- Add rest time
        v_rest_hours := (v_op->>'tiempo_reposo_horas')::numeric;
        v_rest_delta := v_rest_hours * interval '1 hour';
        FOR i IN 1..v_num_pp_batches LOOP
            v_batch_finish_times[i] := v_batch_finish_times[i] + v_rest_delta;
        END LOOP;

        -- Store simulation data for blocked shift adjustment
        v_sim_data := v_sim_data || jsonb_build_array(jsonb_build_object(
            'wc_id', v_wc_id,
            'is_parallel', v_is_par,
            'batch_durations_min', (SELECT jsonb_agg(EXTRACT(EPOCH FROM d) / 60.0) FROM unnest(v_batch_durations) d),
            'rest_hours', v_rest_hours
        ));
    END LOOP;

    -- PP total time = last batch finish
    v_pp_total_time := v_batch_finish_times[v_num_pp_batches];

    -- Add BOM rest time
    v_pp_total_time := v_pp_total_time + (p_bom_rest_time_hours * interval '1 hour');

    -- PP start = parent_last_batch_start - pp_total_time
    v_pp_start := v_parent_last_batch_start - v_pp_total_time;

    -- === Adjust for blocked shifts ===
    IF v_query_start IS NOT NULL AND v_query_end IS NOT NULL THEN
        v_has_blockings := false;

        -- Check if any WC has blocked periods
        FOR j IN 0..jsonb_array_length(v_sim_data) - 1 LOOP
            v_wc_id := v_sim_data->j->>'wc_id';
            SELECT bp.block_starts, bp.block_ends
            INTO v_block_starts, v_block_ends
            FROM produccion._cascade_v2_blocked_periods(v_wc_id, v_query_start, v_query_end) bp;
            IF v_block_starts IS NOT NULL AND array_length(v_block_starts, 1) > 0 THEN
                v_has_blockings := true;
                EXIT;
            END IF;
        END LOOP;

        IF v_has_blockings THEN
            FOR v_iter IN 1..5 LOOP
                -- Forward simulation from v_pp_start
                v_abs_batch_times := ARRAY[]::timestamptz[];
                FOR i IN 1..v_num_pp_batches LOOP
                    v_abs_batch_times := v_abs_batch_times || v_pp_start;
                END LOOP;

                FOR j IN 0..jsonb_array_length(v_sim_data) - 1 LOOP
                    v_sim_entry := v_sim_data->j;
                    v_wc_id := v_sim_entry->>'wc_id';
                    v_is_par := (v_sim_entry->>'is_parallel')::boolean;
                    v_rest_hours := (v_sim_entry->>'rest_hours')::numeric;
                    v_rest_delta := v_rest_hours * interval '1 hour';

                    SELECT bp.block_starts, bp.block_ends
                    INTO v_block_starts, v_block_ends
                    FROM produccion._cascade_v2_blocked_periods(v_wc_id, v_query_start, v_query_end) bp;

                    IF v_is_par THEN
                        v_max_dur := interval '0';
                        FOR i IN 1..v_num_pp_batches LOOP
                            v_dur_min := (v_sim_entry->'batch_durations_min'->>(i - 1))::numeric;
                            IF (v_dur_min * interval '1 minute') > v_max_dur THEN
                                v_max_dur := v_dur_min * interval '1 minute';
                            END IF;
                        END LOOP;

                        v_new_abs_times := ARRAY[]::timestamptz[];
                        FOR i IN 1..v_num_pp_batches LOOP
                            v_dur_min := EXTRACT(EPOCH FROM v_max_dur) / 60.0;
                            v_batch_start := v_abs_batch_times[i];
                            IF v_block_starts IS NOT NULL AND array_length(v_block_starts, 1) > 0 THEN
                                v_batch_start := produccion._cascade_v2_skip_blocked(
                                    v_batch_start, v_dur_min, v_block_starts, v_block_ends);
                            END IF;
                            v_new_abs_times := v_new_abs_times || (v_batch_start + v_max_dur + v_rest_delta);
                        END LOOP;
                        v_abs_batch_times := v_new_abs_times;
                    ELSE
                        -- Sequential with blocked period skipping
                        v_queue_end_iv := interval '0';
                        v_new_abs_times := ARRAY[]::timestamptz[];
                        DECLARE v_queue_end_ts timestamptz := '-infinity'::timestamptz;
                        BEGIN
                            FOR i IN 1..v_num_pp_batches LOOP
                                v_dur_min := (v_sim_entry->'batch_durations_min'->>(i - 1))::numeric;
                                v_batch_start := GREATEST(v_abs_batch_times[i], v_queue_end_ts);
                                IF v_block_starts IS NOT NULL AND array_length(v_block_starts, 1) > 0 THEN
                                    v_batch_start := produccion._cascade_v2_skip_blocked(
                                        v_batch_start, v_dur_min, v_block_starts, v_block_ends);
                                END IF;
                                v_batch_end := v_batch_start + (v_dur_min * interval '1 minute');
                                v_new_abs_times := v_new_abs_times || (v_batch_end + v_rest_delta);
                                v_queue_end_ts := v_batch_end;
                            END LOOP;
                        END;
                        v_abs_batch_times := v_new_abs_times;
                    END IF;
                END LOOP;

                -- Check gap
                v_simulated_end := v_abs_batch_times[1];
                FOR i IN 2..v_num_pp_batches LOOP
                    IF v_abs_batch_times[i] > v_simulated_end THEN
                        v_simulated_end := v_abs_batch_times[i];
                    END IF;
                END LOOP;
                v_simulated_end := v_simulated_end + (p_bom_rest_time_hours * interval '1 hour');

                v_gap := v_simulated_end - v_parent_last_batch_start;
                IF v_gap <= interval '1 minute' THEN
                    EXIT;
                END IF;

                v_pp_start := v_pp_start - v_gap;
            END LOOP;
        END IF;
    END IF;

    -- 3. Check nested PP ingredients
    FOR v_nested_pp_mat IN
        SELECT jsonb_build_object(
            'material_id', p.id::text,
            'material_name', p.name,
            'quantity_needed', bom.quantity_needed,
            'tiempo_reposo_horas', COALESCE(bom.tiempo_reposo_horas, 0),
            'lote_minimo', COALESCE(p.lote_minimo, 100)
        ) AS mat
        FROM produccion.bill_of_materials bom
        JOIN public.products p ON p.id = bom.material_id
        WHERE bom.product_id::text = p_pp_material_id
          AND bom.is_active = true
          AND p.category = 'PP'
    LOOP
        v_nested_quantity := p_required_quantity * (v_nested_pp_mat.mat->>'quantity_needed')::numeric;
        v_nested_rest := (v_nested_pp_mat.mat->>'tiempo_reposo_horas')::numeric;

        -- Get PP productivity for duration calculation
        SELECT usa_tiempo_fijo, tiempo_minimo_fijo, units_per_hour
        INTO v_first_wc_prod
        FROM produccion.production_productivity
        WHERE product_id::text = p_pp_material_id
          AND (work_center_id::text = (v_pp_route->0->>'work_center_id')
               OR operation_id = (v_pp_route->0->>'wc_operation_id')::uuid)
        LIMIT 1;

        IF v_first_wc_prod IS NOT NULL AND v_first_wc_prod.usa_tiempo_fijo THEN
            v_pp_duration_hours := (ceil(p_required_quantity / v_pp_lote_minimo)
                * COALESCE(v_first_wc_prod.tiempo_minimo_fijo, 60)) / 60.0;
        ELSIF v_first_wc_prod IS NOT NULL THEN
            v_pp_duration_hours := p_required_quantity
                / (COALESCE(v_first_wc_prod.units_per_hour, 1) * v_pp_staff_count);
        ELSE
            v_pp_duration_hours := ceil(p_required_quantity / v_pp_lote_minimo) * 1.0;
        END IF;

        v_nested_result := produccion._cascade_v2_backward_cascade(
            p_pp_material_id := v_nested_pp_mat.mat->>'material_id',
            p_required_quantity := v_nested_quantity,
            p_parent_start_datetime := v_pp_start,
            p_parent_duration_hours := v_pp_duration_hours,
            p_parent_staff_count := v_pp_staff_count,
            p_parent_lote_minimo := v_pp_lote_minimo,
            p_parent_total_units := p_required_quantity,
            p_bom_rest_time_hours := v_nested_rest,
            p_create_in_db := p_create_in_db,
            p_depth := p_depth + 1,
            p_max_depth := p_max_depth,
            p_week_start := p_week_start,
            p_week_end := p_week_end,
            p_context_start := p_context_start,
            p_context_end := p_context_end,
            p_produced_for_order_number := p_produced_for_order_number,
            p_week_plan_id := p_week_plan_id,
            p_parent_last_batch_start := NULL  -- Will be calculated
        );

        IF v_nested_result IS NOT NULL THEN
            IF jsonb_typeof(v_nested_result) = 'array' THEN
                v_nested_results := v_nested_results || v_nested_result;
            ELSE
                v_nested_results := v_nested_results || jsonb_build_array(v_nested_result);
            END IF;
        END IF;
    END LOOP;

    -- 4. Generate forward cascade for this PP
    -- Get PP productivity for duration
    SELECT usa_tiempo_fijo, tiempo_minimo_fijo, units_per_hour
    INTO v_first_wc_prod
    FROM produccion.production_productivity
    WHERE product_id::text = p_pp_material_id
      AND (work_center_id::text = (v_pp_route->0->>'work_center_id')
           OR operation_id = (v_pp_route->0->>'wc_operation_id')::uuid)
    LIMIT 1;

    IF v_first_wc_prod IS NOT NULL AND v_first_wc_prod.usa_tiempo_fijo THEN
        v_pp_duration_hours := (ceil(p_required_quantity / v_pp_lote_minimo)
            * COALESCE(v_first_wc_prod.tiempo_minimo_fijo, 60)) / 60.0;
    ELSIF v_first_wc_prod IS NOT NULL THEN
        v_pp_duration_hours := p_required_quantity
            / (COALESCE(v_first_wc_prod.units_per_hour, 1) * v_pp_staff_count);
    ELSE
        v_pp_duration_hours := ceil(p_required_quantity / v_pp_lote_minimo) * 1.0;
    END IF;

    -- PP deadline: parent last batch start minus BOM rest
    v_pp_deadline := v_parent_last_batch_start - (p_bom_rest_time_hours * interval '1 hour');

    -- Generate forward cascade for PP using internal call
    v_pp_cascade_result := produccion._cascade_v2_forward_pp(
        p_product_id := p_pp_material_id,
        p_product_name := v_pp_product_name,
        p_start_datetime := v_pp_start,
        p_duration_hours := v_pp_duration_hours,
        p_staff_count := v_pp_staff_count,
        p_lote_minimo := v_pp_lote_minimo,
        p_route := v_pp_route,
        p_create_in_db := p_create_in_db,
        p_week_plan_id := p_week_plan_id,
        p_context_start := v_query_start,
        p_context_end := v_query_end,
        p_produced_for_order_number := p_produced_for_order_number,
        p_fixed_total_units := p_required_quantity,
        p_deadline := v_pp_deadline
    );

    -- Return nested + current
    RETURN v_nested_results || jsonb_build_array(v_pp_cascade_result);
END;
$$;

-- ============================================================
-- Forward cascade for PP (reuses forward logic)
-- Separate function to avoid circular dependency in main function
-- ============================================================
CREATE OR REPLACE FUNCTION produccion._cascade_v2_forward_pp(
    p_product_id text,
    p_product_name text,
    p_start_datetime timestamptz,
    p_duration_hours numeric,
    p_staff_count int,
    p_lote_minimo numeric,
    p_route jsonb,
    p_create_in_db boolean,
    p_week_plan_id uuid,
    p_context_start timestamptz,
    p_context_end timestamptz,
    p_produced_for_order_number int,
    p_fixed_total_units numeric,
    p_deadline timestamptz DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_start_dt timestamp;
    v_total_units numeric;
    v_batch_sizes numeric[];
    v_num_batches int;
    v_production_order_number int;
    v_route_len int;
    v_route_step jsonb;
    v_step_idx int;
    v_wc_id text;
    v_wc_name text;
    v_cascade_level int;
    v_operation_id uuid;
    v_processing_mode text;
    v_is_parallel boolean;
    v_is_hybrid boolean;
    v_rest_time_hours numeric;
    v_batch_idx int;
    v_batch_size numeric;
    v_batch_duration numeric;
    v_batch_start timestamp;
    v_batch_end timestamp;
    v_batch_offset_hours numeric;
    v_arrival_time timestamp;
    v_cascade_source_id uuid;
    v_schedule_id uuid;
    v_previous_schedules jsonb := '[]'::jsonb;
    v_current_schedules jsonb;
    v_existing_schedules jsonb;
    v_new_batches jsonb;
    v_all_schedules jsonb;
    v_recalculated jsonb;
    v_block_starts timestamptz[];
    v_block_ends timestamptz[];
    v_existing_to_update jsonb;
    v_bulk_insert jsonb;
    v_parking_start timestamp;
    v_parking_end timestamp;
    v_schedule jsonb;
    v_elem jsonb;
    v_prev_end timestamp;
    v_wc_schedules jsonb := '{}'::jsonb;
    v_wc_batches jsonb;
    v_wc_earliest timestamp;
    v_wc_latest timestamp;
    v_cascade_start timestamp;
    v_cascade_end timestamp;
    v_total_created int := 0;
    v_response jsonb;
    -- Multi-WC vars
    v_use_multi_wc boolean;
    v_alt_wcs jsonb;
    v_staffed_wc_ids text[];
    v_wc_contexts jsonb;
    v_distribution jsonb;
    v_first_arrival timestamp;
    v_target_date date;
    v_target_shift int;
    v_assigned_batches jsonb;
    v_multi_created jsonb;
    v_assigned_wc_id text;
    v_assigned_wc_name text;
    v_ctx jsonb;
    v_alt_block_starts timestamptz[];
    v_alt_block_ends timestamptz[];
    i int;
    j int;
BEGIN
    v_start_dt := p_start_datetime AT TIME ZONE 'UTC';
    v_total_units := p_fixed_total_units;
    v_batch_sizes := produccion._cascade_v2_distribute_batches(v_total_units, p_lote_minimo);
    v_num_batches := array_length(v_batch_sizes, 1);
    v_route_len := jsonb_array_length(p_route);

    IF p_create_in_db THEN
        SELECT COALESCE(MAX(production_order_number), 0) + 1
        INTO v_production_order_number
        FROM produccion.production_schedules;
    END IF;

    v_cascade_start := v_start_dt;
    v_cascade_end := v_start_dt;

    FOR v_step_idx IN 0..v_route_len - 1 LOOP
        v_route_step := p_route->v_step_idx;
        v_wc_id := v_route_step->>'work_center_id';
        v_wc_name := v_route_step->>'wc_name';
        v_cascade_level := (v_route_step->>'sequence_order')::int;
        v_operation_id := (v_route_step->>'wc_operation_id')::uuid;

        -- Processing mode
        IF (v_route_step->>'wc_tipo_capacidad') = 'carros'
           AND (v_route_step->>'wc_capacidad_carros')::int > 1 THEN
            v_processing_mode := 'parallel';
        ELSIF (v_route_step->>'wc_permite_paralelo')::boolean THEN
            v_processing_mode := 'hybrid';
        ELSE
            v_processing_mode := 'sequential';
        END IF;
        v_is_parallel := (v_processing_mode = 'parallel');
        v_is_hybrid := (v_processing_mode = 'hybrid');

        -- Rest time from BOM
        v_rest_time_hours := 0;
        IF v_operation_id IS NOT NULL THEN
            SELECT COALESCE(bom.tiempo_reposo_horas, 0)
            INTO v_rest_time_hours
            FROM produccion.bill_of_materials bom
            WHERE bom.product_id::text = p_product_id
              AND bom.operation_id = v_operation_id
              AND bom.tiempo_reposo_horas IS NOT NULL
            LIMIT 1;
            v_rest_time_hours := COALESCE(v_rest_time_hours, 0);
        END IF;

        v_current_schedules := '[]'::jsonb;
        v_wc_batches := '[]'::jsonb;
        v_wc_earliest := NULL;
        v_wc_latest := NULL;
        v_use_multi_wc := false;

        IF NOT v_is_parallel THEN
            v_existing_schedules := produccion._cascade_v2_get_existing_with_arrival(
                v_wc_id, p_context_start, p_context_end);

            v_new_batches := '[]'::jsonb;
            FOR v_batch_idx IN 1..v_num_batches LOOP
                v_batch_size := v_batch_sizes[v_batch_idx];
                v_batch_duration := produccion._cascade_v2_batch_duration(
                    p_product_id, v_wc_id, v_operation_id, v_batch_size);

                IF jsonb_array_length(v_previous_schedules) > 0 THEN
                    v_prev_end := (v_previous_schedules->(v_batch_idx - 1)->>'end_date')::timestamp;
                    v_arrival_time := v_prev_end + (v_rest_time_hours * interval '1 hour');
                    v_cascade_source_id := (v_previous_schedules->(v_batch_idx - 1)->>'id')::uuid;
                ELSE
                    v_arrival_time := v_start_dt;
                    v_cascade_source_id := NULL;
                END IF;

                v_new_batches := v_new_batches || jsonb_build_array(jsonb_build_object(
                    'id', NULL,
                    'is_existing', false,
                    'arrival_time', v_arrival_time,
                    'duration_minutes', v_batch_duration,
                    'batch_number', v_batch_idx,
                    'batch_size', v_batch_size,
                    'cascade_source_id', v_cascade_source_id,
                    'production_order_number', v_production_order_number
                ));
            END LOOP;

            -- Multi-WC check for PP with deadline
            IF v_operation_id IS NOT NULL AND p_deadline IS NOT NULL
               AND NOT v_is_parallel THEN
                -- Check for alternative work centers
                SELECT jsonb_agg(jsonb_build_object(
                    'work_center_id', m.work_center_id::text,
                    'wc_name', wc.name,
                    'wc_operation_id', wc.operation_id
                ))
                INTO v_alt_wcs
                FROM produccion.product_work_center_mapping m
                JOIN produccion.work_centers wc ON wc.id = m.work_center_id
                WHERE m.product_id::text = p_product_id
                  AND m.operation_id = v_operation_id;

                IF v_alt_wcs IS NOT NULL AND jsonb_array_length(v_alt_wcs) > 1 THEN
                    -- Determine target shift
                    IF jsonb_array_length(v_previous_schedules) > 0 THEN
                        v_prev_end := (v_previous_schedules->0->>'end_date')::timestamp;
                        v_first_arrival := v_prev_end + (v_rest_time_hours * interval '1 hour');
                    ELSE
                        v_first_arrival := v_start_dt;
                    END IF;

                    -- determine_shift_from_datetime
                    IF EXTRACT(HOUR FROM v_first_arrival) >= 22 THEN
                        v_target_date := v_first_arrival::date + 1;
                        v_target_shift := 1;
                    ELSIF EXTRACT(HOUR FROM v_first_arrival) < 6 THEN
                        v_target_date := v_first_arrival::date;
                        v_target_shift := 1;
                    ELSIF EXTRACT(HOUR FROM v_first_arrival) < 14 THEN
                        v_target_date := v_first_arrival::date;
                        v_target_shift := 2;
                    ELSE
                        v_target_date := v_first_arrival::date;
                        v_target_shift := 3;
                    END IF;

                    SELECT array_agg(wcs.work_center_id::text)
                    INTO v_staffed_wc_ids
                    FROM produccion.work_center_staffing wcs
                    WHERE wcs.work_center_id::text IN (
                        SELECT (a->>'work_center_id') FROM jsonb_array_elements(v_alt_wcs) a
                    )
                      AND wcs.date = v_target_date
                      AND wcs.shift_number = v_target_shift
                      AND wcs.staff_count > 0;

                    IF v_staffed_wc_ids IS NOT NULL AND array_length(v_staffed_wc_ids, 1) > 1
                       AND v_wc_id = ANY(v_staffed_wc_ids) THEN
                        v_use_multi_wc := true;

                        -- Build WC contexts for distribution
                        v_wc_contexts := '[]'::jsonb;
                        -- Primary first
                        FOR i IN 1..array_length(v_staffed_wc_ids, 1) LOOP
                            v_assigned_wc_id := v_staffed_wc_ids[i];
                            -- Reorder: primary first
                            IF (i = 1 AND v_assigned_wc_id != v_wc_id) THEN
                                CONTINUE;
                            END IF;

                            SELECT bp.block_starts, bp.block_ends
                            INTO v_alt_block_starts, v_alt_block_ends
                            FROM produccion._cascade_v2_blocked_periods(
                                v_assigned_wc_id, p_context_start, p_context_end) bp;

                            v_wc_contexts := v_wc_contexts || jsonb_build_array(jsonb_build_object(
                                'wc_id', v_assigned_wc_id,
                                'existing_schedules', produccion._cascade_v2_get_existing_with_arrival(
                                    v_assigned_wc_id, p_context_start, p_context_end),
                                'block_starts', to_jsonb(v_alt_block_starts),
                                'block_ends', to_jsonb(v_alt_block_ends)
                            ));
                        END LOOP;

                        IF jsonb_array_length(v_wc_contexts) > 1 THEN
                            v_distribution := produccion._cascade_v2_distribute_to_wcs(
                                v_new_batches, v_wc_contexts, p_deadline, v_is_hybrid);

                            -- Process each WC
                            v_multi_created := '[]'::jsonb;
                            FOR i IN 0..jsonb_array_length(v_wc_contexts) - 1 LOOP
                                v_ctx := v_wc_contexts->i;
                                v_assigned_wc_id := v_ctx->>'wc_id';
                                v_assigned_batches := v_distribution->v_assigned_wc_id;

                                IF v_assigned_batches IS NULL OR jsonb_array_length(v_assigned_batches) = 0 THEN
                                    CONTINUE;
                                END IF;

                                -- Get productivity for this WC
                                -- Recalculate durations with this WC's productivity
                                FOR j IN 0..jsonb_array_length(v_assigned_batches) - 1 LOOP
                                    v_batch_duration := produccion._cascade_v2_batch_duration(
                                        p_product_id, v_assigned_wc_id,
                                        v_operation_id, (v_assigned_batches->j->>'batch_size')::numeric);
                                    v_assigned_batches := jsonb_set(v_assigned_batches,
                                        ARRAY[j::text, 'duration_minutes'], to_jsonb(v_batch_duration));
                                END LOOP;

                                v_all_schedules := (v_ctx->'existing_schedules') || v_assigned_batches;
                                v_recalculated := produccion._cascade_v2_recalculate_queue(
                                    v_all_schedules,
                                    ARRAY(SELECT jsonb_array_elements_text(v_ctx->'block_starts')::timestamptz),
                                    ARRAY(SELECT jsonb_array_elements_text(v_ctx->'block_ends')::timestamptz),
                                    v_is_hybrid);

                                -- Process recalculated schedules (same as sequential path)
                                -- ... (insert new, track existing to update)
                                FOR j IN 0..jsonb_array_length(v_recalculated) - 1 LOOP
                                    v_elem := v_recalculated->j;
                                    IF NOT (v_elem->>'is_existing')::boolean THEN
                                        v_batch_start := (v_elem->>'new_start_date')::timestamp;
                                        v_batch_end := (v_elem->>'new_end_date')::timestamp;
                                        v_schedule_id := gen_random_uuid();

                                        v_schedule := jsonb_build_object(
                                            'id', v_schedule_id,
                                            'production_order_number', v_production_order_number,
                                            'resource_id', v_assigned_wc_id,
                                            'product_id', p_product_id,
                                            'quantity', (v_elem->>'batch_size')::numeric::int,
                                            'start_date', v_batch_start,
                                            'end_date', v_batch_end,
                                            'cascade_level', v_cascade_level,
                                            'cascade_source_id', v_elem->>'cascade_source_id',
                                            'batch_number', (v_elem->>'batch_number')::numeric::int,
                                            'total_batches', v_num_batches,
                                            'batch_size', (v_elem->>'batch_size')::numeric,
                                            'status', 'scheduled',
                                            'produced_for_order_number', p_produced_for_order_number,
                                            'cascade_type', 'backward'
                                        );

                                        IF p_create_in_db THEN
                                            INSERT INTO produccion.production_schedules (
                                                id, production_order_number, resource_id, product_id, quantity,
                                                start_date, end_date, cascade_level, cascade_source_id,
                                                batch_number, total_batches, batch_size, status,
                                                produced_for_order_number, cascade_type, week_plan_id
                                            ) VALUES (
                                                v_schedule_id, v_production_order_number, v_assigned_wc_id,
                                                p_product_id, (v_elem->>'batch_size')::numeric::int,
                                                v_batch_start::timestamptz, v_batch_end::timestamptz,
                                                v_cascade_level,
                                                CASE WHEN v_elem->>'cascade_source_id' IS NOT NULL
                                                     THEN (v_elem->>'cascade_source_id')::uuid ELSE NULL END,
                                                (v_elem->>'batch_number')::numeric::int, v_num_batches,
                                                (v_elem->>'batch_size')::numeric, 'scheduled',
                                                p_produced_for_order_number, 'backward',
                                                p_week_plan_id
                                            );
                                            v_total_created := v_total_created + 1;
                                        END IF;

                                        v_current_schedules := v_current_schedules || jsonb_build_array(v_schedule);

                                        IF v_wc_earliest IS NULL OR v_batch_start < v_wc_earliest THEN
                                            v_wc_earliest := v_batch_start;
                                        END IF;
                                        IF v_wc_latest IS NULL OR v_batch_end > v_wc_latest THEN
                                            v_wc_latest := v_batch_end;
                                        END IF;
                                        IF v_batch_end > v_cascade_end THEN
                                            v_cascade_end := v_batch_end;
                                        END IF;
                                    ELSIF (v_elem->>'is_existing')::boolean
                                          AND ((v_elem->>'new_start_date')::timestamptz != (v_elem->>'start_date')::timestamptz
                                               OR (v_elem->>'new_end_date')::timestamptz != (v_elem->>'end_date')::timestamptz) THEN
                                        IF p_create_in_db THEN
                                            -- Park and move existing
                                            UPDATE produccion.production_schedules
                                            SET start_date = (v_elem->>'new_start_date')::timestamptz,
                                                end_date = (v_elem->>'new_end_date')::timestamptz
                                            WHERE id = (v_elem->>'id')::uuid;
                                        END IF;
                                    END IF;
                                END LOOP;
                            END LOOP;

                            -- Sort current_schedules by batch_number
                            SELECT jsonb_agg(elem ORDER BY (elem->>'batch_number')::int)
                            INTO v_current_schedules
                            FROM jsonb_array_elements(v_current_schedules) elem;
                        ELSE
                            v_use_multi_wc := false;
                        END IF;
                    END IF;
                END IF;
            END IF;

            -- Standard sequential path (no multi-WC)
            IF NOT v_use_multi_wc THEN
                SELECT bp.block_starts, bp.block_ends
                INTO v_block_starts, v_block_ends
                FROM produccion._cascade_v2_blocked_periods(
                    v_wc_id, p_context_start, p_context_end) bp;

                v_all_schedules := v_existing_schedules || v_new_batches;
                v_recalculated := produccion._cascade_v2_recalculate_queue(
                    v_all_schedules, v_block_starts, v_block_ends, v_is_hybrid);

                v_existing_to_update := '[]'::jsonb;
                v_bulk_insert := '[]'::jsonb;

                FOR i IN 0..jsonb_array_length(v_recalculated) - 1 LOOP
                    v_elem := v_recalculated->i;
                    IF (v_elem->>'is_existing')::boolean THEN
                        IF (v_elem->>'new_start_date')::timestamptz != (v_elem->>'start_date')::timestamptz
                           OR (v_elem->>'new_end_date')::timestamptz != (v_elem->>'end_date')::timestamptz THEN
                            v_existing_to_update := v_existing_to_update || jsonb_build_array(v_elem);
                        END IF;
                    ELSE
                        v_batch_start := (v_elem->>'new_start_date')::timestamp;
                        v_batch_end := (v_elem->>'new_end_date')::timestamp;
                        v_schedule_id := gen_random_uuid();

                        v_schedule := jsonb_build_object(
                            'id', v_schedule_id,
                            'production_order_number', v_production_order_number,
                            'resource_id', v_wc_id,
                            'product_id', p_product_id,
                            'quantity', (v_elem->>'batch_size')::numeric::int,
                            'start_date', v_batch_start,
                            'end_date', v_batch_end,
                            'cascade_level', v_cascade_level,
                            'cascade_source_id', v_elem->>'cascade_source_id',
                            'batch_number', (v_elem->>'batch_number')::numeric::int,
                            'total_batches', v_num_batches,
                            'batch_size', (v_elem->>'batch_size')::numeric,
                            'status', 'scheduled',
                            'produced_for_order_number', p_produced_for_order_number,
                            'cascade_type', 'backward'
                        );

                        IF p_week_plan_id IS NOT NULL THEN
                            v_schedule := v_schedule || jsonb_build_object('week_plan_id', p_week_plan_id);
                        END IF;

                        v_bulk_insert := v_bulk_insert || jsonb_build_array(v_schedule);
                        v_current_schedules := v_current_schedules || jsonb_build_array(v_schedule);

                        IF v_wc_earliest IS NULL OR v_batch_start < v_wc_earliest THEN
                            v_wc_earliest := v_batch_start;
                        END IF;
                        IF v_wc_latest IS NULL OR v_batch_end > v_wc_latest THEN
                            v_wc_latest := v_batch_end;
                        END IF;
                        IF v_batch_end > v_cascade_end THEN
                            v_cascade_end := v_batch_end;
                        END IF;
                    END IF;
                END LOOP;

                IF p_create_in_db AND (jsonb_array_length(v_bulk_insert) > 0
                                        OR jsonb_array_length(v_existing_to_update) > 0) THEN
                    v_parking_start := p_context_end + interval '30 days';
                    v_parking_end := p_context_end + interval '32 days';

                    FOR i IN 0..jsonb_array_length(v_existing_to_update) - 1 LOOP
                        v_elem := v_existing_to_update->i;
                        UPDATE produccion.production_schedules
                        SET start_date = v_parking_start + (i * interval '1 day'),
                            end_date = v_parking_start + (i * interval '1 day')
                                     + ((v_elem->>'duration_minutes')::numeric * interval '1 minute')
                        WHERE id = (v_elem->>'id')::uuid;
                    END LOOP;

                    FOR i IN 0..jsonb_array_length(v_bulk_insert) - 1 LOOP
                        v_elem := v_bulk_insert->i;
                        INSERT INTO produccion.production_schedules (
                            id, production_order_number, resource_id, product_id, quantity,
                            start_date, end_date, cascade_level, cascade_source_id,
                            batch_number, total_batches, batch_size, status,
                            produced_for_order_number, cascade_type, week_plan_id
                        ) VALUES (
                            (v_elem->>'id')::uuid, v_production_order_number, v_wc_id,
                            p_product_id, (v_elem->>'quantity')::numeric::int,
                            (v_elem->>'start_date')::timestamptz, (v_elem->>'end_date')::timestamptz,
                            v_cascade_level,
                            CASE WHEN v_elem->>'cascade_source_id' IS NOT NULL
                                 THEN (v_elem->>'cascade_source_id')::uuid ELSE NULL END,
                            (v_elem->>'batch_number')::numeric::int, v_num_batches,
                            (v_elem->>'batch_size')::numeric, 'scheduled',
                            p_produced_for_order_number, 'backward',
                            CASE WHEN v_elem ? 'week_plan_id'
                                 THEN (v_elem->>'week_plan_id')::uuid ELSE NULL END
                        );
                        v_total_created := v_total_created + 1;
                    END LOOP;

                    FOR i IN 0..jsonb_array_length(v_existing_to_update) - 1 LOOP
                        v_elem := v_existing_to_update->i;
                        UPDATE produccion.production_schedules
                        SET start_date = (v_elem->>'new_start_date')::timestamptz,
                            end_date = (v_elem->>'new_end_date')::timestamptz
                        WHERE id = (v_elem->>'id')::uuid;
                    END LOOP;
                END IF;
            END IF;

        ELSE
            -- PARALLEL path for PP
            SELECT bp.block_starts, bp.block_ends
            INTO v_block_starts, v_block_ends
            FROM produccion._cascade_v2_blocked_periods(
                v_wc_id, p_context_start, p_context_end) bp;

            FOR v_batch_idx IN 1..v_num_batches LOOP
                v_batch_size := v_batch_sizes[v_batch_idx];
                v_batch_duration := produccion._cascade_v2_batch_duration(
                    p_product_id, v_wc_id, v_operation_id, v_batch_size);

                IF jsonb_array_length(v_previous_schedules) = 0 THEN
                    v_batch_offset_hours := (p_duration_hours / v_num_batches) * (v_batch_idx - 1);
                    v_batch_start := v_start_dt + (v_batch_offset_hours * interval '1 hour');
                ELSE
                    v_prev_end := (v_previous_schedules->(v_batch_idx - 1)->>'end_date')::timestamp;
                    v_batch_start := v_prev_end + (v_rest_time_hours * interval '1 hour');
                END IF;

                IF v_block_starts IS NOT NULL AND array_length(v_block_starts, 1) > 0 THEN
                    v_batch_start := produccion._cascade_v2_skip_blocked(
                        v_batch_start, v_batch_duration, v_block_starts, v_block_ends);
                END IF;

                v_batch_end := v_batch_start + (v_batch_duration * interval '1 minute');
                v_schedule_id := gen_random_uuid();

                v_schedule := jsonb_build_object(
                    'id', v_schedule_id,
                    'production_order_number', v_production_order_number,
                    'resource_id', v_wc_id,
                    'product_id', p_product_id,
                    'quantity', v_batch_size::numeric::int,
                    'start_date', v_batch_start,
                    'end_date', v_batch_end,
                    'cascade_level', v_cascade_level,
                    'cascade_source_id',
                        CASE WHEN jsonb_array_length(v_previous_schedules) > 0
                             THEN v_previous_schedules->(v_batch_idx - 1)->>'id'
                             ELSE NULL END,
                    'batch_number', v_batch_idx,
                    'total_batches', v_num_batches,
                    'batch_size', v_batch_size,
                    'status', 'scheduled',
                    'produced_for_order_number', p_produced_for_order_number,
                    'cascade_type', 'backward'
                );

                IF p_create_in_db THEN
                    INSERT INTO produccion.production_schedules (
                        id, production_order_number, resource_id, product_id, quantity,
                        start_date, end_date, cascade_level, cascade_source_id,
                        batch_number, total_batches, batch_size, status,
                        produced_for_order_number, cascade_type, week_plan_id
                    ) VALUES (
                        v_schedule_id, v_production_order_number, v_wc_id,
                        p_product_id, v_batch_size::numeric::int,
                        v_batch_start::timestamptz, v_batch_end::timestamptz,
                        v_cascade_level,
                        CASE WHEN jsonb_array_length(v_previous_schedules) > 0
                             THEN (v_previous_schedules->(v_batch_idx - 1)->>'id')::uuid
                             ELSE NULL END,
                        v_batch_idx, v_num_batches, v_batch_size, 'scheduled',
                        p_produced_for_order_number, 'backward', p_week_plan_id
                    );
                    v_total_created := v_total_created + 1;
                END IF;

                v_current_schedules := v_current_schedules || jsonb_build_array(v_schedule);

                IF v_wc_earliest IS NULL OR v_batch_start < v_wc_earliest THEN
                    v_wc_earliest := v_batch_start;
                END IF;
                IF v_wc_latest IS NULL OR v_batch_end > v_wc_latest THEN
                    v_wc_latest := v_batch_end;
                END IF;
                IF v_batch_end > v_cascade_end THEN
                    v_cascade_end := v_batch_end;
                END IF;
            END LOOP;
        END IF;

        -- Store WC info
        IF jsonb_array_length(v_current_schedules) > 0 THEN
            v_wc_schedules := jsonb_set(v_wc_schedules, ARRAY[v_wc_id], jsonb_build_object(
                'work_center_id', v_wc_id,
                'work_center_name', v_wc_name,
                'cascade_level', v_cascade_level,
                'processing_type', v_processing_mode,
                'batches', v_current_schedules,
                'earliest_start', v_wc_earliest,
                'latest_end', v_wc_latest
            ));
        END IF;

        v_previous_schedules := v_current_schedules;
    END LOOP;

    v_response := jsonb_build_object(
        'production_order_number', v_production_order_number,
        'product_id', p_product_id,
        'product_name', p_product_name,
        'total_units', v_total_units,
        'lote_minimo', p_lote_minimo,
        'num_batches', v_num_batches,
        'schedules_created', v_total_created,
        'work_centers', (
            SELECT COALESCE(jsonb_agg(v_wc_schedules->key), '[]'::jsonb)
            FROM jsonb_object_keys(v_wc_schedules) key
        ),
        'cascade_start', v_cascade_start,
        'cascade_end', v_cascade_end
    );

    RETURN v_response;
END;
$$;

-- ============================================================
-- GRANTS
-- ============================================================
GRANT EXECUTE ON FUNCTION produccion.generate_cascade_v2(text, timestamptz, numeric, integer, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION produccion.generate_cascade_v2(text, timestamptz, numeric, integer, uuid, boolean) TO service_role;

GRANT EXECUTE ON FUNCTION produccion._cascade_v2_distribute_batches(numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION produccion._cascade_v2_distribute_batches(numeric, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION produccion._cascade_v2_batch_duration(text, text, uuid, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION produccion._cascade_v2_batch_duration(text, text, uuid, numeric, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION produccion._cascade_v2_blocked_periods(text, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION produccion._cascade_v2_blocked_periods(text, timestamptz, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION produccion._cascade_v2_skip_blocked(timestamptz, numeric, timestamptz[], timestamptz[]) TO authenticated;
GRANT EXECUTE ON FUNCTION produccion._cascade_v2_skip_blocked(timestamptz, numeric, timestamptz[], timestamptz[]) TO service_role;
GRANT EXECUTE ON FUNCTION produccion._cascade_v2_recalculate_queue(jsonb, timestamptz[], timestamptz[], boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION produccion._cascade_v2_recalculate_queue(jsonb, timestamptz[], timestamptz[], boolean) TO service_role;
GRANT EXECUTE ON FUNCTION produccion._cascade_v2_simulate_finish(jsonb, jsonb, timestamptz[], timestamptz[], boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION produccion._cascade_v2_simulate_finish(jsonb, jsonb, timestamptz[], timestamptz[], boolean) TO service_role;
GRANT EXECUTE ON FUNCTION produccion._cascade_v2_distribute_to_wcs(jsonb, jsonb, timestamptz, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION produccion._cascade_v2_distribute_to_wcs(jsonb, jsonb, timestamptz, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION produccion._cascade_v2_get_existing_with_arrival(text, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION produccion._cascade_v2_get_existing_with_arrival(text, timestamptz, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION produccion._cascade_v2_backward_cascade(text, numeric, timestamptz, numeric, integer, numeric, numeric, numeric, boolean, integer, integer, timestamptz, timestamptz, timestamptz, timestamptz, integer, uuid, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION produccion._cascade_v2_forward_pp(text, text, timestamptz, numeric, integer, numeric, jsonb, boolean, uuid, timestamptz, timestamptz, integer, numeric, timestamptz) TO service_role;

COMMENT ON FUNCTION produccion.generate_cascade_v2 IS 'V2 cascade: full PL/pgSQL port of cascade.py. All logic runs server-side for ~25x performance. V1 remains as fallback via FastAPI.';
