-- Add client role to users table
-- This role is for e-commerce customers with limited access

-- Add 'client' to the role enum
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
ADD CONSTRAINT users_role_check
CHECK (role IN ('admin', 'reviewer_area1', 'reviewer_area2', 'dispatcher', 'driver', 'commercial', 'client'));

-- Add ecommerce permission to permissions jsonb
-- Update existing users to have ecommerce: false by default
UPDATE users
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{ecommerce}',
  'false'
)
WHERE permissions IS NULL OR NOT permissions ? 'ecommerce';

COMMENT ON COLUMN users.role IS 'User role: admin, reviewer_area1, reviewer_area2, dispatcher, driver, commercial, client';
COMMENT ON COLUMN users.permissions IS 'User permissions: crm, users, orders, inventory, production, plan_master, nucleo, ecommerce';
