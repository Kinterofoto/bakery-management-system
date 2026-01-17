-- Add snapshot_quantity column to inventory_count_items
-- This column stores the inventory balance at the moment the count is finalized

ALTER TABLE public.inventory_count_items
ADD COLUMN IF NOT EXISTS snapshot_quantity NUMERIC DEFAULT 0;

COMMENT ON COLUMN public.inventory_count_items.snapshot_quantity IS
'Snapshot of inventory balance (from inventario.inventory_balances) at the moment the count was finalized. Used to calculate adjustments based on the state at counting time, not current state.';
