-- Migration: Refactor Billing and Dispatch Separation
-- Date: 2025-10-23
-- Description: Makes driver_id and vehicle_id optional in routes table,
--              adds route_name auto-generation support, and prepares system
--              for independent billing and dispatch processes

-- 1. Make driver_id and vehicle_id nullable in routes table
ALTER TABLE routes
ALTER COLUMN driver_id DROP NOT NULL,
ALTER COLUMN vehicle_id DROP NOT NULL;

-- 2. Add route_name column if it doesn't exist (for auto-generated names)
ALTER TABLE routes
ADD COLUMN IF NOT EXISTS route_name VARCHAR(255);

-- 3. Add comment to document the change
COMMENT ON COLUMN routes.driver_id IS 'Driver assigned to route (optional, can be assigned later)';
COMMENT ON COLUMN routes.vehicle_id IS 'Vehicle assigned to route (optional, can be assigned later)';
COMMENT ON COLUMN routes.route_name IS 'Auto-generated route name based on date and sequence';

-- 4. Update existing routes with auto-generated names if they don't have one
UPDATE routes
SET route_name = 'Ruta ' || TO_CHAR(route_date, 'YYYY-MM-DD') || ' #' || route_number
WHERE route_name IS NULL OR route_name = '';

-- 5. Create index for route_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_routes_route_name ON routes(route_name);

-- 6. Add system config for route name generation
INSERT INTO system_config (config_key, config_value, description)
VALUES
    ('route_name_format', 'Ruta {date} #{number}', 'Formato para nombres auto-generados de rutas')
ON CONFLICT (config_key) DO NOTHING;
