-- Add recepcion_pt permission to users table
-- This permission controls access to the Recepción PT (finished product reception) module

-- Update the permissions column comment to include recepcion_pt
COMMENT ON COLUMN users.permissions IS 'User permissions: crm, users, orders, inventory, production, plan_master, nucleo, ecommerce, inventory_adjustment, compras, kardex, store_visits, recepcion_pt';

-- Update super_admin users to have recepcion_pt permission
UPDATE users
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{recepcion_pt}',
  'true'::jsonb
)
WHERE role = 'super_admin'
AND (permissions IS NULL OR NOT permissions ? 'recepcion_pt');

-- Update administrator users to have recepcion_pt permission
UPDATE users
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{recepcion_pt}',
  'true'::jsonb
)
WHERE role = 'administrator'
AND (permissions IS NULL OR NOT permissions ? 'recepcion_pt');
