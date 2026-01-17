-- Add debug logging for inventory movements
-- This creates a view to diagnose what's happening with the inventory calculation

-- =====================================================
-- DEBUG VIEW 1: All movements summary
-- =====================================================
CREATE OR REPLACE VIEW compras.inventory_movements_debug AS
SELECT
  im.id,
  p.name as material_name,
  im.movement_type,
  im.quantity_change,
  im.unit_of_measure,
  im.location,
  im.reference_type,
  im.notes,
  im.movement_date,
  im.created_at,
  u.email as recorded_by_email
FROM compras.inventory_movements im
LEFT JOIN public.products p ON im.material_id = p.id
LEFT JOIN auth.users u ON im.recorded_by = u.id
ORDER BY im.movement_date DESC
LIMIT 1000;

-- =====================================================
-- DEBUG VIEW 2: Warehouse calculation step by step
-- =====================================================
CREATE OR REPLACE VIEW compras.warehouse_inventory_debug AS
WITH movement_details AS (
  SELECT
    material_id,
    movement_type,
    quantity_change,
    movement_date
  FROM compras.inventory_movements
  WHERE movement_type IN ('reception', 'transfer', 'return')
),
summary_by_type AS (
  SELECT
    p.id,
    p.name,
    'reception' as type,
    SUM(CASE WHEN md.movement_type = 'reception' THEN md.quantity_change ELSE 0 END) as qty
  FROM public.products p
  LEFT JOIN movement_details md ON p.id = md.material_id
  WHERE p.category = 'mp'
  GROUP BY p.id, p.name

  UNION ALL

  SELECT
    p.id,
    p.name,
    'transfer' as type,
    SUM(CASE WHEN md.movement_type = 'transfer' THEN md.quantity_change ELSE 0 END) as qty
  FROM public.products p
  LEFT JOIN movement_details md ON p.id = md.material_id
  WHERE p.category = 'mp'
  GROUP BY p.id, p.name

  UNION ALL

  SELECT
    p.id,
    p.name,
    'return' as type,
    SUM(CASE WHEN md.movement_type = 'return' THEN md.quantity_change ELSE 0 END) as qty
  FROM public.products p
  LEFT JOIN movement_details md ON p.id = md.material_id
  WHERE p.category = 'mp'
  GROUP BY p.id, p.name
)
SELECT
  id,
  name,
  type,
  COALESCE(qty, 0) as quantity
FROM summary_by_type
WHERE qty IS NOT NULL OR type = 'reception'
ORDER BY name, 
  CASE type WHEN 'reception' THEN 1 WHEN 'transfer' THEN 2 WHEN 'return' THEN 3 END;

-- =====================================================
-- DEBUG VIEW 3: Production inventory from work centers
-- =====================================================
CREATE OR REPLACE VIEW compras.production_inventory_debug AS
SELECT
  p.id,
  p.name,
  wc.code as work_center_code,
  wc.name as work_center_name,
  wci.quantity_available,
  wci.quantity_consumed,
  wci.transferred_at,
  wci.batch_number,
  wci.expiry_date
FROM public.products p
LEFT JOIN produccion.work_center_inventory wci ON p.id = wci.material_id
LEFT JOIN produccion.work_centers wc ON wci.work_center_id = wc.id
WHERE p.category = 'mp'
ORDER BY p.name, wc.code;

-- =====================================================
-- DEBUG VIEW 4: Final calculation comparison
-- =====================================================
CREATE OR REPLACE VIEW compras.inventory_calculation_debug AS
SELECT
  p.id,
  p.name,
  COALESCE((
    SELECT SUM(quantity_change) 
    FROM compras.inventory_movements 
    WHERE material_id = p.id 
    AND movement_type IN ('reception', 'transfer', 'return')
  ), 0) as warehouse_calculated,
  COALESCE((
    SELECT SUM(quantity_available)
    FROM produccion.work_center_inventory
    WHERE material_id = p.id
  ), 0) as production_calculated,
  (
    SELECT COUNT(*)
    FROM compras.inventory_movements
    WHERE material_id = p.id
  ) as total_movements
FROM public.products p
WHERE p.category = 'mp'
ORDER BY p.name;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON VIEW compras.inventory_movements_debug IS 'All inventory movements with material names and details for debugging';
COMMENT ON VIEW compras.warehouse_inventory_debug IS 'Warehouse inventory calculation breakdown by movement type';
COMMENT ON VIEW compras.production_inventory_debug IS 'Production inventory details from work centers';
COMMENT ON VIEW compras.inventory_calculation_debug IS 'Final warehouse vs production calculation comparison';
