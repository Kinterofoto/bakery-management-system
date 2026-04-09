-- Fix: product_technical_specs, product_costs, product_commercial_info
-- allow duplicate product_id rows. Deduplicate and add unique constraints.

-- product_technical_specs
DELETE FROM public.product_technical_specs
WHERE id NOT IN (
  SELECT DISTINCT ON (product_id) id
  FROM public.product_technical_specs
  ORDER BY product_id, updated_at DESC NULLS LAST
);
ALTER TABLE public.product_technical_specs
  ADD CONSTRAINT product_technical_specs_product_id_unique UNIQUE (product_id);

-- product_costs
DELETE FROM public.product_costs
WHERE id NOT IN (
  SELECT DISTINCT ON (product_id) id
  FROM public.product_costs
  ORDER BY product_id, updated_at DESC NULLS LAST
);
ALTER TABLE public.product_costs
  ADD CONSTRAINT product_costs_product_id_unique UNIQUE (product_id);

-- product_commercial_info
DELETE FROM public.product_commercial_info
WHERE id NOT IN (
  SELECT DISTINCT ON (product_id) id
  FROM public.product_commercial_info
  ORDER BY product_id, updated_at DESC NULLS LAST
);
ALTER TABLE public.product_commercial_info
  ADD CONSTRAINT product_commercial_info_product_id_unique UNIQUE (product_id);
