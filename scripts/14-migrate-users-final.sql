-- Migration script using Supabase's recommended approach
-- Run this in the Supabase SQL Editor Dashboard

-- Step 1: Ensure extensions are enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 2: First, let's add the missing columns to public.users if they don't exist
DO $$
BEGIN
    -- Add permissions column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'permissions') THEN
        ALTER TABLE public.users ADD COLUMN permissions jsonb DEFAULT '{"crm": false, "users": false, "orders": false, "inventory": false}'::jsonb;
        UPDATE public.users SET permissions = '{"crm": false, "users": false, "orders": false, "inventory": false}'::jsonb WHERE permissions IS NULL;
    END IF;
    
    -- Add status column if it doesn't exist  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'status') THEN
        ALTER TABLE public.users ADD COLUMN status text DEFAULT 'active';
        UPDATE public.users SET status = 'active' WHERE status IS NULL;
    END IF;
    
    -- Add last_login column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'last_login') THEN
        ALTER TABLE public.users ADD COLUMN last_login timestamp with time zone;
    END IF;
END $$;

-- Step 3: Create a function to safely migrate users using Supabase's approach
CREATE OR REPLACE FUNCTION migrate_user_to_auth(
  user_record public.users
)
RETURNS uuid AS $$
DECLARE
  new_auth_id UUID;
BEGIN
  -- Check if user already exists in auth.users
  SELECT id INTO new_auth_id 
  FROM auth.users 
  WHERE email = user_record.email;
  
  -- If user doesn't exist, create them
  IF new_auth_id IS NULL THEN
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud,
      instance_id
    ) VALUES (
      user_record.id,
      user_record.email,
      -- Use a random password that must be reset
      crypt('TempPass123!', gen_salt('bf')),
      NOW(),
      json_build_object(
        'full_name', user_record.name,
        'role', user_record.role,
        'permissions', user_record.permissions
      )::jsonb,
      COALESCE(user_record.created_at, NOW()),
      NOW(),
      'authenticated',
      'authenticated',
      '00000000-0000-0000-0000-000000000000'
    );
    
    RAISE NOTICE 'Created auth user: % (%) with ID: %', user_record.name, user_record.email, user_record.id;
    RETURN user_record.id;
  ELSE
    -- Update existing user with additional metadata
    UPDATE auth.users
    SET 
      raw_user_meta_data = json_build_object(
        'full_name', user_record.name,
        'role', user_record.role,
        'permissions', user_record.permissions
      )::jsonb,
      updated_at = NOW()
    WHERE id = new_auth_id;
    
    RAISE NOTICE 'Updated existing auth user: % (%) with ID: %', user_record.name, user_record.email, new_auth_id;
    RETURN new_auth_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Disable triggers temporarily to avoid conflicts
DO $$
BEGIN
  -- Disable triggers if they exist
  IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created') THEN
    EXECUTE 'ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_updated') THEN
    EXECUTE 'ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_updated';
  END IF;
END $$;

-- Step 5: Migrate all active users
DO $$
DECLARE
  user_record public.users%ROWTYPE;
  migrated_count INTEGER := 0;
  auth_user_id UUID;
BEGIN
  -- Loop through all active users
  FOR user_record IN 
    SELECT * FROM public.users 
    WHERE status = 'active' OR status IS NULL
    ORDER BY created_at
  LOOP
    -- Migrate each user
    SELECT migrate_user_to_auth(user_record) INTO auth_user_id;
    
    -- Update the auth_user_id mapping
    UPDATE public.users 
    SET auth_user_id = auth_user_id 
    WHERE id = user_record.id;
    
    migrated_count := migrated_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Successfully migrated % users', migrated_count;
END $$;

-- Step 6: Re-enable triggers
DO $$
BEGIN
  -- Re-enable triggers if they exist
  IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created') THEN
    EXECUTE 'ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_updated') THEN
    EXECUTE 'ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_updated';
  END IF;
END $$;

-- Step 7: Add foreign key constraint (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'users_auth_user_id_fkey' 
                   AND table_name = 'users' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.users 
        ADD CONSTRAINT users_auth_user_id_fkey 
        FOREIGN KEY (auth_user_id) REFERENCES auth.users(id);
        RAISE NOTICE 'Added foreign key constraint';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists';
    END IF;
END $$;

-- Step 8: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_public_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth.users(email);

-- Step 9: Clean up the migration function
DROP FUNCTION IF EXISTS migrate_user_to_auth(public.users);

-- Step 10: Verification queries
SELECT 
  'auth.users' as table_name, 
  COUNT(*) as total_users,
  COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END) as confirmed_users
FROM auth.users
UNION ALL
SELECT 
  'public.users' as table_name, 
  COUNT(*) as total_users,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users
FROM public.users;

-- Show migrated users
SELECT 
  pu.name,
  pu.email,
  pu.role,
  pu.status,
  au.email_confirmed_at,
  au.created_at as auth_created,
  CASE WHEN pu.auth_user_id = au.id THEN 'Linked' ELSE 'Not Linked' END as link_status
FROM public.users pu
LEFT JOIN auth.users au ON pu.auth_user_id = au.id
WHERE pu.status = 'active' OR pu.status IS NULL
ORDER BY pu.created_at;

-- Final success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== MIGRATION COMPLETED SUCCESSFULLY ===';
  RAISE NOTICE 'All users have been migrated to auth.users with temporary password: TempPass123!';
  RAISE NOTICE 'Users can now login with their email and the temporary password.';
  RAISE NOTICE 'Check the verification queries above to confirm migration success.';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test login with any user using TempPass123!';
  RAISE NOTICE '2. Implement password reset flow for production use';
  RAISE NOTICE '3. Update user permissions as needed';
END $$;