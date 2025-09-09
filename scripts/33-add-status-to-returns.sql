-- Add status column to returns table
-- This allows us to track whether returns are pending, accepted, or rejected

ALTER TABLE returns 
ADD COLUMN status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected'));

-- Update existing returns to have pending status
UPDATE returns 
SET status = 'pending' 
WHERE status IS NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);

-- Add index for filtering by route and status
CREATE INDEX IF NOT EXISTS idx_returns_route_status ON returns(route_id, status);

-- Add index for filtering by product and status  
CREATE INDEX IF NOT EXISTS idx_returns_product_status ON returns(product_id, status);

-- Add timestamp for when status was changed
ALTER TABLE returns 
ADD COLUMN status_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create function to automatically update status_updated_at when status changes
CREATE OR REPLACE FUNCTION update_returns_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        NEW.status_updated_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
DROP TRIGGER IF EXISTS returns_status_timestamp_trigger ON returns;
CREATE TRIGGER returns_status_timestamp_trigger
    BEFORE UPDATE ON returns
    FOR EACH ROW
    EXECUTE FUNCTION update_returns_status_timestamp();

-- Comments for documentation
COMMENT ON COLUMN returns.status IS 'Status of the return: pending, accepted, or rejected';
COMMENT ON COLUMN returns.status_updated_at IS 'Timestamp when the status was last updated';