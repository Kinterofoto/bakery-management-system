-- Practical Migration Script - No auth schema manipulation required
-- This prepares everything for manual user creation via Supabase Dashboard

-- Step 1: Ensure extensions are enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 2: Add missing columns to public.users
DO $$
BEGIN
    -- Add permissions column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'permissions') THEN
        ALTER TABLE public.users ADD COLUMN permissions jsonb DEFAULT '{"crm": false, "users": false, "orders": false, "inventory": false}'::jsonb;
        UPDATE public.users SET permissions = '{"crm": false, "users": false, "orders": false, "inventory": false}'::jsonb WHERE permissions IS NULL;
        RAISE NOTICE 'Added permissions column to public.users';
    END IF;
    
    -- Add status column if it doesn't exist  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'status') THEN
        ALTER TABLE public.users ADD COLUMN status text DEFAULT 'active';
        UPDATE public.users SET status = 'active' WHERE status IS NULL;
        RAISE NOTICE 'Added status column to public.users';
    END IF;
    
    -- Add last_login column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'last_login') THEN
        ALTER TABLE public.users ADD COLUMN last_login timestamp with time zone;
        RAISE NOTICE 'Added last_login column to public.users';
    END IF;
END $$;

-- Step 3: Create migration instructions table
CREATE TABLE IF NOT EXISTS user_migration_instructions (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    email TEXT,
    name TEXT,
    role TEXT,
    temp_password TEXT DEFAULT 'TempPass123!',
    migration_status TEXT DEFAULT 'pending',
    auth_user_created_id UUID NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Clear existing instructions
TRUNCATE user_migration_instructions;

-- Step 4: Populate migration instructions
INSERT INTO user_migration_instructions (user_id, email, name, role)
SELECT id, email, name, role 
FROM public.users 
WHERE (status = 'active' OR status IS NULL)
ORDER BY created_at;

-- Step 5: Show current users to migrate
DO $$
DECLARE
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM user_migration_instructions;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== PUBLIC SCHEMA PREPARATION COMPLETED ===';
    RAISE NOTICE 'Found % users ready for migration', user_count;
    RAISE NOTICE '';
    RAISE NOTICE '=== MIGRATION INSTRUCTIONS ===';
    RAISE NOTICE 'Due to Supabase auth security, users must be created manually:';
    RAISE NOTICE '';
    RAISE NOTICE 'OPTION 1 - Supabase Dashboard (Easiest):';
    RAISE NOTICE '1. Go to your Supabase Dashboard';
    RAISE NOTICE '2. Navigate to Authentication > Users';
    RAISE NOTICE '3. For each user below, click "Invite User"';
    RAISE NOTICE '4. Use their email and password: TempPass123!';
    RAISE NOTICE '5. After creation, copy the new auth UUID to update the mapping';
    RAISE NOTICE '';
    RAISE NOTICE 'OPTION 2 - Use the Management API:';
    RAISE NOTICE 'Use the admin createUser API with service role key';
    RAISE NOTICE '';
END $$;

-- Step 6: Display users that need to be created
SELECT 
    ROW_NUMBER() OVER (ORDER BY email) as "#",
    email,
    name,
    role,
    temp_password,
    'Create this user in Supabase Dashboard' as action
FROM user_migration_instructions
ORDER BY email;

-- Step 7: Create helper function to update mapping after manual creation
CREATE OR REPLACE FUNCTION link_auth_user(
    p_email TEXT,
    p_auth_user_id UUID
) RETURNS TEXT AS $$
DECLARE
    result_msg TEXT;
BEGIN
    -- Update the public.users table with the auth user id
    UPDATE public.users 
    SET auth_user_id = p_auth_user_id 
    WHERE email = p_email;
    
    -- Update migration instructions
    UPDATE user_migration_instructions 
    SET 
        auth_user_created_id = p_auth_user_id,
        migration_status = 'completed'
    WHERE email = p_email;
    
    GET DIAGNOSTICS result_msg = ROW_COUNT;
    
    IF result_msg::INTEGER > 0 THEN
        RETURN 'Successfully linked user ' || p_email || ' with auth ID ' || p_auth_user_id;
    ELSE
        RETURN 'No user found with email ' || p_email;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Show example of how to use the helper function
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== AFTER CREATING USERS IN DASHBOARD ===';
    RAISE NOTICE 'For each user created, run this command to link them:';
    RAISE NOTICE '';
    RAISE NOTICE 'SELECT link_auth_user(''user@email.com'', ''new-auth-uuid-from-dashboard'');';
    RAISE NOTICE '';
    RAISE NOTICE 'Example:';
    RAISE NOTICE 'SELECT link_auth_user(''admin@panaderia.com'', ''123e4567-e89b-12d3-a456-426614174000'');';
    RAISE NOTICE '';
    RAISE NOTICE '=== QUICK VERIFICATION ===';
    RAISE NOTICE 'After linking all users, run this to check:';
    RAISE NOTICE 'SELECT email, name, role, migration_status FROM user_migration_instructions;';
END $$;

-- Step 9: Final instructions and verification queries for later use
CREATE OR REPLACE FUNCTION check_migration_progress() 
RETURNS TABLE(
    email TEXT,
    name TEXT,
    role TEXT,
    status TEXT,
    auth_linked BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        umi.email::TEXT,
        umi.name::TEXT,
        umi.role::TEXT,
        umi.migration_status::TEXT,
        (umi.auth_user_created_id IS NOT NULL)::BOOLEAN
    FROM user_migration_instructions umi
    ORDER BY umi.email;
END;
$$ LANGUAGE plpgsql;

-- Show current progress
SELECT * FROM check_migration_progress();

-- Final summary
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== SUMMARY ===';
    RAISE NOTICE '✅ Public schema prepared with all necessary columns';
    RAISE NOTICE '📋 User list generated for manual creation';
    RAISE NOTICE '🔧 Helper functions created for easy linking';
    RAISE NOTICE '';
    RAISE NOTICE 'Next: Create users manually in Supabase Dashboard, then use link_auth_user() to connect them!';
    RAISE NOTICE 'Password for all users: TempPass123!';
END $$;
