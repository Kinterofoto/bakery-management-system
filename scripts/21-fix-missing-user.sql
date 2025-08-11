-- Fix the missing user in public.users

-- Create the missing public.users record from auth.users data
INSERT INTO public.users (id, email, name, role, permissions, status, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', au.email) as name,
  'commercial' as role,
  '{"crm": true, "users": false, "orders": true, "inventory": true}'::jsonb as permissions,
  'active' as status,
  au.created_at,
  NOW() as updated_at
FROM auth.users au
WHERE au.id = 'e242d7e1-836b-46e7-9c8f-ff44989484da'
AND NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = au.id);

-- Verify the user was created
SELECT 
    'FIXED USER' as result,
    id,
    email,
    name,
    role,
    status,
    permissions
FROM public.users 
WHERE id = 'e242d7e1-836b-46e7-9c8f-ff44989484da';

-- Update auth_user_id mapping
UPDATE public.users 
SET auth_user_id = id 
WHERE id = 'e242d7e1-836b-46e7-9c8f-ff44989484da' AND auth_user_id IS NULL;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ User fixed in public.users';
    RAISE NOTICE '🎯 Try logging in again - it should work now!';
END $$;