-- Migration: Staff count affects batch processing speed (not just quantity)
-- Before: more staff = more units = more batches = LONGER cascade (wrong)
-- After:  more staff = same units, faster batches = SHORTER cascade (correct)
--
-- Formula change in _cascade_v2_batch_duration:
--   OLD: duration = (batch_size / uph) * 60
--   NEW: duration = (batch_size / (uph * staff_count)) * 60
--
-- New helper: _cascade_v2_get_wc_staff(wc_id, datetime)
--   Looks up staff_count from work_center_staffing for the WC at the given date/shift

-- ============================================================
-- NEW HELPER: Get staff count for a work center at a given datetime
-- ============================================================
CREATE OR REPLACE FUNCTION produccion._cascade_v2_get_wc_staff(
    p_wc_id text,
    p_datetime timestamp
) RETURNS int
LANGUAGE plpgsql STABLE
AS $$
DECLARE
    v_hour int;
    v_date date;
    v_shift int;
    v_staff int;
BEGIN
    v_hour := EXTRACT(HOUR FROM p_datetime)::int;

    -- Determine shift and date (same logic as frontend use-shift-schedules.ts)
    IF v_hour >= 22 THEN
        v_date := p_datetime::date + 1;  -- T1 belongs to next day
        v_shift := 1;
    ELSIF v_hour < 6 THEN
        v_date := p_datetime::date;
        v_shift := 1;
    ELSIF v_hour < 14 THEN
        v_date := p_datetime::date;
        v_shift := 2;
    ELSE
        v_date := p_datetime::date;
        v_shift := 3;
    END IF;

    SELECT wcs.staff_count INTO v_staff
    FROM produccion.work_center_staffing wcs
    WHERE wcs.work_center_id::text = p_wc_id
      AND wcs.date = v_date
      AND wcs.shift_number = v_shift;

    RETURN COALESCE(v_staff, 1);  -- Default to 1 if no staffing configured
END;
$$;

-- ============================================================
-- UPDATED HELPER 2: Calculate batch duration accounting for staff
-- Drop old signature first (params changed: added p_staff_count)
-- ============================================================
DROP FUNCTION IF EXISTS produccion._cascade_v2_batch_duration(text, text, uuid, numeric, numeric);

CREATE OR REPLACE FUNCTION produccion._cascade_v2_batch_duration(
    p_product_id text,
    p_wc_id text,
    p_operation_id uuid,
    p_batch_size numeric,
    p_staff_count int DEFAULT 1,
    p_default_minutes numeric DEFAULT 60
) RETURNS numeric
LANGUAGE plpgsql STABLE
AS $$
DECLARE
    v_prod record;
    v_uph numeric;
    v_effective_staff int;
BEGIN
    v_effective_staff := GREATEST(p_staff_count, 1);  -- Never less than 1

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
        RETURN p_default_minutes / v_effective_staff;
    END IF;

    IF v_prod.usa_tiempo_fijo THEN
        -- Fixed time operations (e.g. baking) are NOT affected by staff
        RETURN COALESCE(v_prod.tiempo_minimo_fijo, p_default_minutes);
    END IF;

    v_uph := COALESCE(v_prod.units_per_hour, 1);
    IF v_uph <= 0 THEN
        RETURN p_default_minutes / v_effective_staff;
    END IF;

    -- More staff = faster processing
    RETURN (p_batch_size / (v_uph * v_effective_staff)) * 60;
END;
$$;

-- ============================================================
-- UPDATE generate_cascade_v2: pass staff_count to batch_duration
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
    -- Route & product info
    v_route jsonb;
    v_route_len int;
    v_product_name text;
    v_lote_minimo numeric;
    v_source_wc_id text;
    v_source_operation_id uuid;
    v_source_prod record;
    -- Batch calculation
    v_total_units numeric;
    v_batch_sizes numeric[];
    v_num_batches int;
    -- Schedule fields
    v_production_order_number int;
    v_start_dt timestamp;
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
    v_schedule jsonb;
    v_previous_schedules jsonb := '[]'::jsonb;
    v_current_schedules jsonb;
    -- Queue management
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
    v_elem jsonb;
    v_prev_end timestamp;
    -- WC tracking
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
    -- Week boundaries
    v_week_start timestamptz;
    v_week_end timestamptz;
    v_context_start timestamptz;
    v_context_end timestamptz;
    -- Backward cascade
    v_pp_ingredients jsonb;
    v_pp_result jsonb;
    v_pp_results jsonb := '[]'::jsonb;
    v_last_batch_start timestamp;
    -- Staff for downstream WCs
    v_wc_staff int;
BEGIN
    v_start_dt := p_start_datetime AT TIME ZONE 'UTC';

    -- 1. Get product info
    SELECT name, COALESCE(lote_minimo, 100)::numeric
    INTO v_product_name, v_lote_minimo
    FROM public.products
    WHERE id::text = p_product_id;

    IF v_product_name IS NULL THEN
        RAISE EXCEPTION 'Product % not found', p_product_id;
    END IF;

    -- 2. Get production route
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
    INTO v_route
    FROM produccion.production_routes pr
    JOIN produccion.work_centers wc ON wc.id = pr.work_center_id
    WHERE pr.product_id::text = p_product_id
      AND pr.is_active = true;

    IF v_route IS NULL OR jsonb_array_length(v_route) = 0 THEN
        RAISE EXCEPTION 'No production route for product %', p_product_id;
    END IF;
    v_route_len := jsonb_array_length(v_route);

    -- 3. Source WC info
    v_source_wc_id := v_route->0->>'work_center_id';
    v_source_operation_id := (v_route->0->>'wc_operation_id')::uuid;

    -- 4. Get source productivity
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

    -- 5. Calculate total units (staff increases throughput = more units in same time)
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

    -- 8. Calculate week boundaries
    v_week_start := (
        v_start_dt - ((EXTRACT(DOW FROM v_start_dt)::int + 1) % 7 || ' days')::interval
    )::date::timestamptz + interval '22 hours';
    IF v_start_dt < v_week_start THEN
        v_week_start := v_week_start - interval '7 days';
    END IF;
    v_week_end := v_week_start + interval '7 days';
    v_context_start := v_week_start - interval '7 days';
    v_context_end := v_week_end + interval '7 days';

    v_cascade_start := v_start_dt;
    v_cascade_end := v_start_dt;

    -- Disable conflict triggers for bulk operations
    IF p_create_in_db THEN
        ALTER TABLE produccion.production_schedules DISABLE TRIGGER check_schedule_conflict;
        ALTER TABLE produccion.production_schedules DISABLE TRIGGER check_schedule_conflicts_trigger;
    END IF;

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

                -- Calculate arrival time first (needed for staff lookup)
                IF jsonb_array_length(v_previous_schedules) > 0 THEN
                    v_prev_end := (v_previous_schedules->(v_batch_idx - 1)->>'end_date')::timestamp;
                    v_arrival_time := v_prev_end + (v_rest_time_hours * interval '1 hour');
                    v_cascade_source_id := (v_previous_schedules->(v_batch_idx - 1)->>'id')::uuid;
                ELSE
                    v_arrival_time := v_start_dt;
                    v_cascade_source_id := NULL;
                END IF;

                -- Get staff for this WC at the batch arrival time
                IF v_step_idx = 0 THEN
                    v_wc_staff := p_staff_count;  -- First WC: use user-provided staff
                ELSE
                    v_wc_staff := produccion._cascade_v2_get_wc_staff(v_wc_id, v_arrival_time);
                END IF;

                v_batch_duration := produccion._cascade_v2_batch_duration(
                    p_product_id, v_wc_id, v_operation_id, v_batch_size, v_wc_staff);

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

            -- Check for multi-WC distribution
            IF v_operation_id IS NOT NULL THEN
                SELECT jsonb_agg(jsonb_build_object(
                    'work_center_id', pwcm.work_center_id::text,
                    'work_center_name', wc2.name
                ))
                INTO v_alt_wcs
                FROM produccion.product_work_center_mapping pwcm
                JOIN produccion.work_centers wc2 ON wc2.id = pwcm.work_center_id
                WHERE pwcm.product_id::text = p_product_id
                  AND pwcm.operation_id = v_operation_id;

                IF v_alt_wcs IS NOT NULL AND jsonb_array_length(v_alt_wcs) > 1 THEN
                    -- Determine shift from first arrival
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
                                v_assigned_wc_id, v_context_start::timestamptz, v_context_end::timestamptz) bp;

                            v_wc_contexts := v_wc_contexts || jsonb_build_array(jsonb_build_object(
                                'wc_id', v_assigned_wc_id,
                                'existing_schedules', produccion._cascade_v2_get_existing_with_arrival(
                                    v_assigned_wc_id, v_context_start::timestamptz, v_context_end::timestamptz),
                                'block_starts', to_jsonb(COALESCE(v_alt_block_starts, ARRAY[]::timestamptz[])),
                                'block_ends', to_jsonb(COALESCE(v_alt_block_ends, ARRAY[]::timestamptz[]))
                            ));
                        END LOOP;
                    END IF;
                END IF;
            END IF;

            IF NOT v_use_multi_wc THEN
                -- Single WC: recalculate queue
                v_all_schedules := v_existing_schedules || v_new_batches;
                v_recalculated := produccion._cascade_v2_recalculate_queue(
                    v_all_schedules, v_block_starts, v_block_ends, v_is_hybrid);

                -- Separate existing to update vs new to insert
                v_existing_to_update := '[]'::jsonb;
                v_bulk_insert := '[]'::jsonb;

                FOR i IN 0..jsonb_array_length(v_recalculated) - 1 LOOP
                    v_elem := v_recalculated->i;
                    IF (v_elem->>'is_existing')::boolean THEN
                        v_existing_to_update := v_existing_to_update || jsonb_build_array(v_elem);
                    ELSE
                        v_schedule_id := gen_random_uuid();
                        v_batch_start := (v_elem->>'new_start_date')::timestamp;
                        v_batch_end := (v_elem->>'new_end_date')::timestamp;

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
                            'batch_number', (v_elem->>'batch_number')::int,
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

                        v_current_schedules := v_current_schedules || jsonb_build_array(jsonb_build_object(
                            'id', v_schedule_id,
                            'start_date', v_batch_start,
                            'end_date', v_batch_end,
                            'batch_number', (v_elem->>'batch_number')::int
                        ));
                    END IF;
                END LOOP;

                -- Execute DB operations
                IF p_create_in_db THEN
                    -- Park existing
                    v_parking_start := v_context_end::timestamp + interval '30 days';
                    v_parking_end := v_parking_start + interval '2 days';

                    IF jsonb_array_length(v_existing_to_update) > 0 THEN
                        FOR i IN 0..jsonb_array_length(v_existing_to_update) - 1 LOOP
                            v_elem := v_existing_to_update->i;
                            UPDATE produccion.production_schedules
                            SET start_date = v_parking_start,
                                end_date = v_parking_start + ((v_elem->>'duration_minutes')::numeric * interval '1 minute')
                            WHERE id = (v_elem->>'id')::uuid;
                        END LOOP;
                    END IF;

                    -- Bulk insert new
                    IF jsonb_array_length(v_bulk_insert) > 0 THEN
                        FOR i IN 0..jsonb_array_length(v_bulk_insert) - 1 LOOP
                            v_elem := v_bulk_insert->i;
                            INSERT INTO produccion.production_schedules (
                                id, production_order_number, resource_id, product_id,
                                quantity, start_date, end_date, cascade_level,
                                cascade_source_id, batch_number, total_batches,
                                batch_size, status, produced_for_order_number,
                                cascade_type, week_plan_id
                            ) VALUES (
                                (v_elem->>'id')::uuid,
                                (v_elem->>'production_order_number')::int,
                                (v_elem->>'resource_id')::uuid,
                                (v_elem->>'product_id')::uuid,
                                (v_elem->>'quantity')::int,
                                (v_elem->>'start_date')::timestamptz,
                                (v_elem->>'end_date')::timestamptz,
                                (v_elem->>'cascade_level')::int,
                                (v_elem->>'cascade_source_id')::uuid,
                                (v_elem->>'batch_number')::int,
                                (v_elem->>'total_batches')::int,
                                (v_elem->>'batch_size')::numeric,
                                v_elem->>'status',
                                (v_elem->>'produced_for_order_number')::int,
                                v_elem->>'cascade_type',
                                (v_elem->>'week_plan_id')::uuid
                            );
                            v_total_created := v_total_created + 1;
                        END LOOP;
                    END IF;

                    -- Move parked back
                    IF jsonb_array_length(v_existing_to_update) > 0 THEN
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
                -- Multi-WC distribution path
                v_distribution := produccion._cascade_v2_distribute_to_wcs(
                    v_new_batches, v_wc_contexts,
                    NULL,  -- no deadline for forward cascade
                    v_is_hybrid);

                v_multi_created := '[]'::jsonb;
                v_parking_start := v_context_end::timestamp + interval '30 days';
                v_parking_end := v_parking_start + interval '2 days';

                FOR i IN 0..jsonb_array_length(v_distribution) - 1 LOOP
                    v_ctx := v_distribution->i;
                    v_assigned_wc_id := v_ctx->>'wc_id';
                    v_assigned_batches := v_ctx->'assigned_batches';

                    IF v_assigned_batches IS NULL OR jsonb_array_length(v_assigned_batches) = 0 THEN
                        CONTINUE;
                    END IF;

                    -- Recalculate durations with this WC's productivity and staff
                    v_wc_staff := produccion._cascade_v2_get_wc_staff(v_assigned_wc_id, v_first_arrival);

                    FOR j IN 0..jsonb_array_length(v_assigned_batches) - 1 LOOP
                        v_batch_duration := produccion._cascade_v2_batch_duration(
                            p_product_id, v_assigned_wc_id,
                            v_operation_id, (v_assigned_batches->j->>'batch_size')::numeric,
                            v_wc_staff);
                        v_assigned_batches := jsonb_set(v_assigned_batches,
                            ARRAY[j::text, 'duration_minutes'], to_jsonb(v_batch_duration));
                    END LOOP;

                    v_all_schedules := (v_ctx->'existing_schedules') || v_assigned_batches;

                    SELECT bp.block_starts, bp.block_ends
                    INTO v_alt_block_starts, v_alt_block_ends
                    FROM produccion._cascade_v2_blocked_periods(
                        v_assigned_wc_id, v_context_start::timestamptz, v_context_end::timestamptz) bp;

                    v_recalculated := produccion._cascade_v2_recalculate_queue(
                        v_all_schedules, v_alt_block_starts, v_alt_block_ends, v_is_hybrid);

                    -- Process results (same as single WC)
                    v_existing_to_update := '[]'::jsonb;
                    v_bulk_insert := '[]'::jsonb;

                    -- Get WC name for assigned WC
                    SELECT name INTO v_assigned_wc_name
                    FROM produccion.work_centers
                    WHERE id::text = v_assigned_wc_id;

                    FOR j IN 0..jsonb_array_length(v_recalculated) - 1 LOOP
                        v_elem := v_recalculated->j;
                        IF (v_elem->>'is_existing')::boolean THEN
                            v_existing_to_update := v_existing_to_update || jsonb_build_array(v_elem);
                        ELSE
                            v_schedule_id := gen_random_uuid();
                            v_batch_start := (v_elem->>'new_start_date')::timestamp;
                            v_batch_end := (v_elem->>'new_end_date')::timestamp;

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
                                'batch_number', (v_elem->>'batch_number')::int,
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

                            v_multi_created := v_multi_created || jsonb_build_array(jsonb_build_object(
                                'id', v_schedule_id,
                                'start_date', v_batch_start,
                                'end_date', v_batch_end,
                                'batch_number', (v_elem->>'batch_number')::int
                            ));
                        END IF;
                    END LOOP;

                    -- Execute DB operations for this WC
                    IF p_create_in_db THEN
                        IF jsonb_array_length(v_existing_to_update) > 0 THEN
                            FOR j IN 0..jsonb_array_length(v_existing_to_update) - 1 LOOP
                                v_elem := v_existing_to_update->j;
                                UPDATE produccion.production_schedules
                                SET start_date = v_parking_start,
                                    end_date = v_parking_start + ((v_elem->>'duration_minutes')::numeric * interval '1 minute')
                                WHERE id = (v_elem->>'id')::uuid;
                            END LOOP;
                        END IF;

                        IF jsonb_array_length(v_bulk_insert) > 0 THEN
                            FOR j IN 0..jsonb_array_length(v_bulk_insert) - 1 LOOP
                                v_elem := v_bulk_insert->j;
                                INSERT INTO produccion.production_schedules (
                                    id, production_order_number, resource_id, product_id,
                                    quantity, start_date, end_date, cascade_level,
                                    cascade_source_id, batch_number, total_batches,
                                    batch_size, status, produced_for_order_number,
                                    cascade_type, week_plan_id
                                ) VALUES (
                                    (v_elem->>'id')::uuid,
                                    (v_elem->>'production_order_number')::int,
                                    (v_elem->>'resource_id')::uuid,
                                    (v_elem->>'product_id')::uuid,
                                    (v_elem->>'quantity')::int,
                                    (v_elem->>'start_date')::timestamptz,
                                    (v_elem->>'end_date')::timestamptz,
                                    (v_elem->>'cascade_level')::int,
                                    (v_elem->>'cascade_source_id')::uuid,
                                    (v_elem->>'batch_number')::int,
                                    (v_elem->>'total_batches')::int,
                                    (v_elem->>'batch_size')::numeric,
                                    v_elem->>'status',
                                    (v_elem->>'produced_for_order_number')::int,
                                    v_elem->>'cascade_type',
                                    (v_elem->>'week_plan_id')::uuid
                                );
                                v_total_created := v_total_created + 1;
                            END LOOP;
                        END IF;

                        IF jsonb_array_length(v_existing_to_update) > 0 THEN
                            FOR j IN 0..jsonb_array_length(v_existing_to_update) - 1 LOOP
                                v_elem := v_existing_to_update->j;
                                UPDATE produccion.production_schedules
                                SET start_date = (v_elem->>'new_start_date')::timestamptz,
                                    end_date = (v_elem->>'new_end_date')::timestamptz
                                WHERE id = (v_elem->>'id')::uuid;
                            END LOOP;
                        END IF;
                    END IF;
                END LOOP;

                -- Use multi_created as current_schedules for next step, sorted by batch_number
                SELECT jsonb_agg(elem ORDER BY (elem->>'batch_number')::int)
                INTO v_current_schedules
                FROM jsonb_array_elements(v_multi_created) AS elem;
                v_current_schedules := COALESCE(v_current_schedules, '[]'::jsonb);
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

                -- Determine start time first for staff lookup
                IF jsonb_array_length(v_previous_schedules) = 0 THEN
                    -- Source WC: distribute evenly
                    v_batch_offset_hours := (p_duration_hours / v_num_batches) * (v_batch_idx - 1);
                    v_batch_start := v_start_dt + (v_batch_offset_hours * interval '1 hour');
                ELSE
                    -- Parallel: start on arrival
                    v_prev_end := (v_previous_schedules->(v_batch_idx - 1)->>'end_date')::timestamp;
                    v_batch_start := v_prev_end + (v_rest_time_hours * interval '1 hour');
                END IF;

                -- Get staff for this WC at batch start time
                IF v_step_idx = 0 THEN
                    v_wc_staff := p_staff_count;
                ELSE
                    v_wc_staff := produccion._cascade_v2_get_wc_staff(v_wc_id, v_batch_start);
                END IF;

                v_batch_duration := produccion._cascade_v2_batch_duration(
                    p_product_id, v_wc_id, v_operation_id, v_batch_size, v_wc_staff);

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

                v_current_schedules := v_current_schedules || jsonb_build_array(jsonb_build_object(
                    'id', v_schedule_id,
                    'start_date', v_batch_start,
                    'end_date', v_batch_end,
                    'batch_number', v_batch_idx
                ));
            END LOOP;

            -- Bulk insert parallel schedules
            IF p_create_in_db AND jsonb_array_length(v_bulk_insert) > 0 THEN
                FOR i IN 0..jsonb_array_length(v_bulk_insert) - 1 LOOP
                    v_elem := v_bulk_insert->i;
                    INSERT INTO produccion.production_schedules (
                        id, production_order_number, resource_id, product_id,
                        quantity, start_date, end_date, cascade_level,
                        cascade_source_id, batch_number, total_batches,
                        batch_size, status, produced_for_order_number,
                        cascade_type, week_plan_id
                    ) VALUES (
                        (v_elem->>'id')::uuid,
                        (v_elem->>'production_order_number')::int,
                        (v_elem->>'resource_id')::uuid,
                        (v_elem->>'product_id')::uuid,
                        (v_elem->>'quantity')::int,
                        (v_elem->>'start_date')::timestamptz,
                        (v_elem->>'end_date')::timestamptz,
                        (v_elem->>'cascade_level')::int,
                        (v_elem->>'cascade_source_id')::uuid,
                        (v_elem->>'batch_number')::int,
                        (v_elem->>'total_batches')::int,
                        (v_elem->>'batch_size')::numeric,
                        v_elem->>'status',
                        (v_elem->>'produced_for_order_number')::int,
                        v_elem->>'cascade_type',
                        (v_elem->>'week_plan_id')::uuid
                    );
                    v_total_created := v_total_created + 1;
                END LOOP;
            END IF;
        END IF;

        -- Track WC schedules for response
        v_wc_batches := '[]'::jsonb;
        FOR i IN 0..jsonb_array_length(v_current_schedules) - 1 LOOP
            v_elem := v_current_schedules->i;
            v_batch_start := (v_elem->>'start_date')::timestamp;
            v_batch_end := (v_elem->>'end_date')::timestamp;

            IF v_wc_earliest IS NULL OR v_batch_start < v_wc_earliest THEN
                v_wc_earliest := v_batch_start;
            END IF;
            IF v_wc_latest IS NULL OR v_batch_end > v_wc_latest THEN
                v_wc_latest := v_batch_end;
            END IF;
            IF v_batch_start < v_cascade_start THEN
                v_cascade_start := v_batch_start;
            END IF;
            IF v_batch_end > v_cascade_end THEN
                v_cascade_end := v_batch_end;
            END IF;

            v_wc_batches := v_wc_batches || jsonb_build_array(jsonb_build_object(
                'batch_number', (v_elem->>'batch_number')::int,
                'start', v_batch_start,
                'end', v_batch_end
            ));
        END LOOP;

        v_wc_schedules := v_wc_schedules || jsonb_build_object(
            v_wc_name, jsonb_build_object(
                'processing_mode', v_processing_mode,
                'start', v_wc_earliest,
                'end', v_wc_latest,
                'batches', v_wc_batches
            )
        );

        v_previous_schedules := v_current_schedules;

        -- Get last batch start for backward cascade
        IF v_step_idx = 0 THEN
            v_last_batch_start := NULL;
            FOR i IN 0..jsonb_array_length(v_current_schedules) - 1 LOOP
                v_batch_start := (v_current_schedules->i->>'start_date')::timestamp;
                IF v_last_batch_start IS NULL OR v_batch_start > v_last_batch_start THEN
                    v_last_batch_start := v_batch_start;
                END IF;
            END LOOP;
        END IF;
    END LOOP;

    -- ========================================
    -- BACKWARD CASCADE (PP dependencies)
    -- ========================================
    SELECT jsonb_agg(jsonb_build_object(
        'material_id', bom.material_id::text,
        'quantity_needed', bom.quantity_needed,
        'tiempo_reposo_horas', COALESCE(bom.tiempo_reposo_horas, 0)
    ))
    INTO v_pp_ingredients
    FROM produccion.bill_of_materials bom
    JOIN public.products p ON p.id = bom.material_id
    WHERE bom.product_id::text = p_product_id
      AND bom.is_active = true
      AND p.category = 'PP';

    IF v_pp_ingredients IS NOT NULL AND jsonb_array_length(v_pp_ingredients) > 0 THEN
        FOR i IN 0..jsonb_array_length(v_pp_ingredients) - 1 LOOP
            v_pp_result := produccion._cascade_v2_backward_cascade(
                p_pp_material_id := v_pp_ingredients->i->>'material_id',
                p_required_quantity := v_total_units * (v_pp_ingredients->i->>'quantity_needed')::numeric,
                p_parent_start_datetime := p_start_datetime,
                p_parent_duration_hours := p_duration_hours,
                p_parent_staff_count := p_staff_count,
                p_parent_lote_minimo := v_lote_minimo,
                p_parent_total_units := v_total_units,
                p_bom_rest_time_hours := (v_pp_ingredients->i->>'tiempo_reposo_horas')::numeric,
                p_create_in_db := p_create_in_db,
                p_depth := 1,
                p_max_depth := 5,
                p_week_start := v_week_start,
                p_week_end := v_week_end,
                p_context_start := v_context_start,
                p_context_end := v_context_end,
                p_produced_for_order_number := v_production_order_number,
                p_week_plan_id := p_week_plan_id,
                p_parent_last_batch_start := v_last_batch_start::timestamptz
            );

            IF v_pp_result IS NOT NULL THEN
                IF jsonb_typeof(v_pp_result) = 'array' THEN
                    v_pp_results := v_pp_results || v_pp_result;
                ELSE
                    v_pp_results := v_pp_results || jsonb_build_array(v_pp_result);
                END IF;
                -- Count PP schedules
                FOR j IN 0..jsonb_array_length(
                    CASE WHEN jsonb_typeof(v_pp_result) = 'array' THEN v_pp_result
                    ELSE jsonb_build_array(v_pp_result) END
                ) - 1 LOOP
                    v_elem := CASE WHEN jsonb_typeof(v_pp_result) = 'array'
                              THEN v_pp_result->j ELSE v_pp_result END;
                    v_total_created := v_total_created + COALESCE((v_elem->>'schedules_created')::int, 0);
                END LOOP;
            END IF;
        END LOOP;
    END IF;

    -- Re-enable triggers
    IF p_create_in_db THEN
        ALTER TABLE produccion.production_schedules ENABLE TRIGGER check_schedule_conflict;
        ALTER TABLE produccion.production_schedules ENABLE TRIGGER check_schedule_conflicts_trigger;
    END IF;

    EXCEPTION WHEN OTHERS THEN
        IF p_create_in_db THEN
            ALTER TABLE produccion.production_schedules ENABLE TRIGGER check_schedule_conflict;
            ALTER TABLE produccion.production_schedules ENABLE TRIGGER check_schedule_conflicts_trigger;
        END IF;
        RAISE;
    END;

    -- Build response
    v_response := jsonb_build_object(
        'production_order_number', v_production_order_number,
        'product_id', p_product_id,
        'product_name', v_product_name,
        'total_units', v_total_units::int,
        'lote_minimo', v_lote_minimo,
        'num_batches', v_num_batches,
        'schedules_created', v_total_created,
        'work_centers', v_wc_schedules,
        'cascade_start', v_cascade_start,
        'cascade_end', v_cascade_end,
        'pp_dependencies', v_pp_results
    );

    RETURN v_response;
END;
$$;

-- ============================================================
-- UPDATE _cascade_v2_backward_cascade: pass staff to batch_duration
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
    -- Queue simulation
    v_batch_finish_times interval[];
    v_batch_durations interval[];
    v_queue_end interval;
    v_max_dur interval;
    v_pp_total_time interval;
    v_pp_start timestamptz;
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
    v_pp_staff_count int;
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
    -- PP cascade result
    v_pp_cascade_result jsonb;
    -- Iterative adjustment
    v_target_time timestamptz;
    v_simulated_end timestamptz;
    v_gap interval;
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

    -- Simulate through PP route to calculate total time
    FOR j IN 0..v_pp_route_len - 1 LOOP
        v_op := v_pp_route->j;
        v_wc_id := v_op->>'work_center_id';
        v_is_par := (v_op->>'wc_tipo_capacidad') = 'carros'
                    AND (v_op->>'wc_capacidad_carros')::int > 1;

        -- Get staff for this WC (use parent_last_batch_start as reference time)
        v_pp_staff_count := produccion._cascade_v2_get_wc_staff(v_wc_id, v_parent_last_batch_start::timestamp);

        -- Get productivity and calculate batch durations with staff
        v_batch_durations := ARRAY[]::interval[];
        FOR i IN 1..v_num_pp_batches LOOP
            v_dur_min := produccion._cascade_v2_batch_duration(
                p_pp_material_id, v_wc_id, (v_op->>'wc_operation_id')::uuid, v_pp_batches[i],
                v_pp_staff_count);
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
            v_queue_end := interval '0';
            FOR i IN 1..v_num_pp_batches LOOP
                IF v_batch_finish_times[i] > v_queue_end THEN
                    v_batch_finish_times[i] := v_batch_finish_times[i] + v_batch_durations[i];
                ELSE
                    v_batch_finish_times[i] := v_queue_end + v_batch_durations[i];
                END IF;
                v_queue_end := v_batch_finish_times[i];
            END LOOP;
        END IF;

        -- Add rest time (except last step)
        IF j < v_pp_route_len - 1 THEN
            v_rest_hours := COALESCE((v_op->>'tiempo_reposo_horas')::numeric, 0);
            IF v_rest_hours > 0 THEN
                FOR i IN 1..v_num_pp_batches LOOP
                    v_batch_finish_times[i] := v_batch_finish_times[i] + (v_rest_hours * interval '1 hour');
                END LOOP;
            END IF;
        END IF;
    END LOOP;

    -- Get max finish time = total PP time
    v_pp_total_time := v_batch_finish_times[1];
    FOR i IN 2..v_num_pp_batches LOOP
        IF v_batch_finish_times[i] > v_pp_total_time THEN
            v_pp_total_time := v_batch_finish_times[i];
        END IF;
    END LOOP;

    -- Calculate PP start: parent_last_batch_start - pp_total_time - bom_rest
    v_target_time := v_parent_last_batch_start - (p_bom_rest_time_hours * interval '1 hour');
    v_pp_start := v_target_time - v_pp_total_time;

    -- Iterative adjustment for shift blocking (max 5 iterations)
    FOR v_iter IN 1..5 LOOP
        -- Simulate forward with blocked periods
        v_batch_finish_times := ARRAY[]::interval[];
        FOR i IN 1..v_num_pp_batches LOOP
            v_batch_finish_times := v_batch_finish_times || interval '0';
        END LOOP;

        FOR j IN 0..v_pp_route_len - 1 LOOP
            v_op := v_pp_route->j;
            v_wc_id := v_op->>'work_center_id';
            v_is_par := (v_op->>'wc_tipo_capacidad') = 'carros'
                        AND (v_op->>'wc_capacidad_carros')::int > 1;

            v_pp_staff_count := produccion._cascade_v2_get_wc_staff(v_wc_id, v_pp_start::timestamp);

            SELECT bp.block_starts, bp.block_ends
            INTO v_block_starts, v_block_ends
            FROM produccion._cascade_v2_blocked_periods(v_wc_id, v_query_start, v_query_end) bp;

            v_batch_durations := ARRAY[]::interval[];
            FOR i IN 1..v_num_pp_batches LOOP
                v_dur_min := produccion._cascade_v2_batch_duration(
                    p_pp_material_id, v_wc_id, (v_op->>'wc_operation_id')::uuid, v_pp_batches[i],
                    v_pp_staff_count);
                v_batch_durations := v_batch_durations || (v_dur_min * interval '1 minute');
            END LOOP;

            IF v_is_par THEN
                v_max_dur := v_batch_durations[1];
                FOR i IN 2..v_num_pp_batches LOOP
                    IF v_batch_durations[i] > v_max_dur THEN
                        v_max_dur := v_batch_durations[i];
                    END IF;
                END LOOP;
                FOR i IN 1..v_num_pp_batches LOOP
                    v_batch_start := v_pp_start + v_batch_finish_times[i];
                    IF v_block_starts IS NOT NULL AND array_length(v_block_starts, 1) > 0 THEN
                        v_batch_start := produccion._cascade_v2_skip_blocked(
                            v_batch_start, EXTRACT(EPOCH FROM v_max_dur)/60,
                            v_block_starts, v_block_ends);
                    END IF;
                    v_batch_end := v_batch_start + v_max_dur;
                    v_batch_finish_times[i] := v_batch_end - v_pp_start;
                END LOOP;
            ELSE
                v_queue_end := interval '0';
                FOR i IN 1..v_num_pp_batches LOOP
                    IF v_batch_finish_times[i] > v_queue_end THEN
                        v_batch_start := v_pp_start + v_batch_finish_times[i];
                    ELSE
                        v_batch_start := v_pp_start + v_queue_end;
                    END IF;
                    IF v_block_starts IS NOT NULL AND array_length(v_block_starts, 1) > 0 THEN
                        v_batch_start := produccion._cascade_v2_skip_blocked(
                            v_batch_start, EXTRACT(EPOCH FROM v_batch_durations[i])/60,
                            v_block_starts, v_block_ends);
                    END IF;
                    v_batch_end := v_batch_start + v_batch_durations[i];
                    v_batch_finish_times[i] := v_batch_end - v_pp_start;
                    v_queue_end := v_batch_end - v_pp_start;
                END LOOP;
            END IF;

            IF j < v_pp_route_len - 1 THEN
                v_rest_hours := COALESCE((v_op->>'tiempo_reposo_horas')::numeric, 0);
                IF v_rest_hours > 0 THEN
                    FOR i IN 1..v_num_pp_batches LOOP
                        v_batch_finish_times[i] := v_batch_finish_times[i] + (v_rest_hours * interval '1 hour');
                    END LOOP;
                END IF;
            END IF;
        END LOOP;

        v_pp_total_time := v_batch_finish_times[1];
        FOR i IN 2..v_num_pp_batches LOOP
            IF v_batch_finish_times[i] > v_pp_total_time THEN
                v_pp_total_time := v_batch_finish_times[i];
            END IF;
        END LOOP;

        v_simulated_end := v_pp_start + v_pp_total_time;
        v_gap := v_target_time - v_simulated_end;

        IF EXTRACT(EPOCH FROM v_gap) BETWEEN -60 AND 60 THEN
            EXIT;  -- Converged
        END IF;
        v_pp_start := v_pp_start + v_gap;  -- Adjust
    END LOOP;

    -- 3. Handle nested PP (recursion)
    SELECT jsonb_agg(jsonb_build_object(
        'material_id', bom.material_id::text,
        'quantity_needed', bom.quantity_needed,
        'tiempo_reposo_horas', COALESCE(bom.tiempo_reposo_horas, 0)
    ))
    INTO v_nested_pp
    FROM produccion.bill_of_materials bom
    JOIN public.products p ON p.id = bom.material_id
    WHERE bom.product_id::text = p_pp_material_id
      AND bom.is_active = true
      AND p.category = 'PP';

    IF v_nested_pp IS NOT NULL AND jsonb_array_length(v_nested_pp) > 0 THEN
        FOR i IN 0..jsonb_array_length(v_nested_pp) - 1 LOOP
            v_nested_pp_mat := v_nested_pp->i;
            v_nested_quantity := p_required_quantity * (v_nested_pp_mat->>'quantity_needed')::numeric;
            v_nested_rest := (v_nested_pp_mat->>'tiempo_reposo_horas')::numeric;

            -- Get PP productivity for duration
            SELECT usa_tiempo_fijo, tiempo_minimo_fijo, units_per_hour
            INTO v_first_wc_prod
            FROM produccion.production_productivity
            WHERE product_id::text = p_pp_material_id
              AND (work_center_id::text = (v_pp_route->0->>'work_center_id')
                   OR operation_id = (v_pp_route->0->>'wc_operation_id')::uuid)
            LIMIT 1;

            v_pp_staff_count := produccion._cascade_v2_get_wc_staff(
                v_pp_route->0->>'work_center_id', v_pp_start::timestamp);

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
                p_pp_material_id := v_nested_pp_mat->>'material_id',
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
                p_parent_last_batch_start := NULL
            );

            IF v_nested_result IS NOT NULL THEN
                IF jsonb_typeof(v_nested_result) = 'array' THEN
                    v_nested_results := v_nested_results || v_nested_result;
                ELSE
                    v_nested_results := v_nested_results || jsonb_build_array(v_nested_result);
                END IF;
            END IF;
        END LOOP;
    END IF;

    -- 4. Generate forward cascade for this PP
    SELECT usa_tiempo_fijo, tiempo_minimo_fijo, units_per_hour
    INTO v_first_wc_prod
    FROM produccion.production_productivity
    WHERE product_id::text = p_pp_material_id
      AND (work_center_id::text = (v_pp_route->0->>'work_center_id')
           OR operation_id = (v_pp_route->0->>'wc_operation_id')::uuid)
    LIMIT 1;

    v_pp_staff_count := produccion._cascade_v2_get_wc_staff(
        v_pp_route->0->>'work_center_id', v_pp_start::timestamp);

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
    v_target_time := v_parent_last_batch_start - (p_bom_rest_time_hours * interval '1 hour');

    -- Generate forward cascade for PP
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
        p_context_start := p_context_start,
        p_context_end := p_context_end,
        p_produced_for_order_number := p_produced_for_order_number,
        p_fixed_total_units := p_required_quantity,
        p_deadline := v_target_time
    );

    -- Merge nested results
    IF jsonb_array_length(v_nested_results) > 0 THEN
        IF v_pp_cascade_result IS NOT NULL THEN
            RETURN jsonb_build_array(v_pp_cascade_result) || v_nested_results;
        ELSE
            RETURN v_nested_results;
        END IF;
    END IF;

    RETURN v_pp_cascade_result;
END;
$$;

-- ============================================================
-- UPDATE _cascade_v2_forward_pp: pass staff to batch_duration
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
    v_schedule jsonb;
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
    -- Staff for downstream WCs
    v_wc_staff int;
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

        -- Rest time
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
            -- SEQUENTIAL / HYBRID PATH
            v_existing_schedules := produccion._cascade_v2_get_existing_with_arrival(
                v_wc_id, p_context_start, p_context_end);

            v_new_batches := '[]'::jsonb;
            FOR v_batch_idx IN 1..v_num_batches LOOP
                v_batch_size := v_batch_sizes[v_batch_idx];

                -- Calculate arrival time first
                IF jsonb_array_length(v_previous_schedules) > 0 THEN
                    v_prev_end := (v_previous_schedules->(v_batch_idx - 1)->>'end_date')::timestamp;
                    v_arrival_time := v_prev_end + (v_rest_time_hours * interval '1 hour');
                    v_cascade_source_id := (v_previous_schedules->(v_batch_idx - 1)->>'id')::uuid;
                ELSE
                    v_arrival_time := v_start_dt;
                    v_cascade_source_id := NULL;
                END IF;

                -- Get staff for this WC at arrival time
                IF v_step_idx = 0 THEN
                    v_wc_staff := p_staff_count;
                ELSE
                    v_wc_staff := produccion._cascade_v2_get_wc_staff(v_wc_id, v_arrival_time);
                END IF;

                v_batch_duration := produccion._cascade_v2_batch_duration(
                    p_product_id, v_wc_id, v_operation_id, v_batch_size, v_wc_staff);

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

            SELECT bp.block_starts, bp.block_ends
            INTO v_block_starts, v_block_ends
            FROM produccion._cascade_v2_blocked_periods(
                v_wc_id, p_context_start, p_context_end) bp;

            -- Check for multi-WC distribution (only if deadline exists)
            IF v_operation_id IS NOT NULL AND p_deadline IS NOT NULL THEN
                SELECT jsonb_agg(jsonb_build_object(
                    'work_center_id', pwcm.work_center_id::text,
                    'work_center_name', wc2.name
                ))
                INTO v_alt_wcs
                FROM produccion.product_work_center_mapping pwcm
                JOIN produccion.work_centers wc2 ON wc2.id = pwcm.work_center_id
                WHERE pwcm.product_id::text = p_product_id
                  AND pwcm.operation_id = v_operation_id;

                IF v_alt_wcs IS NOT NULL AND jsonb_array_length(v_alt_wcs) > 1 THEN
                    IF jsonb_array_length(v_previous_schedules) > 0 THEN
                        v_prev_end := (v_previous_schedules->0->>'end_date')::timestamp;
                        v_first_arrival := v_prev_end + (v_rest_time_hours * interval '1 hour');
                    ELSE
                        v_first_arrival := v_start_dt;
                    END IF;

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

                        v_wc_contexts := '[]'::jsonb;
                        FOR i IN 1..array_length(v_staffed_wc_ids, 1) LOOP
                            v_assigned_wc_id := v_staffed_wc_ids[i];
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
                                'block_starts', to_jsonb(COALESCE(v_alt_block_starts, ARRAY[]::timestamptz[])),
                                'block_ends', to_jsonb(COALESCE(v_alt_block_ends, ARRAY[]::timestamptz[]))
                            ));
                        END LOOP;
                    END IF;
                END IF;
            END IF;

            IF NOT v_use_multi_wc THEN
                v_all_schedules := v_existing_schedules || v_new_batches;
                v_recalculated := produccion._cascade_v2_recalculate_queue(
                    v_all_schedules, v_block_starts, v_block_ends, v_is_hybrid);

                v_existing_to_update := '[]'::jsonb;
                v_bulk_insert := '[]'::jsonb;

                FOR i IN 0..jsonb_array_length(v_recalculated) - 1 LOOP
                    v_elem := v_recalculated->i;
                    IF (v_elem->>'is_existing')::boolean THEN
                        v_existing_to_update := v_existing_to_update || jsonb_build_array(v_elem);
                    ELSE
                        v_schedule_id := gen_random_uuid();
                        v_batch_start := (v_elem->>'new_start_date')::timestamp;
                        v_batch_end := (v_elem->>'new_end_date')::timestamp;

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
                            'batch_number', (v_elem->>'batch_number')::int,
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

                        v_current_schedules := v_current_schedules || jsonb_build_array(jsonb_build_object(
                            'id', v_schedule_id,
                            'start_date', v_batch_start,
                            'end_date', v_batch_end,
                            'batch_number', (v_elem->>'batch_number')::int
                        ));
                    END IF;
                END LOOP;

                IF p_create_in_db THEN
                    v_parking_start := p_context_end::timestamp + interval '30 days';

                    IF jsonb_array_length(v_existing_to_update) > 0 THEN
                        FOR i IN 0..jsonb_array_length(v_existing_to_update) - 1 LOOP
                            v_elem := v_existing_to_update->i;
                            UPDATE produccion.production_schedules
                            SET start_date = v_parking_start,
                                end_date = v_parking_start + ((v_elem->>'duration_minutes')::numeric * interval '1 minute')
                            WHERE id = (v_elem->>'id')::uuid;
                        END LOOP;
                    END IF;

                    IF jsonb_array_length(v_bulk_insert) > 0 THEN
                        FOR i IN 0..jsonb_array_length(v_bulk_insert) - 1 LOOP
                            v_elem := v_bulk_insert->i;
                            INSERT INTO produccion.production_schedules (
                                id, production_order_number, resource_id, product_id,
                                quantity, start_date, end_date, cascade_level,
                                cascade_source_id, batch_number, total_batches,
                                batch_size, status, produced_for_order_number,
                                cascade_type, week_plan_id
                            ) VALUES (
                                (v_elem->>'id')::uuid,
                                (v_elem->>'production_order_number')::int,
                                (v_elem->>'resource_id')::uuid,
                                (v_elem->>'product_id')::uuid,
                                (v_elem->>'quantity')::int,
                                (v_elem->>'start_date')::timestamptz,
                                (v_elem->>'end_date')::timestamptz,
                                (v_elem->>'cascade_level')::int,
                                (v_elem->>'cascade_source_id')::uuid,
                                (v_elem->>'batch_number')::int,
                                (v_elem->>'total_batches')::int,
                                (v_elem->>'batch_size')::numeric,
                                v_elem->>'status',
                                (v_elem->>'produced_for_order_number')::int,
                                v_elem->>'cascade_type',
                                (v_elem->>'week_plan_id')::uuid
                            );
                            v_total_created := v_total_created + 1;
                        END LOOP;
                    END IF;

                    IF jsonb_array_length(v_existing_to_update) > 0 THEN
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
                -- Multi-WC distribution for PP
                v_distribution := produccion._cascade_v2_distribute_to_wcs(
                    v_new_batches, v_wc_contexts, p_deadline, v_is_hybrid);

                v_multi_created := '[]'::jsonb;
                v_parking_start := p_context_end::timestamp + interval '30 days';

                FOR i IN 0..jsonb_array_length(v_distribution) - 1 LOOP
                    v_ctx := v_distribution->i;
                    v_assigned_wc_id := v_ctx->>'wc_id';
                    v_assigned_batches := v_ctx->'assigned_batches';

                    IF v_assigned_batches IS NULL OR jsonb_array_length(v_assigned_batches) = 0 THEN
                        CONTINUE;
                    END IF;

                    -- Recalculate durations with this WC's productivity and staff
                    v_wc_staff := produccion._cascade_v2_get_wc_staff(v_assigned_wc_id, v_first_arrival);

                    FOR j IN 0..jsonb_array_length(v_assigned_batches) - 1 LOOP
                        v_batch_duration := produccion._cascade_v2_batch_duration(
                            p_product_id, v_assigned_wc_id,
                            v_operation_id, (v_assigned_batches->j->>'batch_size')::numeric,
                            v_wc_staff);
                        v_assigned_batches := jsonb_set(v_assigned_batches,
                            ARRAY[j::text, 'duration_minutes'], to_jsonb(v_batch_duration));
                    END LOOP;

                    v_all_schedules := (v_ctx->'existing_schedules') || v_assigned_batches;

                    SELECT bp.block_starts, bp.block_ends
                    INTO v_alt_block_starts, v_alt_block_ends
                    FROM produccion._cascade_v2_blocked_periods(
                        v_assigned_wc_id, p_context_start, p_context_end) bp;

                    v_recalculated := produccion._cascade_v2_recalculate_queue(
                        v_all_schedules, v_alt_block_starts, v_alt_block_ends, v_is_hybrid);

                    v_existing_to_update := '[]'::jsonb;
                    v_bulk_insert := '[]'::jsonb;

                    SELECT name INTO v_assigned_wc_name
                    FROM produccion.work_centers
                    WHERE id::text = v_assigned_wc_id;

                    FOR j IN 0..jsonb_array_length(v_recalculated) - 1 LOOP
                        v_elem := v_recalculated->j;
                        IF (v_elem->>'is_existing')::boolean THEN
                            v_existing_to_update := v_existing_to_update || jsonb_build_array(v_elem);
                        ELSE
                            v_schedule_id := gen_random_uuid();
                            v_batch_start := (v_elem->>'new_start_date')::timestamp;
                            v_batch_end := (v_elem->>'new_end_date')::timestamp;

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
                                'batch_number', (v_elem->>'batch_number')::int,
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

                            v_multi_created := v_multi_created || jsonb_build_array(jsonb_build_object(
                                'id', v_schedule_id,
                                'start_date', v_batch_start,
                                'end_date', v_batch_end,
                                'batch_number', (v_elem->>'batch_number')::int
                            ));
                        END IF;
                    END LOOP;

                    IF p_create_in_db THEN
                        IF jsonb_array_length(v_existing_to_update) > 0 THEN
                            FOR j IN 0..jsonb_array_length(v_existing_to_update) - 1 LOOP
                                v_elem := v_existing_to_update->j;
                                UPDATE produccion.production_schedules
                                SET start_date = v_parking_start,
                                    end_date = v_parking_start + ((v_elem->>'duration_minutes')::numeric * interval '1 minute')
                                WHERE id = (v_elem->>'id')::uuid;
                            END LOOP;
                        END IF;

                        IF jsonb_array_length(v_bulk_insert) > 0 THEN
                            FOR j IN 0..jsonb_array_length(v_bulk_insert) - 1 LOOP
                                v_elem := v_bulk_insert->j;
                                INSERT INTO produccion.production_schedules (
                                    id, production_order_number, resource_id, product_id,
                                    quantity, start_date, end_date, cascade_level,
                                    cascade_source_id, batch_number, total_batches,
                                    batch_size, status, produced_for_order_number,
                                    cascade_type, week_plan_id
                                ) VALUES (
                                    (v_elem->>'id')::uuid,
                                    (v_elem->>'production_order_number')::int,
                                    (v_elem->>'resource_id')::uuid,
                                    (v_elem->>'product_id')::uuid,
                                    (v_elem->>'quantity')::int,
                                    (v_elem->>'start_date')::timestamptz,
                                    (v_elem->>'end_date')::timestamptz,
                                    (v_elem->>'cascade_level')::int,
                                    (v_elem->>'cascade_source_id')::uuid,
                                    (v_elem->>'batch_number')::int,
                                    (v_elem->>'total_batches')::int,
                                    (v_elem->>'batch_size')::numeric,
                                    v_elem->>'status',
                                    (v_elem->>'produced_for_order_number')::int,
                                    v_elem->>'cascade_type',
                                    (v_elem->>'week_plan_id')::uuid
                                );
                                v_total_created := v_total_created + 1;
                            END LOOP;
                        END IF;

                        IF jsonb_array_length(v_existing_to_update) > 0 THEN
                            FOR j IN 0..jsonb_array_length(v_existing_to_update) - 1 LOOP
                                v_elem := v_existing_to_update->j;
                                UPDATE produccion.production_schedules
                                SET start_date = (v_elem->>'new_start_date')::timestamptz,
                                    end_date = (v_elem->>'new_end_date')::timestamptz
                                WHERE id = (v_elem->>'id')::uuid;
                            END LOOP;
                        END IF;
                    END IF;
                END LOOP;

                SELECT jsonb_agg(elem ORDER BY (elem->>'batch_number')::int)
                INTO v_current_schedules
                FROM jsonb_array_elements(v_multi_created) AS elem;
                v_current_schedules := COALESCE(v_current_schedules, '[]'::jsonb);
            END IF;

        ELSE
            -- PARALLEL PATH for PP
            SELECT bp.block_starts, bp.block_ends
            INTO v_block_starts, v_block_ends
            FROM produccion._cascade_v2_blocked_periods(
                v_wc_id, p_context_start, p_context_end) bp;

            FOR v_batch_idx IN 1..v_num_batches LOOP
                v_batch_size := v_batch_sizes[v_batch_idx];

                -- Determine start time first
                IF jsonb_array_length(v_previous_schedules) = 0 THEN
                    v_batch_offset_hours := (p_duration_hours / v_num_batches) * (v_batch_idx - 1);
                    v_batch_start := v_start_dt + (v_batch_offset_hours * interval '1 hour');
                ELSE
                    v_prev_end := (v_previous_schedules->(v_batch_idx - 1)->>'end_date')::timestamp;
                    v_batch_start := v_prev_end + (v_rest_time_hours * interval '1 hour');
                END IF;

                -- Get staff for this WC at batch start time
                IF v_step_idx = 0 THEN
                    v_wc_staff := p_staff_count;
                ELSE
                    v_wc_staff := produccion._cascade_v2_get_wc_staff(v_wc_id, v_batch_start);
                END IF;

                v_batch_duration := produccion._cascade_v2_batch_duration(
                    p_product_id, v_wc_id, v_operation_id, v_batch_size, v_wc_staff);

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

                IF p_week_plan_id IS NOT NULL THEN
                    v_schedule := v_schedule || jsonb_build_object('week_plan_id', p_week_plan_id);
                END IF;

                IF p_create_in_db THEN
                    INSERT INTO produccion.production_schedules (
                        id, production_order_number, resource_id, product_id,
                        quantity, start_date, end_date, cascade_level,
                        cascade_source_id, batch_number, total_batches,
                        batch_size, status, produced_for_order_number,
                        cascade_type, week_plan_id
                    ) VALUES (
                        (v_schedule->>'id')::uuid,
                        (v_schedule->>'production_order_number')::int,
                        (v_schedule->>'resource_id')::uuid,
                        (v_schedule->>'product_id')::uuid,
                        (v_schedule->>'quantity')::int,
                        (v_schedule->>'start_date')::timestamptz,
                        (v_schedule->>'end_date')::timestamptz,
                        (v_schedule->>'cascade_level')::int,
                        (v_schedule->>'cascade_source_id')::uuid,
                        (v_schedule->>'batch_number')::int,
                        (v_schedule->>'total_batches')::int,
                        (v_schedule->>'batch_size')::numeric,
                        v_schedule->>'status',
                        (v_schedule->>'produced_for_order_number')::int,
                        v_schedule->>'cascade_type',
                        (v_schedule->>'week_plan_id')::uuid
                    );
                    v_total_created := v_total_created + 1;
                END IF;

                v_current_schedules := v_current_schedules || jsonb_build_array(jsonb_build_object(
                    'id', v_schedule_id,
                    'start_date', v_batch_start,
                    'end_date', v_batch_end,
                    'batch_number', v_batch_idx
                ));
            END LOOP;
        END IF;

        -- Track WC schedules
        v_wc_batches := '[]'::jsonb;
        FOR i IN 0..jsonb_array_length(v_current_schedules) - 1 LOOP
            v_elem := v_current_schedules->i;
            v_batch_start := (v_elem->>'start_date')::timestamp;
            v_batch_end := (v_elem->>'end_date')::timestamp;

            IF v_wc_earliest IS NULL OR v_batch_start < v_wc_earliest THEN
                v_wc_earliest := v_batch_start;
            END IF;
            IF v_wc_latest IS NULL OR v_batch_end > v_wc_latest THEN
                v_wc_latest := v_batch_end;
            END IF;
            IF v_batch_start < v_cascade_start THEN
                v_cascade_start := v_batch_start;
            END IF;
            IF v_batch_end > v_cascade_end THEN
                v_cascade_end := v_batch_end;
            END IF;

            v_wc_batches := v_wc_batches || jsonb_build_array(jsonb_build_object(
                'batch_number', (v_elem->>'batch_number')::int,
                'start', v_batch_start,
                'end', v_batch_end
            ));
        END LOOP;

        v_wc_schedules := v_wc_schedules || jsonb_build_object(
            v_wc_name, jsonb_build_object(
                'processing_mode', v_processing_mode,
                'start', v_wc_earliest,
                'end', v_wc_latest,
                'batches', v_wc_batches
            )
        );

        v_previous_schedules := v_current_schedules;
    END LOOP;

    v_response := jsonb_build_object(
        'production_order_number', v_production_order_number,
        'product_id', p_product_id,
        'product_name', p_product_name,
        'total_units', v_total_units::int,
        'lote_minimo', p_lote_minimo,
        'num_batches', v_num_batches,
        'schedules_created', v_total_created,
        'work_centers', v_wc_schedules,
        'cascade_start', v_cascade_start,
        'cascade_end', v_cascade_end
    );

    RETURN v_response;
END;
$$;

-- ============================================================
-- GRANTS for new function
-- ============================================================
GRANT EXECUTE ON FUNCTION produccion._cascade_v2_get_wc_staff(text, timestamp) TO authenticated;
GRANT EXECUTE ON FUNCTION produccion._cascade_v2_get_wc_staff(text, timestamp) TO service_role;

-- Update grants for batch_duration with new signature (5 params -> 6 params)
GRANT EXECUTE ON FUNCTION produccion._cascade_v2_batch_duration(text, text, uuid, numeric, int, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION produccion._cascade_v2_batch_duration(text, text, uuid, numeric, int, numeric) TO service_role;

-- Re-grant main functions (signatures unchanged but bodies updated)
GRANT EXECUTE ON FUNCTION produccion.generate_cascade_v2(text, timestamptz, numeric, integer, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION produccion.generate_cascade_v2(text, timestamptz, numeric, integer, uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION produccion._cascade_v2_backward_cascade(text, numeric, timestamptz, numeric, integer, numeric, numeric, numeric, boolean, integer, integer, timestamptz, timestamptz, timestamptz, timestamptz, integer, uuid, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION produccion._cascade_v2_forward_pp(text, text, timestamptz, numeric, integer, numeric, jsonb, boolean, uuid, timestamptz, timestamptz, integer, numeric, timestamptz) TO service_role;
