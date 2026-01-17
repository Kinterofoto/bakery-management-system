-- Fix reception_item trigger to get unit_of_measure from products table
-- reception_items table does NOT have unit_of_measure column

CREATE OR REPLACE FUNCTION compras.create_inventory_movement_from_reception_item()
RETURNS TRIGGER AS $$
DECLARE
  v_reception RECORD;
  v_balance_after DECIMAL;
BEGIN
  SELECT * INTO v_reception
  FROM compras.material_receptions
  WHERE id = NEW.reception_id;

  IF v_reception.id IS NULL THEN
    RAISE EXCEPTION 'Reception not found for id: %', NEW.reception_id;
  END IF;

  -- Calculate balance after this movement
  v_balance_after := compras.calculate_movement_balance(
    NEW.material_id,
    COALESCE(v_reception.warehouse_type, 'warehouse'),
    v_reception.reception_date
  );

  INSERT INTO compras.inventory_movements (
    material_id,
    movement_type,
    quantity_change,
    unit_of_measure,
    warehouse_type,
    location,
    reference_id,
    reference_type,
    notes,
    recorded_by,
    balance_after,
    movement_date
  ) VALUES (
    NEW.material_id,
    'reception',
    NEW.quantity_received,
    (SELECT unit FROM public.products WHERE id = NEW.material_id),  -- ← FIX: Get from products, not from NEW
    COALESCE(v_reception.warehouse_type, 'warehouse'),
    v_reception.storage_location,
    NEW.id,
    'reception_item',
    'Recepción de material (item) - Orden: ' || COALESCE(v_reception.purchase_order_number, 'N/A'),
    v_reception.operator_id,
    v_balance_after,
    v_reception.reception_date
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION compras.create_inventory_movement_from_reception_item() IS
'Creates inventory movement when a reception item is inserted. Gets unit_of_measure from products table since reception_items does not have that column.';
