-- =====================================================
-- Migration: Fix INSERT bug that creates negative balances
-- =====================================================
-- Purpose: When doing TRANSFER_OUT or OUT from a location with no prior balance,
--          the INSERT was using quantity_delta directly (which is negative),
--          violating the check constraint.
-- Date: 2025-12-02
-- =====================================================

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
  current_balance DECIMAL;
  new_balance DECIMAL;
  v_product_name VARCHAR;
BEGIN
  -- Calculate delta based on movement type
  quantity_delta := CASE p_movement_type
    WHEN 'IN' THEN p_quantity
    WHEN 'TRANSFER_IN' THEN p_quantity
    WHEN 'OUT' THEN -p_quantity
    WHEN 'TRANSFER_OUT' THEN -p_quantity
    ELSE 0
  END;

  -- Get current balance (will be NULL if no balance exists)
  SELECT quantity_on_hand INTO current_balance
  FROM inventario.inventory_balances
  WHERE product_id = p_product_id AND location_id = p_location_id;

  -- If no balance exists, current_balance is NULL, treat as 0
  current_balance := COALESCE(current_balance, 0);

  -- Calculate new balance
  new_balance := current_balance + quantity_delta;

  RAISE NOTICE 'UPDATE_BALANCE: type=%, current=%, delta=%, new=%',
    p_movement_type, current_balance, quantity_delta, new_balance;

  -- Validate: Cannot create negative balance
  IF new_balance < 0 THEN
    -- Get product name for error message
    SELECT name INTO v_product_name
    FROM public.products
    WHERE id = p_product_id;

    RAISE EXCEPTION 'Insufficient stock for product "%": Available=%, Requested=%, Deficit=%',
      COALESCE(v_product_name, p_product_id::TEXT),
      current_balance,
      ABS(quantity_delta),
      ABS(new_balance);
  END IF;

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
    new_balance,  -- ✅ FIX: Use new_balance instead of quantity_delta
    p_movement_id,
    NOW()
  )
  ON CONFLICT (product_id, location_id)
  DO UPDATE SET
    quantity_on_hand = EXCLUDED.quantity_on_hand,  -- ✅ FIX: Use the calculated new_balance
    last_movement_id = p_movement_id,
    last_updated_at = NOW();

  RAISE NOTICE 'UPDATE_BALANCE: Success';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION inventario.update_inventory_balance IS
'Updates inventory balance with proper validation. Prevents negative balances by checking before insert/update.';
