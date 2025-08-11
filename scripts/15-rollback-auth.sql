-- ROLLBACK script for authentication implementation
-- Use this script ONLY if you need to revert the auth changes

-- WARNING: This will remove all auth.users records and revert to the original state
-- Make sure to backup your data before running this script!

BEGIN;

-- Step 1: Drop triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

-- Step 2: Drop trigger functions
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS handle_user_update();
DROP FUNCTION IF EXISTS handle_user_delete();

-- Step 3: Remove foreign key constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_auth_user_id_fkey;

-- Step 4: Drop the auth_user_id column from public.users
ALTER TABLE public.users DROP COLUMN IF EXISTS auth_user_id;

-- Step 5: Clean up any auth.users records that were created during migration
-- (Optional - only if you want to completely clean auth.users)
-- DELETE FROM auth.users WHERE id IN (SELECT id FROM public.users);

-- Step 6: Drop indexes
DROP INDEX IF EXISTS idx_public_users_auth_user_id;
DROP INDEX IF EXISTS idx_auth_users_email;

-- Step 7: Reset permissions and status columns to original state if needed
-- (Uncomment if you want to reset to simpler structure)
-- ALTER TABLE public.users DROP COLUMN IF EXISTS permissions;
-- ALTER TABLE public.users DROP COLUMN IF EXISTS status;
-- ALTER TABLE public.users DROP COLUMN IF EXISTS last_login;

COMMIT;

RAISE NOTICE '=== ROLLBACK COMPLETED ===';
RAISE NOTICE 'Authentication system has been reverted to original state.';
RAISE NOTICE 'You may need to restart your application to clear any cached auth state.';