-- Add inventory_deducted flag to orders table
-- This column tracks whether inventory has already been deducted for an order,
-- preventing double deduction when an order goes through remision -> invoice flow.
--
-- New behavior:
--   - Inventory deducts at BILLING (factura) or REMISION time, not at dispatch.
--   - If a remision is created, inventory deducts then. Later invoicing skips deduction.
--   - If direct billing (no remision), inventory deducts at invoice time.

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS inventory_deducted BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: mark already-dispatched orders as inventory_deducted = true
-- since they were dispatched under the old flow where dispatch deducted inventory.
UPDATE public.orders
SET inventory_deducted = TRUE
WHERE status IN ('dispatched', 'in_delivery', 'delivered')
  AND inventory_deducted = FALSE;

COMMENT ON COLUMN public.orders.inventory_deducted IS
  'Whether inventory movements have been created for this order (to prevent double deduction)';
