-- Fix transfer movement trigger
-- Problem: Original trigger fires on material_transfers INSERT, but transfer_items don't exist yet
-- Solution: Trigger on transfer_items INSERT instead

-- Drop old trigger
DROP TRIGGER IF EXISTS inventory_movement_on_transfer ON compras.material_transfers;

-- Create new function that creates movement for a single transfer item
CREATE OR REPLACE FUNCTION compras.create_movement_on_transfer_item()
RETURNS TRIGGER AS $$
DECLARE
  v_work_center RECORD;
  v_transfer RECORD;
BEGIN
  -- Get work center and transfer info
  SELECT wc.code, wc.name, mt.requested_by
  INTO v_work_center
  FROM compras.material_transfers mt
  JOIN produccion.work_centers wc ON wc.id = mt.work_center_id
  WHERE mt.id = NEW.transfer_id;

  -- Create inventory movement for this item
  INSERT INTO compras.inventory_movements (
    material_id,
    movement_type,
    quantity_change,
    unit_of_measure,
    reference_id,
    reference_type,
    location,
    notes,
    recorded_by,
    movement_date
  )
  VALUES (
    NEW.material_id,
    'transfer',
    -NEW.quantity_requested,
    NEW.unit_of_measure,
    NEW.transfer_id,
    'material_transfer',
    'Centro: ' || v_work_center.code,
    'Traslado a ' || v_work_center.name || ' - Lote: ' || COALESCE(NEW.batch_number, 'N/A'),
    v_work_center.requested_by,
    CURRENT_TIMESTAMP
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger on transfer_items
CREATE TRIGGER inventory_movement_on_transfer_item
AFTER INSERT ON compras.transfer_items
FOR EACH ROW
EXECUTE FUNCTION compras.create_movement_on_transfer_item();

-- Comment
COMMENT ON TRIGGER inventory_movement_on_transfer_item ON compras.transfer_items IS
'Creates inventory movement when a transfer item is added. Triggers on transfer_items instead of material_transfers to ensure items exist.';
