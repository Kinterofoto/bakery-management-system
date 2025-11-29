-- Migration: Create physical balance table for material inventory
-- Purpose: Optimize inventory queries by maintaining real-time balances
-- instead of calculating from all historical movements

-- =====================================================
-- 1. CREATE PHYSICAL BALANCE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS compras.material_inventory_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,

  -- Stock quantities by location
  warehouse_stock DECIMAL(12, 3) NOT NULL DEFAULT 0,
  production_stock DECIMAL(12, 3) NOT NULL DEFAULT 0,

  -- Computed total (stored for performance)
  total_stock DECIMAL(12, 3) GENERATED ALWAYS AS (warehouse_stock + production_stock) STORED,

  -- Unit of measure (denormalized for quick reference)
  unit_of_measure VARCHAR(50) NOT NULL DEFAULT 'kg',

  -- Audit fields
  last_movement_id UUID REFERENCES compras.inventory_movements(id),
  last_movement_date TIMESTAMP WITH TIME ZONE,
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Future expansion fields (not used in phase 1)
  minimum_stock DECIMAL(12, 3),
  maximum_stock DECIMAL(12, 3),
  reorder_point DECIMAL(12, 3),

  -- Constraints
  CONSTRAINT unique_material_balance UNIQUE (material_id),
  CONSTRAINT positive_warehouse_stock CHECK (warehouse_stock >= 0),
  CONSTRAINT positive_production_stock CHECK (production_stock >= 0)
);

-- =====================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_material_balances_material_id
  ON compras.material_inventory_balances(material_id);

CREATE INDEX idx_material_balances_warehouse_stock
  ON compras.material_inventory_balances(warehouse_stock)
  WHERE warehouse_stock > 0;

CREATE INDEX idx_material_balances_production_stock
  ON compras.material_inventory_balances(production_stock)
  WHERE production_stock > 0;

CREATE INDEX idx_material_balances_total_stock
  ON compras.material_inventory_balances(total_stock)
  WHERE total_stock > 0;

CREATE INDEX idx_material_balances_last_updated
  ON compras.material_inventory_balances(last_updated_at DESC);

-- =====================================================
-- 3. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE compras.material_inventory_balances IS
  'Physical balance table for real-time inventory tracking. Maintains current stock levels per material and location, updated via triggers on inventory_movements.';

COMMENT ON COLUMN compras.material_inventory_balances.warehouse_stock IS
  'Current stock quantity in warehouse/bodega';

COMMENT ON COLUMN compras.material_inventory_balances.production_stock IS
  'Current stock quantity in production/work centers (sum of all work centers)';

COMMENT ON COLUMN compras.material_inventory_balances.total_stock IS
  'Computed total stock (warehouse + production), stored for performance';

COMMENT ON COLUMN compras.material_inventory_balances.last_movement_id IS
  'Reference to the last movement that updated this balance';

-- =====================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE compras.material_inventory_balances ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read balances
CREATE POLICY select_material_balances
  ON compras.material_inventory_balances
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only allow system (triggers/functions) to modify balances
-- Users should not directly update balances, only through movements
CREATE POLICY update_material_balances
  ON compras.material_inventory_balances
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY insert_material_balances
  ON compras.material_inventory_balances
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY delete_material_balances
  ON compras.material_inventory_balances
  FOR DELETE
  TO authenticated
  USING (false);

-- =====================================================
-- 5. GRANT PERMISSIONS
-- =====================================================

GRANT SELECT ON compras.material_inventory_balances TO authenticated;
GRANT SELECT ON compras.material_inventory_balances TO anon;

-- Allow service role to modify (for triggers and functions)
GRANT ALL ON compras.material_inventory_balances TO service_role;
