-- Migration: Add performance indexes for Kardex module
-- Purpose: Optimize common queries for scalability with large datasets

-- =====================================================
-- 1. COMPOSITE INDEX FOR COMMON FILTER COMBINATIONS
-- =====================================================

-- Most common query: Recent movements by date DESC
-- Already exists from creation, but let's ensure it's optimal
DROP INDEX IF EXISTS compras.idx_inventory_movements_date;
CREATE INDEX IF NOT EXISTS idx_inventory_movements_date_desc
  ON compras.inventory_movements(movement_date DESC, created_at DESC);

-- Composite index for filtering by material and date range
CREATE INDEX IF NOT EXISTS idx_inventory_movements_material_date
  ON compras.inventory_movements(material_id, movement_date DESC)
  WHERE movement_date IS NOT NULL;

-- Index for filtering by movement type (reception, consumption, etc.)
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type_date
  ON compras.inventory_movements(movement_type, movement_date DESC);

-- Index for warehouse type filtering
CREATE INDEX IF NOT EXISTS idx_inventory_movements_warehouse_type_date
  ON compras.inventory_movements(warehouse_type, movement_date DESC)
  WHERE warehouse_type IS NOT NULL;

-- Composite index for material + type + date (common filter combination)
CREATE INDEX IF NOT EXISTS idx_inventory_movements_material_type_date
  ON compras.inventory_movements(material_id, movement_type, movement_date DESC);

-- =====================================================
-- 2. INDEXES FOR BALANCE TABLE
-- =====================================================

-- Index for filtering materials with stock
CREATE INDEX IF NOT EXISTS idx_material_balances_total_stock_desc
  ON compras.material_inventory_balances(total_stock DESC)
  WHERE total_stock > 0;

-- Index for warehouse stock queries
CREATE INDEX IF NOT EXISTS idx_material_balances_warehouse_desc
  ON compras.material_inventory_balances(warehouse_stock DESC)
  WHERE warehouse_stock > 0;

-- Index for production stock queries
CREATE INDEX IF NOT EXISTS idx_material_balances_production_desc
  ON compras.material_inventory_balances(production_stock DESC)
  WHERE production_stock > 0;

-- Index for last updated queries (useful for cache invalidation)
CREATE INDEX IF NOT EXISTS idx_material_balances_updated
  ON compras.material_inventory_balances(last_updated_at DESC);

-- =====================================================
-- 3. COVERING INDEX FOR COMMON MOVEMENTS QUERY
-- =====================================================

-- Covering index to avoid table lookups for common columns
CREATE INDEX IF NOT EXISTS idx_inventory_movements_covering
  ON compras.inventory_movements(
    movement_date DESC,
    material_id,
    movement_type,
    quantity_change,
    warehouse_type
  )
  INCLUDE (unit_of_measure, notes, created_at);

-- =====================================================
-- 4. ADD STATISTICS FOR QUERY PLANNER
-- =====================================================

-- Update statistics to help PostgreSQL query planner
ANALYZE compras.inventory_movements;
ANALYZE compras.material_inventory_balances;

-- =====================================================
-- 5. ADD COMMENTS
-- =====================================================

COMMENT ON INDEX compras.idx_inventory_movements_date_desc IS
  'Optimizes default query: recent movements ordered by date DESC';

COMMENT ON INDEX compras.idx_inventory_movements_material_date IS
  'Optimizes filtering by specific material within date range';

COMMENT ON INDEX compras.idx_inventory_movements_type_date IS
  'Optimizes filtering by movement type (reception, consumption, etc.)';

COMMENT ON INDEX compras.idx_inventory_movements_warehouse_type_date IS
  'Optimizes filtering by warehouse vs production location';

COMMENT ON INDEX compras.idx_inventory_movements_material_type_date IS
  'Optimizes complex filter: material + type + date range';

COMMENT ON INDEX compras.idx_inventory_movements_covering IS
  'Covering index to avoid table lookups for common SELECT columns';

COMMENT ON INDEX compras.idx_material_balances_total_stock_desc IS
  'Optimizes queries for materials sorted by total stock';

COMMENT ON INDEX compras.idx_material_balances_updated IS
  'Optimizes cache invalidation queries by last_updated_at';
