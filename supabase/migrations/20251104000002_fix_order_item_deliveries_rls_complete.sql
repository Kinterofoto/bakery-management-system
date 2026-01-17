-- Complete RLS fix for order_item_deliveries table
-- This ensures all users can read/write delivery records

-- 1. Drop all existing policies
DROP POLICY IF EXISTS "Allow all operations on order_item_deliveries" ON public.order_item_deliveries;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.order_item_deliveries;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.order_item_deliveries;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.order_item_deliveries;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.order_item_deliveries;

-- 2. Disable RLS temporarily
ALTER TABLE public.order_item_deliveries DISABLE ROW LEVEL SECURITY;

-- 3. Re-enable RLS
ALTER TABLE public.order_item_deliveries ENABLE ROW LEVEL SECURITY;

-- 4. Drop any existing policies that might have similar names
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.order_item_deliveries;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.order_item_deliveries;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.order_item_deliveries;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.order_item_deliveries;

-- 5. Create granular policies for each operation
-- SELECT policy
CREATE POLICY "Enable read access for authenticated users"
ON public.order_item_deliveries
FOR SELECT
TO authenticated
USING (true);

-- INSERT policy
CREATE POLICY "Enable insert for authenticated users"
ON public.order_item_deliveries
FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE policy
CREATE POLICY "Enable update for authenticated users"
ON public.order_item_deliveries
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- DELETE policy
CREATE POLICY "Enable delete for authenticated users"
ON public.order_item_deliveries
FOR DELETE
TO authenticated
USING (true);

-- 6. Grant necessary permissions
GRANT ALL ON public.order_item_deliveries TO authenticated;
GRANT ALL ON public.order_item_deliveries TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 7. Verify the setup
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '✓ RLS policies for order_item_deliveries recreated';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '';
    RAISE NOTICE 'Policies created:';
    RAISE NOTICE '  ✓ Enable read access for authenticated users (SELECT)';
    RAISE NOTICE '  ✓ Enable insert for authenticated users (INSERT)';
    RAISE NOTICE '  ✓ Enable update for authenticated users (UPDATE)';
    RAISE NOTICE '  ✓ Enable delete for authenticated users (DELETE)';
    RAISE NOTICE '';
    RAISE NOTICE 'All authenticated users can now access order_item_deliveries';
    RAISE NOTICE '';
END $$;
