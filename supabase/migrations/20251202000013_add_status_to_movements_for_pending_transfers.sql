-- =====================================================
-- Migration: Add status field to inventory_movements for two-step transfers
-- =====================================================
-- Purpose: Enable pending → completed workflow for material transfers
--          so work centers can see and confirm incoming materials
-- Date: 2025-12-02
-- =====================================================

-- 1. Add status column to inventory_movements
ALTER TABLE inventario.inventory_movements
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'completed';

-- 2. Add constraint for valid status values
ALTER TABLE inventario.inventory_movements
ADD CONSTRAINT inventory_movements_status_check
CHECK (status IN ('pending', 'completed', 'cancelled'));

-- 3. Create index for faster queries on pending transfers
CREATE INDEX IF NOT EXISTS idx_inventory_movements_status_location_to
ON inventario.inventory_movements(status, location_id_to)
WHERE status = 'pending' AND movement_type = 'TRANSFER_IN';

-- 4. Add received_at and received_by columns for tracking confirmation
ALTER TABLE inventario.inventory_movements
ADD COLUMN IF NOT EXISTS received_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS received_by UUID REFERENCES auth.users(id);

-- 5. Update existing movements to 'completed' status
UPDATE inventario.inventory_movements
SET status = 'completed'
WHERE status IS NULL;

COMMENT ON COLUMN inventario.inventory_movements.status IS
'Movement status: pending (awaiting confirmation), completed (confirmed), cancelled';

COMMENT ON COLUMN inventario.inventory_movements.received_at IS
'Timestamp when transfer was received/confirmed at destination';

COMMENT ON COLUMN inventario.inventory_movements.received_by IS
'User who confirmed receipt of the transfer';
