-- Purchase Module Migration
-- Creates schema and tables for suppliers, material-supplier relationships, and purchase orders

-- =====================================================
-- CREATE COMPRAS SCHEMA
-- =====================================================
CREATE SCHEMA IF NOT EXISTS compras;

-- =====================================================
-- SUPPLIERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS compras.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(255) NOT NULL,
  nit VARCHAR(50) NOT NULL UNIQUE,
  address TEXT,
  contact_person_name VARCHAR(255),
  contact_phone VARCHAR(50),
  contact_email VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON compras.suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_nit ON compras.suppliers(nit);

-- =====================================================
-- MATERIAL_SUPPLIERS TABLE (Many-to-Many relationship)
-- =====================================================
CREATE TABLE IF NOT EXISTS compras.material_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES compras.suppliers(id) ON DELETE CASCADE,
  presentation VARCHAR(255), -- Packaging format (e.g., "Bolsa 50kg", "Caja 25 unidades")
  unit_price DECIMAL(12, 2) NOT NULL,
  packaging_unit INTEGER DEFAULT 1, -- How many units per package
  lead_time_days INTEGER, -- Expected delivery time in days
  is_preferred BOOLEAN DEFAULT false, -- Preferred supplier for this material
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(material_id, supplier_id)
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_material_suppliers_material ON compras.material_suppliers(material_id);
CREATE INDEX IF NOT EXISTS idx_material_suppliers_supplier ON compras.material_suppliers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_material_suppliers_status ON compras.material_suppliers(status);
CREATE INDEX IF NOT EXISTS idx_material_suppliers_preferred ON compras.material_suppliers(is_preferred) WHERE is_preferred = true;

-- =====================================================
-- PURCHASE_ORDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS compras.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) NOT NULL UNIQUE,
  supplier_id UUID NOT NULL REFERENCES compras.suppliers(id) ON DELETE RESTRICT,
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN (
    'pending',
    'ordered',
    'partially_received',
    'received',
    'cancelled'
  )),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  total_amount DECIMAL(12, 2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON compras.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON compras.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_date ON compras.purchase_orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_number ON compras.purchase_orders(order_number);

-- =====================================================
-- PURCHASE_ORDER_ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS compras.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES compras.purchase_orders(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  material_supplier_id UUID REFERENCES compras.material_suppliers(id) ON DELETE SET NULL,
  quantity_ordered DECIMAL(12, 3) NOT NULL,
  quantity_received DECIMAL(12, 3) DEFAULT 0,
  unit_price DECIMAL(12, 2) NOT NULL,
  subtotal DECIMAL(12, 2) GENERATED ALWAYS AS (quantity_ordered * unit_price) STORED,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order ON compras.purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_material ON compras.purchase_order_items(material_id);

-- =====================================================
-- MATERIAL_EXPLOSION_HISTORY TABLE (Track BOM calculations)
-- =====================================================
CREATE TABLE IF NOT EXISTS compras.material_explosion_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity_requested DECIMAL(12, 3) NOT NULL,
  calculation_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES auth.users(id),
  notes TEXT
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_material_explosion_product ON compras.material_explosion_history(product_id);
CREATE INDEX IF NOT EXISTS idx_material_explosion_date ON compras.material_explosion_history(calculation_date DESC);

-- =====================================================
-- MATERIAL_EXPLOSION_ITEMS TABLE (Details of each calculation)
-- =====================================================
CREATE TABLE IF NOT EXISTS compras.material_explosion_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  explosion_id UUID NOT NULL REFERENCES compras.material_explosion_history(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity_per_unit DECIMAL(12, 3) NOT NULL, -- From BOM
  total_quantity_needed DECIMAL(12, 3) NOT NULL, -- Calculated
  suggested_supplier_id UUID REFERENCES compras.suppliers(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_material_explosion_items_explosion ON compras.material_explosion_items(explosion_id);
CREATE INDEX IF NOT EXISTS idx_material_explosion_items_material ON compras.material_explosion_items(material_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to auto-generate purchase order numbers
CREATE OR REPLACE FUNCTION generate_purchase_order_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
  year_suffix VARCHAR(4);
BEGIN
  -- Get current year suffix (last 2 digits)
  year_suffix := TO_CHAR(CURRENT_DATE, 'YY');

  -- Get the next number for this year
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 3) AS INTEGER)), 0) + 1
  INTO next_number
  FROM compras.purchase_orders
  WHERE order_number LIKE 'OC' || year_suffix || '%';

  -- Generate order number: OC + YY + sequential number (padded to 4 digits)
  NEW.order_number := 'OC' || year_suffix || LPAD(next_number::TEXT, 4, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate order number if not provided
CREATE TRIGGER trg_generate_purchase_order_number
BEFORE INSERT ON compras.purchase_orders
FOR EACH ROW
WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
EXECUTE FUNCTION generate_purchase_order_number();

-- Function to update purchase order total
CREATE OR REPLACE FUNCTION update_purchase_order_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE compras.purchase_orders
  SET total_amount = (
    SELECT COALESCE(SUM(subtotal), 0)
    FROM compras.purchase_order_items
    WHERE purchase_order_id = NEW.purchase_order_id
  )
  WHERE id = NEW.purchase_order_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update order total when items change
CREATE TRIGGER trg_update_purchase_order_total_insert
AFTER INSERT ON compras.purchase_order_items
FOR EACH ROW
EXECUTE FUNCTION update_purchase_order_total();

CREATE TRIGGER trg_update_purchase_order_total_update
AFTER UPDATE ON compras.purchase_order_items
FOR EACH ROW
EXECUTE FUNCTION update_purchase_order_total();

CREATE TRIGGER trg_update_purchase_order_total_delete
AFTER DELETE ON compras.purchase_order_items
FOR EACH ROW
EXECUTE FUNCTION update_purchase_order_total();

-- Function to auto-update purchase order status based on received quantities
CREATE OR REPLACE FUNCTION update_purchase_order_status()
RETURNS TRIGGER AS $$
DECLARE
  total_items INTEGER;
  fully_received_items INTEGER;
  partially_received_items INTEGER;
BEGIN
  -- Count items in the order
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE quantity_received >= quantity_ordered),
    COUNT(*) FILTER (WHERE quantity_received > 0 AND quantity_received < quantity_ordered)
  INTO total_items, fully_received_items, partially_received_items
  FROM compras.purchase_order_items
  WHERE purchase_order_id = NEW.purchase_order_id;

  -- Update order status
  IF fully_received_items = total_items THEN
    UPDATE compras.purchase_orders
    SET status = 'received',
        actual_delivery_date = COALESCE(actual_delivery_date, CURRENT_DATE)
    WHERE id = NEW.purchase_order_id AND status != 'received';
  ELSIF partially_received_items > 0 OR fully_received_items > 0 THEN
    UPDATE compras.purchase_orders
    SET status = 'partially_received'
    WHERE id = NEW.purchase_order_id AND status = 'ordered';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update order status when items are received
CREATE TRIGGER trg_update_purchase_order_status
AFTER UPDATE OF quantity_received ON compras.purchase_order_items
FOR EACH ROW
EXECUTE FUNCTION update_purchase_order_status();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update timestamp triggers
CREATE TRIGGER trg_suppliers_updated_at
BEFORE UPDATE ON compras.suppliers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_material_suppliers_updated_at
BEFORE UPDATE ON compras.material_suppliers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_purchase_orders_updated_at
BEFORE UPDATE ON compras.purchase_orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_purchase_order_items_updated_at
BEFORE UPDATE ON compras.purchase_order_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE compras.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras.material_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras.material_explosion_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras.material_explosion_items ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
-- Suppliers
CREATE POLICY "Enable read access for all authenticated users" ON compras.suppliers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON compras.suppliers
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON compras.suppliers
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated users" ON compras.suppliers
  FOR DELETE TO authenticated USING (true);

-- Material Suppliers
CREATE POLICY "Enable read access for all authenticated users" ON compras.material_suppliers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON compras.material_suppliers
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON compras.material_suppliers
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated users" ON compras.material_suppliers
  FOR DELETE TO authenticated USING (true);

-- Purchase Orders
CREATE POLICY "Enable read access for all authenticated users" ON compras.purchase_orders
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON compras.purchase_orders
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON compras.purchase_orders
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated users" ON compras.purchase_orders
  FOR DELETE TO authenticated USING (true);

-- Purchase Order Items
CREATE POLICY "Enable read access for all authenticated users" ON compras.purchase_order_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON compras.purchase_order_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON compras.purchase_order_items
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated users" ON compras.purchase_order_items
  FOR DELETE TO authenticated USING (true);

-- Material Explosion History
CREATE POLICY "Enable read access for all authenticated users" ON compras.material_explosion_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON compras.material_explosion_history
  FOR INSERT TO authenticated WITH CHECK (true);

-- Material Explosion Items
CREATE POLICY "Enable read access for all authenticated users" ON compras.material_explosion_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON compras.material_explosion_items
  FOR INSERT TO authenticated WITH CHECK (true);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE compras.suppliers IS 'Suppliers for raw materials';
COMMENT ON TABLE compras.material_suppliers IS 'Many-to-many relationship between materials and suppliers with pricing and packaging info';
COMMENT ON TABLE compras.purchase_orders IS 'Purchase orders for materials';
COMMENT ON TABLE compras.purchase_order_items IS 'Individual items in a purchase order';
COMMENT ON TABLE compras.material_explosion_history IS 'History of BOM calculations for production planning';
COMMENT ON TABLE compras.material_explosion_items IS 'Detailed results of each BOM calculation';
