-- Alternative migration approach using only public schema
-- This script prepares the system without directly manipulating auth.users
-- Users will need to be created manually through Supabase Dashboard or API

-- Step 1: Add necessary columns to public.users if they don't exist
DO $$
BEGIN
    -- Add permissions column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'permissions') THEN
        ALTER TABLE public.users ADD COLUMN permissions jsonb DEFAULT '{"crm": false, "users": false, "orders": false, "inventory": false}'::jsonb;
    END IF;
    
    -- Add status column if it doesn't exist  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'status') THEN
        ALTER TABLE public.users ADD COLUMN status text DEFAULT 'active';
    END IF;
    
    -- Add last_login column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'last_login') THEN
        ALTER TABLE public.users ADD COLUMN last_login timestamp with time zone;
    END IF;
    
    -- Update existing users to have default values
    UPDATE public.users 
    SET permissions = '{"crm": false, "users": false, "orders": false, "inventory": false}'::jsonb
    WHERE permissions IS NULL;
    
    UPDATE public.users 
    SET status = 'active' 
    WHERE status IS NULL;
    
    RAISE NOTICE 'Public users table prepared successfully';
END $$;

-- Step 2: Create a temporary table with user information for manual creation
CREATE TABLE IF NOT EXISTS temp_users_for_migration (
    id UUID,
    email TEXT,
    name TEXT,
    role TEXT,
    temporary_password TEXT DEFAULT 'TempPass123!'
);

-- Clear any existing data
TRUNCATE temp_users_for_migration;

-- Insert users that need to be created in auth
INSERT INTO temp_users_for_migration (id, email, name, role)
SELECT id, email, name, role 
FROM public.users 
WHERE status = 'active'
ORDER BY created_at;

-- Step 3: Show instructions for manual user creation
DO $$
DECLARE
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM temp_users_for_migration;
    
    RAISE NOTICE '=== MIGRATION PREPARATION COMPLETED ===';
    RAISE NOTICE 'Found % users to migrate', user_count;
    RAISE NOTICE '';
    RAISE NOTICE '=== NEXT STEPS - MANUAL USER CREATION ===';
    RAISE NOTICE 'Due to Supabase security restrictions, you need to create auth users manually.';
    RAISE NOTICE '';
    RAISE NOTICE 'Option 1 - Use Supabase Dashboard:';
    RAISE NOTICE '1. Go to Authentication > Users in your Supabase dashboard';
    RAISE NOTICE '2. Click "Invite User" for each user in temp_users_for_migration table';
    RAISE NOTICE '3. Use the same email and set temporary password: TempPass123!';
    RAISE NOTICE '4. Make sure the UUID matches (you may need to use the API for this)';
    RAISE NOTICE '';
    RAISE NOTICE 'Option 2 - Use Supabase Management API:';
    RAISE NOTICE 'Use the admin API to create users with the exact UUIDs from temp_users_for_migration';
    RAISE NOTICE '';
    RAISE NOTICE 'Option 3 - Use the simplified approach (recommended):';
    RAISE NOTICE 'Run the next script (14b-simple-migration.sql) which creates new users';
END $$;

-- Step 4: Display users to be migrated
SELECT 
    id,
    email,
    name,
    role,
    'TempPass123!' as temporary_password
FROM temp_users_for_migration
ORDER BY email;

RAISE NOTICE '';
RAISE NOTICE 'Users listed above need to be created in Supabase Auth with password: TempPass123!';
RAISE NOTICE 'After creating them, run: SELECT * FROM temp_users_for_migration; to see the list again';