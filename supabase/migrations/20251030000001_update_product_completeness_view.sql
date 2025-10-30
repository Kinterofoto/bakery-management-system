-- Drop and recreate product_completeness view to include visible_in_ecommerce field
DROP VIEW IF EXISTS product_completeness;

CREATE VIEW product_completeness AS
SELECT
  p.id as product_id,
  p.name,
  p.category,
  p.visible_in_ecommerce,
  -- Basic info completeness
  CASE
    WHEN p.description IS NOT NULL
      AND p.unit IS NOT NULL
      AND p.price IS NOT NULL
    THEN true ELSE false
  END as basic_info_complete,

  -- Technical specs completeness
  EXISTS(SELECT 1 FROM product_technical_specs WHERE product_id = p.id) as has_technical_specs,

  -- Quality specs completeness
  EXISTS(SELECT 1 FROM product_quality_specs WHERE product_id = p.id) as has_quality_specs,

  -- Production process completeness
  EXISTS(
    SELECT 1 FROM product_production_process
    WHERE product_id = p.id AND is_active = true
  ) as has_production_process,

  -- Bill of materials completeness (from existing produccion schema)
  EXISTS(
    SELECT 1 FROM produccion.bill_of_materials
    WHERE product_id = p.id
  ) as has_bill_of_materials,

  -- Costs completeness
  EXISTS(SELECT 1 FROM product_costs WHERE product_id = p.id) as has_costs,

  -- Price lists completeness
  EXISTS(
    SELECT 1 FROM product_price_lists
    WHERE product_id = p.id AND is_active = true
  ) as has_price_lists,

  -- Commercial info completeness
  EXISTS(SELECT 1 FROM product_commercial_info WHERE product_id = p.id) as has_commercial_info,

  -- Media completeness
  EXISTS(SELECT 1 FROM product_media WHERE product_id = p.id) as has_media,

  -- Inventory config completeness
  EXISTS(SELECT 1 FROM product_inventory_config WHERE product_id = p.id) as has_inventory_config,

  -- Overall completeness percentage
  (
    CASE WHEN p.description IS NOT NULL AND p.unit IS NOT NULL AND p.price IS NOT NULL THEN 11.11 ELSE 0 END +
    CASE WHEN EXISTS(SELECT 1 FROM product_technical_specs WHERE product_id = p.id) THEN 11.11 ELSE 0 END +
    CASE WHEN EXISTS(SELECT 1 FROM product_quality_specs WHERE product_id = p.id) THEN 11.11 ELSE 0 END +
    CASE WHEN EXISTS(SELECT 1 FROM product_production_process WHERE product_id = p.id AND is_active = true) THEN 11.11 ELSE 0 END +
    CASE WHEN EXISTS(SELECT 1 FROM produccion.bill_of_materials WHERE product_id = p.id) THEN 11.11 ELSE 0 END +
    CASE WHEN EXISTS(SELECT 1 FROM product_costs WHERE product_id = p.id) THEN 11.11 ELSE 0 END +
    CASE WHEN EXISTS(SELECT 1 FROM product_price_lists WHERE product_id = p.id AND is_active = true) THEN 11.11 ELSE 0 END +
    CASE WHEN EXISTS(SELECT 1 FROM product_commercial_info WHERE product_id = p.id) THEN 11.11 ELSE 0 END +
    CASE WHEN EXISTS(SELECT 1 FROM product_media WHERE product_id = p.id) THEN 11.11 ELSE 0 END
  ) as completeness_percentage
FROM products p;

-- Grant permissions
GRANT SELECT ON product_completeness TO authenticated;
