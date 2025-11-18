-- Fix Material Inventory Status View
-- Ensures the view is created and accessible via REST API

-- =====================================================
-- DROP EXISTING VIEW IF IT EXISTS
-- =====================================================
DROP VIEW IF EXISTS compras.material_inventory_status CASCADE;

-- =====================================================
-- RECREATE MATERIAL_INVENTORY_STATUS VIEW
-- =====================================================
CREATE VIEW compras.material_inventory_status AS
SELECT
  p.id,
  p.name,
  p.category,
  COALESCE(SUM(CASE WHEN im.movement_type = 'reception' THEN im.quantity_change ELSE 0 END), 0) as current_stock,
  COALESCE(SUM(CASE WHEN im.movement_type = 'consumption' THEN im.quantity_change ELSE 0 END), 0) as total_consumed,
  COALESCE(SUM(CASE WHEN im.movement_type = 'waste' THEN im.quantity_change ELSE 0 END), 0) as total_waste,
  MAX(im.movement_date) as last_movement_date,
  COUNT(DISTINCT CASE WHEN mr.id IS NOT NULL THEN mr.id END) as total_receptions
FROM public.products p
LEFT JOIN compras.inventory_movements im ON p.id = im.material_id
LEFT JOIN compras.material_receptions mr ON p.id = mr.material_id
WHERE p.category = 'mp' -- Only raw materials
GROUP BY p.id, p.name, p.category;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON VIEW compras.material_inventory_status IS 'Real-time inventory status for raw materials with reception tracking';
