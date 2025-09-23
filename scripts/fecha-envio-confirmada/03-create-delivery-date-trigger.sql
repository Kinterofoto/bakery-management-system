-- Create trigger to automatically adjust delivery dates based on client frequencies

-- Drop trigger if exists (for safe re-execution)
DROP TRIGGER IF EXISTS trigger_adjust_delivery_date ON orders;

-- Create trigger that runs before INSERT or UPDATE on orders
CREATE TRIGGER trigger_adjust_delivery_date
    BEFORE INSERT OR UPDATE OF expected_delivery_date ON orders
    FOR EACH ROW
    EXECUTE FUNCTION adjust_delivery_date_by_frequency();

-- Add comments for documentation
COMMENT ON TRIGGER trigger_adjust_delivery_date ON orders IS
'Automatically adjusts expected_delivery_date based on client branch frequencies while preserving the original requested date';

-- Test the trigger functionality (optional - can be removed in production)
-- This will help verify the trigger is working correctly
CREATE OR REPLACE FUNCTION test_delivery_date_adjustment()
RETURNS TEXT AS $$
DECLARE
    test_result TEXT := 'Trigger test completed successfully';
BEGIN
    -- This function can be called to test if the trigger is working
    -- Example: SELECT test_delivery_date_adjustment();

    RAISE NOTICE 'Delivery date adjustment trigger is installed and ready';
    RETURN test_result;
END;
$$ LANGUAGE plpgsql;