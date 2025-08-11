-- Fix triggers that are causing 500 errors when creating users via Dashboard

-- Step 1: Check current trigger status
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table, 
    action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' 
  AND event_object_table = 'users';

-- Step 2: Temporarily disable problematic triggers to allow manual user creation
DO $$
BEGIN
    -- Disable triggers temporarily
    IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created') THEN
        EXECUTE 'ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created';
        RAISE NOTICE 'Disabled on_auth_user_created trigger';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_updated') THEN
        EXECUTE 'ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_updated';
        RAISE NOTICE 'Disabled on_auth_user_updated trigger';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_deleted') THEN
        EXECUTE 'ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_deleted';
        RAISE NOTICE 'Disabled on_auth_user_deleted trigger';
    END IF;
END $$;

-- Step 3: Create a safer version of the handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user_safe()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create public.users record if it doesn't already exist
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id OR email = NEW.email) THEN
    INSERT INTO public.users (
      id, 
      email, 
      name, 
      role, 
      permissions, 
      status, 
      created_at, 
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), 
      COALESCE(NEW.raw_user_meta_data->>'role', 'commercial'),
      COALESCE(
        (NEW.raw_user_meta_data->'permissions')::jsonb, 
        '{"crm": false, "users": false, "orders": false, "inventory": false}'::jsonb
      ),
      'active',
      COALESCE(NEW.created_at, NOW()),
      NOW()
    );
    
    RAISE NOTICE 'Created public.users record for: % (%)', NEW.email, NEW.id;
  ELSE
    RAISE NOTICE 'User already exists in public.users: % (%)', NEW.email, NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth user creation
    RAISE WARNING 'Error in handle_new_user_safe for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create safer update function
CREATE OR REPLACE FUNCTION handle_user_update_safe()
RETURNS TRIGGER AS $$
BEGIN
  -- Update public.users if record exists
  IF EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
    UPDATE public.users
    SET 
      email = NEW.email,
      name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', name),
      updated_at = NOW()
    WHERE id = NEW.id;
    
    -- Update last_login if last_sign_in_at changed
    IF OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at AND NEW.last_sign_in_at IS NOT NULL THEN
      UPDATE public.users
      SET last_login = NEW.last_sign_in_at
      WHERE id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth user update
    RAISE WARNING 'Error in handle_user_update_safe for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create safer delete function
CREATE OR REPLACE FUNCTION handle_user_delete_safe()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark user as inactive instead of deleting
  IF EXISTS (SELECT 1 FROM public.users WHERE id = OLD.id) THEN
    UPDATE public.users
    SET 
      status = 'inactive',
      updated_at = NOW()
    WHERE id = OLD.id;
  END IF;
  
  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth user deletion
    RAISE WARNING 'Error in handle_user_delete_safe for %: %', OLD.email, SQLERRM;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Instructions for next steps
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== TRIGGERS TEMPORARILY DISABLED ===';
    RAISE NOTICE 'You can now create users in the Supabase Dashboard without 500 errors';
    RAISE NOTICE '';
    RAISE NOTICE '=== NEXT STEPS ===';
    RAISE NOTICE '1. Go to Supabase Dashboard > Authentication > Users';
    RAISE NOTICE '2. Create users manually with email and password TempPass123!';
    RAISE NOTICE '3. After creating all users, run script 17-enable-safe-triggers.sql';
    RAISE NOTICE '';
    RAISE NOTICE '=== WHAT WE FIXED ===';
    RAISE NOTICE '- Disabled problematic triggers causing 500 errors';
    RAISE NOTICE '- Created safer trigger functions with error handling';
    RAISE NOTICE '- Added checks to prevent duplicate user creation';
    RAISE NOTICE '';
END $$;

-- Step 7: Show users that need to be created manually
SELECT 
    email,
    name,
    role,
    'TempPass123!' as password,
    'Create manually in Dashboard' as action
FROM user_migration_instructions
WHERE migration_status = 'pending'
ORDER BY email;