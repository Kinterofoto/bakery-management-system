-- Update apply_inventory_adjustment to use inventario.perform_inventory_movement
-- This integrates adjustments with the new WMS inventory system

-- Drop existing function first (with all overloads)
DROP FUNCTION IF EXISTS public.apply_inventory_adjustment(UUID, UUID, DECIMAL, DECIMAL);
DROP FUNCTION IF EXISTS public.apply_inventory_adjustment;

CREATE OR REPLACE FUNCTION public.apply_inventory_adjustment(
  p_adjustment_id UUID,
  p_user_id UUID,
  p_warehouse_qty DECIMAL(12, 3) DEFAULT NULL,
  p_production_qty DECIMAL(12, 3) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_adjustment RECORD;
  v_inventory RECORD;
  v_movement_id UUID;
  v_warehouse_qty DECIMAL(12, 3);
  v_production_qty DECIMAL(12, 3);
  v_total_distribution DECIMAL(12, 3);
  v_bin_type TEXT;
  v_location_id UUID;
  v_movement_type TEXT;
BEGIN
  -- Get adjustment details with inventory type
  SELECT
    ia.*,
    i.inventory_type
  INTO v_adjustment
  FROM public.inventory_adjustments ia
  JOIN public.inventories i ON i.id = ia.inventory_id
  WHERE ia.id = p_adjustment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Adjustment not found';
  END IF;

  IF v_adjustment.status != 'pending' THEN
    RAISE EXCEPTION 'Adjustment already processed';
  END IF;

  -- Map inventory_type to bin_type
  CASE v_adjustment.inventory_type
    WHEN 'produccion' THEN v_bin_type := 'production';
    WHEN 'producto_terminado' THEN v_bin_type := 'general';
    WHEN 'bodega_materias_primas' THEN v_bin_type := 'receiving';
    WHEN 'producto_en_proceso' THEN v_bin_type := 'production';
    WHEN 'producto_no_conforme' THEN v_bin_type := 'quarantine';
    ELSE v_bin_type := 'general';
  END CASE;

  -- Find a location with the appropriate bin_type
  SELECT id INTO v_location_id
  FROM inventario.locations
  WHERE bin_type = v_bin_type
    AND is_active = true
  LIMIT 1;

  IF v_location_id IS NULL THEN
    RAISE EXCEPTION 'No active location found for bin_type: %', v_bin_type;
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

  -- Determine movement type based on adjustment type
  IF v_adjustment.adjustment_type = 'negative' THEN
    v_movement_type := 'OUT';
    v_warehouse_qty := ABS(v_warehouse_qty);
  ELSE
    v_movement_type := 'IN';
    v_warehouse_qty := ABS(v_warehouse_qty);
  END IF;

  -- Call inventario.perform_inventory_movement
  -- This will create the movement and automatically update inventory_balances
  SELECT movement_id INTO v_movement_id
  FROM inventario.perform_inventory_movement(
    p_product_id := v_adjustment.product_id,
    p_quantity := v_warehouse_qty,
    p_movement_type := v_movement_type::inventario.movement_type_enum,
    p_reason_type := 'adjustment'::inventario.reason_type_enum,
    p_location_id_from := CASE WHEN v_movement_type = 'OUT' THEN v_location_id ELSE NULL END,
    p_location_id_to := CASE WHEN v_movement_type = 'IN' THEN v_location_id ELSE NULL END,
    p_reference_id := v_adjustment.inventory_id,
    p_reference_type := 'inventory_adjustment',
    p_notes := CONCAT(
      'Ajuste de inventario - ',
      CASE WHEN v_adjustment.custom_reason IS NOT NULL
           THEN v_adjustment.custom_reason
           ELSE (SELECT reason FROM public.adjustment_reasons WHERE id = v_adjustment.reason_id)
      END
    ),
    p_recorded_by := p_user_id,
    p_batch_number := NULL,
    p_expiry_date := NULL
  );

  -- Update adjustment record
  UPDATE public.inventory_adjustments
  SET
    status = 'approved',
    approved_by = p_user_id,
    approved_at = CURRENT_TIMESTAMP,
    movement_id = v_movement_id,
    warehouse_quantity = v_warehouse_qty,
    production_quantity = 0, -- We're only using one location now
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_adjustment_id;

  RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.apply_inventory_adjustment IS
'Applies an inventory adjustment by creating a movement in the inventario schema.
Maps inventory_type to bin_type to determine the appropriate location.
Uses inventario.perform_inventory_movement to ensure consistency with the WMS system.';
