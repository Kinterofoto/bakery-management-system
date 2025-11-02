-- Add NIT field to clients table
-- Script 32: Add NIT field for client identification

-- Add NIT column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS nit VARCHAR(20);

-- Create index for better performance when searching by NIT
CREATE INDEX IF NOT EXISTS idx_clients_nit ON clients(nit);

-- Add comment to document the purpose
COMMENT ON COLUMN clients.nit IS 'Número de Identificación Tributaria del cliente';

-- Print completion message
DO $$
BEGIN
    RAISE NOTICE 'NIT field added to clients table successfully';
    RAISE NOTICE '• Added nit column to clients table';
    RAISE NOTICE '• Created index for better NIT search performance';
END $$;