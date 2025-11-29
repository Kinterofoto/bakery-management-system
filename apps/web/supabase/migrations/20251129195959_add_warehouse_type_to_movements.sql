-- Migration: Add warehouse_type column to inventory_movements
-- Purpose: Support tracking whether movements affect warehouse or production inventory

-- Add warehouse_type column if it doesn't exist
ALTER TABLE compras.inventory_movements
ADD COLUMN IF NOT EXISTS warehouse_type VARCHAR(20) CHECK (warehouse_type IN ('warehouse', 'production'));

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_inventory_movements_warehouse_type
  ON compras.inventory_movements(warehouse_type)
  WHERE warehouse_type IS NOT NULL;

-- Add comment
COMMENT ON COLUMN compras.inventory_movements.warehouse_type IS
  'Indicates if movement affects warehouse or production inventory. NULL means warehouse (default for backwards compatibility)';

-- Update existing adjustments that have been applied to set warehouse_type
-- based on the distribution in inventory_adjustments table
UPDATE compras.inventory_movements im
SET warehouse_type = CASE
  WHEN ia.warehouse_quantity > 0 THEN 'warehouse'
  WHEN ia.production_quantity > 0 THEN 'production'
  ELSE 'warehouse' -- Default
END
FROM public.inventory_adjustments ia
WHERE im.reference_id = ia.inventory_id
  AND im.reference_type = 'inventory_adjustment'
  AND im.movement_type = 'adjustment'
  AND im.warehouse_type IS NULL
  AND ia.status = 'approved';
