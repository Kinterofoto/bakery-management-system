-- Test if audit context is working

-- 1. First, set the audit context manually
SELECT set_audit_context('app.current_user_id', 'test-user-id-123', true);

-- 2. Try to read it back
SELECT current_setting('app.current_user_id', true) as current_user_from_session;

-- 3. Check the audit trigger functions source code
SELECT
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_name IN ('audit_orders_changes', 'audit_order_items_changes', 'audit_order_item_deliveries_changes')
AND routine_schema = 'public'
ORDER BY routine_name;
