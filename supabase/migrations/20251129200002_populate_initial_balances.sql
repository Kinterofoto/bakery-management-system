-- Migration: Populate initial balances from historical movements
-- Purpose: Calculate and insert current balances for all materials that have movements

-- =====================================================
-- 1. POPULATE BALANCES FROM HISTORICAL DATA
-- =====================================================

INSERT INTO compras.material_inventory_balances (
  material_id,
  warehouse_stock,
  production_stock,
  unit_of_measure,
  last_movement_id,
  last_movement_date,
  last_updated_at
)
SELECT
  im.material_id,

  -- Calculate warehouse stock
  GREATEST(0, COALESCE(
    SUM(CASE
      -- Reception adds to warehouse
      WHEN im.movement_type = 'reception' THEN im.quantity_change

      -- Consumption removes from warehouse (if warehouse_type = 'warehouse' or NULL)
      WHEN im.movement_type = 'consumption' AND (im.warehouse_type = 'warehouse' OR im.warehouse_type IS NULL)
        THEN -ABS(im.quantity_change)

      -- Transfer removes from warehouse
      WHEN im.movement_type = 'transfer' THEN -ABS(im.quantity_change)

      -- Return adds to warehouse
      WHEN im.movement_type = 'return' THEN ABS(im.quantity_change)

      -- Waste removes from warehouse (if warehouse_type = 'warehouse' or NULL)
      WHEN im.movement_type = 'waste' AND (im.warehouse_type = 'warehouse' OR im.warehouse_type IS NULL)
        THEN -ABS(im.quantity_change)

      -- Adjustment affects warehouse (if warehouse_type = 'warehouse' or NULL)
      WHEN im.movement_type = 'adjustment' AND (im.warehouse_type = 'warehouse' OR im.warehouse_type IS NULL)
        THEN im.quantity_change

      ELSE 0
    END),
    0
  )) AS warehouse_stock,

  -- Calculate production stock
  GREATEST(0, COALESCE(
    SUM(CASE
      -- Consumption removes from production (if warehouse_type = 'production')
      WHEN im.movement_type = 'consumption' AND im.warehouse_type = 'production'
        THEN -ABS(im.quantity_change)

      -- Transfer adds to production
      WHEN im.movement_type = 'transfer' THEN ABS(im.quantity_change)

      -- Return removes from production
      WHEN im.movement_type = 'return' THEN -ABS(im.quantity_change)

      -- Waste removes from production (if warehouse_type = 'production')
      WHEN im.movement_type = 'waste' AND im.warehouse_type = 'production'
        THEN -ABS(im.quantity_change)

      -- Adjustment affects production (if warehouse_type = 'production')
      WHEN im.movement_type = 'adjustment' AND im.warehouse_type = 'production'
        THEN im.quantity_change

      ELSE 0
    END),
    0
  )) AS production_stock,

  -- Unit of measure from product or most recent movement
  COALESCE(MAX(p.unit), MAX(im.unit_of_measure), 'kg') AS unit_of_measure,

  -- Get the last movement ID for this material
  (
    SELECT id
    FROM compras.inventory_movements im2
    WHERE im2.material_id = im.material_id
    ORDER BY im2.movement_date DESC, im2.created_at DESC
    LIMIT 1
  ) AS last_movement_id,

  -- Get the last movement date for this material
  (
    SELECT movement_date
    FROM compras.inventory_movements im2
    WHERE im2.material_id = im.material_id
    ORDER BY im2.movement_date DESC, im2.created_at DESC
    LIMIT 1
  ) AS last_movement_date,

  NOW() AS last_updated_at

FROM compras.inventory_movements im
LEFT JOIN public.products p ON p.id = im.material_id
GROUP BY im.material_id

ON CONFLICT (material_id) DO UPDATE SET
  warehouse_stock = EXCLUDED.warehouse_stock,
  production_stock = EXCLUDED.production_stock,
  unit_of_measure = EXCLUDED.unit_of_measure,
  last_movement_id = EXCLUDED.last_movement_id,
  last_movement_date = EXCLUDED.last_movement_date,
  last_updated_at = NOW();

-- =====================================================
-- 2. VALIDATE BALANCE CALCULATIONS
-- =====================================================

-- Create a temporary view to compare calculated balances with existing views
CREATE TEMP VIEW balance_validation AS
SELECT
  mib.material_id,
  p.name AS material_name,
  mib.warehouse_stock AS new_warehouse_stock,
  mib.production_stock AS new_production_stock,
  mib.total_stock AS new_total_stock,

  -- Compare with existing view (if it exists)
  COALESCE(mis.current_stock, 0) AS old_current_stock,

  -- Difference
  mib.total_stock - COALESCE(mis.current_stock, 0) AS difference

FROM compras.material_inventory_balances mib
LEFT JOIN public.products p ON p.id = mib.material_id
LEFT JOIN compras.material_inventory_status mis ON mis.id = mib.material_id
ORDER BY ABS(mib.total_stock - COALESCE(mis.current_stock, 0)) DESC;

-- Log any significant differences (>0.01) for review
DO $$
DECLARE
  v_difference_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_difference_count
  FROM balance_validation
  WHERE ABS(difference) > 0.01;

  IF v_difference_count > 0 THEN
    RAISE NOTICE 'Found % materials with balance differences >0.01. Review balance_validation view.', v_difference_count;
  ELSE
    RAISE NOTICE 'All balances match existing calculations. Migration successful!';
  END IF;
END $$;

-- =====================================================
-- 3. ADD SUMMARY STATISTICS
-- =====================================================

DO $$
DECLARE
  v_total_materials INTEGER;
  v_materials_with_warehouse_stock INTEGER;
  v_materials_with_production_stock INTEGER;
  v_total_warehouse_stock DECIMAL(12, 3);
  v_total_production_stock DECIMAL(12, 3);
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE warehouse_stock > 0),
    COUNT(*) FILTER (WHERE production_stock > 0),
    SUM(warehouse_stock),
    SUM(production_stock)
  INTO
    v_total_materials,
    v_materials_with_warehouse_stock,
    v_materials_with_production_stock,
    v_total_warehouse_stock,
    v_total_production_stock
  FROM compras.material_inventory_balances;

  RAISE NOTICE '===== INITIAL BALANCE POPULATION SUMMARY =====';
  RAISE NOTICE 'Total materials with balances: %', v_total_materials;
  RAISE NOTICE 'Materials with warehouse stock: %', v_materials_with_warehouse_stock;
  RAISE NOTICE 'Materials with production stock: %', v_materials_with_production_stock;
  RAISE NOTICE 'Total warehouse stock: % (mixed units)', v_total_warehouse_stock;
  RAISE NOTICE 'Total production stock: % (mixed units)', v_total_production_stock;
  RAISE NOTICE '==============================================';
END $$;
