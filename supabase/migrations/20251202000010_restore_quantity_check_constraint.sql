-- =====================================================
-- Migration: Restore quantity check constraint
-- =====================================================
-- Purpose: Re-add the check constraint now that transfer logic is fixed
-- Date: 2025-12-02
-- =====================================================

-- Add the constraint back
ALTER TABLE inventario.inventory_balances
ADD CONSTRAINT inventory_balances_quantity_on_hand_check
CHECK (quantity_on_hand >= 0);

COMMENT ON TABLE inventario.inventory_balances IS
'Inventory balances by product and location with quantity check constraint restored';
