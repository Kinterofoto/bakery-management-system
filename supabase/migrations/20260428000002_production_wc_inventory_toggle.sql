-- Toggle global "production_wc_inventory_enabled".
--
-- ON  (default): comportamiento actual. Inventario por centro de trabajo,
--                transferencias desde compras, registro manual de consumos.
-- OFF          : sin inventario por centro. Al finalizar la producción, el
--                sistema descuenta automáticamente las líneas del BOM
--                (filtradas por la operación del centro de trabajo) desde
--                la ubicación general de recepción (WH1-RECEIVING).
--
-- Cada shift_production guarda en `wc_inventory_mode` el modo vigente al
-- iniciarse, para que producciones que estaban abiertas cuando se cambia
-- el toggle terminen con la lógica con la que arrancaron.

BEGIN;

-- 1. Setting global -----------------------------------------------------------

INSERT INTO public.system_settings (key, value, description)
VALUES (
    'production_wc_inventory_enabled',
    'true'::jsonb,
    'Activa el inventario por centro de trabajo. Si está en false, no hay transferencias ni registro manual de consumos: al finalizar cada producción se descuenta el BOM (por operación) desde WH1-RECEIVING contra la cantidad producida.'
)
ON CONFLICT (key) DO NOTHING;

-- 2. Snapshot del modo + bandera idempotente en shift_productions -------------

ALTER TABLE produccion.shift_productions
    ADD COLUMN IF NOT EXISTS wc_inventory_mode boolean,
    ADD COLUMN IF NOT EXISTS materials_auto_deducted boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN produccion.shift_productions.wc_inventory_mode IS
    'Snapshot del setting production_wc_inventory_enabled al iniciar la producción. NULL en producciones previas a la introducción del toggle (se asume true).';

COMMENT ON COLUMN produccion.shift_productions.materials_auto_deducted IS
    'True cuando el RPC produccion.finalize_production_auto_consume ya ejecutó el descuento automático de BOM. Garantiza idempotencia.';

-- 3. Permitir consumption_type='auto_bom' en material_consumptions ------------

ALTER TABLE produccion.material_consumptions
    DROP CONSTRAINT IF EXISTS material_consumptions_consumption_type_check;

ALTER TABLE produccion.material_consumptions
    ADD CONSTRAINT material_consumptions_consumption_type_check
        CHECK ((consumption_type)::text = ANY ((ARRAY[
            'consumed'::character varying,
            'wasted'::character varying,
            'auto_bom'::character varying
        ])::text[]));

-- 4. RPC para descontar BOM al finalizar --------------------------------------

CREATE OR REPLACE FUNCTION produccion.finalize_production_auto_consume(
    p_shift_production_id uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'produccion', 'inventario', 'public'
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
BEGIN
    -- 1. Cargar producción
    SELECT * INTO v_production
    FROM produccion.shift_productions
    WHERE id = p_shift_production_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'shift_production % no existe', p_shift_production_id;
    END IF;

    IF v_production.materials_auto_deducted THEN
        RETURN json_build_object(
            'status', 'skipped',
            'reason', 'already_deducted',
            'lines_processed', 0
        );
    END IF;

    IF COALESCE(v_production.total_good_units, 0) <= 0 THEN
        UPDATE produccion.shift_productions
        SET materials_auto_deducted = true,
            updated_at = now()
        WHERE id = p_shift_production_id;

        RETURN json_build_object(
            'status', 'skipped',
            'reason', 'no_good_units',
            'lines_processed', 0
        );
    END IF;

    -- 2. Centro de trabajo y operación
    SELECT wc.* INTO v_work_center
    FROM produccion.production_shifts ps
    JOIN produccion.work_centers wc ON wc.id = ps.work_center_id
    WHERE ps.id = v_production.shift_id;

    IF NOT FOUND OR v_work_center.operation_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró centro de trabajo u operación para la producción %', p_shift_production_id;
    END IF;

    v_operation_id := v_work_center.operation_id;

    -- 3. Variante: usar la elegida en pesaje, o la default del producto
    v_variant_id := v_production.bom_variant_id;
    IF v_variant_id IS NULL THEN
        SELECT id INTO v_variant_id
        FROM produccion.bom_variants
        WHERE product_id = v_production.product_id
          AND is_default = true
        LIMIT 1;
    END IF;

    -- 4. Ubicación de descuento: WH1-RECEIVING
    SELECT id INTO v_location_id
    FROM inventario.locations
    WHERE code = 'WH1-RECEIVING'
    LIMIT 1;

    IF v_location_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró la ubicación WH1-RECEIVING';
    END IF;

    v_user_id := auth.uid();

    -- 5. Recorrer BOM por operación y descontar
    FOR v_bom IN
        SELECT bom.material_id,
               bom.quantity_needed
        FROM produccion.bill_of_materials bom
        WHERE bom.product_id = v_production.product_id
          AND bom.is_active = true
          AND bom.material_id IS NOT NULL
          AND bom.operation_id = v_operation_id
          AND (
                (v_variant_id IS NOT NULL AND bom.variant_id = v_variant_id)
             OR (v_variant_id IS NULL AND bom.variant_id IS NULL)
          )
    LOOP
        v_qty := COALESCE(v_bom.quantity_needed, 0) * v_production.total_good_units;

        IF v_qty <= 0 THEN
            CONTINUE;
        END IF;

        PERFORM inventario.perform_inventory_movement(
            p_product_id      => v_bom.material_id,
            p_quantity        => v_qty,
            p_movement_type   => 'OUT',
            p_reason_type     => 'consumption',
            p_location_id_from => v_location_id,
            p_location_id_to  => NULL,
            p_reference_id    => v_production.id,
            p_reference_type  => 'shift_production',
            p_notes           => 'Auto-consumo BOM al finalizar producción (modo sin inventario por centro de trabajo)',
            p_recorded_by     => v_user_id
        );

        INSERT INTO produccion.material_consumptions (
            shift_production_id,
            material_id,
            quantity_consumed,
            consumption_type,
            recorded_by,
            notes
        ) VALUES (
            v_production.id,
            v_bom.material_id,
            v_qty,
            'auto_bom',
            v_user_id,
            'Descuento automático BOM al finalizar producción'
        );

        v_lines_count := v_lines_count + 1;
    END LOOP;

    UPDATE produccion.shift_productions
    SET materials_auto_deducted = true,
        updated_at = now()
    WHERE id = p_shift_production_id;

    RETURN json_build_object(
        'status', 'ok',
        'lines_processed', v_lines_count,
        'good_units', v_production.total_good_units,
        'operation_id', v_operation_id,
        'variant_id', v_variant_id
    );
END;
$$;

ALTER FUNCTION produccion.finalize_production_auto_consume(uuid) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION produccion.finalize_production_auto_consume(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION produccion.finalize_production_auto_consume(uuid) TO service_role;

COMMENT ON FUNCTION produccion.finalize_production_auto_consume(uuid) IS
    'Descuenta automáticamente las líneas del BOM (filtradas por la operación del centro de trabajo y la variante de la producción) desde WH1-RECEIVING al finalizar una shift_production. Idempotente: la bandera materials_auto_deducted impide doble descuento. Permite balances negativos (la política está habilitada en inventario).';

COMMIT;
