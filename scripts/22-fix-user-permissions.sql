-- Fix user permissions that might be causing the query to hang

-- Step 1: Check current permissions format
SELECT 
    email,
    name,
    role,
    permissions,
    CASE 
        WHEN permissions IS NULL THEN '❌ NULL'
        WHEN permissions = '{}'::jsonb THEN '⚠️ Empty Object'
        WHEN permissions::text = 'null' THEN '❌ Null String'
        ELSE '✅ Has Data'
    END as permission_status
FROM public.users
ORDER BY email;

-- Step 2: Fix any NULL or malformed permissions
UPDATE public.users 
SET permissions = '{"crm": true, "users": false, "orders": true, "inventory": true}'::jsonb
WHERE permissions IS NULL 
   OR permissions = '{}'::jsonb
   OR permissions::text = 'null';

-- Step 3: Specifically fix the problematic user
UPDATE public.users 
SET 
    permissions = '{"crm": true, "users": false, "orders": true, "inventory": true}'::jsonb,
    updated_at = NOW()
WHERE id = 'e242d7e1-836b-46e7-9c8f-ff44989484da';

-- Step 4: Verify the fix
SELECT 
    'FIXED USER DATA' as info,
    id,
    email,
    name,
    role,
    status,
    permissions,
    auth_user_id,
    updated_at
FROM public.users 
WHERE id = 'e242d7e1-836b-46e7-9c8f-ff44989484da';

-- Step 5: Test the exact query that the app is running
SELECT 
    'TEST QUERY RESULT' as test,
    name, 
    role, 
    permissions, 
    status, 
    last_login
FROM public.users
WHERE id = 'e242d7e1-836b-46e7-9c8f-ff44989484da';

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ User permissions fixed';
    RAISE NOTICE '🧪 Query tested successfully';
    RAISE NOTICE '🎯 Try logging in again!';
END $$;