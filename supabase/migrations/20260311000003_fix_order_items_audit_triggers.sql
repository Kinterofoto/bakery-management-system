-- Fix: drop and recreate order_items audit triggers
-- The existing triggers may be in an inconsistent state

-- Drop all existing audit triggers on order_items
DROP TRIGGER IF EXISTS audit_order_items_changes_trigger ON order_items;
DROP TRIGGER IF EXISTS order_items_audit_after_trigger ON order_items;
DROP TRIGGER IF EXISTS order_items_audit_before_trigger ON order_items;

-- Recreate: AFTER INSERT/UPDATE and BEFORE DELETE
CREATE TRIGGER order_items_audit_after_trigger
    AFTER INSERT OR UPDATE ON public.order_items
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_order_items_changes();

CREATE TRIGGER order_items_audit_before_trigger
    BEFORE DELETE ON public.order_items
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_order_items_changes();
