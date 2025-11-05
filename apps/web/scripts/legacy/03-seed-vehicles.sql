-- Insert sample vehicles
INSERT INTO vehicles (vehicle_code, driver_name, capacity_kg, status) VALUES
('VEH-001', 'Pedro Martínez', 1500.00, 'available'),
('VEH-002', 'Ana García', 1200.00, 'available'),
('VEH-003', 'Carlos López', 1800.00, 'available'),
('VEH-004', 'María Rodríguez', 1000.00, 'maintenance');

-- Update existing routes with vehicles
UPDATE routes SET vehicle_id = (SELECT id FROM vehicles WHERE vehicle_code = 'VEH-001') WHERE route_name = 'Ruta Norte';
UPDATE routes SET vehicle_id = (SELECT id FROM vehicles WHERE vehicle_code = 'VEH-002') WHERE route_name = 'Ruta Sur';

-- Update order_items with prices
UPDATE order_items SET unit_price = 3500.00 WHERE product_id = (SELECT id FROM products WHERE name = 'Pan Integral');
UPDATE order_items SET unit_price = 2800.00 WHERE product_id = (SELECT id FROM products WHERE name = 'Pan Blanco');
UPDATE order_items SET unit_price = 4200.00 WHERE product_id = (SELECT id FROM products WHERE name = 'Croissant');
UPDATE order_items SET unit_price = 4500.00 WHERE product_id = (SELECT id FROM products WHERE name = 'Baguette');
UPDATE order_items SET unit_price = 3800.00 WHERE product_id = (SELECT id FROM products WHERE name = 'Pan Dulce');
UPDATE order_items SET unit_price = 1500.00 WHERE product_id = (SELECT id FROM products WHERE name = 'Pan de Hamburguesa');
UPDATE order_items SET unit_price = 8500.00 WHERE product_id = (SELECT id FROM products WHERE name = 'Rosquillas');

-- Calculate totals for existing orders
SELECT calculate_order_total(id) FROM orders;
