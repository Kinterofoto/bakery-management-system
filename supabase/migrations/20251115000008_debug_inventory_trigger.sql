-- Debug Inventory Trigger Issue
-- Verify and fix the trigger that creates inventory movements on reception

-- =====================================================
-- DROP OLD TRIGGERS (clean up conflicts)
-- =====================================================
DROP TRIGGER IF EXISTS inventory_movement_on_reception_item ON compras.reception_items;
DROP TRIGGER IF EXISTS inventory_movement_on_reception ON compras.material_receptions;

-- =====================================================
-- DROP OLD FUNCTIONS
-- =====================================================
DROP FUNCTION IF EXISTS compras.create_movement_on_reception_item() CASCADE;
DROP FUNCTION IF EXISTS compras.create_movement_on_reception() CASCADE;

-- =====================================================
-- RECREATE FUNCTION FOR RECEPTION_ITEMS
-- =====================================================
CREATE OR REPLACE FUNCTION compras.create_movement_on_reception_item()
RETURNS TRIGGER AS $$
DECLARE
  v_unit VARCHAR;
  v_operator_id UUID;
BEGIN
  -- Get the unit from products
  SELECT p.unit INTO v_unit
  FROM public.products p
  WHERE p.id = NEW.material_id;

  -- Get the operator_id from material_receptions
  SELECT mr.operator_id INTO v_operator_id
  FROM compras.material_receptions mr
  WHERE mr.id = NEW.reception_id;

  -- Insert inventory movement
  INSERT INTO compras.inventory_movements (
    material_id,
    movement_type,
    quantity_change,
    unit_of_measure,
    reference_id,
    reference_type,
    notes,
    recorded_by,
    movement_date
  ) VALUES (
    NEW.material_id,
    'reception',
    NEW.quantity_received,
    COALESCE(v_unit, ''),
    NEW.reception_id,
    'reception_item',
    'Recepción de lote: ' || COALESCE(NEW.batch_number, 'SN'),
    v_operator_id,
    CURRENT_TIMESTAMP
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CREATE TRIGGER ON RECEPTION_ITEMS
-- =====================================================
CREATE TRIGGER inventory_movement_on_reception_item
AFTER INSERT ON compras.reception_items
FOR EACH ROW
EXECUTE FUNCTION compras.create_movement_on_reception_item();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON FUNCTION compras.create_movement_on_reception_item() IS 'Creates an inventory movement entry when a reception item is inserted';
