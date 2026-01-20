-- Add batch_number and expiry_date columns to material_consumptions table
-- These fields are used to track batch information for materials consumed in production

ALTER TABLE produccion.material_consumptions
ADD COLUMN batch_number VARCHAR(100),
ADD COLUMN expiry_date DATE;

-- Add comments for documentation
COMMENT ON COLUMN produccion.material_consumptions.batch_number IS 'Batch/lot number of the material consumed';
COMMENT ON COLUMN produccion.material_consumptions.expiry_date IS 'Expiration date of the material batch';
