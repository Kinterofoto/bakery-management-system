-- Restore the BEFORE DELETE trigger on order_items for audit logging
-- The trigger was lost when audit_order_items_changes_trigger was dropped
-- and order_items_audit_before_trigger may no longer exist

-- Recreate the BEFORE DELETE trigger
CREATE OR REPLACE TRIGGER order_items_audit_before_trigger
    BEFORE DELETE ON public.order_items
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_order_items_changes();
