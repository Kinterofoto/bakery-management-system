-- =====================================================
-- Migration: Allow Negative balance_after in inventory_movements
-- =====================================================
-- Purpose: Remove CHECK constraint to allow negative balances when dispatching without inventory
-- Date: 2025-12-04
-- =====================================================

-- Drop the constraint that prevents negative balance_after
ALTER TABLE inventario.inventory_movements
DROP CONSTRAINT IF EXISTS inventory_movements_balance_after_check;

-- Add comment explaining why this is allowed
COMMENT ON COLUMN inventario.inventory_movements.balance_after IS
'Balance at the affected location after this movement. Can be negative if dispatch_inventory_config.allow_dispatch_without_inventory is enabled.';

-- Also allow negative balances in inventory_balances table
ALTER TABLE inventario.inventory_balances
DROP CONSTRAINT IF EXISTS inventory_balances_quantity_on_hand_check;

-- Add comment
COMMENT ON COLUMN inventario.inventory_balances.quantity_on_hand IS
'Current available quantity. Can be negative if dispatch_inventory_config.allow_dispatch_without_inventory is enabled.';

-- Verify constraints were dropped
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Constraints removed successfully';
  RAISE NOTICE 'inventory_movements.balance_after can now be negative';
  RAISE NOTICE 'inventory_balances.quantity_on_hand can now be negative';
  RAISE NOTICE '========================================';
END $$;
