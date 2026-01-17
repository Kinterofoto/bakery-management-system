-- Add VAT breakdown fields to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10,2);

-- Add comment
COMMENT ON COLUMN orders.subtotal IS 'Subtotal del pedido antes de IVA';
COMMENT ON COLUMN orders.vat_amount IS 'Monto del IVA (19%)';

-- Update existing records to calculate subtotal and VAT from total_value
-- Assuming total_value already includes VAT for products with tax_rate = 19
UPDATE orders
SET subtotal = total_value,
    vat_amount = 0
WHERE subtotal IS NULL;
