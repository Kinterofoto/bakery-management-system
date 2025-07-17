-- Fix any existing orders that might have NULL total_value
UPDATE orders 
SET total_value = (
  SELECT COALESCE(SUM(quantity_requested * unit_price), 0)
  FROM order_items 
  WHERE order_items.order_id = orders.id
)
WHERE total_value IS NULL OR total_value = 0;

-- Ensure all order_items have unit_price set
UPDATE order_items 
SET unit_price = products.price 
FROM products 
WHERE order_items.product_id = products.id 
AND (order_items.unit_price IS NULL OR order_items.unit_price = 0)
AND products.price IS NOT NULL;

-- Set default prices for products that don't have prices
UPDATE products SET price = 1000.00 WHERE price IS NULL OR price = 0;

-- Update order_items that still don't have unit_price
UPDATE order_items SET unit_price = 1000.00 WHERE unit_price IS NULL OR unit_price = 0;

-- Recalculate all order totals using the function
SELECT calculate_order_total(id) FROM orders;
