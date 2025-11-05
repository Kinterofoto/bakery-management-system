-- Fix order_items_audit DELETE conflict
-- The issue: When deleting an order_item, the AFTER DELETE trigger tries to insert
-- into order_items_audit with a reference to the deleted item, causing FK violation.
-- Solution: Change FK constraint to SET NULL on delete, preserving audit history.

-- 1. Make order_item_id nullable (required for SET NULL)
ALTER TABLE order_items_audit
ALTER COLUMN order_item_id DROP NOT NULL;

-- 2. Drop the existing foreign key constraint
ALTER TABLE order_items_audit
DROP CONSTRAINT IF EXISTS order_items_audit_order_item_id_fkey;

-- 3. Recreate the foreign key with SET NULL on delete
-- This allows audit records to persist even after the order_item is deleted
ALTER TABLE order_items_audit
ADD CONSTRAINT order_items_audit_order_item_id_fkey
FOREIGN KEY (order_item_id)
REFERENCES order_items(id)
ON DELETE SET NULL;

-- Add helpful comment
COMMENT ON COLUMN order_items_audit.order_item_id IS
'Reference to the order item. NULL for deleted items to preserve audit history.';
