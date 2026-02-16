-- RPC function to perform the four-phase update in a single DB round-trip
-- This replaces N individual UPDATE calls with 1 RPC call

-- Phase operation: park existing schedules, bulk insert new ones, move parked back
CREATE OR REPLACE FUNCTION produccion.cascade_bulk_upsert(
    p_schedules_to_park jsonb DEFAULT '[]'::jsonb,
    p_schedules_to_insert jsonb DEFAULT '[]'::jsonb,
    p_schedules_to_move jsonb DEFAULT '[]'::jsonb,
    p_parking_zone_wc_id text DEFAULT NULL,
    p_parking_zone_start timestamptz DEFAULT NULL,
    p_parking_zone_end timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    park_rec jsonb;
    insert_rec jsonb;
    move_rec jsonb;
    parking_cursor timestamptz;
    parked_count int := 0;
    inserted_count int := 0;
    moved_count int := 0;
BEGIN
    -- Phase 0: Clean parking area
    IF p_parking_zone_wc_id IS NOT NULL AND p_parking_zone_start IS NOT NULL THEN
        DELETE FROM produccion.production_schedules
        WHERE resource_id = p_parking_zone_wc_id
          AND start_date >= p_parking_zone_start
          AND start_date < p_parking_zone_end;
    END IF;

    -- Phase 1: Park existing schedules to far-future zone
    parking_cursor := p_parking_zone_start + interval '1 day';
    FOR park_rec IN SELECT * FROM jsonb_array_elements(p_schedules_to_park)
    LOOP
        UPDATE produccion.production_schedules
        SET start_date = parking_cursor,
            end_date = parking_cursor + ((park_rec->>'duration_minutes')::numeric * interval '1 minute')
        WHERE id = (park_rec->>'id')::uuid;

        parking_cursor := parking_cursor + ((park_rec->>'duration_minutes')::numeric * interval '1 minute');
        parked_count := parked_count + 1;
    END LOOP;

    -- Phase 2: Bulk insert new schedules
    FOR insert_rec IN SELECT * FROM jsonb_array_elements(p_schedules_to_insert)
    LOOP
        INSERT INTO produccion.production_schedules (
            id, production_order_number, resource_id, product_id, quantity,
            start_date, end_date, cascade_level, cascade_source_id,
            batch_number, total_batches, batch_size, status,
            produced_for_order_number, cascade_type, week_plan_id
        ) VALUES (
            (insert_rec->>'id')::uuid,
            (insert_rec->>'production_order_number')::int,
            insert_rec->>'resource_id',
            insert_rec->>'product_id',
            (insert_rec->>'quantity')::int,
            (insert_rec->>'start_date')::timestamptz,
            (insert_rec->>'end_date')::timestamptz,
            (insert_rec->>'cascade_level')::int,
            CASE WHEN insert_rec->>'cascade_source_id' IS NOT NULL
                 THEN (insert_rec->>'cascade_source_id')::uuid ELSE NULL END,
            (insert_rec->>'batch_number')::int,
            (insert_rec->>'total_batches')::int,
            (insert_rec->>'batch_size')::numeric,
            COALESCE(insert_rec->>'status', 'scheduled'),
            CASE WHEN insert_rec->>'produced_for_order_number' IS NOT NULL
                 THEN (insert_rec->>'produced_for_order_number')::int ELSE NULL END,
            insert_rec->>'cascade_type',
            CASE WHEN insert_rec->>'week_plan_id' IS NOT NULL
                 THEN (insert_rec->>'week_plan_id')::uuid ELSE NULL END
        );
        inserted_count := inserted_count + 1;
    END LOOP;

    -- Phase 3: Move parked schedules to final positions
    FOR move_rec IN SELECT * FROM jsonb_array_elements(p_schedules_to_move)
    LOOP
        UPDATE produccion.production_schedules
        SET start_date = (move_rec->>'start_date')::timestamptz,
            end_date = (move_rec->>'end_date')::timestamptz
        WHERE id = (move_rec->>'id')::uuid;
        moved_count := moved_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'parked', parked_count,
        'inserted', inserted_count,
        'moved', moved_count
    );
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION produccion.cascade_bulk_upsert(jsonb, jsonb, jsonb, text, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION produccion.cascade_bulk_upsert(jsonb, jsonb, jsonb, text, timestamptz, timestamptz) TO service_role;

COMMENT ON FUNCTION produccion.cascade_bulk_upsert IS 'Performs four-phase cascade update (park, insert, move) in a single DB round-trip for performance.';
