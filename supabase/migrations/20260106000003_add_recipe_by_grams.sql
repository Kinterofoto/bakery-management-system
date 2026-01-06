-- Add recipe by grams functionality to products and BOM

-- Add is_recipe_by_grams flag to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS is_recipe_by_grams boolean DEFAULT false;

-- Add original_quantity to bill_of_materials to store user input
ALTER TABLE produccion.bill_of_materials
ADD COLUMN IF NOT EXISTS original_quantity numeric(12, 3);

-- Migrate existing data: copy quantity_needed to original_quantity
UPDATE produccion.bill_of_materials
SET original_quantity = quantity_needed
WHERE original_quantity IS NULL;

-- Add comment to explain the fields
COMMENT ON COLUMN products.is_recipe_by_grams IS
'When true, all BOM materials for this product will be normalized so their quantities sum to 1 (100%)';

COMMENT ON COLUMN produccion.bill_of_materials.original_quantity IS
'Original quantity entered by user before normalization (shown in UI)';

COMMENT ON COLUMN produccion.bill_of_materials.quantity_needed IS
'Normalized quantity used in calculations. When is_recipe_by_grams is true, this equals original_quantity / sum(all_original_quantities)';
