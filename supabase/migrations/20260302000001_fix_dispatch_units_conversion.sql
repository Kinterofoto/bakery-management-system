-- Fix: Kardex descuenta paquetes en vez de unidades al despachar
--
-- When dispatching an order, the system was passing the quantity in packages
-- directly to inventory movements. But inventory is tracked in units.
-- This fix looks up units_per_package from product_config and multiplies
-- before calling perform_dispatch_movement.

CREATE OR REPLACE FUNCTION "inventario"."perform_batch_dispatch_movements"(
  "p_order_id" "uuid",
  "p_order_number" character varying,
  "p_items" "jsonb",
  "p_location_id_from" "uuid",
  "p_notes" "text" DEFAULT NULL::"text",
  "p_recorded_by" "uuid" DEFAULT NULL::"uuid"
) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_item JSONB;
  v_result JSON;
  v_results JSONB := '[]'::JSONB;
  v_success_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_errors JSONB := '[]'::JSONB;
  v_units_per_package INTEGER;
  v_quantity_units DECIMAL;
BEGIN
  RAISE NOTICE 'Starting batch dispatch for order: %, items count: %', p_order_number, jsonb_array_length(p_items);

  -- Iterate over each item in the order
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    BEGIN
      RAISE NOTICE 'Processing item: %', v_item;

      -- Look up units_per_package for this product
      SELECT COALESCE(pc.units_per_package, 1)
        INTO v_units_per_package
        FROM public.product_config pc
       WHERE pc.product_id = (v_item->>'product_id')::UUID;

      -- If no row found in product_config, default to 1
      v_units_per_package := COALESCE(v_units_per_package, 1);

      -- Convert packages to units
      v_quantity_units := (v_item->>'quantity')::DECIMAL * v_units_per_package;

      RAISE NOTICE 'Product %: quantity=% packages, units_per_package=%, quantity_units=%',
        v_item->>'product_id', v_item->>'quantity', v_units_per_package, v_quantity_units;

      -- Perform dispatch movement for this item (in units)
      v_result := inventario.perform_dispatch_movement(
        (v_item->>'product_id')::UUID,
        v_quantity_units,
        p_location_id_from,
        p_order_id,
        p_order_number,
        p_notes,
        p_recorded_by
      );

      -- Check if movement was successful
      IF (v_result->>'success')::BOOLEAN THEN
        v_success_count := v_success_count + 1;
        RAISE NOTICE 'Item processed successfully: %', v_item->>'product_id';
      ELSE
        v_error_count := v_error_count + 1;
        v_errors := v_errors || jsonb_build_object(
          'product_id', v_item->>'product_id',
          'error', v_result->>'error'
        );
        RAISE NOTICE 'Item failed: %, error: %', v_item->>'product_id', v_result->>'error';
      END IF;

      -- Add result to results array
      v_results := v_results || jsonb_build_object(
        'product_id', v_item->>'product_id',
        'result', v_result
      );

    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Exception processing item: %, error: %', v_item, SQLERRM;
        v_errors := v_errors || jsonb_build_object(
          'product_id', v_item->>'product_id',
          'error', SQLERRM
        );
        v_error_count := v_error_count + 1;
    END;
  END LOOP;

  RAISE NOTICE 'Batch dispatch completed: success=%, errors=%', v_success_count, v_error_count;

  -- Return summary
  RETURN json_build_object(
    'success', v_error_count = 0,
    'total_items', jsonb_array_length(p_items),
    'success_count', v_success_count,
    'error_count', v_error_count,
    'results', v_results,
    'errors', v_errors
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ERROR in batch dispatch: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'total_items', jsonb_array_length(p_items),
      'success_count', v_success_count,
      'error_count', v_error_count
    );
END;
$$;
