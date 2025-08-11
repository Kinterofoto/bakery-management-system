-- Check if the specific user exists in public.users

-- Step 1: Check auth.users
SELECT 
    'AUTH USER' as source,
    id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users 
WHERE email = 'comercial@pastrychef.com.co' OR id = 'e242d7e1-836b-46e7-9c8f-ff44989484da';

-- Step 2: Check public.users by ID
SELECT 
    'PUBLIC USER (by ID)' as source,
    id,
    email,
    name,
    role,
    status,
    permissions,
    auth_user_id,
    created_at
FROM public.users 
WHERE id = 'e242d7e1-836b-46e7-9c8f-ff44989484da';

-- Step 3: Check public.users by email
SELECT 
    'PUBLIC USER (by email)' as source,
    id,
    email,
    name,
    role,
    status,
    permissions,
    auth_user_id,
    created_at
FROM public.users 
WHERE email = 'comercial@pastrychef.com.co';

-- Step 4: Show all users in public.users to compare
SELECT 
    'ALL PUBLIC USERS' as info,
    id,
    email,
    name,
    role,
    status
FROM public.users
ORDER BY email;

-- Step 5: If user doesn't exist in public.users, create it manually
DO $$
DECLARE
    auth_user_exists BOOLEAN := FALSE;
    public_user_exists BOOLEAN := FALSE;
BEGIN
    -- Check if auth user exists
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = 'e242d7e1-836b-46e7-9c8f-ff44989484da') 
    INTO auth_user_exists;
    
    -- Check if public user exists
    SELECT EXISTS(SELECT 1 FROM public.users WHERE id = 'e242d7e1-836b-46e7-9c8f-ff44989484da') 
    INTO public_user_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== USER DIAGNOSIS ===';
    RAISE NOTICE 'Auth user exists: %', auth_user_exists;
    RAISE NOTICE 'Public user exists: %', public_user_exists;
    RAISE NOTICE '';
    
    IF auth_user_exists AND NOT public_user_exists THEN
        RAISE NOTICE '⚠️  PROBLEM FOUND: User exists in auth.users but NOT in public.users';
        RAISE NOTICE '';
        RAISE NOTICE '🔧 SOLUTION: Create the missing public.users record';
        RAISE NOTICE 'Run this SQL:';
        RAISE NOTICE '';
        RAISE NOTICE 'INSERT INTO public.users (id, email, name, role, permissions, status, created_at, updated_at)';
        RAISE NOTICE 'SELECT ';
        RAISE NOTICE '  id,';
        RAISE NOTICE '  email,';
        RAISE NOTICE '  COALESCE(raw_user_meta_data->>''full_name'', email) as name,';
        RAISE NOTICE '  ''commercial'' as role,';
        RAISE NOTICE '  ''{"crm": false, "users": false, "orders": false, "inventory": false}''::jsonb as permissions,';
        RAISE NOTICE '  ''active'' as status,';
        RAISE NOTICE '  created_at,';
        RAISE NOTICE '  NOW() as updated_at';
        RAISE NOTICE 'FROM auth.users';
        RAISE NOTICE 'WHERE id = ''e242d7e1-836b-46e7-9c8f-ff44989484da'';';
    ELSIF NOT auth_user_exists THEN
        RAISE NOTICE '❌ PROBLEM: User does not exist in auth.users either';
        RAISE NOTICE 'You need to create this user in Supabase Dashboard first';
    ELSE
        RAISE NOTICE '✅ Both users exist - there might be a different issue';
    END IF;
END $$;