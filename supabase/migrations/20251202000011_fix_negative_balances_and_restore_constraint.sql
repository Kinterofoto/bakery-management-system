-- =====================================================
-- Migration: Fix negative balances and restore constraint properly
-- =====================================================
-- Purpose: Clean up any negative balances before restoring constraint
-- Date: 2025-12-02
-- =====================================================

-- First, drop the constraint if it exists
ALTER TABLE inventario.inventory_balances
DROP CONSTRAINT IF EXISTS inventory_balances_quantity_on_hand_check;

-- Find and fix any negative balances
DO $$
DECLARE
  negative_count INTEGER;
BEGIN
  -- Count negative balances
  SELECT COUNT(*) INTO negative_count
  FROM inventario.inventory_balances
  WHERE quantity_on_hand < 0;

  IF negative_count > 0 THEN
    RAISE NOTICE 'Found % negative balances, setting them to 0', negative_count;

    -- Set negative balances to 0
    UPDATE inventario.inventory_balances
    SET quantity_on_hand = 0
    WHERE quantity_on_hand < 0;
  ELSE
    RAISE NOTICE 'No negative balances found';
  END IF;
END $$;

-- Now add the constraint
ALTER TABLE inventario.inventory_balances
ADD CONSTRAINT inventory_balances_quantity_on_hand_check
CHECK (quantity_on_hand >= 0);

COMMENT ON TABLE inventario.inventory_balances IS
'Inventory balances by product and location with quantity check constraint';
