-- =====================================================
-- Migration: Drop old version of perform_inventory_movement
-- =====================================================
-- Purpose: Remove the old version with COALESCE logic that causes
--          incorrect balance checking for TRANSFER_OUT movements
-- Date: 2025-12-02
-- =====================================================

-- Drop the old version with batch_number and expiry_date parameters
-- This is the version with incorrect COALESCE logic
DROP FUNCTION IF EXISTS inventario.perform_inventory_movement(
  UUID, DECIMAL, VARCHAR, VARCHAR, UUID, UUID, UUID, VARCHAR, TEXT, UUID, VARCHAR, DATE
) CASCADE;

-- Verify only the correct version remains (with fixed CASE logic)
DO $$
DECLARE
  v_function_count int;
BEGIN
  SELECT COUNT(*) INTO v_function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'inventario'
    AND p.proname = 'perform_inventory_movement';

  IF v_function_count > 1 THEN
    RAISE WARNING 'Multiple versions of perform_inventory_movement still exist: %', v_function_count;
  ELSIF v_function_count = 1 THEN
    RAISE NOTICE '✅ Only one version of perform_inventory_movement exists';
  ELSE
    RAISE WARNING 'No version of perform_inventory_movement exists!';
  END IF;
END $$;
