-- ============================================
-- FIX CLIENT ROLE MIGRATION
-- ============================================

-- Step 1: Check what roles currently exist
SELECT DISTINCT role, COUNT(*) as count
FROM users
GROUP BY role
ORDER BY role;

-- Step 2: Drop existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Step 3: Add new constraint with ALL existing roles plus 'client'
-- Based on the codebase, the roles should be:
ALTER TABLE users
ADD CONSTRAINT users_role_check
CHECK (role IN (
  'admin',
  'administrator',
  'coordinador_logistico',
  'commercial',
  'reviewer',
  'reviewer_area1',
  'reviewer_area2',
  'dispatcher',
  'driver',
  'client'
));

-- Step 4: Add ecommerce permission to all existing users
UPDATE users
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{ecommerce}',
  'false'
)
WHERE permissions IS NULL OR NOT (permissions ? 'ecommerce');

-- Step 5: Add comments
COMMENT ON COLUMN users.role IS 'User role: admin, administrator, coordinador_logistico, commercial, reviewer, reviewer_area1, reviewer_area2, dispatcher, driver, client';
COMMENT ON COLUMN users.permissions IS 'User permissions: crm, users, orders, inventory, production, plan_master, nucleo, ecommerce';

-- Step 6: Verify the changes
SELECT
  'Constraint updated' as status,
  constraint_name,
  check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'users_role_check';

-- Show all users with their roles and ecommerce permission
SELECT
  id,
  email,
  name,
  role,
  permissions->'ecommerce' as has_ecommerce_permission
FROM users
ORDER BY role;
