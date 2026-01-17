-- Reception and Inventory Module Migration
-- Creates tables for material reception tracking and real-time inventory management

-- =====================================================
-- MATERIAL_RECEPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS compras.material_receptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reception_number VARCHAR(50) NOT NULL UNIQUE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('specific_material', 'purchase_order')), -- Type of reception
  purchase_order_id UUID REFERENCES compras.purchase_orders(id) ON DELETE SET NULL, -- Only for PO receptions
  material_id UUID REFERENCES public.products(id) ON DELETE SET NULL, -- Only for specific material receptions
  quantity_received DECIMAL(12, 3) NOT NULL,
  unit_of_measure VARCHAR(50), -- e.g., "kg", "liters", "boxes"
  reception_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reception_time TIME,
  batch_number VARCHAR(100),
  lot_number VARCHAR(100),
  supplier_id UUID REFERENCES compras.suppliers(id),
  operator_id UUID REFERENCES auth.users(id), -- Operator who received
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_material_receptions_order ON compras.material_receptions(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_material_receptions_material ON compras.material_receptions(material_id);
CREATE INDEX IF NOT EXISTS idx_material_receptions_supplier ON compras.material_receptions(supplier_id);
CREATE INDEX IF NOT EXISTS idx_material_receptions_date ON compras.material_receptions(reception_date DESC);
CREATE INDEX IF NOT EXISTS idx_material_receptions_number ON compras.material_receptions(reception_number);
CREATE INDEX IF NOT EXISTS idx_material_receptions_operator ON compras.material_receptions(operator_id);

-- =====================================================
-- INVENTORY_MOVEMENTS TABLE (Audit Trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS compras.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  movement_type VARCHAR(30) NOT NULL CHECK (movement_type IN (
    'reception',
    'consumption',
    'adjustment',
    'return',
    'waste',
    'transfer'
  )),
  quantity_change DECIMAL(12, 3) NOT NULL, -- Positive for entrada, negative for salida
  unit_of_measure VARCHAR(50),
  reference_id UUID, -- Reference to material_receptions, production records, etc.
  reference_type VARCHAR(50), -- e.g., 'material_reception', 'production', 'adjustment'
  location VARCHAR(100), -- Storage location
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  movement_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_inventory_movements_material ON compras.inventory_movements(material_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON compras.inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_date ON compras.inventory_movements(movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_reference ON compras.inventory_movements(reference_id);

-- =====================================================
-- MATERIAL_INVENTORY_VIEW (Real-time Inventory Status)
-- =====================================================
CREATE OR REPLACE VIEW compras.material_inventory_status AS
SELECT
  p.id,
  p.name,
  p.category,
  COALESCE(SUM(CASE WHEN im.movement_type = 'reception' THEN im.quantity_change ELSE 0 END), 0) as current_stock,
  COALESCE(SUM(CASE WHEN im.movement_type = 'consumption' THEN im.quantity_change ELSE 0 END), 0) as total_consumed,
  COALESCE(SUM(CASE WHEN im.movement_type = 'waste' THEN im.quantity_change ELSE 0 END), 0) as total_waste,
  MAX(im.movement_date) as last_movement_date,
  COUNT(DISTINCT mr.id) as total_receptions
FROM public.products p
LEFT JOIN compras.inventory_movements im ON p.id = im.material_id
LEFT JOIN compras.material_receptions mr ON p.id = mr.material_id
WHERE p.category = 'mp' -- Only raw materials
GROUP BY p.id, p.name, p.category;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS for material_receptions
ALTER TABLE compras.material_receptions ENABLE ROW LEVEL SECURITY;

-- Material Receptions RLS Policies
CREATE POLICY "material_receptions_allow_authenticated_select" ON compras.material_receptions
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "material_receptions_allow_authenticated_insert" ON compras.material_receptions
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "material_receptions_allow_authenticated_update" ON compras.material_receptions
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "material_receptions_allow_authenticated_delete" ON compras.material_receptions
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Enable RLS for inventory_movements
ALTER TABLE compras.inventory_movements ENABLE ROW LEVEL SECURITY;

-- Inventory Movements RLS Policies
CREATE POLICY "inventory_movements_allow_authenticated_select" ON compras.inventory_movements
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "inventory_movements_allow_authenticated_insert" ON compras.inventory_movements
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "inventory_movements_allow_authenticated_update" ON compras.inventory_movements
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "inventory_movements_allow_authenticated_delete" ON compras.inventory_movements
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- =====================================================
-- FUNCTION: Generate Reception Number
-- =====================================================
CREATE OR REPLACE FUNCTION compras.generate_reception_number()
RETURNS VARCHAR AS $$
DECLARE
  year_part VARCHAR;
  counter INTEGER;
  new_number VARCHAR;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YY');
  
  -- Get the next counter for this year
  counter := COALESCE(
    (SELECT CAST(SUBSTRING(reception_number, 4) AS INTEGER) 
     FROM compras.material_receptions 
     WHERE reception_number LIKE 'RC' || year_part || '%'
     ORDER BY CAST(SUBSTRING(reception_number, 4) AS INTEGER) DESC
     LIMIT 1),
    0
  ) + 1;
  
  new_number := 'RC' || year_part || LPAD(counter::TEXT, 5, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: Update reception_number on insert
-- =====================================================
CREATE OR REPLACE FUNCTION compras.set_reception_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reception_number IS NULL THEN
    NEW.reception_number := compras.generate_reception_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reception_number_trigger
BEFORE INSERT ON compras.material_receptions
FOR EACH ROW
EXECUTE FUNCTION compras.set_reception_number();

-- =====================================================
-- TRIGGER: Create inventory movement on reception
-- =====================================================
CREATE OR REPLACE FUNCTION compras.create_movement_on_reception()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO compras.inventory_movements (
    material_id,
    movement_type,
    quantity_change,
    unit_of_measure,
    reference_id,
    reference_type,
    notes,
    recorded_by,
    movement_date
  ) VALUES (
    NEW.material_id,
    'reception',
    NEW.quantity_received,
    NEW.unit_of_measure,
    NEW.id,
    'material_reception',
    'Recepción de material: ' || COALESCE(NEW.batch_number, '') || ' ' || COALESCE(NEW.lot_number, ''),
    NEW.operator_id,
    CURRENT_TIMESTAMP
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inventory_movement_on_reception
AFTER INSERT ON compras.material_receptions
FOR EACH ROW
EXECUTE FUNCTION compras.create_movement_on_reception();
