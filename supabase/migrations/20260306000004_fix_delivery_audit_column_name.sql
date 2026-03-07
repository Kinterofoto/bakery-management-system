-- Fix: audit_order_item_deliveries_changes() uses "order_item_delivery_id"
-- but the table column is "delivery_id". Migration 20260305000001 introduced
-- this mismatch, breaking the delivery completion flow.

CREATE OR REPLACE FUNCTION public.audit_order_item_deliveries_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    current_user_id UUID;
    current_ip INET;
    current_user_agent TEXT;
    related_order_id UUID;
    related_order_item_id UUID;
BEGIN
    BEGIN
        current_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        current_user_id := NULL;
    END;

    IF current_user_id IS NULL THEN
        BEGIN
            current_user_id := current_setting('app.current_user_id', true)::UUID;
        EXCEPTION WHEN OTHERS THEN
            current_user_id := NULL;
        END;
    END IF;

    BEGIN
        current_ip := current_setting('app.client_ip', true)::INET;
    EXCEPTION WHEN OTHERS THEN
        current_ip := NULL;
    END;

    BEGIN
        current_user_agent := current_setting('app.user_agent', true);
    EXCEPTION WHEN OTHERS THEN
        current_user_agent := NULL;
    END;

    IF TG_OP = 'DELETE' THEN
        related_order_item_id := OLD.order_item_id;
        SELECT order_id INTO related_order_id FROM order_items WHERE id = OLD.order_item_id;
    ELSE
        related_order_item_id := NEW.order_item_id;
        SELECT order_id INTO related_order_id FROM order_items WHERE id = NEW.order_item_id;
    END IF;

    IF (TG_OP = 'INSERT') THEN
        INSERT INTO order_item_deliveries_audit (
            delivery_id, order_item_id, order_id, action, new_data,
            changed_by, ip_address, user_agent
        ) VALUES (
            NEW.id, related_order_item_id, related_order_id, 'INSERT',
            row_to_json(NEW)::JSONB,
            current_user_id, current_ip, current_user_agent
        );
        RETURN NEW;
    END IF;

    IF (TG_OP = 'UPDATE') THEN
        INSERT INTO order_item_deliveries_audit (
            delivery_id, order_item_id, order_id, action, old_data, new_data,
            changed_by, ip_address, user_agent
        ) VALUES (
            NEW.id, related_order_item_id, related_order_id, 'UPDATE',
            row_to_json(OLD)::JSONB, row_to_json(NEW)::JSONB,
            current_user_id, current_ip, current_user_agent
        );
        RETURN NEW;
    END IF;

    IF (TG_OP = 'DELETE') THEN
        INSERT INTO order_item_deliveries_audit (
            delivery_id, order_item_id, order_id, action, old_data,
            changed_by, ip_address, user_agent
        ) VALUES (
            OLD.id, related_order_item_id, related_order_id, 'DELETE',
            row_to_json(OLD)::JSONB,
            current_user_id, current_ip, current_user_agent
        );
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;
