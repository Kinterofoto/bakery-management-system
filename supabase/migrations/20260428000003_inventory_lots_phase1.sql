-- Inventory by lot (phase 1): MP + PP/PT lots, FIFO consumption, traceability scaffolding.
--
-- Modelo:
--   inventario.lots — primer ciudadano del modelo. Cada recepción de MP crea un lote.
--   Cada finalización de producción crea un lote PP/PT vinculado al shift_production.
--   inventory_movements y material_consumptions ganan lot_id (FK opcional).
--
-- FIFO:
--   El RPC consume_fifo recorre lotes ORDER BY received_at ASC y crea N OUT movements
--   (uno por lote tocado). Si la cantidad excede el inventario por lote, dumping en el
--   lote más reciente (puede dejar quantity_remaining negativo, consistente con la
--   política de inventario negativo ya activa).
--
-- Compatibilidad: perform_inventory_movement se redefine añadiendo p_lot_id (opcional).
-- Llamadas existentes siguen funcionando sin cambios.

BEGIN;

-- ============================================================================
-- 1. Tabla inventario.lots
-- ============================================================================

CREATE TABLE IF NOT EXISTS inventario.lots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    lot_code text NOT NULL,
    quantity_initial numeric(14,3) NOT NULL,
    quantity_remaining numeric(14,3) NOT NULL,
    expiry_date date,
    source_type varchar(20) NOT NULL CHECK (source_type IN ('reception','production','manual','backfill')),
    reception_id uuid,
    shift_production_id uuid REFERENCES produccion.shift_productions(id) ON DELETE SET NULL,
    received_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (product_id, lot_code)
);

ALTER TABLE inventario.lots OWNER TO postgres;

CREATE INDEX IF NOT EXISTS idx_lots_product_remaining
    ON inventario.lots (product_id, received_at)
    WHERE quantity_remaining > 0;

CREATE INDEX IF NOT EXISTS idx_lots_product
    ON inventario.lots (product_id);

CREATE INDEX IF NOT EXISTS idx_lots_shift_production
    ON inventario.lots (shift_production_id)
    WHERE shift_production_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lots_reception
    ON inventario.lots (reception_id)
    WHERE reception_id IS NOT NULL;

ALTER TABLE inventario.lots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read lots" ON inventario.lots;
CREATE POLICY "Authenticated read lots" ON inventario.lots
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated write lots" ON inventario.lots;
CREATE POLICY "Authenticated write lots" ON inventario.lots
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON inventario.lots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON inventario.lots TO service_role;

COMMENT ON TABLE inventario.lots IS
    'Lotes de inventario. Cada recepción de MP crea un lote (lot_code = batch_number); cada finalización de producción crea un lote PP/PT (lot_code = <PRODUCT_CODE>-<YYYYMMDD-HHMM>-<id_short>). FIFO se basa en received_at.';

-- ============================================================================
-- 2. Columnas lot_id en movements y material_consumptions
-- ============================================================================

ALTER TABLE inventario.inventory_movements
    ADD COLUMN IF NOT EXISTS lot_id uuid REFERENCES inventario.lots(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_movements_lot
    ON inventario.inventory_movements (lot_id)
    WHERE lot_id IS NOT NULL;

ALTER TABLE produccion.material_consumptions
    ADD COLUMN IF NOT EXISTS lot_id uuid REFERENCES inventario.lots(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_material_consumptions_lot
    ON produccion.material_consumptions (lot_id)
    WHERE lot_id IS NOT NULL;

-- ============================================================================
-- 3. Helper: generador de lot_code para producción
-- ============================================================================

CREATE OR REPLACE FUNCTION inventario.generate_production_lot_code(
    p_product_id uuid,
    p_shift_production_id uuid
) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
    v_code text;
    v_short text;
BEGIN
    SELECT COALESCE(
        NULLIF(codigo_wo, ''),
        upper(left(regexp_replace(coalesce(name, 'PROD'), '[^a-zA-Z0-9]', '', 'g'), 6))
    )
    INTO v_code
    FROM public.products WHERE id = p_product_id;

    v_short := upper(left(replace(p_shift_production_id::text, '-', ''), 6));
    RETURN COALESCE(NULLIF(v_code, ''), 'PROD') || '-' || to_char(now(), 'YYYYMMDD-HH24MI') || '-' || v_short;
END;
$$;

ALTER FUNCTION inventario.generate_production_lot_code(uuid, uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION inventario.generate_production_lot_code(uuid, uuid) TO authenticated, service_role;

-- ============================================================================
-- 4. Recreate perform_inventory_movement con soporte de p_lot_id
--    + auto-creación de lote en IN/purchase y IN/production
-- ============================================================================

DROP FUNCTION IF EXISTS inventario.perform_inventory_movement(
    uuid, numeric, varchar, varchar, uuid, uuid, uuid, varchar, text, uuid, varchar, date
);

CREATE OR REPLACE FUNCTION inventario.perform_inventory_movement(
    p_product_id uuid,
    p_quantity numeric,
    p_movement_type varchar,
    p_reason_type varchar,
    p_location_id_from uuid DEFAULT NULL,
    p_location_id_to uuid DEFAULT NULL,
    p_reference_id uuid DEFAULT NULL,
    p_reference_type varchar DEFAULT NULL,
    p_notes text DEFAULT NULL,
    p_recorded_by uuid DEFAULT NULL,
    p_batch_number varchar DEFAULT NULL,
    p_expiry_date date DEFAULT NULL,
    p_lot_id uuid DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_movement_id uuid;
    v_balance_after numeric;
    v_movement_number varchar;
    v_unit_of_measure varchar;
    v_affected_location uuid;
    v_balance_update_location uuid;
    v_actual_recorded_by uuid;
    v_lot_id uuid := p_lot_id;
    v_lot_code text;
BEGIN
    -- 1. Validations
    IF p_movement_type NOT IN ('IN','OUT','TRANSFER_IN','TRANSFER_OUT') THEN
        RAISE EXCEPTION 'Invalid movement_type: %', p_movement_type;
    END IF;
    IF p_reason_type NOT IN ('purchase','production','sale','consumption','adjustment','return','waste','transfer','initial') THEN
        RAISE EXCEPTION 'Invalid reason_type: %', p_reason_type;
    END IF;

    IF p_location_id_to IS NULL AND p_movement_type IN ('IN','TRANSFER_IN') THEN
        p_location_id_to := inventario.get_default_location(p_reason_type);
    END IF;

    IF p_movement_type = 'IN' AND p_location_id_to IS NULL THEN
        RAISE EXCEPTION 'Movement type IN requires location_id_to and no default location found';
    END IF;
    IF p_movement_type = 'OUT' AND p_location_id_from IS NULL THEN
        RAISE EXCEPTION 'Movement type OUT requires location_id_from';
    END IF;
    IF p_movement_type IN ('TRANSFER_IN','TRANSFER_OUT') AND (p_location_id_from IS NULL OR p_location_id_to IS NULL) THEN
        RAISE EXCEPTION 'Transfer movements require both location_id_from and location_id_to';
    END IF;

    SELECT unit INTO v_unit_of_measure FROM public.products WHERE id = p_product_id;
    IF v_unit_of_measure IS NULL THEN
        RAISE EXCEPTION 'Product not found: %', p_product_id;
    END IF;

    v_affected_location := CASE p_movement_type
        WHEN 'OUT' THEN p_location_id_from
        WHEN 'TRANSFER_OUT' THEN p_location_id_from
        WHEN 'IN' THEN p_location_id_to
        WHEN 'TRANSFER_IN' THEN p_location_id_to
        ELSE COALESCE(p_location_id_to, p_location_id_from)
    END;

    v_balance_after := inventario.calculate_balance_after(p_product_id, v_affected_location, p_quantity, p_movement_type);
    v_movement_number := inventario.generate_movement_number();
    v_actual_recorded_by := COALESCE(p_recorded_by, auth.uid());
    IF v_actual_recorded_by IS NULL THEN
        RAISE EXCEPTION 'recorded_by is required (no authenticated user found)';
    END IF;

    -- 2. Lot handling (NEW). Auto-create on IN movements with semantic context.
    IF v_lot_id IS NULL AND p_movement_type = 'IN' THEN
        IF p_reason_type = 'purchase' THEN
            v_lot_code := COALESCE(
                NULLIF(p_batch_number, ''),
                'REC-' || to_char(now(), 'YYYYMMDD-HH24MISS') || '-' || upper(left(replace(gen_random_uuid()::text, '-', ''), 4))
            );

            INSERT INTO inventario.lots (
                product_id, lot_code, quantity_initial, quantity_remaining,
                expiry_date, source_type, reception_id, received_at, created_by
            ) VALUES (
                p_product_id, v_lot_code, p_quantity, p_quantity,
                p_expiry_date, 'reception',
                CASE WHEN p_reference_type IN ('material_reception','direct_reception') THEN p_reference_id ELSE NULL END,
                NOW(), v_actual_recorded_by
            )
            ON CONFLICT (product_id, lot_code) DO UPDATE SET
                quantity_initial = inventario.lots.quantity_initial + EXCLUDED.quantity_initial,
                quantity_remaining = inventario.lots.quantity_remaining + EXCLUDED.quantity_initial,
                expiry_date = COALESCE(inventario.lots.expiry_date, EXCLUDED.expiry_date),
                updated_at = NOW()
            RETURNING id INTO v_lot_id;

        ELSIF p_reason_type = 'production' AND p_reference_type = 'shift_production' AND p_reference_id IS NOT NULL THEN
            -- Reusar lote si ya existe para este shift_production (caso buenas + malas)
            SELECT id INTO v_lot_id
            FROM inventario.lots
            WHERE shift_production_id = p_reference_id
              AND product_id = p_product_id
            LIMIT 1;

            IF v_lot_id IS NULL THEN
                v_lot_code := inventario.generate_production_lot_code(p_product_id, p_reference_id);
                INSERT INTO inventario.lots (
                    product_id, lot_code, quantity_initial, quantity_remaining,
                    expiry_date, source_type, shift_production_id, received_at, created_by
                ) VALUES (
                    p_product_id, v_lot_code, p_quantity, p_quantity,
                    p_expiry_date, 'production', p_reference_id, NOW(), v_actual_recorded_by
                )
                RETURNING id INTO v_lot_id;
            ELSE
                UPDATE inventario.lots
                SET quantity_initial = quantity_initial + p_quantity,
                    quantity_remaining = quantity_remaining + p_quantity,
                    updated_at = NOW()
                WHERE id = v_lot_id;
            END IF;
        END IF;
    ELSIF v_lot_id IS NOT NULL THEN
        -- Lote explícito: ajustar quantity_remaining según el tipo de movimiento.
        UPDATE inventario.lots
        SET quantity_remaining = quantity_remaining +
                CASE WHEN p_movement_type IN ('IN','TRANSFER_IN') THEN p_quantity
                     WHEN p_movement_type IN ('OUT','TRANSFER_OUT') THEN -p_quantity
                     ELSE 0 END,
            updated_at = NOW()
        WHERE id = v_lot_id;
    END IF;

    -- 3. Insert movement
    INSERT INTO inventario.inventory_movements (
        id, movement_number, product_id, quantity, unit_of_measure,
        movement_type, reason_type, location_id_from, location_id_to,
        balance_after, reference_id, reference_type, notes, recorded_by,
        movement_date, batch_number, expiry_date, lot_id
    ) VALUES (
        gen_random_uuid(), v_movement_number, p_product_id, p_quantity, v_unit_of_measure,
        p_movement_type, p_reason_type, p_location_id_from, p_location_id_to,
        v_balance_after, p_reference_id, p_reference_type, p_notes, v_actual_recorded_by,
        NOW(), p_batch_number, p_expiry_date, v_lot_id
    ) RETURNING id INTO v_movement_id;

    v_balance_update_location := CASE p_movement_type
        WHEN 'OUT' THEN p_location_id_from
        WHEN 'TRANSFER_OUT' THEN p_location_id_from
        WHEN 'IN' THEN p_location_id_to
        WHEN 'TRANSFER_IN' THEN p_location_id_to
        ELSE v_affected_location
    END;

    PERFORM inventario.update_inventory_balance(p_product_id, v_balance_update_location, p_quantity, p_movement_type, v_movement_id);

    RETURN json_build_object(
        'success', true,
        'movement_id', v_movement_id,
        'movement_number', v_movement_number,
        'balance_after', v_balance_after,
        'affected_location', v_affected_location,
        'lot_id', v_lot_id
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating movement: %', SQLERRM;
END;
$$;

ALTER FUNCTION inventario.perform_inventory_movement(
    uuid, numeric, varchar, varchar, uuid, uuid, uuid, varchar, text, uuid, varchar, date, uuid
) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION inventario.perform_inventory_movement(
    uuid, numeric, varchar, varchar, uuid, uuid, uuid, varchar, text, uuid, varchar, date, uuid
) TO anon, authenticated, service_role;

COMMENT ON FUNCTION inventario.perform_inventory_movement(
    uuid, numeric, varchar, varchar, uuid, uuid, uuid, varchar, text, uuid, varchar, date, uuid
) IS 'Core function to create inventory movements. Auto-creates a lot on IN/purchase and IN/production movements when p_lot_id is null. Updates lots.quantity_remaining when a lot is associated.';

-- ============================================================================
-- 5. consume_fifo helper (multi-OUT por lote, FIFO)
-- ============================================================================

CREATE OR REPLACE FUNCTION inventario.consume_fifo(
    p_product_id uuid,
    p_quantity numeric,
    p_location_id_from uuid,
    p_reference_id uuid DEFAULT NULL,
    p_reference_type varchar DEFAULT NULL,
    p_notes text DEFAULT NULL,
    p_recorded_by uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_remaining numeric := p_quantity;
    v_take numeric;
    v_lot record;
    v_breakdown jsonb := '[]'::jsonb;
    v_recorded_by uuid;
    v_recent_lot_id uuid;
    v_recent_lot_code text;
BEGIN
    v_recorded_by := COALESCE(p_recorded_by, auth.uid());

    IF p_quantity <= 0 THEN
        RETURN jsonb_build_object('breakdown', '[]'::jsonb, 'consumed', 0);
    END IF;

    FOR v_lot IN
        SELECT id, lot_code, quantity_remaining
        FROM inventario.lots
        WHERE product_id = p_product_id AND quantity_remaining > 0
        ORDER BY received_at ASC, created_at ASC
    LOOP
        IF v_remaining <= 0 THEN EXIT; END IF;

        v_take := LEAST(v_remaining, v_lot.quantity_remaining);

        PERFORM inventario.perform_inventory_movement(
            p_product_id => p_product_id,
            p_quantity => v_take,
            p_movement_type => 'OUT',
            p_reason_type => 'consumption',
            p_location_id_from => p_location_id_from,
            p_location_id_to => NULL,
            p_reference_id => p_reference_id,
            p_reference_type => p_reference_type,
            p_notes => p_notes,
            p_recorded_by => v_recorded_by,
            p_batch_number => v_lot.lot_code,
            p_expiry_date => NULL,
            p_lot_id => v_lot.id
        );

        v_breakdown := v_breakdown || jsonb_build_array(jsonb_build_object(
            'lot_id', v_lot.id, 'lot_code', v_lot.lot_code, 'quantity', v_take
        ));
        v_remaining := v_remaining - v_take;
    END LOOP;

    -- Si todavía queda cantidad por consumir → al lote más reciente (queda negativo)
    IF v_remaining > 0 THEN
        SELECT id, lot_code INTO v_recent_lot_id, v_recent_lot_code
        FROM inventario.lots
        WHERE product_id = p_product_id
        ORDER BY received_at DESC, created_at DESC
        LIMIT 1;

        IF v_recent_lot_id IS NOT NULL THEN
            PERFORM inventario.perform_inventory_movement(
                p_product_id => p_product_id,
                p_quantity => v_remaining,
                p_movement_type => 'OUT',
                p_reason_type => 'consumption',
                p_location_id_from => p_location_id_from,
                p_reference_id => p_reference_id,
                p_reference_type => p_reference_type,
                p_notes => COALESCE(p_notes,'') || ' [overdraft FIFO]',
                p_recorded_by => v_recorded_by,
                p_batch_number => v_recent_lot_code,
                p_lot_id => v_recent_lot_id
            );
            v_breakdown := v_breakdown || jsonb_build_array(jsonb_build_object(
                'lot_id', v_recent_lot_id, 'lot_code', v_recent_lot_code, 'quantity', v_remaining, 'overdraft', true
            ));
        ELSE
            -- Producto sin lotes registrados: consumo "huérfano" (sin lot_id)
            PERFORM inventario.perform_inventory_movement(
                p_product_id => p_product_id,
                p_quantity => v_remaining,
                p_movement_type => 'OUT',
                p_reason_type => 'consumption',
                p_location_id_from => p_location_id_from,
                p_reference_id => p_reference_id,
                p_reference_type => p_reference_type,
                p_notes => COALESCE(p_notes,'') || ' [sin lotes — registro huérfano]',
                p_recorded_by => v_recorded_by
            );
            v_breakdown := v_breakdown || jsonb_build_array(jsonb_build_object(
                'lot_id', NULL, 'quantity', v_remaining, 'no_lots', true
            ));
        END IF;
        v_remaining := 0;
    END IF;

    RETURN jsonb_build_object('breakdown', v_breakdown, 'consumed', p_quantity);
END;
$$;

ALTER FUNCTION inventario.consume_fifo(uuid, numeric, uuid, uuid, varchar, text, uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION inventario.consume_fifo(uuid, numeric, uuid, uuid, varchar, text, uuid) TO authenticated, service_role;

COMMENT ON FUNCTION inventario.consume_fifo(uuid, numeric, uuid, uuid, varchar, text, uuid) IS
    'Consume p_quantity walking lots FIFO (received_at ASC). Emits one OUT movement per lot touched. If quantity exceeds available stock, dumps the remainder on the most recent lot (negative). Returns jsonb {breakdown:[{lot_id,quantity,...}], consumed}.';

-- ============================================================================
-- 6. Rewire finalize_production_auto_consume to use FIFO
-- ============================================================================

CREATE OR REPLACE FUNCTION produccion.finalize_production_auto_consume(
    p_shift_production_id uuid
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'produccion','inventario','public'
AS $$
DECLARE
    v_production    produccion.shift_productions%ROWTYPE;
    v_work_center   produccion.work_centers%ROWTYPE;
    v_operation_id  uuid;
    v_variant_id    uuid;
    v_location_id   uuid;
    v_user_id       uuid;
    v_bom           record;
    v_qty           numeric;
    v_lines_count   integer := 0;
    v_fifo_result   jsonb;
    v_lot_line      record;
BEGIN
    SELECT * INTO v_production
    FROM produccion.shift_productions
    WHERE id = p_shift_production_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'shift_production % no existe', p_shift_production_id;
    END IF;

    IF v_production.materials_auto_deducted THEN
        RETURN json_build_object('status','skipped','reason','already_deducted','lines_processed',0);
    END IF;

    IF COALESCE(v_production.total_good_units, 0) <= 0 THEN
        UPDATE produccion.shift_productions
        SET materials_auto_deducted = true, updated_at = now()
        WHERE id = p_shift_production_id;
        RETURN json_build_object('status','skipped','reason','no_good_units','lines_processed',0);
    END IF;

    SELECT wc.* INTO v_work_center
    FROM produccion.production_shifts ps
    JOIN produccion.work_centers wc ON wc.id = ps.work_center_id
    WHERE ps.id = v_production.shift_id;

    IF NOT FOUND OR v_work_center.operation_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró centro de trabajo u operación para la producción %', p_shift_production_id;
    END IF;
    v_operation_id := v_work_center.operation_id;

    v_variant_id := v_production.bom_variant_id;
    IF v_variant_id IS NULL THEN
        SELECT id INTO v_variant_id
        FROM produccion.bom_variants
        WHERE product_id = v_production.product_id AND is_default = true
        LIMIT 1;
    END IF;

    SELECT id INTO v_location_id
    FROM inventario.locations
    WHERE code = 'WH1-RECEIVING'
    LIMIT 1;
    IF v_location_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró la ubicación WH1-RECEIVING';
    END IF;

    v_user_id := auth.uid();

    FOR v_bom IN
        SELECT bom.material_id, bom.quantity_needed
        FROM produccion.bill_of_materials bom
        WHERE bom.product_id = v_production.product_id
          AND bom.is_active = true
          AND bom.material_id IS NOT NULL
          AND bom.operation_id = v_operation_id
          AND ((v_variant_id IS NOT NULL AND bom.variant_id = v_variant_id)
            OR (v_variant_id IS NULL AND bom.variant_id IS NULL))
    LOOP
        v_qty := COALESCE(v_bom.quantity_needed, 0) * v_production.total_good_units;
        IF v_qty <= 0 THEN CONTINUE; END IF;

        v_fifo_result := inventario.consume_fifo(
            p_product_id => v_bom.material_id,
            p_quantity => v_qty,
            p_location_id_from => v_location_id,
            p_reference_id => v_production.id,
            p_reference_type => 'shift_production',
            p_notes => 'Auto-consumo BOM al finalizar producción',
            p_recorded_by => v_user_id
        );

        -- Persist material_consumptions per lot for traceability
        FOR v_lot_line IN
            SELECT
                (item->>'lot_id')::uuid AS lot_id,
                (item->>'quantity')::numeric AS quantity
            FROM jsonb_array_elements(v_fifo_result->'breakdown') AS item
        LOOP
            INSERT INTO produccion.material_consumptions
                (shift_production_id, material_id, quantity_consumed, consumption_type, recorded_by, notes, lot_id)
            VALUES
                (v_production.id, v_bom.material_id, v_lot_line.quantity, 'auto_bom', v_user_id,
                 'Descuento automático BOM al finalizar producción', v_lot_line.lot_id);
        END LOOP;

        v_lines_count := v_lines_count + 1;
    END LOOP;

    UPDATE produccion.shift_productions
    SET materials_auto_deducted = true, updated_at = now()
    WHERE id = p_shift_production_id;

    RETURN json_build_object(
        'status','ok',
        'lines_processed', v_lines_count,
        'good_units', v_production.total_good_units,
        'operation_id', v_operation_id,
        'variant_id', v_variant_id
    );
END;
$$;

ALTER FUNCTION produccion.finalize_production_auto_consume(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION produccion.finalize_production_auto_consume(uuid) TO authenticated, service_role;

-- ============================================================================
-- 7. Backfill: un lote INICIAL por producto con balance positivo
-- ============================================================================

INSERT INTO inventario.lots (
    product_id, lot_code, quantity_initial, quantity_remaining,
    source_type, received_at, notes
)
SELECT
    totals.product_id,
    'INICIAL-' || to_char(now(), 'YYYYMMDD'),
    totals.total_balance,
    totals.total_balance,
    'backfill',
    -- Datado en el pasado para que cualquier recepción nueva sea más joven (FIFO consume primero el INICIAL)
    now() - interval '1 year',
    'Lote inicial creado por backfill desde inventory_balances. Ajustar manualmente si es necesario.'
FROM (
    SELECT product_id, SUM(quantity_on_hand) AS total_balance
    FROM inventario.inventory_balances
    GROUP BY product_id
) totals
WHERE totals.total_balance > 0
ON CONFLICT (product_id, lot_code) DO NOTHING;

-- ============================================================================
-- 8. Helper RPC: ajuste de cantidad de un lote (para Kardex/Adjustments)
-- ============================================================================

CREATE OR REPLACE FUNCTION inventario.adjust_lot_quantity(
    p_lot_id uuid,
    p_new_remaining numeric,
    p_notes text DEFAULT NULL,
    p_recorded_by uuid DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_lot inventario.lots%ROWTYPE;
    v_delta numeric;
    v_movement_type varchar;
    v_user_id uuid;
    v_default_location uuid;
BEGIN
    SELECT * INTO v_lot FROM inventario.lots WHERE id = p_lot_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lot % not found', p_lot_id;
    END IF;

    v_user_id := COALESCE(p_recorded_by, auth.uid());
    v_delta := p_new_remaining - v_lot.quantity_remaining;

    IF v_delta = 0 THEN
        RETURN json_build_object('status','noop','lot_id',p_lot_id);
    END IF;

    SELECT id INTO v_default_location FROM inventario.locations WHERE code = 'WH1-RECEIVING' LIMIT 1;

    IF v_delta > 0 THEN
        v_movement_type := 'IN';
    ELSE
        v_movement_type := 'OUT';
    END IF;

    PERFORM inventario.perform_inventory_movement(
        p_product_id => v_lot.product_id,
        p_quantity => abs(v_delta),
        p_movement_type => v_movement_type,
        p_reason_type => 'adjustment',
        p_location_id_from => CASE WHEN v_movement_type = 'OUT' THEN v_default_location ELSE NULL END,
        p_location_id_to => CASE WHEN v_movement_type = 'IN' THEN v_default_location ELSE NULL END,
        p_reference_id => p_lot_id,
        p_reference_type => 'lot_adjustment',
        p_notes => COALESCE(p_notes, 'Ajuste manual de lote ' || v_lot.lot_code),
        p_recorded_by => v_user_id,
        p_lot_id => p_lot_id
    );

    RETURN json_build_object('status','ok','lot_id',p_lot_id,'delta',v_delta,'new_remaining',p_new_remaining);
END;
$$;

ALTER FUNCTION inventario.adjust_lot_quantity(uuid, numeric, text, uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION inventario.adjust_lot_quantity(uuid, numeric, text, uuid) TO authenticated, service_role;

COMMENT ON FUNCTION inventario.adjust_lot_quantity(uuid, numeric, text, uuid) IS
    'Set lot.quantity_remaining to p_new_remaining and emit a corresponding adjustment movement (IN if delta>0, OUT if delta<0).';

COMMIT;
