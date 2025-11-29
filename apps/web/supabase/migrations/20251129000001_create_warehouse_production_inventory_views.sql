-- Create Warehouse and Production Inventory Views
-- Separates inventory between warehouse (bodega) and production (work centers)

-- =====================================================
-- WAREHOUSE INVENTORY VIEW (Bodega)
-- Excludes items transferred to production
-- =====================================================
CREATE OR REPLACE VIEW compras.warehouse_inventory_status AS
SELECT
  p.id,
  p.name,
  p.category,
  COALESCE(SUM(CASE 
    WHEN im.movement_type = 'reception' THEN im.quantity_change 
    WHEN im.movement_type = 'return' THEN im.quantity_change 
    ELSE 0 
  END), 0) - COALESCE(SUM(CASE 
    WHEN im.movement_type = 'transfer' THEN im.quantity_change 
    ELSE 0 
  END), 0) as current_stock,
  COALESCE(SUM(CASE WHEN im.movement_type = 'consumption' THEN im.quantity_change ELSE 0 END), 0) as total_consumed,
  COALESCE(SUM(CASE WHEN im.movement_type = 'waste' THEN im.quantity_change ELSE 0 END), 0) as total_waste,
  MAX(im.movement_date) as last_movement_date,
  COUNT(DISTINCT mr.id) as total_receptions,
  'warehouse' as location_type
FROM public.products p
LEFT JOIN compras.inventory_movements im ON p.id = im.material_id AND (im.movement_type != 'transfer' OR im.location IS NULL OR im.location NOT LIKE '%Centro:%')
LEFT JOIN compras.material_receptions mr ON p.id = mr.material_id
WHERE p.category = 'mp'
GROUP BY p.id, p.name, p.category;

-- =====================================================
-- PRODUCTION INVENTORY VIEW (Producción)
-- Aggregates inventory transferred to all work centers
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
  COUNT(DISTINCT wci.work_center_id) as total_work_centers,
  'production' as location_type
FROM public.products p
LEFT JOIN produccion.work_center_inventory wci ON p.id = wci.material_id
WHERE p.category = 'mp'
GROUP BY p.id, p.name, p.category;

-- =====================================================
-- COMBINED INVENTORY VIEW WITH LOCATION TYPE FILTER
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
  p.total_work_centers,
  'production' as location_type
FROM compras.production_inventory_status p;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON VIEW compras.warehouse_inventory_status IS 'Real-time inventory status for raw materials in warehouse (bodega), excluding transferred items';
COMMENT ON VIEW compras.production_inventory_status IS 'Real-time inventory status for raw materials distributed to work centers (producción)';
COMMENT ON VIEW compras.inventory_status_by_location IS 'Combined inventory view with location type filter for warehouse and production';
