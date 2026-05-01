-- Inventory lots phase 2: lot/internal codes con la lógica de la compañía + order_item_lots.
--
-- Lot code (customer-facing, semanal):  YYWW [+ L cuando ISODOW >= 4]   ej: 2613, 2613L
-- Internal code (traceability interno): DD-MM<S> HH:MM (Bogotá)         ej: 25-03M 09:30
--   Turnos:  M = 06:00–14:00 / T = 14:00–22:00 / N = 22:00–06:00 (siguiente día)
--
-- Multi-lot por order_item: tabla order_item_lots con (lot_id, shift_production_id,
-- internal_code, quantity, sequence). order_items.lot_id/internal_code se conservan
-- como denormalización del primer lote asignado (compatibilidad).
--
-- perform_inventory_movement cambia el lookup de lote para producción: en lugar de
-- buscar por shift_production_id (Phase 1), busca por (product_id, lot_code) — así
-- todas las producciones del mismo producto en la misma "mitad-de-semana" mergean al
-- mismo lote sumando inventario.

BEGIN;

-- ============================================================================
-- 1. Helpers de formato (Bogotá)
-- ============================================================================

CREATE OR REPLACE FUNCTION produccion.compute_lot_code(p_ts timestamptz DEFAULT now())
RETURNS text LANGUAGE plpgsql IMMUTABLE
SET search_path TO 'produccion','public' AS $$
DECLARE
    v_local timestamp;
    v_dow int;
BEGIN
    v_local := p_ts AT TIME ZONE 'America/Bogota';
    v_dow := EXTRACT(ISODOW FROM v_local)::int; -- 1=Mon … 7=Sun
    -- IYIW = ISO year (4 digits) + ISO week (2 digits). Tomamos los últimos 4 chars (YYWW).
    RETURN substr(to_char(v_local, 'IYIW'), 3) ||
           CASE WHEN v_dow >= 4 THEN 'L' ELSE '' END;
END;
$$;

ALTER FUNCTION produccion.compute_lot_code(timestamptz) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION produccion.compute_lot_code(timestamptz) TO anon, authenticated, service_role;
COMMENT ON FUNCTION produccion.compute_lot_code(timestamptz) IS
    'Lot code (customer-facing, semanal): YYWW + L cuando ISODOW >= 4 (jueves–domingo). Bogotá TZ.';

CREATE OR REPLACE FUNCTION produccion.compute_internal_code(p_ts timestamptz DEFAULT now())
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
    v_local timestamp;
    v_hour int;
    v_shift text;
BEGIN
    v_local := p_ts AT TIME ZONE 'America/Bogota';
    v_hour := EXTRACT(HOUR FROM v_local)::int;
    v_shift := CASE
        WHEN v_hour >= 6 AND v_hour < 14 THEN 'M'
        WHEN v_hour >= 14 AND v_hour < 22 THEN 'T'
        ELSE 'N'
    END;
    RETURN to_char(v_local, 'DD-MM') || v_shift || ' ' || to_char(v_local, 'HH24:MI');
END;
$$;

ALTER FUNCTION produccion.compute_internal_code(timestamptz) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION produccion.compute_internal_code(timestamptz) TO anon, authenticated, service_role;
COMMENT ON FUNCTION produccion.compute_internal_code(timestamptz) IS
    'Internal code (per-empacado): DD-MM<S> HH:MM en Bogotá. Turnos M(06–14) T(14–22) N(22–06).';

-- ============================================================================
-- 2. Columnas nuevas
-- ============================================================================

ALTER TABLE produccion.shift_productions
    ADD COLUMN IF NOT EXISTS internal_code text;

CREATE INDEX IF NOT EXISTS idx_shift_productions_internal_code
    ON produccion.shift_productions(internal_code)
    WHERE internal_code IS NOT NULL;

COMMENT ON COLUMN produccion.shift_productions.internal_code IS
    'Código interno por empacado (formato DD-MM<S> HH:MM, Bogotá). Set automáticamente cuando se crea el movimiento IN/production al finalizar la producción.';

ALTER TABLE public.order_items
    ADD COLUMN IF NOT EXISTS lot_id uuid REFERENCES inventario.lots(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS internal_code text;

CREATE INDEX IF NOT EXISTS idx_order_items_lot
    ON public.order_items(lot_id)
    WHERE lot_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_internal_code
    ON public.order_items(internal_code)
    WHERE internal_code IS NOT NULL;

COMMENT ON COLUMN public.order_items.lot_id IS
    'Lote primario asignado (denormalización del primer order_item_lots). Para multi-lote, ver order_item_lots.';
COMMENT ON COLUMN public.order_items.internal_code IS
    'Código interno primario asignado (denormalización del primer order_item_lots).';

-- ============================================================================
-- 3. Tabla order_item_lots — multi-lote por línea de pedido
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.order_item_lots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id uuid NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
    lot_id uuid NOT NULL REFERENCES inventario.lots(id) ON DELETE RESTRICT,
    shift_production_id uuid REFERENCES produccion.shift_productions(id) ON DELETE SET NULL,
    internal_code text,
    quantity numeric(14,3) NOT NULL CHECK (quantity > 0),
    sequence integer NOT NULL DEFAULT 1,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL
);

ALTER TABLE public.order_item_lots OWNER TO postgres;

CREATE INDEX IF NOT EXISTS idx_order_item_lots_order_item
    ON public.order_item_lots(order_item_id);
CREATE INDEX IF NOT EXISTS idx_order_item_lots_lot
    ON public.order_item_lots(lot_id);
CREATE INDEX IF NOT EXISTS idx_order_item_lots_shift_production
    ON public.order_item_lots(shift_production_id)
    WHERE shift_production_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_item_lots_internal_code
    ON public.order_item_lots(internal_code)
    WHERE internal_code IS NOT NULL;

ALTER TABLE public.order_item_lots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read order_item_lots" ON public.order_item_lots;
CREATE POLICY "Authenticated read order_item_lots" ON public.order_item_lots
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated write order_item_lots" ON public.order_item_lots;
CREATE POLICY "Authenticated write order_item_lots" ON public.order_item_lots
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_item_lots TO authenticated, service_role;

COMMENT ON TABLE public.order_item_lots IS
    'Distribución de lotes por línea de pedido. Permite multi-lote por order_item para trazabilidad granular: cada fila es un (lot_id, shift_production_id, internal_code, quantity).';

-- ============================================================================
-- 4. generate_production_lot_code → usa el nuevo formato
-- ============================================================================

CREATE OR REPLACE FUNCTION inventario.generate_production_lot_code(
    p_product_id uuid,
    p_shift_production_id uuid
) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
    v_ended_at timestamptz;
BEGIN
    SELECT ended_at INTO v_ended_at
    FROM produccion.shift_productions WHERE id = p_shift_production_id;
    RETURN produccion.compute_lot_code(COALESCE(v_ended_at, now()));
END;
$$;

-- ============================================================================
-- 5. perform_inventory_movement — lookup de lote de producción por (product, lot_code)
-- ============================================================================

DROP FUNCTION IF EXISTS inventario.perform_inventory_movement(
    uuid, numeric, varchar, varchar, uuid, uuid, uuid, varchar, text, uuid, varchar, date, uuid
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

    -- Lot handling
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
            v_lot_code := inventario.generate_production_lot_code(p_product_id, p_reference_id);

            -- Lookup canonical: producciones de la misma "mitad de semana" comparten lote
            SELECT id INTO v_lot_id
            FROM inventario.lots
            WHERE product_id = p_product_id AND lot_code = v_lot_code
            LIMIT 1;

            IF v_lot_id IS NULL THEN
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
        UPDATE inventario.lots
        SET quantity_remaining = quantity_remaining +
                CASE WHEN p_movement_type IN ('IN','TRANSFER_IN') THEN p_quantity
                     WHEN p_movement_type IN ('OUT','TRANSFER_OUT') THEN -p_quantity
                     ELSE 0 END,
            updated_at = NOW()
        WHERE id = v_lot_id;
    END IF;

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

-- ============================================================================
-- 6. Trigger: setear shift_productions.internal_code al insertar IN/production movement
-- ============================================================================

CREATE OR REPLACE FUNCTION produccion.set_internal_code_from_movement()
RETURNS trigger LANGUAGE plpgsql
SET search_path TO 'produccion','public' AS $$
DECLARE
    v_ts timestamptz;
BEGIN
    IF NEW.movement_type = 'IN'
       AND NEW.reason_type = 'production'
       AND NEW.reference_type = 'shift_production'
       AND NEW.reference_id IS NOT NULL THEN

        SELECT COALESCE(ended_at, started_at::timestamptz, NEW.movement_date)
        INTO v_ts
        FROM produccion.shift_productions
        WHERE id = NEW.reference_id;

        UPDATE produccion.shift_productions
        SET internal_code = produccion.compute_internal_code(v_ts)
        WHERE id = NEW.reference_id
          AND internal_code IS NULL;
    END IF;
    RETURN NEW;
END;
$$;

ALTER FUNCTION produccion.set_internal_code_from_movement() OWNER TO postgres;

DROP TRIGGER IF EXISTS trg_movements_set_internal_code ON inventario.inventory_movements;
CREATE TRIGGER trg_movements_set_internal_code
    AFTER INSERT ON inventario.inventory_movements
    FOR EACH ROW
    EXECUTE FUNCTION produccion.set_internal_code_from_movement();

-- ============================================================================
-- 7. Helpers: lot_internal_codes + suggest_fefo_lots
-- ============================================================================

-- 7.1 Productions que aportaron a un lote (con su internal_code y cantidad aportada)
CREATE OR REPLACE FUNCTION inventario.lot_internal_codes(p_lot_id uuid)
RETURNS TABLE (
    shift_production_id uuid,
    internal_code text,
    movement_date timestamptz,
    quantity numeric
) LANGUAGE sql STABLE AS $$
    SELECT
        m.reference_id AS shift_production_id,
        sp.internal_code,
        m.movement_date,
        m.quantity
    FROM inventario.inventory_movements m
    LEFT JOIN produccion.shift_productions sp ON sp.id = m.reference_id
    WHERE m.lot_id = p_lot_id
      AND m.reason_type = 'production'
      AND m.movement_type = 'IN'
      AND m.reference_type = 'shift_production'
    ORDER BY m.movement_date ASC;
$$;

GRANT EXECUTE ON FUNCTION inventario.lot_internal_codes(uuid) TO authenticated, service_role;

-- 7.2 FEFO multi-lote: dada una cantidad necesaria, devuelve la distribución sugerida
CREATE OR REPLACE FUNCTION inventario.suggest_fefo_lots(
    p_product_id uuid,
    p_quantity_needed numeric
) RETURNS TABLE (
    lot_id uuid,
    lot_code text,
    quantity_to_take numeric,
    quantity_remaining_after numeric,
    expiry_date date,
    received_at timestamptz,
    sequence integer
) LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_remaining numeric := p_quantity_needed;
    v_lot record;
    v_seq integer := 0;
BEGIN
    IF p_quantity_needed IS NULL OR p_quantity_needed <= 0 THEN
        RETURN;
    END IF;

    FOR v_lot IN
        SELECT id, l.lot_code, l.expiry_date, l.received_at, l.quantity_remaining
        FROM inventario.lots l
        WHERE l.product_id = p_product_id AND l.quantity_remaining > 0
        ORDER BY l.expiry_date ASC NULLS LAST, l.received_at ASC
    LOOP
        IF v_remaining <= 0 THEN EXIT; END IF;
        v_seq := v_seq + 1;
        lot_id := v_lot.id;
        lot_code := v_lot.lot_code;
        expiry_date := v_lot.expiry_date;
        received_at := v_lot.received_at;
        quantity_to_take := LEAST(v_remaining, v_lot.quantity_remaining);
        quantity_remaining_after := v_lot.quantity_remaining - quantity_to_take;
        sequence := v_seq;
        RETURN NEXT;
        v_remaining := v_remaining - quantity_to_take;
    END LOOP;
    RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION inventario.suggest_fefo_lots(uuid, numeric) TO authenticated, service_role;

COMMENT ON FUNCTION inventario.suggest_fefo_lots(uuid, numeric) IS
    'Distribución FEFO sugerida para cubrir p_quantity_needed. Retorna filas en orden de toma (expiry ASC NULLS LAST, received_at ASC). Si la cantidad no se cubre, devuelve solo lo que alcanzaron los lotes — el caller decide qué hacer con el faltante.';

-- ============================================================================
-- 8. Backfill: completed shift_productions sin internal_code
-- ============================================================================

UPDATE produccion.shift_productions
SET internal_code = produccion.compute_internal_code(COALESCE(ended_at, started_at::timestamptz))
WHERE internal_code IS NULL
  AND status = 'completed'
  AND COALESCE(ended_at, started_at) IS NOT NULL;

COMMIT;
