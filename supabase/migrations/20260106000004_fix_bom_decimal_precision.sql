-- Fix BOM decimal precision and migrate existing data

-- 1. Change decimal precision from 3 to 6 digits for better normalization accuracy
ALTER TABLE produccion.bill_of_materials
ALTER COLUMN quantity_needed TYPE numeric(12, 6);

ALTER TABLE produccion.bill_of_materials
ALTER COLUMN original_quantity TYPE numeric(12, 6);

ALTER TABLE produccion.bill_of_materials
ALTER COLUMN unit_equivalence_grams TYPE numeric(12, 6);

ALTER TABLE produccion.bill_of_materials
ALTER COLUMN tiempo_reposo_horas TYPE numeric(8, 6);

-- 2. Migrate existing data: ensure original_quantity is populated
-- For items where original_quantity is NULL, copy from quantity_needed
UPDATE produccion.bill_of_materials
SET original_quantity = quantity_needed
WHERE original_quantity IS NULL;

-- 3. Add comment
COMMENT ON COLUMN produccion.bill_of_materials.quantity_needed IS
'Normalized quantity used in calculations. When is_recipe_by_grams is true, this equals original_quantity / sum(all_original_quantities) for the product. Precision: 6 decimal places for accurate percentage calculations.';

COMMENT ON COLUMN produccion.bill_of_materials.original_quantity IS
'Original quantity entered by user before normalization (shown in UI). This value never changes unless manually edited. Precision: 6 decimal places.';
