-- Add audit columns to routes table
-- Script 40: Enable tracking of who creates and modifies routes

-- Add created_by and updated_by columns
ALTER TABLE routes ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
ALTER TABLE routes ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_routes_created_by ON routes(created_by);
CREATE INDEX IF NOT EXISTS idx_routes_updated_by ON routes(updated_by);

-- Update existing routes to have a default creator (first admin user)
-- This is a one-time migration for existing data
UPDATE routes
SET created_by = (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
WHERE created_by IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN routes.created_by IS 'Usuario que creó la ruta';
COMMENT ON COLUMN routes.updated_by IS 'Usuario que modificó la ruta por última vez';

-- Print completion message
DO $$
BEGIN
    RAISE NOTICE '✓ Columnas de auditoría agregadas a tabla routes';
    RAISE NOTICE '✓ Índices creados para mejor performance';
    RAISE NOTICE '✓ Rutas existentes actualizadas con usuario por defecto';
END $$;
