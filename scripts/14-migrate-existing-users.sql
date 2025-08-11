-- Migration script to move existing users from public.users to auth.users
-- This script should be run AFTER the trigger functions are created

-- WARNING: This is a destructive migration. Make sure to backup your data first!
-- This script will:
-- 1. Create auth.users records for existing public.users
-- 2. Update all foreign key references to use the new auth.users IDs
-- 3. Preserve all existing user data and relationships

-- Step 1: Create temporary function to generate auth users
CREATE OR REPLACE FUNCTION migrate_user_to_auth(
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  temp_password TEXT DEFAULT 'TempPass123!'
)
RETURNS UUID AS $$
DECLARE
  new_auth_id UUID;
BEGIN
  -- Create user in auth.users using Supabase's auth functions
  -- Note: In production, you would use Supabase's admin API instead
  -- This is a simplified version for the migration
  
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data,
    aud,
    role
  ) VALUES (
    user_id, -- Keep the same UUID to preserve foreign key relationships
    '00000000-0000-0000-0000-000000000000', -- Default instance_id
    user_email,
    crypt(temp_password, gen_salt('bf')), -- Temporary password (user must reset)
    NOW(), -- Confirm email immediately
    NOW(),
    NOW(),
    json_build_object('full_name', user_name)::jsonb,
    'authenticated',
    'authenticated'
  );
  
  RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Migrate all existing users from public.users to auth.users
-- First, disable the triggers temporarily to avoid duplication
ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;
ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_updated;

-- Migrate users (this will preserve UUIDs and all foreign key relationships)
DO $$
DECLARE
  user_record RECORD;
  migrated_count INTEGER := 0;
BEGIN
  -- Loop through all active users in public.users
  FOR user_record IN 
    SELECT id, email, name, role, created_at
    FROM public.users 
    WHERE status = 'active'
    ORDER BY created_at
  LOOP
    -- Check if user already exists in auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_record.id) THEN
      -- Create the auth user
      INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_user_meta_data,
        aud,
        role,
        confirmation_token
      ) VALUES (
        user_record.id,
        '00000000-0000-0000-0000-000000000000',
        user_record.email,
        crypt('TempPass123!', gen_salt('bf')), -- Temporary password
        NOW(),
        user_record.created_at,
        NOW(),
        json_build_object('full_name', user_record.name, 'role', user_record.role)::jsonb,
        'authenticated',
        'authenticated',
        encode(gen_random_bytes(32), 'hex')
      );
      
      migrated_count := migrated_count + 1;
      RAISE NOTICE 'Migrated user: % (%), ID: %', user_record.name, user_record.email, user_record.id;
    ELSE
      RAISE NOTICE 'User already exists in auth.users: % (%), ID: %', user_record.name, user_record.email, user_record.id;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Migration completed. Total users migrated: %', migrated_count;
END $$;

-- Step 3: Re-enable triggers
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_updated;

-- Step 4: Update public.users to link to auth.users
UPDATE public.users 
SET auth_user_id = id 
WHERE auth_user_id IS NULL AND id IN (SELECT id FROM auth.users);

-- Step 5: Add foreign key constraint now that migration is complete
DO $$
BEGIN
    -- Check if constraint doesn't exist before adding
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'users_auth_user_id_fkey' 
                   AND table_name = 'users' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.users 
        ADD CONSTRAINT users_auth_user_id_fkey 
        FOREIGN KEY (auth_user_id) REFERENCES auth.users(id);
    END IF;
END $$;

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_public_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth.users(email);

-- Step 7: Clean up temporary function
DROP FUNCTION IF EXISTS migrate_user_to_auth(UUID, TEXT, TEXT, TEXT);

-- Step 8: Verification queries
-- Run these to verify the migration was successful:

-- Count of users in both tables
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

-- Check for any orphaned records
SELECT 
  'Orphaned public.users' as issue,
  COUNT(*) as count
FROM public.users pu 
WHERE NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = pu.id)
AND pu.status = 'active'
UNION ALL
SELECT 
  'Orphaned auth.users' as issue,
  COUNT(*) as count
FROM auth.users au 
WHERE NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = au.id);

-- List all migrated users for verification
SELECT 
  au.id,
  au.email as auth_email,
  pu.email as public_email,
  pu.name,
  pu.role,
  pu.status,
  au.email_confirmed_at,
  au.created_at as auth_created
FROM auth.users au
JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at;

-- Final notices about migration completion
DO $$
BEGIN
  RAISE NOTICE '=== MIGRATION COMPLETED ===';
  RAISE NOTICE 'Important: All users now have temporary password "TempPass123!"';
  RAISE NOTICE 'Users must reset their passwords on first login.';
  RAISE NOTICE 'Run the verification queries above to ensure migration success.';
END $$;