-- Add has_pending_missing field to orders table
-- This field tracks whether an order has been sent to dispatch with missing items
-- and is waiting for those items to be completed

ALTER TABLE orders
ADD COLUMN has_pending_missing BOOLEAN DEFAULT FALSE;

-- Add comment to explain the field
COMMENT ON COLUMN orders.has_pending_missing IS 'Indicates if the order has been sent to dispatch with missing items that need to be completed';

-- Create index for faster filtering in the Faltantes tab
CREATE INDEX idx_orders_has_pending_missing ON orders(has_pending_missing) WHERE has_pending_missing = TRUE;
