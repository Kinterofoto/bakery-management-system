-- Add unit_price column to order_items table if it doesn't exist
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2) DEFAULT 0;

-- Update existing order_items with prices from products table
UPDATE order_items 
SET unit_price = products.price 
FROM products 
WHERE order_items.product_id = products.id 
AND order_items.unit_price = 0;

-- Update specific products with correct prices
UPDATE order_items SET unit_price = 3500.00 WHERE product_id IN (SELECT id FROM products WHERE name = 'Pan Integral');
UPDATE order_items SET unit_price = 2800.00 WHERE product_id IN (SELECT id FROM products WHERE name = 'Pan Blanco');
UPDATE order_items SET unit_price = 4200.00 WHERE product_id IN (SELECT id FROM products WHERE name = 'Croissant');
UPDATE order_items SET unit_price = 4500.00 WHERE product_id IN (SELECT id FROM products WHERE name = 'Baguette');
UPDATE order_items SET unit_price = 3800.00 WHERE product_id IN (SELECT id FROM products WHERE name = 'Pan Dulce');
UPDATE order_items SET unit_price = 1500.00 WHERE product_id IN (SELECT id FROM products WHERE name = 'Pan de Hamburguesa');
UPDATE order_items SET unit_price = 8500.00 WHERE product_id IN (SELECT id FROM products WHERE name = 'Rosquillas');

-- Recalculate totals for all orders
SELECT calculate_order_total(id) FROM orders;
