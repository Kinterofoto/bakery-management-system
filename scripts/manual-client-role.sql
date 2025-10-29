-- ============================================
-- APPLY THIS SQL IN SUPABASE SQL EDITOR
-- ============================================
-- Add client role to users table
-- This role is for e-commerce customers with limited access

-- Step 1: Drop existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Step 2: Add new constraint with 'client' role
ALTER TABLE users
ADD CONSTRAINT users_role_check
CHECK (role IN ('admin', 'reviewer_area1', 'reviewer_area2', 'dispatcher', 'driver', 'commercial', 'client'));

-- Step 3: Add ecommerce permission to all existing users
UPDATE users
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{ecommerce}',
  'false'
)
WHERE permissions IS NULL OR NOT (permissions ? 'ecommerce');

-- Step 4: Add comments
COMMENT ON COLUMN users.role IS 'User role: admin, reviewer_area1, reviewer_area2, dispatcher, driver, commercial, client';
COMMENT ON COLUMN users.permissions IS 'User permissions: crm, users, orders, inventory, production, plan_master, nucleo, ecommerce';

-- Step 5: Verify the changes
SELECT
  'Constraint added' as status,
  constraint_name,
  check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'users_role_check';

-- Show sample users with new ecommerce permission
SELECT
  id,
  email,
  name,
  role,
  permissions->'ecommerce' as has_ecommerce_permission
FROM users
LIMIT 5;
