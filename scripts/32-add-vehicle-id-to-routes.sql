-- Add vehicle_id column to routes table
ALTER TABLE routes ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES vehicles(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_routes_vehicle_id ON routes(vehicle_id);