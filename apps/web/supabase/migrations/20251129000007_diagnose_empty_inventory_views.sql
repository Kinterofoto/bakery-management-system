-- Diagnose why inventory views are returning empty results
-- This creates diagnostic views to check base data

-- =====================================================
-- CHECK 1: Do we have products with category 'mp'?
-- =====================================================
CREATE OR REPLACE VIEW compras.diagnostic_products AS
SELECT
  id,
  name,
  category,
  unit,
  created_at
FROM public.products
WHERE category = 'mp'
ORDER BY name;

COMMENT ON VIEW compras.diagnostic_products IS 'List all raw material products to verify they exist';

-- =====================================================
-- CHECK 2: Do we have inventory movements?
-- =====================================================
CREATE OR REPLACE VIEW compras.diagnostic_movements AS
SELECT
  im.id,
  p.name as material_name,
  im.movement_type,
  im.quantity_change,
  im.location,
  im.movement_date
FROM compras.inventory_movements im
LEFT JOIN public.products p ON im.material_id = p.id
ORDER BY im.movement_date DESC
LIMIT 50;

COMMENT ON VIEW compras.diagnostic_movements IS 'Recent inventory movements to verify they exist';

-- =====================================================
-- CHECK 3: Do we have work center inventory?
-- =====================================================
CREATE OR REPLACE VIEW compras.diagnostic_work_center_inventory AS
SELECT
  wci.id,
  p.name as material_name,
  wc.code as work_center_code,
  wci.quantity_available,
  wci.quantity_consumed,
  wci.transferred_at
FROM produccion.work_center_inventory wci
LEFT JOIN public.products p ON wci.material_id = p.id
LEFT JOIN produccion.work_centers wc ON wci.work_center_id = wc.id
ORDER BY wci.transferred_at DESC
LIMIT 50;

COMMENT ON VIEW compras.diagnostic_work_center_inventory IS 'Work center inventory entries to verify they exist';

-- =====================================================
-- CHECK 4: Simple warehouse calculation WITHOUT mp filter
-- =====================================================
CREATE OR REPLACE VIEW compras.diagnostic_warehouse_all_products AS
SELECT
  p.id,
  p.name,
  p.category,
  COALESCE(SUM(im.quantity_change), 0) as total_movement,
  COUNT(im.id) as movement_count
FROM public.products p
LEFT JOIN compras.inventory_movements im ON p.id = im.material_id
  AND im.movement_type IN ('reception', 'transfer', 'return')
GROUP BY p.id, p.name, p.category
HAVING COUNT(im.id) > 0
ORDER BY p.name;

COMMENT ON VIEW compras.diagnostic_warehouse_all_products IS 'Warehouse inventory for ALL products (not just mp)';

-- Grant permissions
GRANT SELECT ON compras.diagnostic_products TO authenticated;
GRANT SELECT ON compras.diagnostic_movements TO authenticated;
GRANT SELECT ON compras.diagnostic_work_center_inventory TO authenticated;
GRANT SELECT ON compras.diagnostic_warehouse_all_products TO authenticated;
