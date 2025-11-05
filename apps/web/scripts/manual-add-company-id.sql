-- Script para agregar company_id a la tabla users
-- Ejecutar manualmente en Supabase Dashboard SQL Editor

-- Add company_id column to users table to link client users to a company
ALTER TABLE users
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);

-- Add comment for documentation
COMMENT ON COLUMN users.company_id IS 'Links client role users to their company (clients table). Used to determine which client the user can create orders for.';

-- Mensaje de confirmación
SELECT 'company_id column added successfully to users table' AS message;
