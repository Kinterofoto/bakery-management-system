-- Add access_token column to suppliers table for portal access
ALTER TABLE compras.suppliers
ADD COLUMN IF NOT EXISTS access_token VARCHAR(255) UNIQUE;

-- Create index for faster lookups by token
CREATE INDEX IF NOT EXISTS idx_suppliers_access_token
ON compras.suppliers(access_token)
WHERE access_token IS NOT NULL;

-- Function to generate a unique access token
CREATE OR REPLACE FUNCTION compras.generate_supplier_token()
RETURNS VARCHAR AS $$
DECLARE
  new_token VARCHAR;
  token_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a random token (using UUID and encoding to remove dashes)
    new_token := encode(gen_random_bytes(32), 'base64');
    -- Remove special characters that might cause URL issues
    new_token := REPLACE(REPLACE(REPLACE(new_token, '+', ''), '/', ''), '=', '');
    new_token := SUBSTRING(new_token, 1, 40);

    -- Check if token already exists
    SELECT EXISTS(SELECT 1 FROM compras.suppliers WHERE access_token = new_token) INTO token_exists;

    -- If token doesn't exist, exit loop
    IF NOT token_exists THEN
      EXIT;
    END IF;
  END LOOP;

  RETURN new_token;
END;
$$ LANGUAGE plpgsql;

-- Update existing suppliers with tokens
UPDATE compras.suppliers
SET access_token = compras.generate_supplier_token()
WHERE access_token IS NULL;

-- Create trigger to automatically generate token for new suppliers
CREATE OR REPLACE FUNCTION compras.set_supplier_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.access_token IS NULL THEN
    NEW.access_token := compras.generate_supplier_token();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_supplier_token ON compras.suppliers;
CREATE TRIGGER trigger_set_supplier_token
  BEFORE INSERT ON compras.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION compras.set_supplier_token();

-- Grant permissions for anonymous users to access supplier by token (read-only)
-- This is needed for the supplier portal
CREATE POLICY "Allow suppliers to view their own data via token"
  ON compras.suppliers
  FOR SELECT
  USING (true); -- We'll validate the token in the application layer

COMMENT ON COLUMN compras.suppliers.access_token IS 'Unique access token for supplier portal access. Automatically generated on insert.';
