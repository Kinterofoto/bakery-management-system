-- Migration: Allow multiple work center assignments per product-operation
-- This allows a product to be produced in multiple work centers for the same operation

-- Drop the existing unique constraint that limits one work center per product-operation
ALTER TABLE produccion.product_work_center_mapping
DROP CONSTRAINT IF EXISTS product_work_center_mapping_product_id_operation_id_key;

-- Add a new unique constraint that allows multiple work centers but prevents exact duplicates
ALTER TABLE produccion.product_work_center_mapping
ADD CONSTRAINT product_work_center_mapping_unique_assignment
UNIQUE (product_id, operation_id, work_center_id);

-- Update the updated_at column trigger if it doesn't exist
CREATE OR REPLACE FUNCTION produccion.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_product_work_center_mapping_updated_at ON produccion.product_work_center_mapping;

CREATE TRIGGER update_product_work_center_mapping_updated_at
    BEFORE UPDATE ON produccion.product_work_center_mapping
    FOR EACH ROW
    EXECUTE FUNCTION produccion.update_updated_at_column();
