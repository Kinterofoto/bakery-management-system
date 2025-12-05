-- Fix foreign key constraint for movement_id to reference inventario.inventory_movements
-- The movements are created in inventario schema, not public

-- Drop the old constraint if it exists
ALTER TABLE public.inventory_adjustments
DROP CONSTRAINT IF EXISTS inventory_adjustments_movement_id_fkey;

-- Add new constraint pointing to inventario.inventory_movements
ALTER TABLE public.inventory_adjustments
ADD CONSTRAINT inventory_adjustments_movement_id_fkey
FOREIGN KEY (movement_id)
REFERENCES inventario.inventory_movements(id)
ON DELETE SET NULL;

COMMENT ON CONSTRAINT inventory_adjustments_movement_id_fkey ON public.inventory_adjustments IS
'References movement in inventario schema created by apply_inventory_adjustment';
