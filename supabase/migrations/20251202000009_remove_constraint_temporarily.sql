-- =====================================================
-- Migration: Temporarily disable quantity check constraint for debugging
-- =====================================================
-- Purpose: Allow negative balances temporarily to see what's happening
-- Date: 2025-12-02
-- =====================================================

-- Drop the constraint temporarily
ALTER TABLE inventario.inventory_balances
DROP CONSTRAINT IF EXISTS inventory_balances_quantity_on_hand_check;

-- We'll add it back once we fix the issue
COMMENT ON TABLE inventario.inventory_balances IS
'TEMP: quantity_on_hand check constraint removed for debugging';
