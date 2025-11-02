-- Create tables for the bakery management system

-- Users and roles
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'reviewer_area1', 'reviewer_area2', 'dispatcher', 'driver', 'commercial')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  unit VARCHAR(50) NOT NULL DEFAULT 'units',
  price DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number VARCHAR(100) UNIQUE NOT NULL,
  client_id UUID REFERENCES clients(id),
  expected_delivery_date DATE NOT NULL,
  observations TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'review_area1', 'review_area2', 'ready_dispatch', 'dispatched', 'in_delivery', 'delivered', 'partially_delivered', 'returned')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  total_value DECIMAL(12,2) DEFAULT 0,
  assigned_route_id UUID REFERENCES routes(id)
);

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity_requested INTEGER NOT NULL,
  quantity_available INTEGER DEFAULT 0,
  quantity_missing INTEGER DEFAULT 0,
  quantity_dispatched INTEGER DEFAULT 0,
  quantity_delivered INTEGER DEFAULT 0,
  quantity_returned INTEGER DEFAULT 0,
  availability_status VARCHAR(50) DEFAULT 'pending' CHECK (availability_status IN ('pending', 'available', 'partial', 'unavailable')),
  created_at TIMESTAMP DEFAULT NOW(),
  unit_price DECIMAL(10,2) DEFAULT 0
);

-- Add vehicles table BEFORE routes table
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_code VARCHAR(50) UNIQUE NOT NULL,
  driver_name VARCHAR(255),
  capacity_kg DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Then create routes table with vehicle reference
CREATE TABLE IF NOT EXISTS routes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  route_name VARCHAR(255) NOT NULL,
  driver_id UUID REFERENCES users(id),
  vehicle_id UUID REFERENCES vehicles(id),
  route_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Route orders (many-to-many relationship)
CREATE TABLE IF NOT EXISTS route_orders (
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

-- Returns
CREATE TABLE IF NOT EXISTS returns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  product_id UUID REFERENCES products(id),
  quantity_returned INTEGER NOT NULL,
  return_reason VARCHAR(255),
  return_date TIMESTAMP DEFAULT NOW(),
  processed_by UUID REFERENCES users(id),
  route_id UUID REFERENCES routes(id),
  rejection_reason TEXT
);

-- Order status history
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  changed_by UUID REFERENCES users(id),
  change_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add order_item_deliveries table for granular delivery tracking
CREATE TABLE IF NOT EXISTS order_item_deliveries (
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

-- Add order status triggers
CREATE OR REPLACE FUNCTION update_order_status_history()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by, change_reason)
    VALUES (NEW.id, OLD.status, NEW.status, NEW.created_by, 'Status updated');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_status_change_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_order_status_history();

-- Function to calculate order total
CREATE OR REPLACE FUNCTION calculate_order_total(order_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
  total DECIMAL(12,2);
BEGIN
  SELECT COALESCE(SUM(quantity_requested * unit_price), 0)
  INTO total
  FROM order_items
  WHERE order_id = order_uuid;
  
  UPDATE orders SET total_value = total WHERE id = order_uuid;
  
  RETURN total;
END;
$$ LANGUAGE plpgsql;
