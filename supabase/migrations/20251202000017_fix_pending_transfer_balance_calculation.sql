-- =====================================================
-- Migration: Fix pending transfer to calculate projected balance
-- =====================================================
-- Purpose: Calculate projected balance for pending transfers instead of NULL
-- Date: 2025-12-02
-- =====================================================

CREATE OR REPLACE FUNCTION inventario.create_pending_transfer(
  p_product_id UUID,
  p_quantity DECIMAL,
  p_location_id_from UUID,
  p_location_id_to UUID,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type VARCHAR DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_recorded_by UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_movement_out_id UUID;
  v_movement_in_id UUID;
  v_movement_number_out VARCHAR;
  v_movement_number_in VARCHAR;
  v_unit_of_measure VARCHAR;
  v_current_balance_from DECIMAL;
  v_current_balance_to DECIMAL;
  v_projected_balance_from DECIMAL;
  v_projected_balance_to DECIMAL;
  v_actual_recorded_by UUID;
BEGIN
  -- Validate locations
  IF p_location_id_from IS NULL OR p_location_id_to IS NULL THEN
    RAISE EXCEPTION 'Both location_id_from and location_id_to are required';
  END IF;

  IF p_location_id_from = p_location_id_to THEN
    RAISE EXCEPTION 'Cannot transfer to the same location';
  END IF;

  -- Get product unit of measure
  SELECT unit INTO v_unit_of_measure
  FROM public.products
  WHERE id = p_product_id;

  IF v_unit_of_measure IS NULL THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;

  -- Get current balances at both locations
  SELECT COALESCE(quantity_on_hand, 0) INTO v_current_balance_from
  FROM inventario.inventory_balances
  WHERE product_id = p_product_id AND location_id = p_location_id_from;

  SELECT COALESCE(quantity_on_hand, 0) INTO v_current_balance_to
  FROM inventario.inventory_balances
  WHERE product_id = p_product_id AND location_id = p_location_id_to;

  -- Calculate projected balances (what they will be after confirmation)
  v_projected_balance_from := v_current_balance_from - p_quantity;
  v_projected_balance_to := v_current_balance_to + p_quantity;

  -- Validate sufficient stock at source location
  IF v_projected_balance_from < 0 THEN
    RAISE EXCEPTION 'Insufficient stock: Available=%, Requested=%', v_current_balance_from, p_quantity;
  END IF;

  -- Get recorded_by
  v_actual_recorded_by := COALESCE(p_recorded_by, auth.uid());
  IF v_actual_recorded_by IS NULL THEN
    RAISE EXCEPTION 'recorded_by is required';
  END IF;

  -- Generate movement numbers
  v_movement_number_out := inventario.generate_movement_number();
  v_movement_number_in := inventario.generate_movement_number();

  -- Create TRANSFER_OUT movement (pending)
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
    movement_date,
    status
  ) VALUES (
    gen_random_uuid(),
    v_movement_number_out,
    p_product_id,
    p_quantity,
    v_unit_of_measure,
    'TRANSFER_OUT',
    'transfer',
    p_location_id_from,
    p_location_id_to,
    v_projected_balance_from, -- Projected balance after confirmation
    p_reference_id,
    p_reference_type,
    'Transfer OUT (pending): ' || COALESCE(p_notes, ''),
    v_actual_recorded_by,
    NOW(),
    'pending'
  ) RETURNING id INTO v_movement_out_id;

  -- Create TRANSFER_IN movement (pending)
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
    movement_date,
    status,
    linked_movement_id
  ) VALUES (
    gen_random_uuid(),
    v_movement_number_in,
    p_product_id,
    p_quantity,
    v_unit_of_measure,
    'TRANSFER_IN',
    'transfer',
    p_location_id_from,
    p_location_id_to,
    v_projected_balance_to, -- Projected balance after confirmation
    p_reference_id,
    p_reference_type,
    'Transfer IN (pending): ' || COALESCE(p_notes, ''),
    v_actual_recorded_by,
    NOW(),
    'pending',
    v_movement_out_id
  ) RETURNING id INTO v_movement_in_id;

  -- Link movements together
  UPDATE inventario.inventory_movements
  SET linked_movement_id = v_movement_in_id
  WHERE id = v_movement_out_id;

  RETURN json_build_object(
    'success', true,
    'movement_out_id', v_movement_out_id,
    'movement_in_id', v_movement_in_id,
    'movement_out_number', v_movement_number_out,
    'movement_in_number', v_movement_number_in,
    'status', 'pending',
    'projected_balance_from', v_projected_balance_from,
    'projected_balance_to', v_projected_balance_to
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating pending transfer: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION inventario.create_pending_transfer IS
'Creates a transfer in pending status with projected balance calculation. Actual balance update happens on confirmation.';
