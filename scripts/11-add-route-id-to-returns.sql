-- Add missing route_id column to returns table
ALTER TABLE returns ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES routes(id);

-- Add index for better performance on route_id queries
CREATE INDEX IF NOT EXISTS idx_returns_route_id ON returns(route_id) WHERE route_id IS NOT NULL;