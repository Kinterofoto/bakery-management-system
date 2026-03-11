-- Fix: ON DELETE CASCADE on order_items_audit was deleting audit history
-- when order items were removed. Change to SET NULL to preserve audit trail.

ALTER TABLE order_items_audit
    DROP CONSTRAINT order_items_audit_order_item_id_fkey,
    ADD CONSTRAINT order_items_audit_order_item_id_fkey
        FOREIGN KEY (order_item_id) REFERENCES order_items(id)
        ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- Also fix order_item_deliveries_audit if it has the same issue
ALTER TABLE order_item_deliveries_audit
    DROP CONSTRAINT IF EXISTS order_item_deliveries_audit_order_item_delivery_id_fkey;

-- Make order_item_delivery_id nullable and remove CASCADE if exists
DO $$
BEGIN
    -- Check if the constraint exists and fix it
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'order_item_deliveries_audit_order_item_delivery_id_fkey'
        AND table_name = 'order_item_deliveries_audit'
    ) THEN
        ALTER TABLE order_item_deliveries_audit
            DROP CONSTRAINT order_item_deliveries_audit_order_item_delivery_id_fkey;
    END IF;
END $$;
