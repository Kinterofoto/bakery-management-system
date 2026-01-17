-- =====================================================
-- Migration: Add batch_number and expiry_date to inventory_movements
-- =====================================================
-- Purpose: Store batch and expiry as proper fields for alerts and FEFO logic
-- Date: 2025-12-01
-- =====================================================

-- Add columns to inventory_movements
ALTER TABLE inventario.inventory_movements
ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_movements_batch ON inventario.inventory_movements(batch_number) WHERE batch_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_movements_expiry ON inventario.inventory_movements(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_movements_expiry_product ON inventario.inventory_movements(product_id, expiry_date) WHERE expiry_date IS NOT NULL;

-- Add comments
COMMENT ON COLUMN inventario.inventory_movements.batch_number IS 'Batch/lot number from supplier';
COMMENT ON COLUMN inventario.inventory_movements.expiry_date IS 'Expiration date for perishable products (used for FEFO and alerts)';

-- Drop old function signature
DROP FUNCTION IF EXISTS inventario.perform_inventory_movement(UUID, DECIMAL, VARCHAR, VARCHAR, UUID, UUID, UUID, VARCHAR, TEXT, UUID);

-- Create new function with batch and expiry parameters
CREATE OR REPLACE FUNCTION inventario.perform_inventory_movement(
  p_product_id UUID,
  p_quantity DECIMAL,
  p_movement_type VARCHAR,
  p_reason_type VARCHAR,
  p_location_id_from UUID DEFAULT NULL,
  p_location_id_to UUID DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type VARCHAR DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_recorded_by UUID DEFAULT NULL,
  p_batch_number VARCHAR DEFAULT NULL,
  p_expiry_date DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_movement_id UUID;
  v_balance_after DECIMAL;
  v_movement_number VARCHAR;
  v_unit_of_measure VARCHAR;
  v_affected_location UUID;
  v_actual_recorded_by UUID;
BEGIN
  -- 1. Validate movement type
  IF p_movement_type NOT IN ('IN', 'OUT', 'TRANSFER_IN', 'TRANSFER_OUT') THEN
    RAISE EXCEPTION 'Invalid movement_type: %', p_movement_type;
  END IF;

  -- 2. Validate reason type
  IF p_reason_type NOT IN ('purchase', 'production', 'sale', 'consumption', 'adjustment', 'return', 'waste', 'transfer', 'initial') THEN
    RAISE EXCEPTION 'Invalid reason_type: %', p_reason_type;
  END IF;

  -- 3. Assign default location if not provided (BEFORE validation)
  IF p_location_id_to IS NULL AND p_movement_type IN ('IN', 'TRANSFER_IN') THEN
    p_location_id_to := inventario.get_default_location(p_reason_type);
  END IF;

  -- 4. Validate locations based on movement type (AFTER default assignment)
  IF p_movement_type = 'IN' AND p_location_id_to IS NULL THEN
    RAISE EXCEPTION 'Movement type IN requires location_id_to';
  END IF;

  IF p_movement_type = 'OUT' AND p_location_id_from IS NULL THEN
    RAISE EXCEPTION 'Movement type OUT requires location_id_from';
  END IF;

  IF p_movement_type IN ('TRANSFER_IN', 'TRANSFER_OUT') AND (p_location_id_from IS NULL OR p_location_id_to IS NULL) THEN
    RAISE EXCEPTION 'Transfer movements require both location_id_from and location_id_to';
  END IF;

  -- 5. Get product unit of measure
  SELECT unit INTO v_unit_of_measure
  FROM public.products
  WHERE id = p_product_id;

  IF v_unit_of_measure IS NULL THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;

  -- 6. Determine affected location (for balance calculation)
  v_affected_location := COALESCE(p_location_id_to, p_location_id_from);

  -- 7. Calculate balance after movement
  v_balance_after := inventario.calculate_balance_after(
    p_product_id,
    v_affected_location,
    p_quantity,
    p_movement_type
  );

  -- 8. Generate movement number
  v_movement_number := inventario.generate_movement_number();

  -- 9. Get recorded_by (use provided or auth.uid())
  v_actual_recorded_by := COALESCE(p_recorded_by, auth.uid());

  IF v_actual_recorded_by IS NULL THEN
    RAISE EXCEPTION 'recorded_by is required (no authenticated user found)';
  END IF;

  -- 10. Insert movement (NOW with batch_number and expiry_date)
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
    batch_number,
    expiry_date
  ) VALUES (
    gen_random_uuid(),
    v_movement_number,
    p_product_id,
    p_quantity,
    v_unit_of_measure,
    p_movement_type,
    p_reason_type,
    p_location_id_from,
    p_location_id_to,
    v_balance_after,
    p_reference_id,
    p_reference_type,
    p_notes,
    v_actual_recorded_by,
    NOW(),
    p_batch_number,
    p_expiry_date
  ) RETURNING id INTO v_movement_id;

  -- 11. Update balance
  PERFORM inventario.update_inventory_balance(
    p_product_id,
    v_affected_location,
    p_quantity,
    p_movement_type,
    v_movement_id
  );

  -- 12. Return result
  RETURN json_build_object(
    'success', true,
    'movement_id', v_movement_id,
    'movement_number', v_movement_number,
    'balance_after', v_balance_after,
    'affected_location', v_affected_location
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating movement: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION inventario.perform_inventory_movement IS 'Core function to create inventory movements with batch and expiry tracking';
