-- Temporary migration to delete test orders #002014 and #002015
-- These were created during audit integration testing

-- Disable audit triggers to avoid FK circular dependency on delete
ALTER TABLE orders DISABLE TRIGGER orders_audit_trigger;
ALTER TABLE order_items DISABLE TRIGGER order_items_audit_after_trigger;
ALTER TABLE order_items DISABLE TRIGGER order_items_audit_before_trigger;

-- Delete all related data for both test orders
DO $$
DECLARE
    order_ids UUID[] := ARRAY[
        'fc825451-9ec3-437c-9f17-039d849f2ee4'::UUID,
        '76be7724-30ae-42c7-a6f6-e216274ccc8e'::UUID
    ];
    oid UUID;
    item_ids UUID[];
BEGIN
    FOREACH oid IN ARRAY order_ids LOOP
        -- Get item IDs for this order
        SELECT ARRAY_AGG(id) INTO item_ids FROM order_items WHERE order_id = oid;

        -- Delete audit entries
        DELETE FROM order_item_deliveries_audit WHERE order_id = oid;
        DELETE FROM order_items_audit WHERE order_id = oid;
        DELETE FROM orders_audit WHERE order_id = oid;

        -- Delete events
        DELETE FROM order_events WHERE order_id = oid;

        -- Delete deliveries for items
        IF item_ids IS NOT NULL THEN
            DELETE FROM order_item_deliveries WHERE order_item_id = ANY(item_ids);
        END IF;

        -- Delete items
        DELETE FROM order_items WHERE order_id = oid;

        -- Delete order
        DELETE FROM orders WHERE id = oid;

        RAISE NOTICE 'Deleted order %', oid;
    END LOOP;
END;
$$;

-- Re-enable triggers
ALTER TABLE orders ENABLE TRIGGER orders_audit_trigger;
ALTER TABLE order_items ENABLE TRIGGER order_items_audit_after_trigger;
ALTER TABLE order_items ENABLE TRIGGER order_items_audit_before_trigger;
