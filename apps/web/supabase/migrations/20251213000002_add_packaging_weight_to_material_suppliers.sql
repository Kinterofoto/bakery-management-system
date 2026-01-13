-- Add packaging_weight_grams column to material_suppliers
-- This column stores the total weight in grams of the packaging presentation
ALTER TABLE compras.material_suppliers
ADD COLUMN IF NOT EXISTS packaging_weight_grams INTEGER;

COMMENT ON COLUMN compras.material_suppliers.packaging_weight_grams IS 'Total weight in grams of the packaging presentation. Used to calculate price per gram.';

-- Update existing records to have a default value if null
-- We'll calculate from packaging_unit if it exists, otherwise set to 1000g (1kg)
UPDATE compras.material_suppliers
SET packaging_weight_grams = COALESCE(packaging_unit * 1000, 1000)
WHERE packaging_weight_grams IS NULL;
