-- =====================================================
-- Migration: Update all MP products unit to 'gr'
-- =====================================================
-- Purpose: Standardize all raw materials (MP) to use grams as unit
-- Date: 2025-12-01
-- =====================================================

-- Update all products with category 'MP' to use 'gr' as unit
UPDATE public.products
SET unit = 'gr'
WHERE category = 'MP' AND unit != 'gr';

-- Log the changes
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % products from category MP to unit "gr"', updated_count;
END $$;
