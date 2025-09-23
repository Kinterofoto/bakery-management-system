-- Add requested_delivery_date field to orders table
-- This field will store the original delivery date requested before frequency adjustment

ALTER TABLE orders ADD COLUMN IF NOT EXISTS requested_delivery_date DATE;

-- Add comment to explain the field purpose
COMMENT ON COLUMN orders.requested_delivery_date IS 'Original delivery date requested before automatic adjustment based on client frequency';
COMMENT ON COLUMN orders.expected_delivery_date IS 'Confirmed delivery date after adjustment based on client frequency (if applicable)';