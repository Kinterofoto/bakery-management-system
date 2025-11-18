-- Add Trigger to Update Inventory Movements on Reception Item Update
-- When a reception item quantity changes, update the corresponding inventory movement

-- =====================================================
-- FUNCTION: Update inventory movement on reception item update
-- =====================================================
CREATE OR REPLACE FUNCTION compras.update_movement_on_reception_item_update()
RETURNS TRIGGER AS $$
DECLARE
  v_existing_movement_id UUID;
  v_quantity_difference DECIMAL;
BEGIN
  -- Only process if quantity_received changed
  IF NEW.quantity_received <> OLD.quantity_received THEN
    -- Find the existing movement for this reception item
    SELECT id INTO v_existing_movement_id
    FROM compras.inventory_movements
    WHERE reference_id = NEW.reception_id
      AND reference_type = 'reception_item'
      AND material_id = NEW.material_id
    ORDER BY movement_date DESC
    LIMIT 1;

    IF v_existing_movement_id IS NOT NULL THEN
      -- Calculate the difference
      v_quantity_difference := NEW.quantity_received - OLD.quantity_received;

      -- Update the existing movement with the new quantity
      UPDATE compras.inventory_movements
      SET quantity_change = NEW.quantity_received,
          notes = 'Recepción actualizada: Lote ' || COALESCE(NEW.batch_number, 'SN') || ' Cantidad: ' || NEW.quantity_received
      WHERE id = v_existing_movement_id;
    ELSE
      -- If no movement found, create a new one
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
        (SELECT p.unit FROM public.products p WHERE p.id = NEW.material_id),
        NEW.reception_id,
        'reception_item',
        'Recepción actualizada: Lote ' || COALESCE(NEW.batch_number, 'SN'),
        (SELECT operator_id FROM compras.material_receptions WHERE id = NEW.reception_id),
        CURRENT_TIMESTAMP
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: Update movement on reception item update
-- =====================================================
DROP TRIGGER IF EXISTS update_movement_on_reception_item_update ON compras.reception_items;

CREATE TRIGGER update_movement_on_reception_item_update
AFTER UPDATE ON compras.reception_items
FOR EACH ROW
EXECUTE FUNCTION compras.update_movement_on_reception_item_update();

-- =====================================================
-- FUNCTION: Delete inventory movement on reception item delete
-- =====================================================
CREATE OR REPLACE FUNCTION compras.delete_movement_on_reception_item_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete the corresponding inventory movement
  DELETE FROM compras.inventory_movements
  WHERE reference_id = OLD.reception_id
    AND reference_type = 'reception_item'
    AND material_id = OLD.material_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: Delete movement on reception item delete
-- =====================================================
DROP TRIGGER IF EXISTS delete_movement_on_reception_item_delete ON compras.reception_items;

CREATE TRIGGER delete_movement_on_reception_item_delete
AFTER DELETE ON compras.reception_items
FOR EACH ROW
EXECUTE FUNCTION compras.delete_movement_on_reception_item_delete();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON FUNCTION compras.update_movement_on_reception_item_update() IS 'Updates the corresponding inventory movement when a reception item is updated';
COMMENT ON FUNCTION compras.delete_movement_on_reception_item_delete() IS 'Deletes the corresponding inventory movement when a reception item is deleted';
