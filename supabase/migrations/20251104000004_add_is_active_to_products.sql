-- Add is_active field to products table
-- This field controls whether a product is available for new transactions
-- Products with is_active = false will not appear in:
-- - Order Management (new orders)
-- - E-commerce
-- - CRM (new orders from leads)
-- - Production module (new productions)
-- Products will still appear in existing/historical orders

-- Add is_active column with default value true
ALTER TABLE products
ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL;

-- Set all existing products to active
UPDATE products SET is_active = true WHERE is_active IS NULL;

-- Create index for efficient filtering by is_active
CREATE INDEX idx_products_is_active ON products(is_active);

-- Create index for common query pattern (active + category)
CREATE INDEX idx_products_is_active_category ON products(is_active, category);

-- Add comment to document the field
COMMENT ON COLUMN products.is_active IS 'Controls product availability for new transactions. Inactive products are hidden from new orders, e-commerce, and production but remain visible in historical data.';
