-- Fix warehouse inventory calculation
-- Issue: transfer_qty is already negative from trigger, but we were summing it wrong

DROP VIEW IF EXISTS compras.inventory_status_by_location CASCADE;
DROP VIEW IF EXISTS compras.warehouse_inventory_status CASCADE;

-- =====================================================
-- WAREHOUSE INVENTORY VIEW (Bodega) - CORRECTED
-- Stock = Reception + Returns + Transfers (transfers are already negative from trigger)
-- This equals: what we received + what came back - what we sent to production
-- =====================================================
CREATE OR REPLACE VIEW compras.warehouse_inventory_status AS
WITH movement_summary AS (
  SELECT
    material_id,
    SUM(quantity_change) as net_warehouse_stock,
    MAX(movement_date) as last_movement_date
  FROM compras.inventory_movements
  WHERE movement_type IN ('reception', 'transfer', 'return')
  GROUP BY material_id
)
SELECT
  p.id,
  p.name,
  p.category,
  COALESCE(ms.net_warehouse_stock, 0) as current_stock,
  0 as total_consumed,
  0 as total_waste,
  ms.last_movement_date,
  0 as total_receptions,
  'warehouse' as location_type
FROM public.products p
LEFT JOIN movement_summary ms ON p.id = ms.material_id
WHERE p.category = 'mp';

-- =====================================================
-- PRODUCTION INVENTORY VIEW (Producción)
-- Aggregates inventory from work_center_inventory
-- =====================================================
CREATE OR REPLACE VIEW compras.production_inventory_status AS
SELECT
  p.id,
  p.name,
  p.category,
  COALESCE(SUM(wci.quantity_available), 0) as current_stock,
  COALESCE(SUM(wci.quantity_consumed), 0) as total_consumed,
  0 as total_waste,
  MAX(wci.transferred_at) as last_movement_date,
  COUNT(DISTINCT wci.work_center_id) as total_receptions,
  'production' as location_type
FROM public.products p
LEFT JOIN produccion.work_center_inventory wci ON p.id = wci.material_id
WHERE p.category = 'mp'
GROUP BY p.id, p.name, p.category;

-- =====================================================
-- COMBINED INVENTORY VIEW
-- =====================================================
CREATE OR REPLACE VIEW compras.inventory_status_by_location AS
SELECT
  w.id,
  w.name,
  w.category,
  w.current_stock,
  w.total_consumed,
  w.total_waste,
  w.last_movement_date,
  w.total_receptions,
  'warehouse' as location_type
FROM compras.warehouse_inventory_status w

UNION ALL

SELECT
  p.id,
  p.name,
  p.category,
  p.current_stock,
  p.total_consumed,
  p.total_waste,
  p.last_movement_date,
  p.total_receptions,
  'production' as location_type
FROM compras.production_inventory_status p;

COMMENT ON VIEW compras.warehouse_inventory_status IS 'Warehouse inventory: sum of reception + return + transfer movements (net warehouse stock)';
COMMENT ON VIEW compras.production_inventory_status IS 'Production inventory: direct count from work_center_inventory table';
