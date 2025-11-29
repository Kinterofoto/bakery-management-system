-- Migration: Create triggers to automatically maintain material_inventory_balances
-- Purpose: Ensure balances are always in sync with inventory_movements

-- =====================================================
-- 1. FUNCTION: UPDATE BALANCE ON MOVEMENT INSERT
-- =====================================================

CREATE OR REPLACE FUNCTION compras.update_balance_on_movement_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_warehouse_change DECIMAL(12, 3) := 0;
  v_production_change DECIMAL(12, 3) := 0;
  v_unit_of_measure VARCHAR(50);
BEGIN
  -- Get unit of measure from product
  SELECT p.unit INTO v_unit_of_measure
  FROM public.products p
  WHERE p.id = NEW.material_id;

  -- Determine stock changes based on movement type and warehouse_type
  CASE NEW.movement_type
    -- RECEPTION: Always adds to warehouse
    WHEN 'reception' THEN
      v_warehouse_change := NEW.quantity_change;

    -- CONSUMPTION: Removes from warehouse or production based on warehouse_type
    WHEN 'consumption' THEN
      IF NEW.warehouse_type = 'warehouse' OR NEW.warehouse_type IS NULL THEN
        v_warehouse_change := -ABS(NEW.quantity_change);
      ELSE
        v_production_change := -ABS(NEW.quantity_change);
      END IF;

    -- TRANSFER: Removes from warehouse, adds to production
    WHEN 'transfer' THEN
      v_warehouse_change := -ABS(NEW.quantity_change);
      v_production_change := ABS(NEW.quantity_change);

    -- RETURN: Removes from production, adds to warehouse
    WHEN 'return' THEN
      v_warehouse_change := ABS(NEW.quantity_change);
      v_production_change := -ABS(NEW.quantity_change);

    -- WASTE: Removes from warehouse or production based on warehouse_type
    WHEN 'waste' THEN
      IF NEW.warehouse_type = 'warehouse' OR NEW.warehouse_type IS NULL THEN
        v_warehouse_change := -ABS(NEW.quantity_change);
      ELSE
        v_production_change := -ABS(NEW.quantity_change);
      END IF;

    -- ADJUSTMENT: Can affect warehouse or production based on warehouse_type
    WHEN 'adjustment' THEN
      IF NEW.warehouse_type = 'warehouse' OR NEW.warehouse_type IS NULL THEN
        v_warehouse_change := NEW.quantity_change;
      ELSE
        v_production_change := NEW.quantity_change;
      END IF;

    ELSE
      -- Unknown movement type, log warning but don't fail
      RAISE WARNING 'Unknown movement type: %', NEW.movement_type;
  END CASE;

  -- Insert or update balance record
  INSERT INTO compras.material_inventory_balances (
    material_id,
    warehouse_stock,
    production_stock,
    unit_of_measure,
    last_movement_id,
    last_movement_date,
    last_updated_at
  )
  VALUES (
    NEW.material_id,
    GREATEST(0, v_warehouse_change),
    GREATEST(0, v_production_change),
    COALESCE(v_unit_of_measure, NEW.unit_of_measure, 'kg'),
    NEW.id,
    NEW.movement_date,
    NOW()
  )
  ON CONFLICT (material_id)
  DO UPDATE SET
    warehouse_stock = GREATEST(0, material_inventory_balances.warehouse_stock + v_warehouse_change),
    production_stock = GREATEST(0, material_inventory_balances.production_stock + v_production_change),
    last_movement_id = NEW.id,
    last_movement_date = NEW.movement_date,
    last_updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. FUNCTION: UPDATE BALANCE ON MOVEMENT UPDATE
-- =====================================================

CREATE OR REPLACE FUNCTION compras.update_balance_on_movement_update()
RETURNS TRIGGER AS $$
DECLARE
  v_old_warehouse_change DECIMAL(12, 3) := 0;
  v_old_production_change DECIMAL(12, 3) := 0;
  v_new_warehouse_change DECIMAL(12, 3) := 0;
  v_new_production_change DECIMAL(12, 3) := 0;
BEGIN
  -- Only recalculate if quantity, type, or warehouse_type changed
  IF OLD.quantity_change = NEW.quantity_change
     AND OLD.movement_type = NEW.movement_type
     AND (OLD.warehouse_type IS NOT DISTINCT FROM NEW.warehouse_type) THEN
    RETURN NEW;
  END IF;

  -- Calculate OLD movement impact (reverse it)
  CASE OLD.movement_type
    WHEN 'reception' THEN
      v_old_warehouse_change := -OLD.quantity_change;
    WHEN 'consumption' THEN
      IF OLD.warehouse_type = 'warehouse' OR OLD.warehouse_type IS NULL THEN
        v_old_warehouse_change := ABS(OLD.quantity_change);
      ELSE
        v_old_production_change := ABS(OLD.quantity_change);
      END IF;
    WHEN 'transfer' THEN
      v_old_warehouse_change := ABS(OLD.quantity_change);
      v_old_production_change := -ABS(OLD.quantity_change);
    WHEN 'return' THEN
      v_old_warehouse_change := -ABS(OLD.quantity_change);
      v_old_production_change := ABS(OLD.quantity_change);
    WHEN 'waste' THEN
      IF OLD.warehouse_type = 'warehouse' OR OLD.warehouse_type IS NULL THEN
        v_old_warehouse_change := ABS(OLD.quantity_change);
      ELSE
        v_old_production_change := ABS(OLD.quantity_change);
      END IF;
    WHEN 'adjustment' THEN
      IF OLD.warehouse_type = 'warehouse' OR OLD.warehouse_type IS NULL THEN
        v_old_warehouse_change := -OLD.quantity_change;
      ELSE
        v_old_production_change := -OLD.quantity_change;
      END IF;
  END CASE;

  -- Calculate NEW movement impact (apply it)
  CASE NEW.movement_type
    WHEN 'reception' THEN
      v_new_warehouse_change := NEW.quantity_change;
    WHEN 'consumption' THEN
      IF NEW.warehouse_type = 'warehouse' OR NEW.warehouse_type IS NULL THEN
        v_new_warehouse_change := -ABS(NEW.quantity_change);
      ELSE
        v_new_production_change := -ABS(NEW.quantity_change);
      END IF;
    WHEN 'transfer' THEN
      v_new_warehouse_change := -ABS(NEW.quantity_change);
      v_new_production_change := ABS(NEW.quantity_change);
    WHEN 'return' THEN
      v_new_warehouse_change := ABS(NEW.quantity_change);
      v_new_production_change := -ABS(NEW.quantity_change);
    WHEN 'waste' THEN
      IF NEW.warehouse_type = 'warehouse' OR NEW.warehouse_type IS NULL THEN
        v_new_warehouse_change := -ABS(NEW.quantity_change);
      ELSE
        v_new_production_change := -ABS(NEW.quantity_change);
      END IF;
    WHEN 'adjustment' THEN
      IF NEW.warehouse_type = 'warehouse' OR NEW.warehouse_type IS NULL THEN
        v_new_warehouse_change := NEW.quantity_change;
      ELSE
        v_new_production_change := NEW.quantity_change;
      END IF;
  END CASE;

  -- Update balance (reverse old, apply new)
  UPDATE compras.material_inventory_balances
  SET
    warehouse_stock = GREATEST(0, warehouse_stock + v_old_warehouse_change + v_new_warehouse_change),
    production_stock = GREATEST(0, production_stock + v_old_production_change + v_new_production_change),
    last_movement_id = NEW.id,
    last_movement_date = NEW.movement_date,
    last_updated_at = NOW()
  WHERE material_id = NEW.material_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. FUNCTION: UPDATE BALANCE ON MOVEMENT DELETE
-- =====================================================

CREATE OR REPLACE FUNCTION compras.update_balance_on_movement_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_warehouse_change DECIMAL(12, 3) := 0;
  v_production_change DECIMAL(12, 3) := 0;
  v_last_movement RECORD;
BEGIN
  -- Calculate reverse of the deleted movement
  CASE OLD.movement_type
    WHEN 'reception' THEN
      v_warehouse_change := -OLD.quantity_change;
    WHEN 'consumption' THEN
      IF OLD.warehouse_type = 'warehouse' OR OLD.warehouse_type IS NULL THEN
        v_warehouse_change := ABS(OLD.quantity_change);
      ELSE
        v_production_change := ABS(OLD.quantity_change);
      END IF;
    WHEN 'transfer' THEN
      v_warehouse_change := ABS(OLD.quantity_change);
      v_production_change := -ABS(OLD.quantity_change);
    WHEN 'return' THEN
      v_warehouse_change := -ABS(OLD.quantity_change);
      v_production_change := ABS(OLD.quantity_change);
    WHEN 'waste' THEN
      IF OLD.warehouse_type = 'warehouse' OR OLD.warehouse_type IS NULL THEN
        v_warehouse_change := ABS(OLD.quantity_change);
      ELSE
        v_production_change := ABS(OLD.quantity_change);
      END IF;
    WHEN 'adjustment' THEN
      IF OLD.warehouse_type = 'warehouse' OR OLD.warehouse_type IS NULL THEN
        v_warehouse_change := -OLD.quantity_change;
      ELSE
        v_production_change := -OLD.quantity_change;
      END IF;
  END CASE;

  -- Find the most recent movement for this material (for audit trail)
  SELECT id, movement_date INTO v_last_movement
  FROM compras.inventory_movements
  WHERE material_id = OLD.material_id
    AND id != OLD.id
  ORDER BY movement_date DESC, created_at DESC
  LIMIT 1;

  -- Update balance (reverse the deleted movement)
  UPDATE compras.material_inventory_balances
  SET
    warehouse_stock = GREATEST(0, warehouse_stock + v_warehouse_change),
    production_stock = GREATEST(0, production_stock + v_production_change),
    last_movement_id = v_last_movement.id,
    last_movement_date = v_last_movement.movement_date,
    last_updated_at = NOW()
  WHERE material_id = OLD.material_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. CREATE TRIGGERS
-- =====================================================

-- Trigger on INSERT
CREATE TRIGGER trigger_update_balance_on_movement_insert
  AFTER INSERT ON compras.inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION compras.update_balance_on_movement_insert();

-- Trigger on UPDATE
CREATE TRIGGER trigger_update_balance_on_movement_update
  AFTER UPDATE ON compras.inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION compras.update_balance_on_movement_update();

-- Trigger on DELETE
CREATE TRIGGER trigger_update_balance_on_movement_delete
  AFTER DELETE ON compras.inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION compras.update_balance_on_movement_delete();

-- =====================================================
-- 5. ADD COMMENTS
-- =====================================================

COMMENT ON FUNCTION compras.update_balance_on_movement_insert() IS
  'Automatically updates material_inventory_balances when a new movement is inserted. Determines warehouse vs production impact based on movement_type and warehouse_type.';

COMMENT ON FUNCTION compras.update_balance_on_movement_update() IS
  'Automatically updates material_inventory_balances when a movement is modified. Reverses old impact and applies new impact.';

COMMENT ON FUNCTION compras.update_balance_on_movement_delete() IS
  'Automatically updates material_inventory_balances when a movement is deleted. Reverses the impact of the deleted movement.';
