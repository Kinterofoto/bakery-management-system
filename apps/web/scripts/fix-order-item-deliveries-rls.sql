-- Enable RLS on order_item_deliveries table
ALTER TABLE public.order_item_deliveries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow all operations on order_item_deliveries" ON public.order_item_deliveries;

-- Create policy to allow all authenticated users to manage delivery records
CREATE POLICY "Allow all operations on order_item_deliveries"
ON public.order_item_deliveries
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Verify the table is accessible
GRANT ALL ON public.order_item_deliveries TO authenticated;
GRANT ALL ON public.order_item_deliveries TO service_role;
