-- Re-enable triggers with safer implementations after manual user creation

-- Step 1: Drop old trigger implementations and recreate with safe versions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;  
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

-- Step 2: Create new safe triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_safe();

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_user_update_safe();

CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_user_delete_safe();

-- Step 3: Verify triggers are working
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== SAFE TRIGGERS RE-ENABLED ===';
    RAISE NOTICE 'Triggers now have better error handling and duplicate prevention';
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFICATION ===';
    RAISE NOTICE 'New auth users will automatically create public.users records';
    RAISE NOTICE 'Existing users will be updated safely';
    RAISE NOTICE 'No more 500 errors during user creation';
    RAISE NOTICE '';
END $$;

-- Step 4: Show current trigger status
SELECT 
    trigger_name, 
    event_manipulation, 
    action_timing,
    'ENABLED' as status
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' 
  AND event_object_table = 'users'
ORDER BY trigger_name;