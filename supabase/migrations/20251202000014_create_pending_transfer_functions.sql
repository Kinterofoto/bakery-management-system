-- =====================================================
-- Migration: Create functions for two-step pending transfers
-- =====================================================
-- Purpose: New functions for pending transfer workflow
-- Date: 2025-12-02
-- =====================================================

-- =====================================================
-- Function: create_pending_transfer
-- =====================================================
-- Creates a transfer in 'pending' status without updating balances
-- The balance update happens only when the transfer is confirmed
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
  v_current_balance DECIMAL;
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

  -- Validate sufficient stock at source location
  SELECT COALESCE(quantity_on_hand, 0) INTO v_current_balance
  FROM inventario.inventory_balances
  WHERE product_id = p_product_id AND location_id = p_location_id_from;

  IF v_current_balance < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock: Available=%, Requested=%', v_current_balance, p_quantity;
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
    NULL, -- Balance calculated on confirmation
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
    NULL, -- Balance calculated on confirmation
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
    'status', 'pending'
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating pending transfer: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Function: confirm_pending_transfer
-- =====================================================
-- Confirms a pending transfer and updates the balances
CREATE OR REPLACE FUNCTION inventario.confirm_pending_transfer(
  p_movement_in_id UUID,
  p_confirmed_by UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_movement_out_id UUID;
  v_product_id UUID;
  v_quantity DECIMAL;
  v_location_id_from UUID;
  v_location_id_to UUID;
  v_confirmed_by UUID;
  v_movement_in RECORD;
  v_balance_after_from DECIMAL;
  v_balance_after_to DECIMAL;
BEGIN
  -- Get confirmed_by
  v_confirmed_by := COALESCE(p_confirmed_by, auth.uid());
  IF v_confirmed_by IS NULL THEN
    RAISE EXCEPTION 'confirmed_by is required';
  END IF;

  -- Get the TRANSFER_IN movement
  SELECT * INTO v_movement_in
  FROM inventario.inventory_movements
  WHERE id = p_movement_in_id
    AND movement_type = 'TRANSFER_IN'
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending TRANSFER_IN movement not found: %', p_movement_in_id;
  END IF;

  -- Get linked TRANSFER_OUT movement
  v_movement_out_id := v_movement_in.linked_movement_id;
  IF v_movement_out_id IS NULL THEN
    RAISE EXCEPTION 'Linked TRANSFER_OUT movement not found';
  END IF;

  -- Extract movement details
  v_product_id := v_movement_in.product_id;
  v_quantity := v_movement_in.quantity;
  v_location_id_from := v_movement_in.location_id_from;
  v_location_id_to := v_movement_in.location_id_to;

  -- Update balance at FROM location (subtract)
  PERFORM inventario.update_inventory_balance(
    v_product_id,
    v_location_id_from,
    v_quantity,
    'TRANSFER_OUT',
    v_movement_out_id
  );

  -- Get new balance at FROM location
  SELECT quantity_on_hand INTO v_balance_after_from
  FROM inventario.inventory_balances
  WHERE product_id = v_product_id AND location_id = v_location_id_from;

  -- Update balance at TO location (add)
  PERFORM inventario.update_inventory_balance(
    v_product_id,
    v_location_id_to,
    v_quantity,
    'TRANSFER_IN',
    p_movement_in_id
  );

  -- Get new balance at TO location
  SELECT quantity_on_hand INTO v_balance_after_to
  FROM inventario.inventory_balances
  WHERE product_id = v_product_id AND location_id = v_location_id_to;

  -- Update TRANSFER_OUT movement status
  UPDATE inventario.inventory_movements
  SET status = 'completed',
      balance_after = v_balance_after_from,
      received_at = NOW(),
      received_by = v_confirmed_by
  WHERE id = v_movement_out_id;

  -- Update TRANSFER_IN movement status
  UPDATE inventario.inventory_movements
  SET status = 'completed',
      balance_after = v_balance_after_to,
      received_at = NOW(),
      received_by = v_confirmed_by
  WHERE id = p_movement_in_id;

  RETURN json_build_object(
    'success', true,
    'movement_in_id', p_movement_in_id,
    'movement_out_id', v_movement_out_id,
    'status', 'completed',
    'balance_after_from', v_balance_after_from,
    'balance_after_to', v_balance_after_to
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error confirming transfer: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Function: get_pending_transfers_for_location
-- =====================================================
-- Gets all pending transfers for a specific location
CREATE OR REPLACE FUNCTION inventario.get_pending_transfers_for_location(
  p_location_id UUID
)
RETURNS TABLE (
  movement_id UUID,
  movement_number VARCHAR,
  product_id UUID,
  product_name VARCHAR,
  quantity DECIMAL,
  unit_of_measure VARCHAR,
  location_from_id UUID,
  location_from_name VARCHAR,
  requested_by UUID,
  requested_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.movement_number,
    m.product_id,
    p.name,
    m.quantity,
    m.unit_of_measure,
    m.location_id_from,
    l.name,
    m.recorded_by,
    m.movement_date,
    m.notes
  FROM inventario.inventory_movements m
  JOIN public.products p ON m.product_id = p.id
  LEFT JOIN inventario.locations l ON m.location_id_from = l.id
  WHERE m.location_id_to = p_location_id
    AND m.movement_type = 'TRANSFER_IN'
    AND m.status = 'pending'
  ORDER BY m.movement_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION inventario.create_pending_transfer IS
'Creates a transfer in pending status. Balance is NOT updated until confirmed.';

COMMENT ON FUNCTION inventario.confirm_pending_transfer IS
'Confirms a pending transfer and updates balances at both locations.';

COMMENT ON FUNCTION inventario.get_pending_transfers_for_location IS
'Gets all pending incoming transfers for a location (work center).';
