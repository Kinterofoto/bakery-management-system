-- Fix audit trigger timing for DELETE operations
-- The issue: AFTER DELETE trigger tries to insert a reference to an already deleted record
-- Solution: Change to BEFORE DELETE so the record still exists when audit is inserted

-- Drop the existing trigger
DROP TRIGGER IF EXISTS audit_order_items_changes_trigger ON order_items;

-- Recreate the trigger as BEFORE DELETE (instead of AFTER)
CREATE TRIGGER audit_order_items_changes_trigger
BEFORE INSERT OR UPDATE OR DELETE ON order_items
FOR EACH ROW EXECUTE FUNCTION audit_order_items_changes();
