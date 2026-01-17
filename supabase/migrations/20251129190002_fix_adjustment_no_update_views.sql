-- Fix apply_inventory_adjustment to only insert movements
-- The views material_inventory_status and production_inventory_status
-- are calculated views that update automatically from inventory_movements

-- First, update the view to include 'adjustment' movements in current_stock calculation
DROP VIEW IF EXISTS compras.material_inventory_status CASCADE;

CREATE VIEW compras.material_inventory_status AS
SELECT
  p.id,
  p.name,
  p.category,
  COALESCE(
    SUM(
      CASE
        WHEN im.movement_type IN ('reception', 'adjustment') THEN im.quantity_change
        ELSE 0::numeric
      END
    ),
    0::numeric
  ) as current_stock,
  COALESCE(
    SUM(
      CASE
        WHEN im.movement_type = 'consumption' THEN im.quantity_change
        ELSE 0::numeric
      END
    ),
    0::numeric
  ) as total_consumed,
  COALESCE(
    SUM(
      CASE
        WHEN im.movement_type = 'waste' THEN im.quantity_change
        ELSE 0::numeric
      END
    ),
    0::numeric
  ) as total_waste,
  MAX(im.movement_date) as last_movement_date,
  COUNT(DISTINCT CASE WHEN mr.id IS NOT NULL THEN mr.id END) as total_receptions
FROM public.products p
LEFT JOIN compras.inventory_movements im ON p.id = im.material_id AND im.location = 'Bodega'
LEFT JOIN compras.material_receptions mr ON p.id = mr.material_id
GROUP BY p.id, p.name, p.category;

-- Create production inventory status view if it doesn't exist
DROP VIEW IF EXISTS compras.production_inventory_status CASCADE;

CREATE VIEW compras.production_inventory_status AS
SELECT
  p.id as material_id,
  p.name,
  p.category,
  COALESCE(
    SUM(
      CASE
        WHEN im.movement_type IN ('transfer', 'adjustment') AND im.location = 'Producción' THEN im.quantity_change
        ELSE 0::numeric
      END
    ),
    0::numeric
  ) as current_stock,
  0 as minimum_stock
FROM public.products p
LEFT JOIN compras.inventory_movements im ON p.id = im.material_id
WHERE p.category = 'mp'
GROUP BY p.id, p.name, p.category;

-- Now update the function to only insert movements
CREATE OR REPLACE FUNCTION public.apply_inventory_adjustment(
  p_adjustment_id UUID,
  p_user_id UUID,
  p_warehouse_qty DECIMAL(12, 3) DEFAULT NULL,
  p_production_qty DECIMAL(12, 3) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_adjustment RECORD;
  v_movement_id UUID;
  v_warehouse_qty DECIMAL(12, 3);
  v_production_qty DECIMAL(12, 3);
  v_total_distribution DECIMAL(12, 3);
BEGIN
  -- Get adjustment details
  SELECT * INTO v_adjustment
  FROM public.inventory_adjustments
  WHERE id = p_adjustment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Adjustment not found';
  END IF;

  IF v_adjustment.status != 'pending' THEN
    RAISE EXCEPTION 'Adjustment already processed';
  END IF;

  -- Use provided distribution or default to 100% warehouse
  v_warehouse_qty := COALESCE(p_warehouse_qty, v_adjustment.adjustment_quantity);
  v_production_qty := COALESCE(p_production_qty, 0);
  v_total_distribution := v_warehouse_qty + v_production_qty;

  -- Validate distribution doesn't exceed adjustment quantity
  IF ABS(v_total_distribution) > ABS(v_adjustment.adjustment_quantity) + 0.01 THEN
    RAISE EXCEPTION 'Distribution total (% + % = %) exceeds adjustment quantity (%)',
      v_warehouse_qty, v_production_qty, v_total_distribution, v_adjustment.adjustment_quantity;
  END IF;

  -- Apply sign based on adjustment type
  IF v_adjustment.adjustment_type = 'negative' THEN
    v_warehouse_qty := -ABS(v_warehouse_qty);
    v_production_qty := -ABS(v_production_qty);
  ELSE
    v_warehouse_qty := ABS(v_warehouse_qty);
    v_production_qty := ABS(v_production_qty);
  END IF;

  -- Create inventory movement for warehouse (Bodega)
  -- The view will automatically recalculate when this movement is inserted
  IF v_warehouse_qty != 0 THEN
    INSERT INTO compras.inventory_movements (
      material_id,
      movement_type,
      quantity_change,
      unit_of_measure,
      location,
      reference_id,
      reference_type,
      notes,
      recorded_by,
      movement_date
    ) VALUES (
      v_adjustment.product_id,
      'adjustment',
      v_warehouse_qty,
      'g', -- grams
      'Bodega',
      v_adjustment.inventory_id,
      'inventory_adjustment',
      CONCAT(
        'Ajuste de inventario (Bodega) - ',
        CASE WHEN v_adjustment.custom_reason IS NOT NULL
             THEN v_adjustment.custom_reason
             ELSE (SELECT reason FROM public.adjustment_reasons WHERE id = v_adjustment.reason_id)
        END
      ),
      p_user_id,
      CURRENT_TIMESTAMP
    ) RETURNING id INTO v_movement_id;
  END IF;

  -- Create inventory movement for production (Producción)
  -- The view will automatically recalculate when this movement is inserted
  IF v_production_qty != 0 THEN
    INSERT INTO compras.inventory_movements (
      material_id,
      movement_type,
      quantity_change,
      unit_of_measure,
      location,
      reference_id,
      reference_type,
      notes,
      recorded_by,
      movement_date
    ) VALUES (
      v_adjustment.product_id,
      'adjustment',
      v_production_qty,
      'g', -- grams
      'Producción',
      v_adjustment.inventory_id,
      'inventory_adjustment',
      CONCAT(
        'Ajuste de inventario (Producción) - ',
        CASE WHEN v_adjustment.custom_reason IS NOT NULL
             THEN v_adjustment.custom_reason
             ELSE (SELECT reason FROM public.adjustment_reasons WHERE id = v_adjustment.reason_id)
        END
      ),
      p_user_id,
      CURRENT_TIMESTAMP
    );
  END IF;

  -- Update adjustment record
  UPDATE public.inventory_adjustments
  SET
    status = 'approved',
    approved_by = p_user_id,
    approved_at = CURRENT_TIMESTAMP,
    movement_id = v_movement_id,
    warehouse_quantity = ABS(v_warehouse_qty),
    production_quantity = ABS(v_production_qty),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_adjustment_id;

  RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions on views
GRANT SELECT ON compras.material_inventory_status TO authenticated;
GRANT SELECT ON compras.production_inventory_status TO authenticated;
