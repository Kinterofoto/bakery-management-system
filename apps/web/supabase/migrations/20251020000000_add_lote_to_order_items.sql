-- Add lote column to order_items table
ALTER TABLE order_items
ADD COLUMN lote TEXT;

-- Add comment to document the column
COMMENT ON COLUMN order_items.lote IS 'Lote/batch number for the product item';
