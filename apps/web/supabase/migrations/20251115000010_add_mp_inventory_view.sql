-- Add Raw Materials Inventory View
-- Creates a separate view for inventory filtered by 'mp' (materias primas) category

-- =====================================================
-- VIEW: Raw Materials (MP) Inventory Status
-- =====================================================
CREATE OR REPLACE VIEW compras.mp_material_inventory_status AS
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
  AND (im.id IS NOT NULL OR mr.id IS NOT NULL)
GROUP BY
  p.id,
  p.name,
  p.category
ORDER BY p.name;

-- =====================================================
-- GRANT VIEW PERMISSIONS
-- =====================================================
GRANT SELECT ON compras.mp_material_inventory_status TO authenticated;
GRANT SELECT ON compras.mp_material_inventory_status TO service_role;
GRANT SELECT ON compras.mp_material_inventory_status TO anon;

-- =====================================================
-- COMMENT
-- =====================================================
COMMENT ON VIEW compras.mp_material_inventory_status IS 'Real-time inventory status for raw materials (mp category) only';
