-- Add distribution columns to inventory_adjustments table
-- This allows manual distribution of adjustments between warehouse and production

-- Add distribution columns
ALTER TABLE public.inventory_adjustments
ADD COLUMN IF NOT EXISTS warehouse_quantity DECIMAL(12, 3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS production_quantity DECIMAL(12, 3) DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.inventory_adjustments.warehouse_quantity IS 'Quantity to adjust in warehouse inventory';
COMMENT ON COLUMN public.inventory_adjustments.production_quantity IS 'Quantity to adjust in production inventory';

-- =====================================================
-- UPDATED FUNCTION: Apply Adjustment with Distribution
-- =====================================================
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

  -- Create inventory movement for warehouse
  IF v_warehouse_qty != 0 THEN
    INSERT INTO compras.inventory_movements (
      material_id,
      movement_type,
      quantity_change,
      unit_of_measure,
      warehouse_type,
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
      'warehouse',
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

  -- Create inventory movement for production
  IF v_production_qty != 0 THEN
    INSERT INTO compras.inventory_movements (
      material_id,
      movement_type,
      quantity_change,
      unit_of_measure,
      warehouse_type,
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
      'production',
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

  -- Update material_inventory_status for warehouse
  IF v_warehouse_qty != 0 THEN
    UPDATE compras.material_inventory_status
    SET current_stock = current_stock + v_warehouse_qty
    WHERE id = v_adjustment.product_id;

    -- Insert if not exists
    IF NOT FOUND THEN
      INSERT INTO compras.material_inventory_status (
        id,
        current_stock,
        minimum_stock,
        maximum_stock
      ) VALUES (
        v_adjustment.product_id,
        v_warehouse_qty,
        0,
        0
      );
    END IF;
  END IF;

  -- Update production_inventory_status for production
  IF v_production_qty != 0 THEN
    UPDATE compras.production_inventory_status
    SET current_stock = current_stock + v_production_qty
    WHERE material_id = v_adjustment.product_id;

    -- Insert if not exists
    IF NOT FOUND THEN
      INSERT INTO compras.production_inventory_status (
        material_id,
        current_stock,
        minimum_stock
      ) VALUES (
        v_adjustment.product_id,
        v_production_qty,
        0
      );
    END IF;
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
