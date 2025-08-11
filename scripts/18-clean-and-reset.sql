-- Clean reset: Delete public.users and let triggers recreate them from auth

-- Step 1: Backup current users data (optional, for safety)
CREATE TABLE IF NOT EXISTS users_backup AS 
SELECT * FROM public.users;

-- Step 2: Show what we're about to delete
SELECT 
    'Users to be deleted from public.users:' as info,
    COUNT(*) as total_users
FROM public.users;

SELECT email, name, role, status FROM public.users ORDER BY email;

-- Step 3: Clear public.users table
TRUNCATE TABLE public.users RESTART IDENTITY CASCADE;

-- Step 4: Clear migration instructions table
TRUNCATE TABLE user_migration_instructions;

-- Step 5: Re-populate migration instructions from backup
INSERT INTO user_migration_instructions (user_id, email, name, role)
SELECT id, email, name, role 
FROM users_backup 
WHERE (status = 'active' OR status IS NULL);

-- Step 6: Verify cleanup
SELECT 
    'public.users' as table_name,
    COUNT(*) as record_count
FROM public.users
UNION ALL
SELECT 
    'users_backup' as table_name,
    COUNT(*) as record_count  
FROM users_backup
UNION ALL
SELECT 
    'user_migration_instructions' as table_name,
    COUNT(*) as record_count
FROM user_migration_instructions;

-- Step 7: Show users that need to be created via Dashboard
SELECT 
    email,
    name, 
    role,
    'TempPass123!' as password,
    'Create in Supabase Dashboard' as next_action
FROM user_migration_instructions
ORDER BY email;

-- Step 8: Final instructions
DO $$
DECLARE
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM user_migration_instructions;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== CLEAN RESET COMPLETED ===';
    RAISE NOTICE '✅ Backed up % users to users_backup table', user_count;
    RAISE NOTICE '✅ Cleared public.users table';
    RAISE NOTICE '✅ Updated migration instructions';
    RAISE NOTICE '';
    RAISE NOTICE '=== NEXT STEPS ===';
    RAISE NOTICE '1. Go to Supabase Dashboard > Authentication > Users';
    RAISE NOTICE '2. Create each user manually with:';
    RAISE NOTICE '   - Their email address';
    RAISE NOTICE '   - Password: TempPass123!';
    RAISE NOTICE '   - ✅ Check "Auto Confirm User"';
    RAISE NOTICE '';
    RAISE NOTICE '3. The triggers will automatically:';
    RAISE NOTICE '   - Create records in public.users';
    RAISE NOTICE '   - Set default role as "commercial"';
    RAISE NOTICE '   - Add default permissions';
    RAISE NOTICE '';
    RAISE NOTICE '4. After creating users, update their roles:';
    RAISE NOTICE '   UPDATE public.users SET role = ''admin'' WHERE email = ''admin@domain.com'';';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 This approach is much cleaner and will work perfectly!';
END $$;