-- =====================================================
-- Migration: Create perform_transfer function for immediate transfers
-- =====================================================
-- Purpose: Create immediate transfer function (used for returns and direct transfers)
-- Date: 2025-12-02
-- =====================================================

CREATE OR REPLACE FUNCTION inventario.perform_transfer(
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
  v_result_out JSON;
  v_result_in JSON;
BEGIN
  -- Validate locations
  IF p_location_id_from IS NULL OR p_location_id_to IS NULL THEN
    RAISE EXCEPTION 'Both location_id_from and location_id_to are required for transfers';
  END IF;

  IF p_location_id_from = p_location_id_to THEN
    RAISE EXCEPTION 'Cannot transfer to the same location';
  END IF;

  -- 1. Create TRANSFER_OUT movement (updates balance immediately)
  v_result_out := inventario.perform_inventory_movement(
    p_product_id,
    p_quantity,
    'TRANSFER_OUT',
    'transfer',
    p_location_id_from,
    p_location_id_to,
    p_reference_id,
    p_reference_type,
    'Transfer OUT: ' || COALESCE(p_notes, ''),
    p_recorded_by
  );
  v_movement_out_id := (v_result_out->>'movement_id')::UUID;

  -- 2. Create TRANSFER_IN movement (updates balance immediately)
  v_result_in := inventario.perform_inventory_movement(
    p_product_id,
    p_quantity,
    'TRANSFER_IN',
    'transfer',
    p_location_id_from,
    p_location_id_to,
    p_reference_id,
    p_reference_type,
    'Transfer IN: ' || COALESCE(p_notes, ''),
    p_recorded_by
  );
  v_movement_in_id := (v_result_in->>'movement_id')::UUID;

  -- 3. Link movements together
  UPDATE inventario.inventory_movements
  SET linked_movement_id = v_movement_in_id
  WHERE id = v_movement_out_id;

  UPDATE inventario.inventory_movements
  SET linked_movement_id = v_movement_out_id
  WHERE id = v_movement_in_id;

  -- 4. Return result
  RETURN json_build_object(
    'success', true,
    'movement_out_id', v_movement_out_id,
    'movement_in_id', v_movement_in_id,
    'movement_out_number', v_result_out->>'movement_number',
    'movement_in_number', v_result_in->>'movement_number',
    'balance_after_from', v_result_out->>'balance_after',
    'balance_after_to', v_result_in->>'balance_after'
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating transfer: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION inventario.perform_transfer IS
'Performs an immediate transfer between two locations. Creates TRANSFER_OUT and TRANSFER_IN movements atomically.';
