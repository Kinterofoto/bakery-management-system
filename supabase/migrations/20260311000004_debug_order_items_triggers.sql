-- Debug: check trigger state and force enable
-- First enable all triggers on order_items
ALTER TABLE order_items ENABLE ALWAYS TRIGGER order_items_audit_after_trigger;
ALTER TABLE order_items ENABLE ALWAYS TRIGGER order_items_audit_before_trigger;
