-- Add quantity_completed column to order_items table
-- This will store the quantity completed in area 2 review for display in dispatch center

ALTER TABLE public.order_items 
ADD COLUMN quantity_completed INTEGER DEFAULT 0;

-- Add comment to explain the purpose
COMMENT ON COLUMN public.order_items.quantity_completed IS 'Quantity completed during area 2 review, displayed in dispatch center';

-- Update any existing rows to have default value (though there should be none)
UPDATE public.order_items 
SET quantity_completed = 0 
WHERE quantity_completed IS NULL;