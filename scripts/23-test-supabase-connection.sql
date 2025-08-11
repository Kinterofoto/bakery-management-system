-- Test Supabase connection and data integrity

-- Step 1: Test basic connection
SELECT 'Connection test' as test, NOW() as current_time;

-- Step 2: Test the exact user data that's causing problems
SELECT 
    'User data test' as test,
    id,
    email,
    name,
    role,
    permissions,
    status,
    last_login,
    auth_user_id,
    created_at,
    updated_at
FROM public.users 
WHERE id = 'e242d7e1-836b-46e7-9c8f-ff44989484da';

-- Step 3: Test the exact query the app is making
SELECT 
    name, 
    role, 
    permissions, 
    status, 
    last_login
FROM public.users
WHERE id = 'e242d7e1-836b-46e7-9c8f-ff44989484da';

-- Step 4: Test permissions data type
SELECT 
    email,
    permissions,
    pg_typeof(permissions) as permissions_type,
    jsonb_pretty(permissions) as permissions_formatted
FROM public.users 
WHERE id = 'e242d7e1-836b-46e7-9c8f-ff44989484da';

-- Step 5: Test if there are any weird characters or encoding issues
SELECT 
    email,
    name,
    octet_length(name) as name_byte_length,
    char_length(name) as name_char_length,
    ascii(substring(name, 1, 1)) as first_char_ascii
FROM public.users 
WHERE id = 'e242d7e1-836b-46e7-9c8f-ff44989484da';

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== SUPABASE CONNECTION TESTS COMPLETED ===';
    RAISE NOTICE 'If all queries above returned data, the issue is likely in the client-side code.';
    RAISE NOTICE 'If any queries failed, there might be a database connectivity issue.';
END $$;