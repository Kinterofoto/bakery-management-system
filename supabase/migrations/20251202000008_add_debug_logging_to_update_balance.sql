-- =====================================================
-- Migration: Add debug logging to update_inventory_balance
-- =====================================================
-- Purpose: Add RAISE NOTICE statements to understand what's happening
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
BEGIN
  -- Calculate delta based on movement type
  quantity_delta := CASE p_movement_type
    WHEN 'IN' THEN p_quantity
    WHEN 'TRANSFER_IN' THEN p_quantity
    WHEN 'OUT' THEN -p_quantity
    WHEN 'TRANSFER_OUT' THEN -p_quantity
    ELSE 0
  END;

  -- Get current balance for debugging
  SELECT COALESCE(quantity_on_hand, 0) INTO current_balance
  FROM inventario.inventory_balances
  WHERE product_id = p_product_id AND location_id = p_location_id;

  RAISE NOTICE 'UPDATE_BALANCE: type=%, current=%, delta=%, new=%',
    p_movement_type, current_balance, quantity_delta, current_balance + quantity_delta;

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

  RAISE NOTICE 'UPDATE_BALANCE: Success';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION inventario.update_inventory_balance IS
'Updates inventory balance with debug logging';
