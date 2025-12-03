-- =====================================================
-- Migration: Create Dispatch Inventory Functions
-- =====================================================
-- Purpose: Functions for dispatch-inventory integration with configurable negative balance support
-- Date: 2025-12-03
-- =====================================================

-- =====================================================
-- FUNCTION: get_dispatch_config()
-- =====================================================
-- Returns current dispatch inventory configuration
CREATE OR REPLACE FUNCTION public.get_dispatch_config()
RETURNS TABLE (
  allow_dispatch_without_inventory BOOLEAN,
  default_dispatch_location_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.allow_dispatch_without_inventory,
    c.default_dispatch_location_id
  FROM public.dispatch_inventory_config c
  WHERE c.id = '00000000-0000-0000-0000-000000000000'::UUID
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: calculate_balance_after_dispatch()
-- =====================================================
-- Calculates balance after dispatch movement (allows negative if configured)
CREATE OR REPLACE FUNCTION inventario.calculate_balance_after_dispatch(
  p_product_id UUID,
  p_location_id UUID,
  p_quantity DECIMAL,
  p_movement_type VARCHAR,
  p_allow_negative BOOLEAN DEFAULT false
)
RETURNS DECIMAL AS $$
DECLARE
  current_balance DECIMAL;
  new_balance DECIMAL;
BEGIN
  -- Get current balance
  current_balance := inventario.get_current_balance(p_product_id, p_location_id);

  -- Calculate new balance based on movement type
  new_balance := CASE p_movement_type
    WHEN 'IN' THEN current_balance + p_quantity
    WHEN 'TRANSFER_IN' THEN current_balance + p_quantity
    WHEN 'OUT' THEN current_balance - p_quantity
    WHEN 'TRANSFER_OUT' THEN current_balance - p_quantity
    ELSE current_balance
  END;

  -- Validate non-negative balance (unless explicitly allowed)
  IF new_balance < 0 AND NOT p_allow_negative THEN
    RAISE EXCEPTION 'Insufficient inventory. Current: %, Required: %, Movement: %',
      current_balance, p_quantity, p_movement_type;
  END IF;

  RETURN new_balance;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: update_inventory_balance_dispatch()
-- =====================================================
-- Updates balance after dispatch movement (allows negative balances)
CREATE OR REPLACE FUNCTION inventario.update_inventory_balance_dispatch(
  p_product_id UUID,
  p_location_id UUID,
  p_quantity DECIMAL,
  p_movement_type VARCHAR,
  p_movement_id UUID
)
RETURNS VOID AS $$
DECLARE
  quantity_delta DECIMAL;
BEGIN
  -- Calculate delta based on movement type
  quantity_delta := CASE p_movement_type
    WHEN 'IN' THEN p_quantity
    WHEN 'TRANSFER_IN' THEN p_quantity
    WHEN 'OUT' THEN -p_quantity
    WHEN 'TRANSFER_OUT' THEN -p_quantity
    ELSE 0
  END;

  -- Upsert balance (NO constraint on negative values)
  INSERT INTO inventario.inventory_balances (
    product_id,
    location_id,
    quantity_on_hand,
    last_movement_id,
    last_updated_at
  ) VALUES (
    p_product_id,
    p_location_id,
    quantity_delta,
    p_movement_id,
    NOW()
  )
  ON CONFLICT (product_id, location_id)
  DO UPDATE SET
    quantity_on_hand = inventario.inventory_balances.quantity_on_hand + quantity_delta,
    last_movement_id = p_movement_id,
    last_updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: perform_dispatch_movement()
-- =====================================================
-- Creates inventory movement for dispatched orders
-- Respects allow_dispatch_without_inventory configuration
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
  -- 1. Get dispatch configuration
  SELECT allow_dispatch_without_inventory INTO v_allow_negative
  FROM public.dispatch_inventory_config
  WHERE id = '00000000-0000-0000-0000-000000000000'::UUID;

  -- Default to false if config not found
  v_allow_negative := COALESCE(v_allow_negative, false);

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

  -- 4. Get current balance
  v_current_balance := inventario.get_current_balance(p_product_id, p_location_id_from);

  -- 5. Calculate balance after movement (allows negative if configured)
  v_balance_after := inventario.calculate_balance_after_dispatch(
    p_product_id,
    p_location_id_from,
    p_quantity,
    'OUT',
    v_allow_negative
  );

  -- 6. Generate movement number
  v_movement_number := inventario.generate_movement_number();

  -- 7. Get recorded_by
  v_actual_recorded_by := COALESCE(p_recorded_by, auth.uid());
  IF v_actual_recorded_by IS NULL THEN
    RAISE EXCEPTION 'recorded_by is required (no authenticated user found)';
  END IF;

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

  -- 9. Update balance (allows negative)
  PERFORM inventario.update_inventory_balance_dispatch(
    p_product_id,
    p_location_id_from,
    p_quantity,
    'OUT',
    v_movement_id
  );

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
    RAISE EXCEPTION 'Error creating dispatch movement: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: perform_batch_dispatch_movements()
-- =====================================================
-- Creates multiple inventory movements for a batch of order items
CREATE OR REPLACE FUNCTION inventario.perform_batch_dispatch_movements(
  p_order_id UUID,
  p_order_number VARCHAR,
  p_items JSONB, -- Array of {product_id, quantity}
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
  -- Iterate over each item in the order
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    BEGIN
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

      -- Add result to results array
      v_results := v_results || jsonb_build_object(
        'product_id', v_item->>'product_id',
        'result', v_result
      );

      v_success_count := v_success_count + 1;

    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but continue processing other items
        v_errors := v_errors || jsonb_build_object(
          'product_id', v_item->>'product_id',
          'error', SQLERRM
        );
        v_error_count := v_error_count + 1;
    END;
  END LOOP;

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
    RAISE EXCEPTION 'Error in batch dispatch: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON FUNCTION inventario.perform_dispatch_movement IS 'Creates inventory OUT movement for dispatched order item, respects allow_dispatch_without_inventory config';
COMMENT ON FUNCTION inventario.perform_batch_dispatch_movements IS 'Creates multiple inventory movements for a batch of order items being dispatched';
COMMENT ON FUNCTION public.get_dispatch_config IS 'Returns current dispatch inventory configuration';
