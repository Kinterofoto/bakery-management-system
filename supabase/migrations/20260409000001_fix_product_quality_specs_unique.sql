-- Fix: product_quality_specs allows duplicate product_id rows
-- Keep only the most recently updated row per product_id, delete the rest

DELETE FROM public.product_quality_specs
WHERE id NOT IN (
  SELECT DISTINCT ON (product_id) id
  FROM public.product_quality_specs
  ORDER BY product_id, updated_at DESC NULLS LAST
);

-- Add unique constraint so this cannot happen again
ALTER TABLE public.product_quality_specs
  ADD CONSTRAINT product_quality_specs_product_id_unique UNIQUE (product_id);
