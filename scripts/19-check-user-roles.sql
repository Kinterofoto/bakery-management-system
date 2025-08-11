-- Check current user roles and permissions

-- Step 1: Show all users in public.users
SELECT 
    'PUBLIC USERS' as table_type,
    email,
    name,
    role,
    status,
    permissions,
    auth_user_id,
    created_at
FROM public.users
ORDER BY email;

-- Step 2: Show all users in auth.users  
SELECT 
    'AUTH USERS' as table_type,
    email,
    id,
    email_confirmed_at,
    raw_user_meta_data,
    created_at
FROM auth.users
ORDER BY email;

-- Step 3: Show mapping between auth and public users
SELECT 
    'USER MAPPING' as info,
    au.email,
    au.id as auth_id,
    pu.id as public_id,
    pu.name,
    pu.role,
    pu.status,
    CASE 
        WHEN pu.auth_user_id = au.id THEN '✅ Correctly Linked'
        WHEN pu.auth_user_id IS NULL THEN '❌ Not Linked'
        ELSE '⚠️ Wrong Link'
    END as link_status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id OR au.email = pu.email
ORDER BY au.email;

-- Step 4: Check for any users that might need role updates
DO $$
DECLARE
    user_count INTEGER;
    admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM public.users WHERE status = 'active';
    SELECT COUNT(*) INTO admin_count FROM public.users WHERE role = 'admin' AND status = 'active';
    
    RAISE NOTICE '';
    RAISE NOTICE '=== USER ROLE ANALYSIS ===';
    RAISE NOTICE 'Total active users: %', user_count;
    RAISE NOTICE 'Admin users: %', admin_count;
    RAISE NOTICE '';
    
    IF admin_count = 0 THEN
        RAISE NOTICE '⚠️  NO ADMIN USERS FOUND!';
        RAISE NOTICE 'You may need to update a user role to admin:';
        RAISE NOTICE 'UPDATE public.users SET role = ''admin'' WHERE email = ''your@email.com'';';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== ROLES THAT CAN ACCESS MODULE SELECTION (/) ===';
    RAISE NOTICE '✅ admin - Can see all modules';
    RAISE NOTICE '✅ commercial - Can see Orders and CRM modules';
    RAISE NOTICE '';
    RAISE NOTICE '=== ROLES WITH DIRECT REDIRECTS ===';
    RAISE NOTICE '↗️  reviewer_area1 → /review-area1';
    RAISE NOTICE '↗️  reviewer_area2 → /review-area2';  
    RAISE NOTICE '↗️  dispatcher → /dispatch';
    RAISE NOTICE '↗️  driver → /routes';
END $$;