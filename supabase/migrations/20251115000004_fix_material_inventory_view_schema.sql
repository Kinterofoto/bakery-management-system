-- Fix Material Inventory Status View - Schema Qualification Issue
-- The view must fully qualify all table references for REST API access

-- =====================================================
-- DROP EXISTING VIEW
-- =====================================================
DROP VIEW IF EXISTS compras.material_inventory_status CASCADE;

-- =====================================================
-- RECREATE WITH PROPER SCHEMA QUALIFICATION
-- =====================================================
CREATE VIEW compras.material_inventory_status AS
SELECT
  p.id,
  p.name,
  p.category,
  COALESCE(
    SUM(
      CASE
        WHEN im.movement_type::text = 'reception'::text THEN im.quantity_change
        ELSE 0::numeric
      END
    ),
    0::numeric
  ) as current_stock,
  COALESCE(
    SUM(
      CASE
        WHEN im.movement_type::text = 'consumption'::text THEN im.quantity_change
        ELSE 0::numeric
      END
    ),
    0::numeric
  ) as total_consumed,
  COALESCE(
    SUM(
      CASE
        WHEN im.movement_type::text = 'waste'::text THEN im.quantity_change
        ELSE 0::numeric
      END
    ),
    0::numeric
  ) as total_waste,
  MAX(im.movement_date) as last_movement_date,
  COUNT(
    DISTINCT CASE
      WHEN mr.id IS NOT NULL THEN mr.id
      ELSE NULL::uuid
    END
  ) as total_receptions
FROM
  public.products p
  LEFT JOIN compras.inventory_movements im ON p.id = im.material_id
  LEFT JOIN compras.material_receptions mr ON p.id = mr.material_id
WHERE
  p.category::text = 'mp'::text
GROUP BY
  p.id,
  p.name,
  p.category;

-- =====================================================
-- GRANT VIEW ACCESS PERMISSIONS
-- =====================================================
GRANT SELECT ON compras.material_inventory_status TO authenticated;
GRANT SELECT ON compras.material_inventory_status TO service_role;
GRANT SELECT ON compras.material_inventory_status TO anon;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON VIEW compras.material_inventory_status IS 'Real-time inventory status for raw materials with reception tracking';
