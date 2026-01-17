-- Add company_id column to users table to link client users to a company
ALTER TABLE users
ADD COLUMN company_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_users_company_id ON users(company_id);

-- Add comment for documentation
COMMENT ON COLUMN users.company_id IS 'Links client role users to their company (clients table). Used to determine which client the user can create orders for.';
