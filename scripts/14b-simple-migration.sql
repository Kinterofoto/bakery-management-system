-- Simple migration approach - Create new auth users and update references
-- This approach creates new UUIDs for auth users and updates all references

-- Step 1: Add a mapping column to track the new auth user IDs
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS new_auth_id UUID;

-- Step 2: Create a function to handle user creation with new IDs
CREATE OR REPLACE FUNCTION create_auth_user_simple(
    p_email TEXT,
    p_name TEXT,
    p_password TEXT DEFAULT 'TempPass123!'
) RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
BEGIN
    -- Generate a new UUID
    new_user_id := gen_random_uuid();
    
    -- This would normally create the auth user, but we can't due to permissions
    -- Instead, we'll return the new UUID and log the user info
    RAISE NOTICE 'Would create auth user: ID=%, Email=%, Name=%, Password=%', 
                 new_user_id, p_email, p_name, p_password;
    
    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Update public.users with new auth IDs (simulated)
DO $$
DECLARE
    user_rec RECORD;
    new_auth_uuid UUID;
BEGIN
    FOR user_rec IN 
        SELECT id, email, name 
        FROM public.users 
        WHERE status = 'active' AND new_auth_id IS NULL
    LOOP
        -- Generate new auth ID
        new_auth_uuid := gen_random_uuid();
        
        -- Update the mapping
        UPDATE public.users 
        SET new_auth_id = new_auth_uuid 
        WHERE id = user_rec.id;
        
        RAISE NOTICE 'User: % (%) -> Auth ID: %', user_rec.name, user_rec.email, new_auth_uuid;
    END LOOP;
END $$;

-- Step 4: Show final mapping and instructions
SELECT 
    pu.name,
    pu.email,
    pu.role,
    pu.id as original_id,
    pu.new_auth_id as auth_id_to_create,
    'TempPass123!' as password
FROM public.users pu
WHERE pu.status = 'active' AND pu.new_auth_id IS NOT NULL
ORDER BY pu.email;

-- Clean up function
DROP FUNCTION create_auth_user_simple(TEXT, TEXT, TEXT);

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== SIMPLE MIGRATION APPROACH ===';
    RAISE NOTICE 'Due to Supabase auth schema restrictions, follow these steps:';
    RAISE NOTICE '';
    RAISE NOTICE '1. Copy the user list above';
    RAISE NOTICE '2. For each user, create them in Supabase Dashboard:';
    RAISE NOTICE '   - Go to Authentication > Users';
    RAISE NOTICE '   - Click "Invite User"';
    RAISE NOTICE '   - Use the email and password "TempPass123!"';
    RAISE NOTICE '   - Note: Supabase will assign new UUIDs (this is normal)';
    RAISE NOTICE '';
    RAISE NOTICE '3. After creating users, update the auth_user_id mapping:';
    RAISE NOTICE '   UPDATE public.users SET auth_user_id = [new_supabase_uuid] WHERE email = [user_email];';
    RAISE NOTICE '';
    RAISE NOTICE '4. Test login with any user using "TempPass123!"';
END $$;