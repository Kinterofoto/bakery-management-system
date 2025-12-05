-- Fix JSON extraction from perform_inventory_movement
-- The function returns JSON directly, not a table

DROP FUNCTION IF EXISTS public.apply_inventory_adjustment(UUID, UUID);

CREATE OR REPLACE FUNCTION public.apply_inventory_adjustment(
  p_adjustment_id UUID,
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_adjustment RECORD;
  v_movement_id UUID;
  v_location_id UUID;
  v_movement_type TEXT;
  v_quantity DECIMAL(12, 3);
  v_result JSON;
BEGIN
  -- Get adjustment details with inventory location_id
  SELECT
    ia.*,
    i.location_id
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

  -- Use the inventory's location_id directly
  v_location_id := v_adjustment.location_id;

  IF v_location_id IS NULL THEN
    RAISE EXCEPTION 'Inventory does not have a location_id assigned';
  END IF;

  -- Determine movement type and quantity based on adjustment type
  v_quantity := ABS(v_adjustment.adjustment_quantity);

  IF v_adjustment.adjustment_type = 'negative' THEN
    v_movement_type := 'OUT';
  ELSE
    v_movement_type := 'IN';
  END IF;

  -- Call inventario.perform_inventory_movement
  -- This returns JSON directly with the movement details
  v_result := inventario.perform_inventory_movement(
    p_product_id := v_adjustment.product_id,
    p_quantity := v_quantity,
    p_movement_type := v_movement_type,
    p_reason_type := 'adjustment',
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
    p_recorded_by := p_user_id
  );

  -- Extract movement_id from JSON result
  v_movement_id := (v_result->>'movement_id')::UUID;

  -- Update adjustment record
  UPDATE public.inventory_adjustments
  SET
    status = 'approved',
    approved_by = p_user_id,
    approved_at = CURRENT_TIMESTAMP,
    movement_id = v_movement_id,
    warehouse_quantity = v_quantity,
    production_quantity = 0,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_adjustment_id;

  RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.apply_inventory_adjustment IS
'Applies an inventory adjustment directly to the inventory''s location_id.
No distribution needed - each inventory is now associated with a specific location.
Uses inventario.perform_inventory_movement to ensure consistency with the WMS system.';
