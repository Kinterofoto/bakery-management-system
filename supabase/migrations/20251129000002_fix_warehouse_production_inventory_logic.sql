-- Fix Warehouse and Production Inventory Views Logic
-- Previous views had incorrect logic for separating warehouse vs production inventory

-- =====================================================
-- DROP EXISTING VIEWS
-- =====================================================
DROP VIEW IF EXISTS compras.inventory_status_by_location CASCADE;
DROP VIEW IF EXISTS compras.production_inventory_status CASCADE;
DROP VIEW IF EXISTS compras.warehouse_inventory_status CASCADE;

-- =====================================================
-- WAREHOUSE INVENTORY VIEW (Bodega)
-- Stock = Reception + Returns - Transfers - Consumption - Waste
-- Only tracks inventory in warehouse storage
-- =====================================================
CREATE OR REPLACE VIEW compras.warehouse_inventory_status AS
WITH movement_summary AS (
  SELECT
    material_id,
    SUM(CASE WHEN movement_type = 'reception' THEN quantity_change ELSE 0 END) as reception_qty,
    SUM(CASE WHEN movement_type = 'transfer' THEN quantity_change ELSE 0 END) as transfer_qty,
    SUM(CASE WHEN movement_type = 'return' THEN quantity_change ELSE 0 END) as return_qty,
    SUM(CASE WHEN movement_type = 'consumption' THEN quantity_change ELSE 0 END) as consumption_qty,
    SUM(CASE WHEN movement_type = 'waste' THEN quantity_change ELSE 0 END) as waste_qty,
    MAX(movement_date) as last_movement_date
  FROM compras.inventory_movements
  GROUP BY material_id
)
SELECT
  p.id,
  p.name,
  p.category,
  COALESCE(ms.reception_qty, 0) + COALESCE(ms.return_qty, 0) + COALESCE(ms.transfer_qty, 0) as current_stock,
  COALESCE(ms.consumption_qty, 0) as total_consumed,
  COALESCE(ms.waste_qty, 0) as total_waste,
  ms.last_movement_date,
  COUNT(DISTINCT mr.id) as total_receptions,
  'warehouse' as location_type
FROM public.products p
LEFT JOIN movement_summary ms ON p.id = ms.material_id
LEFT JOIN compras.material_receptions mr ON p.id = mr.material_id
WHERE p.category = 'mp'
GROUP BY p.id, p.name, p.category, ms.reception_qty, ms.return_qty, ms.transfer_qty, 
         ms.consumption_qty, ms.waste_qty, ms.last_movement_date;

-- =====================================================
-- PRODUCTION INVENTORY VIEW (Producción)
-- Aggregates inventory from work_center_inventory
-- Shows only what's currently in production centers
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
-- COMBINED INVENTORY VIEW WITH LOCATION TYPE
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

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON VIEW compras.warehouse_inventory_status IS 'Warehouse inventory: reception + returns - transfers = current bodega stock';
COMMENT ON VIEW compras.production_inventory_status IS 'Production inventory: direct count from work_center_inventory table';
COMMENT ON VIEW compras.inventory_status_by_location IS 'Combined view separating warehouse and production inventory';
