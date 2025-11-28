-- Add inventory_adjustment permission to users table
-- This permission controls access to the inventory adjustment feature

-- Add inventory_adjustment permission to the permissions jsonb column comment
COMMENT ON COLUMN users.permissions IS 'User permissions: crm, users, orders, inventory, production, plan_master, nucleo, ecommerce, inventory_adjustment';

-- Update admin users to have inventory_adjustment permission
UPDATE users
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{inventory_adjustment}',
  'true'::jsonb
)
WHERE role = 'administrator'
AND (permissions IS NULL OR NOT permissions ? 'inventory_adjustment');
