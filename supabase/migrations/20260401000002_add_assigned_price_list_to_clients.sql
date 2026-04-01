-- Add assigned_price_list column to clients table
-- This allows assigning a named price list (from product_price_lists) to a client
-- NULL means "Regular" (uses products.price as default)
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS assigned_price_list VARCHAR(100) DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.clients.assigned_price_list IS 'Name of the assigned price list from product_price_lists. NULL = Regular/default pricing.';
