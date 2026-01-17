-- Fix inventory views to use uppercase 'MP' instead of lowercase 'mp'
-- Issue: Products have category = 'MP' but views filter for 'mp'
-- PostgreSQL string comparison is case-sensitive by default

-- =====================================================
-- DROP AND RECREATE WAREHOUSE INVENTORY VIEW
-- With correct MP uppercase
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
  0 as total_consumed,
  0 as total_waste,
  ms.last_movement_date,
  COALESCE(ms.net_warehouse_stock, 0) as total_receptions
FROM public.products p
LEFT JOIN movement_summary ms ON p.id = ms.material_id
WHERE p.category = 'MP' AND ms.material_id IS NOT NULL
ORDER BY p.name;

COMMENT ON VIEW compras.warehouse_inventory_status IS 'Warehouse inventory (bodega) - MP products only';

-- =====================================================
-- DROP AND RECREATE PRODUCTION INVENTORY VIEW
-- With correct MP uppercase
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
WHERE p.category = 'MP' AND wci.material_id IS NOT NULL
GROUP BY p.id, p.name, p.category, p.unit
ORDER BY p.name;

COMMENT ON VIEW compras.production_inventory_status IS 'Production inventory - MP products in work centers';

-- =====================================================
-- UPDATE DIAGNOSTIC VIEWS TOO
-- =====================================================
DROP VIEW IF EXISTS compras.diagnostic_products CASCADE;

CREATE OR REPLACE VIEW compras.diagnostic_products AS
SELECT
  id,
  name,
  category,
  unit,
  created_at
FROM public.products
WHERE category = 'MP'
ORDER BY name;

COMMENT ON VIEW compras.diagnostic_products IS 'List all raw material products (MP category)';

-- Grant permissions
GRANT SELECT ON compras.warehouse_inventory_status TO authenticated;
GRANT SELECT ON compras.production_inventory_status TO authenticated;
GRANT SELECT ON compras.diagnostic_products TO authenticated;
GRANT SELECT ON compras.warehouse_inventory_status TO anon;
GRANT SELECT ON compras.production_inventory_status TO anon;
