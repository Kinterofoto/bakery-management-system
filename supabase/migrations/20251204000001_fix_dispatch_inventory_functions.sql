-- =====================================================
-- Migration: Fix Dispatch Inventory Functions
-- =====================================================
-- Purpose: Fix perform_dispatch_movement to properly handle errors and return better diagnostics
-- Date: 2025-12-04
-- =====================================================

-- Drop and recreate with better error handling
DROP FUNCTION IF EXISTS inventario.perform_dispatch_movement(UUID, DECIMAL, UUID, UUID, VARCHAR, TEXT, UUID);
DROP FUNCTION IF EXISTS inventario.perform_batch_dispatch_movements(UUID, VARCHAR, JSONB, UUID, TEXT, UUID);

-- =====================================================
-- FUNCTION: perform_dispatch_movement()
-- =====================================================
CREATE OR REPLACE FUNCTION inventario.perform_dispatch_movement(
  p_product_id UUID,
  p_quantity DECIMAL,
  p_location_id_from UUID,
  p_order_id UUID,
  p_order_number VARCHAR,
  p_notes TEXT DEFAULT NULL,
  p_recorded_by UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_movement_id UUID;
  v_balance_after DECIMAL;
  v_movement_number VARCHAR;
  v_unit_of_measure VARCHAR;
  v_actual_recorded_by UUID;
  v_allow_negative BOOLEAN;
  v_current_balance DECIMAL;
BEGIN
  RAISE NOTICE 'Starting dispatch movement for product: %, quantity: %', p_product_id, p_quantity;

  -- 1. Get dispatch configuration
  SELECT allow_dispatch_without_inventory INTO v_allow_negative
  FROM public.dispatch_inventory_config
  WHERE id = '00000000-0000-0000-0000-000000000000'::UUID;

  v_allow_negative := COALESCE(v_allow_negative, false);
  RAISE NOTICE 'Allow negative balance: %', v_allow_negative;

  -- 2. Validate location
  IF p_location_id_from IS NULL THEN
    RAISE EXCEPTION 'location_id_from is required for dispatch movements';
  END IF;

  -- 3. Get product unit of measure
  SELECT unit INTO v_unit_of_measure
  FROM public.products
  WHERE id = p_product_id;

  IF v_unit_of_measure IS NULL THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;

  RAISE NOTICE 'Product unit: %', v_unit_of_measure;

  -- 4. Get current balance
  v_current_balance := inventario.get_current_balance(p_product_id, p_location_id_from);
  RAISE NOTICE 'Current balance: %', v_current_balance;

  -- 5. Calculate balance after movement (allows negative if configured)
  v_balance_after := inventario.calculate_balance_after_dispatch(
    p_product_id,
    p_location_id_from,
    p_quantity,
    'OUT',
    v_allow_negative
  );
  RAISE NOTICE 'Balance after: %', v_balance_after;

  -- 6. Generate movement number
  v_movement_number := inventario.generate_movement_number();
  RAISE NOTICE 'Movement number: %', v_movement_number;

  -- 7. Get recorded_by
  v_actual_recorded_by := COALESCE(p_recorded_by, auth.uid());
  IF v_actual_recorded_by IS NULL THEN
    RAISE EXCEPTION 'recorded_by is required (no authenticated user found)';
  END IF;
  RAISE NOTICE 'Recorded by: %', v_actual_recorded_by;

  -- 8. Insert movement
  INSERT INTO inventario.inventory_movements (
    id,
    movement_number,
    product_id,
    quantity,
    unit_of_measure,
    movement_type,
    reason_type,
    location_id_from,
    location_id_to,
    balance_after,
    reference_id,
    reference_type,
    notes,
    recorded_by,
    movement_date
  ) VALUES (
    gen_random_uuid(),
    v_movement_number,
    p_product_id,
    p_quantity,
    v_unit_of_measure,
    'OUT',
    'sale',
    p_location_id_from,
    NULL,
    v_balance_after,
    p_order_id,
    'dispatch',
    'Dispatch - Order: ' || p_order_number || COALESCE(' - ' || p_notes, ''),
    v_actual_recorded_by,
    NOW()
  ) RETURNING id INTO v_movement_id;

  RAISE NOTICE 'Movement inserted with ID: %', v_movement_id;

  -- 9. Update balance (allows negative)
  PERFORM inventario.update_inventory_balance_dispatch(
    p_product_id,
    p_location_id_from,
    p_quantity,
    'OUT',
    v_movement_id
  );

  RAISE NOTICE 'Balance updated successfully';

  -- 10. Return result
  RETURN json_build_object(
    'success', true,
    'movement_id', v_movement_id,
    'movement_number', v_movement_number,
    'balance_before', v_current_balance,
    'balance_after', v_balance_after,
    'allowed_negative', v_allow_negative
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ERROR in perform_dispatch_movement: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: perform_batch_dispatch_movements()
-- =====================================================
CREATE OR REPLACE FUNCTION inventario.perform_batch_dispatch_movements(
  p_order_id UUID,
  p_order_number VARCHAR,
  p_items JSONB,
  p_location_id_from UUID,
  p_notes TEXT DEFAULT NULL,
  p_recorded_by UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_item JSONB;
  v_result JSON;
  v_results JSONB := '[]'::JSONB;
  v_success_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_errors JSONB := '[]'::JSONB;
BEGIN
  RAISE NOTICE 'Starting batch dispatch for order: %, items count: %', p_order_number, jsonb_array_length(p_items);

  -- Iterate over each item in the order
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    BEGIN
      RAISE NOTICE 'Processing item: %', v_item;

      -- Perform dispatch movement for this item
      v_result := inventario.perform_dispatch_movement(
        (v_item->>'product_id')::UUID,
        (v_item->>'quantity')::DECIMAL,
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON FUNCTION inventario.perform_dispatch_movement IS 'Creates inventory OUT movement for dispatched order item with enhanced error handling and logging';
COMMENT ON FUNCTION inventario.perform_batch_dispatch_movements IS 'Creates multiple inventory movements for a batch of order items with detailed error reporting';
