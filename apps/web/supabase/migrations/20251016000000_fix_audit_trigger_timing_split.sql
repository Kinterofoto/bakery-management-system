-- Fix Order Items Audit Trigger Timing
-- This migration resolves FK violation conflicts by using appropriate trigger timing:
-- - AFTER INSERT/UPDATE: Row exists in table, FK reference is valid (fixes n8n automation)
-- - BEFORE DELETE: Row still exists, can be audited before deletion (fixes app deletions)

-- 1. Drop both existing triggers
DROP TRIGGER IF EXISTS audit_order_items_changes_trigger ON order_items;
DROP TRIGGER IF EXISTS order_items_audit_trigger ON order_items;

-- 2. Create AFTER trigger for INSERT and UPDATE operations
-- These operations need AFTER timing so the row exists in order_items table
-- before we try to create an audit record with FK reference to it
CREATE TRIGGER order_items_audit_after_trigger
    AFTER INSERT OR UPDATE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION audit_order_items_changes();

-- 3. Create BEFORE trigger for DELETE operations
-- DELETE operations need BEFORE timing so we can audit the row
-- while it still exists in the table
CREATE TRIGGER order_items_audit_before_trigger
    BEFORE DELETE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION audit_order_items_changes();

-- Print completion message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '✓ Audit triggers timing fixed';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '';
    RAISE NOTICE 'Changes applied:';
    RAISE NOTICE '  ✓ AFTER INSERT/UPDATE trigger - fixes n8n automation';
    RAISE NOTICE '  ✓ BEFORE DELETE trigger - fixes app deletions';
    RAISE NOTICE '  ✓ Removed duplicate triggers';
    RAISE NOTICE '';
END $$;
