-- =====================================================
-- Migration: Set WH3 as Default Dispatch Location
-- =====================================================
-- Purpose: Configure WH3 (Producto Terminado) as the default location for dispatch inventory movements
-- Date: 2025-12-03
-- =====================================================

-- Update dispatch_inventory_config to use WH3 as default location
UPDATE public.dispatch_inventory_config
SET default_dispatch_location_id = (
  SELECT id
  FROM inventario.locations
  WHERE code = 'WH3'
  LIMIT 1
)
WHERE id = '00000000-0000-0000-0000-000000000000'::UUID;

-- Verify the update
DO $$
DECLARE
  v_location_id UUID;
  v_location_code VARCHAR;
  v_location_name VARCHAR;
BEGIN
  SELECT
    default_dispatch_location_id,
    l.code,
    l.name
  INTO
    v_location_id,
    v_location_code,
    v_location_name
  FROM public.dispatch_inventory_config c
  LEFT JOIN inventario.locations l ON c.default_dispatch_location_id = l.id
  WHERE c.id = '00000000-0000-0000-0000-000000000000'::UUID;

  IF v_location_id IS NULL THEN
    RAISE EXCEPTION 'Failed to set WH3 as default dispatch location. WH3 may not exist in locations table.';
  ELSE
    RAISE NOTICE 'Default dispatch location set successfully:';
    RAISE NOTICE '  Location ID: %', v_location_id;
    RAISE NOTICE '  Code: %', v_location_code;
    RAISE NOTICE '  Name: %', v_location_name;
  END IF;
END $$;

-- =====================================================
-- COMMENT
-- =====================================================
COMMENT ON TABLE public.dispatch_inventory_config IS 'Configuration for dispatch-inventory integration. Default location is WH3 (Producto Terminado) where finished goods from production are received.';
