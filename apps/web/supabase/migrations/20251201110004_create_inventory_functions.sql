-- =====================================================
-- Migration: Create Inventory Functions
-- =====================================================
-- Purpose: Business logic functions for inventory management
-- Date: 2025-12-01
-- =====================================================

-- =====================================================
-- FUNCTION: generate_movement_number()
-- =====================================================
-- Generates sequential movement numbers: MOV-2025-00001

CREATE OR REPLACE FUNCTION inventario.generate_movement_number()
RETURNS VARCHAR AS $$
DECLARE
  next_number INTEGER;
  year_part VARCHAR;
BEGIN
  next_number := nextval('inventario.movement_number_seq');
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');

  RETURN 'MOV-' || year_part || '-' || LPAD(next_number::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: get_default_location(reason_type)
-- =====================================================
-- Returns default location ID based on movement reason

CREATE OR REPLACE FUNCTION inventario.get_default_location(p_reason_type VARCHAR)
RETURNS UUID AS $$
DECLARE
  default_location_code VARCHAR;
  location_id UUID;
BEGIN
  -- Map reason to default location
  default_location_code := CASE p_reason_type
    WHEN 'purchase' THEN 'WH1-RECEIVING'
    WHEN 'production' THEN 'Z2-PROD-GENERAL'
    WHEN 'return' THEN 'WH1-GENERAL'
    WHEN 'adjustment' THEN 'WH1-GENERAL'
    WHEN 'initial' THEN 'WH1-GENERAL'
    ELSE 'WH1-GENERAL'
  END;

  -- Get location ID
  SELECT id INTO location_id
  FROM inventario.locations
  WHERE code = default_location_code
  LIMIT 1;

  IF location_id IS NULL THEN
    RAISE EXCEPTION 'Default location % not found', default_location_code;
  END IF;

  RETURN location_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: get_current_balance(product_id, location_id)
-- =====================================================
-- Returns current balance for a product at a location

CREATE OR REPLACE FUNCTION inventario.get_current_balance(
  p_product_id UUID,
  p_location_id UUID
)
RETURNS DECIMAL AS $$
DECLARE
  current_balance DECIMAL;
BEGIN
  SELECT COALESCE(quantity_on_hand, 0) INTO current_balance
  FROM inventario.inventory_balances
  WHERE product_id = p_product_id
    AND location_id = p_location_id;

  RETURN COALESCE(current_balance, 0);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: calculate_balance_after(product_id, location_id, quantity, movement_type)
-- =====================================================
-- Calculates what the balance will be after a movement

CREATE OR REPLACE FUNCTION inventario.calculate_balance_after(
  p_product_id UUID,
  p_location_id UUID,
  p_quantity DECIMAL,
  p_movement_type VARCHAR
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

  -- Validate non-negative balance
  IF new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient inventory. Current: %, Required: %, Movement: %',
      current_balance, p_quantity, p_movement_type;
  END IF;

  RETURN new_balance;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: update_inventory_balance()
-- =====================================================
-- Updates or creates balance record after a movement

CREATE OR REPLACE FUNCTION inventario.update_inventory_balance(
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

  -- Upsert balance
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
-- FUNCTION: perform_inventory_movement()
-- =====================================================
-- Main function to create an inventory movement
-- This is the CORE function that all hooks will call

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
  p_recorded_by UUID DEFAULT NULL
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

  -- 3. Validate locations based on movement type
  IF p_movement_type = 'IN' AND p_location_id_to IS NULL THEN
    RAISE EXCEPTION 'Movement type IN requires location_id_to';
  END IF;

  IF p_movement_type = 'OUT' AND p_location_id_from IS NULL THEN
    RAISE EXCEPTION 'Movement type OUT requires location_id_from';
  END IF;

  IF p_movement_type IN ('TRANSFER_IN', 'TRANSFER_OUT') AND (p_location_id_from IS NULL OR p_location_id_to IS NULL) THEN
    RAISE EXCEPTION 'Transfer movements require both location_id_from and location_id_to';
  END IF;

  -- 4. Assign default location if not provided
  IF p_location_id_to IS NULL AND p_movement_type IN ('IN', 'TRANSFER_IN') THEN
    p_location_id_to := inventario.get_default_location(p_reason_type);
  END IF;

  -- 5. Get product unit of measure
  SELECT unit_of_measure INTO v_unit_of_measure
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

  -- 10. Insert movement
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
    p_movement_type,
    p_reason_type,
    p_location_id_from,
    p_location_id_to,
    v_balance_after,
    p_reference_id,
    p_reference_type,
    p_notes,
    v_actual_recorded_by,
    NOW()
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

-- =====================================================
-- FUNCTION: perform_transfer()
-- =====================================================
-- Handles atomic transfers (creates 2 linked movements)

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

  -- 1. Create TRANSFER_OUT movement
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

  -- 2. Create TRANSFER_IN movement
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

-- =====================================================
-- FUNCTION: get_product_balance_total()
-- =====================================================
-- Returns total balance across all locations for a product

CREATE OR REPLACE FUNCTION inventario.get_product_balance_total(p_product_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  total_balance DECIMAL;
BEGIN
  SELECT COALESCE(SUM(quantity_on_hand), 0) INTO total_balance
  FROM inventario.inventory_balances
  WHERE product_id = p_product_id;

  RETURN total_balance;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: get_product_balance_by_location()
-- =====================================================
-- Returns balance breakdown by location for a product

CREATE OR REPLACE FUNCTION inventario.get_product_balance_by_location(p_product_id UUID)
RETURNS TABLE (
  location_id UUID,
  location_code VARCHAR,
  location_name VARCHAR,
  quantity_on_hand DECIMAL,
  last_updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.location_id,
    l.code,
    l.name,
    b.quantity_on_hand,
    b.last_updated_at
  FROM inventario.inventory_balances b
  JOIN inventario.locations l ON b.location_id = l.id
  WHERE b.product_id = p_product_id
    AND b.quantity_on_hand > 0
  ORDER BY b.quantity_on_hand DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION inventario.perform_inventory_movement IS 'Core function to create inventory movements with automatic balance calculation';
COMMENT ON FUNCTION inventario.perform_transfer IS 'Atomic transfer between locations (creates 2 linked movements)';
COMMENT ON FUNCTION inventario.get_product_balance_total IS 'Returns total inventory balance across all locations';
COMMENT ON FUNCTION inventario.get_product_balance_by_location IS 'Returns inventory balance breakdown by location';
