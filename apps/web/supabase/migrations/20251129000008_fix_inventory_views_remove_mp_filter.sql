-- Fix inventory views by removing 'mp' category filter
-- Issue: Views filter WHERE category = 'mp' but products don't have that category
-- Solution: Remove the category filter to show all products with inventory

-- =====================================================
-- DROP AND RECREATE WAREHOUSE INVENTORY VIEW
-- Without mp filter
-- =====================================================
DROP VIEW IF EXISTS compras.warehouse_inventory_status CASCADE;

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
  p.unit,
  COALESCE(ms.net_warehouse_stock, 0) as current_stock,
  0 as total_consumed,  -- Not tracked in warehouse view
  0 as total_waste,     -- Not tracked in warehouse view
  ms.last_movement_date,
  COALESCE(ms.net_warehouse_stock, 0) as total_receptions
FROM public.products p
LEFT JOIN movement_summary ms ON p.id = ms.material_id
WHERE ms.material_id IS NOT NULL  -- Only show products with movements
ORDER BY p.name;

COMMENT ON VIEW compras.warehouse_inventory_status IS 'Warehouse inventory (bodega) - shows reception + return - transfer for all products with movements';

-- =====================================================
-- DROP AND RECREATE PRODUCTION INVENTORY VIEW
-- Without mp filter
-- =====================================================
DROP VIEW IF EXISTS compras.production_inventory_status CASCADE;

CREATE OR REPLACE VIEW compras.production_inventory_status AS
SELECT
  p.id,
  p.name,
  p.category,
  p.unit,
  COALESCE(SUM(wci.quantity_available), 0) as current_stock,
  COALESCE(SUM(wci.quantity_consumed), 0) as total_consumed,
  0 as total_waste,
  MAX(wci.transferred_at) as last_movement_date,
  0 as total_receptions
FROM public.products p
LEFT JOIN produccion.work_center_inventory wci ON p.id = wci.material_id
WHERE wci.material_id IS NOT NULL  -- Only show products in work centers
GROUP BY p.id, p.name, p.category, p.unit
ORDER BY p.name;

COMMENT ON VIEW compras.production_inventory_status IS 'Production inventory - aggregates quantity_available from all work centers for all products';

-- Grant permissions
GRANT SELECT ON compras.warehouse_inventory_status TO authenticated;
GRANT SELECT ON compras.production_inventory_status TO authenticated;
GRANT SELECT ON compras.warehouse_inventory_status TO anon;
GRANT SELECT ON compras.production_inventory_status TO anon;
