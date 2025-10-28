-- Add is_displayed column to product_evaluations table

ALTER TABLE visitas.product_evaluations
ADD COLUMN IF NOT EXISTS is_displayed BOOLEAN DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN visitas.product_evaluations.is_displayed IS
'Indicates if the product is displayed/exhibited in the store. If false, only temperature, training and comments are evaluated.';
