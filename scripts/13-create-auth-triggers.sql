-- Create auth trigger functions to sync auth.users with public.users
-- This script creates the missing trigger functions referenced in the system

-- Function to handle new user creation
-- When a user is created in auth.users, create corresponding record in public.users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, permissions, status, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), -- Use full_name from metadata or email as fallback
    'commercial', -- Default role, can be changed by admin later
    '{"crm": false, "users": false, "orders": false, "inventory": false}'::jsonb, -- Default permissions
    'active',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle user updates
-- When auth.users is updated, sync relevant fields to public.users
CREATE OR REPLACE FUNCTION handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update email and name if they changed
  UPDATE public.users
  SET 
    email = NEW.email,
    name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    updated_at = NOW()
  WHERE id = NEW.id;
  
  -- Update last_login if last_sign_in_at changed
  IF OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at AND NEW.last_sign_in_at IS NOT NULL THEN
    UPDATE public.users
    SET last_login = NEW.last_sign_in_at
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle user deletion
-- When a user is deleted from auth.users, update status in public.users
CREATE OR REPLACE FUNCTION handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Instead of deleting, mark as inactive to preserve referential integrity
  UPDATE public.users
  SET 
    status = 'inactive',
    updated_at = NOW()
  WHERE id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers (they should already exist based on the system info provided)
-- But we'll recreate them to ensure they work with our functions

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_user_update();

DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_user_delete();

-- Add any missing columns to public.users that might be needed
-- Check if auth_user_id column exists, if not add it (without foreign key constraint for now)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'auth_user_id') THEN
        -- Add column without foreign key constraint first
        ALTER TABLE public.users ADD COLUMN auth_user_id UUID;
        -- Set auth_user_id to id for existing records (they will be migrated later)
        UPDATE public.users SET auth_user_id = id;
        -- We'll add the foreign key constraint after migration in script 14
    END IF;
END $$;

-- Grant necessary permissions for the trigger functions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON public.users TO supabase_auth_admin;