-- Add vehicle_id column to routes table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'routes' 
                   AND column_name = 'vehicle_id') THEN
        ALTER TABLE routes ADD COLUMN vehicle_id UUID REFERENCES vehicles(id);
    END IF;
END $$;

-- Optional: Update existing routes with vehicle assignments based on driver names
-- This is just a helper for existing data - you can skip this if you have no existing routes
/*
UPDATE routes 
SET vehicle_id = (
    SELECT v.id 
    FROM vehicles v 
    WHERE v.driver_name = (
        SELECT u.name 
        FROM users u 
        WHERE u.id = routes.driver_id
    )
    LIMIT 1
)
WHERE vehicle_id IS NULL;
*/