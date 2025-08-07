-- Create branches (sucursales) table
-- This table will store the different branches that clients can have

CREATE TABLE IF NOT EXISTS branches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  contact_person VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  is_main BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add branch_id column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_branches_client_id ON branches(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_branch_id ON orders(branch_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists, then create it
DROP TRIGGER IF EXISTS update_branches_updated_at ON branches;
CREATE TRIGGER update_branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert a default branch for existing clients without branches
INSERT INTO branches (client_id, name, address, contact_person, phone, email, is_main)
SELECT 
  id,
  name || ' - Sucursal Principal',
  address,
  contact_person,
  phone,
  email,
  TRUE
FROM clients
WHERE id NOT IN (SELECT DISTINCT client_id FROM branches WHERE client_id IS NOT NULL);