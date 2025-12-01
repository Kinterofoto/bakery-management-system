-- =====================================================
-- Migration: Add balance_after column and centralized calculation function
-- Purpose: Store historical balance in inventory_movements for accurate tracking
-- =====================================================

-- =====================================================
-- STEP 1: Add balance_after column to inventory_movements
-- =====================================================
ALTER TABLE compras.inventory_movements
ADD COLUMN IF NOT EXISTS balance_after DECIMAL(10,2) DEFAULT 0 NOT NULL;

-- Add index for performance when filtering by balance
CREATE INDEX IF NOT EXISTS idx_inventory_movements_balance
ON compras.inventory_movements(balance_after);

-- =====================================================
-- STEP 2: Create centralized function to calculate balance
-- =====================================================
CREATE OR REPLACE FUNCTION compras.calculate_movement_balance(
  p_material_id UUID,
  p_warehouse_type TEXT,
  p_movement_date TIMESTAMPTZ DEFAULT NOW()
) RETURNS DECIMAL AS $$
DECLARE
  v_current_balance DECIMAL := 0;
BEGIN
  -- Get current balance from material_inventory_balances
  -- This table is updated BEFORE this function is called by triggers

  IF p_warehouse_type = 'production' THEN
    SELECT COALESCE(production_stock, 0)
    INTO v_current_balance
    FROM compras.material_inventory_balances
    WHERE material_id = p_material_id;
  ELSE
    -- Default to warehouse for NULL or 'warehouse' values
    SELECT COALESCE(warehouse_stock, 0)
    INTO v_current_balance
    FROM compras.material_inventory_balances
    WHERE material_id = p_material_id;
  END IF;

  -- Return the current balance (which already reflects this movement)
  RETURN v_current_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the function
COMMENT ON FUNCTION compras.calculate_movement_balance IS
'Calculates the balance after a movement by reading the current stock from material_inventory_balances.
Must be called AFTER the balance table has been updated by update_material_inventory_balance trigger.';

-- =====================================================
-- STEP 3: Update existing triggers to populate balance_after
-- =====================================================

-- 3.1: Reception trigger
CREATE OR REPLACE FUNCTION compras.create_inventory_movement_from_reception()
RETURNS TRIGGER AS $$
DECLARE
  v_balance_after DECIMAL;
BEGIN
  -- Calculate balance after this movement
  v_balance_after := compras.calculate_movement_balance(
    NEW.material_id,
    COALESCE(NEW.warehouse_type, 'warehouse'),
    NEW.reception_date
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
    NEW.unit_of_measure,
    COALESCE(NEW.warehouse_type, 'warehouse'),
    NEW.storage_location,
    NEW.id,
    'reception',
    'Recepción de material - Orden: ' || COALESCE(NEW.purchase_order_number, 'N/A'),
    NEW.operator_id,
    v_balance_after,
    NEW.reception_date
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3.2: Reception Items trigger
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
    (SELECT unit FROM public.products WHERE id = NEW.material_id),
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

-- 3.3: Transfer Items trigger
CREATE OR REPLACE FUNCTION compras.create_inventory_movement_from_transfer()
RETURNS TRIGGER AS $$
DECLARE
  v_transfer RECORD;
  v_balance_after_from DECIMAL;
  v_balance_after_to DECIMAL;
BEGIN
  SELECT * INTO v_transfer
  FROM compras.material_transfers
  WHERE id = NEW.transfer_id;

  IF v_transfer.id IS NULL THEN
    RAISE EXCEPTION 'Transfer not found for id: %', NEW.transfer_id;
  END IF;

  -- Calculate balance for origin location (negative movement)
  v_balance_after_from := compras.calculate_movement_balance(
    NEW.material_id,
    v_transfer.from_location,
    v_transfer.transfer_date
  );

  -- Create movement for origin (deduction)
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
    'transfer',
    -NEW.quantity_transferred,
    NEW.unit_of_measure,
    v_transfer.from_location,
    v_transfer.from_location,
    NEW.id,
    'transfer_item_out',
    'Transferencia salida - ' || COALESCE(v_transfer.notes, 'Sin notas'),
    v_transfer.requested_by,
    v_balance_after_from,
    v_transfer.transfer_date
  );

  -- Calculate balance for destination location (positive movement)
  v_balance_after_to := compras.calculate_movement_balance(
    NEW.material_id,
    v_transfer.to_location,
    v_transfer.transfer_date
  );

  -- Create movement for destination (addition)
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
    'transfer',
    NEW.quantity_transferred,
    NEW.unit_of_measure,
    v_transfer.to_location,
    v_transfer.to_location,
    NEW.id,
    'transfer_item_in',
    'Transferencia entrada - ' || COALESCE(v_transfer.notes, 'Sin notas'),
    v_transfer.requested_by,
    v_balance_after_to,
    v_transfer.transfer_date
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3.4: Returns trigger
CREATE OR REPLACE FUNCTION compras.create_inventory_movement_from_return()
RETURNS TRIGGER AS $$
DECLARE
  v_balance_after DECIMAL;
BEGIN
  IF NEW.status = 'received' AND OLD.status != 'received' THEN
    -- Calculate balance after this return
    v_balance_after := compras.calculate_movement_balance(
      NEW.material_id,
      COALESCE(NEW.return_to_location, 'warehouse'),
      NEW.received_date
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
      'return',
      NEW.quantity_returned,
      NEW.unit_of_measure,
      COALESCE(NEW.return_to_location, 'warehouse'),
      NEW.return_to_location,
      NEW.id,
      'material_return',
      'Devolución de material - Razón: ' || COALESCE(NEW.reason, 'No especificada'),
      NEW.accepted_by,
      v_balance_after,
      NEW.received_date
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 4: Update RPC function for adjustments
-- =====================================================
-- Drop existing function first to allow return type change
DROP FUNCTION IF EXISTS public.apply_inventory_adjustment(UUID, UUID);

CREATE OR REPLACE FUNCTION public.apply_inventory_adjustment(
  p_adjustment_id UUID,
  p_user_id UUID
) RETURNS JSON AS $$
DECLARE
  v_adjustment RECORD;
  v_item RECORD;
  v_balance_after DECIMAL;
  v_result JSON;
BEGIN
  -- Get adjustment details
  SELECT * INTO v_adjustment
  FROM compras.inventory_adjustments
  WHERE id = p_adjustment_id;

  IF v_adjustment.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Adjustment not found');
  END IF;

  IF v_adjustment.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Adjustment already processed');
  END IF;

  -- Process each adjustment item
  FOR v_item IN
    SELECT * FROM compras.adjustment_items WHERE adjustment_id = p_adjustment_id
  LOOP
    -- Update balance in material_inventory_balances first
    -- (This trigger already exists and runs automatically)

    -- Calculate balance after adjustment
    v_balance_after := compras.calculate_movement_balance(
      v_item.material_id,
      COALESCE(v_adjustment.warehouse_type, 'warehouse'),
      NOW()
    );

    -- Create inventory movement with balance
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
      balance_after,
      movement_date
    ) VALUES (
      v_item.material_id,
      'adjustment',
      v_item.quantity_change,
      v_item.unit_of_measure,
      COALESCE(v_adjustment.warehouse_type, 'warehouse'),
      v_item.id,
      'adjustment_item',
      v_adjustment.reason || ' - ' || COALESCE(v_item.notes, ''),
      p_user_id,
      v_balance_after,
      NOW()
    );
  END LOOP;

  -- Mark adjustment as completed
  UPDATE compras.inventory_adjustments
  SET
    status = 'completed',
    approved_by = p_user_id,
    approved_at = NOW()
  WHERE id = p_adjustment_id;

  RETURN json_build_object('success', true, 'adjustment_id', p_adjustment_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 5: Refresh schema and verify
-- =====================================================
COMMENT ON COLUMN compras.inventory_movements.balance_after IS
'Balance of inventory after this movement was applied. Calculated and stored at insert time for historical accuracy.';
