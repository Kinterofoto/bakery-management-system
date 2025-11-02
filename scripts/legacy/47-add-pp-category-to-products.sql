-- Migration: Add PP (Semi-Finished Product) category to products table
-- Date: 2025-10-23
-- Description: Extends the products category constraint to support PP (Producto en Proceso/Semi-Finished)
--              in addition to existing PT (Finished Product) and MP (Raw Material) categories

-- Drop the existing check constraint
ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS products_category_check;

-- Add new check constraint with PP category included
ALTER TABLE public.products
ADD CONSTRAINT products_category_check
CHECK (
  category::text = ANY (
    ARRAY['PT'::character varying, 'MP'::character varying, 'PP'::character varying]::text[]
  )
);

-- Add comment to document the categories
COMMENT ON COLUMN public.products.category IS 'Product category: PT (Producto Terminado/Finished), MP (Materia Prima/Raw Material), PP (Producto en Proceso/Semi-Finished)';
