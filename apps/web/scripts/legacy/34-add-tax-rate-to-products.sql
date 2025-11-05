-- Add tax rate field to products table
-- Script 34: Add tax_rate column for product tax management

-- Add tax_rate column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 19.00;

-- Create index for better performance when filtering by tax rate
CREATE INDEX IF NOT EXISTS idx_products_tax_rate ON products(tax_rate);

-- Update existing products to have default tax rate (19%)
UPDATE products
SET tax_rate = 19.00
WHERE tax_rate IS NULL;

-- Add constraint to ensure tax rate is valid (0% or 19%)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'products_tax_rate_check'
        AND table_name = 'products'
    ) THEN
        ALTER TABLE products ADD CONSTRAINT products_tax_rate_check
        CHECK (tax_rate IN (0.00, 19.00));
    END IF;
END $$;

-- Add comment to document the purpose
COMMENT ON COLUMN products.tax_rate IS 'Tasa de impuesto del producto (0% o 19%)';

-- Print completion message
DO $$
BEGIN
    RAISE NOTICE 'Tax rate field added to products table successfully';
    RAISE NOTICE '• Added tax_rate column to products table';
    RAISE NOTICE '• Set default tax rate to 19%% for all products';
    RAISE NOTICE '• Added constraint to allow only 0%% or 19%% tax rates';
    RAISE NOTICE '• Created index for better tax rate filtering performance';
END $$;