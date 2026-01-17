-- =====================================================
-- Migration: Update all PT products unit to 'und'
-- =====================================================
-- Purpose: Standardize all finished products (PT) to use units as unit
-- Date: 2025-12-01
-- =====================================================

-- Update all products with category 'PT' to use 'und' as unit
UPDATE public.products
SET unit = 'und'
WHERE category = 'PT' AND unit != 'und';

-- Log the changes
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % products from category PT to unit "und"', updated_count;
END $$;
