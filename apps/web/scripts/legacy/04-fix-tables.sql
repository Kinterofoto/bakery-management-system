-- Fix table creation order and add missing constraints

-- Drop and recreate tables in correct order
DROP TABLE IF EXISTS order_item_deliveries CASCADE;
DROP TABLE IF EXISTS route_orders CASCADE;
DROP TABLE IF EXISTS returns CASCADE;
DROP TABLE IF EXISTS routes CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;

-- Create vehicles table first
CREATE TABLE vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_code VARCHAR(50) UNIQUE NOT NULL,
  driver_name VARCHAR(255),
  capacity_kg DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create routes table
CREATE TABLE routes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  route_name VARCHAR(255) NOT NULL,
  driver_id UUID REFERENCES users(id),
  vehicle_id UUID REFERENCES vehicles(id),
  route_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Update orders table to add route reference if not exists
ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_route_id UUID REFERENCES routes(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_value DECIMAL(12,2) DEFAULT 0;

-- Add unit_price to order_items if not exists
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2) DEFAULT 0;

-- Recreate route_orders table
CREATE TABLE route_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id),
  delivery_sequence INTEGER NOT NULL,
  delivery_status VARCHAR(50) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'delivered', 'partial', 'rejected')),
  delivery_time TIMESTAMP,
  evidence_url TEXT,
  delivery_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Recreate returns table
CREATE TABLE returns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  product_id UUID REFERENCES products(id),
  route_id UUID REFERENCES routes(id),
  quantity_returned INTEGER NOT NULL,
  return_reason VARCHAR(255),
  rejection_reason TEXT,
  return_date TIMESTAMP DEFAULT NOW(),
  processed_by UUID REFERENCES users(id)
);

-- Recreate order_item_deliveries table
CREATE TABLE order_item_deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  route_order_id UUID REFERENCES route_orders(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE,
  delivery_status VARCHAR(50) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'delivered', 'partial', 'rejected')),
  quantity_delivered INTEGER DEFAULT 0,
  quantity_rejected INTEGER DEFAULT 0,
  rejection_reason TEXT,
  evidence_url TEXT,
  delivery_notes TEXT,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert sample vehicles
INSERT INTO vehicles (vehicle_code, driver_name, capacity_kg, status) VALUES
('VEH-001', 'Pedro Martínez', 1500.00, 'available'),
('VEH-002', 'Ana García', 1200.00, 'available'),
('VEH-003', 'Carlos López', 1800.00, 'available'),
('VEH-004', 'María Rodríguez', 1000.00, 'maintenance');

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
