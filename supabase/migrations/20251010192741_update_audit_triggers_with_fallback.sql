-- Update audit triggers to include user fallback from related order
-- This fixes the issue where changed_by was NULL for order_items and order_item_deliveries

-- 1. Update order_items_audit trigger function
CREATE OR REPLACE FUNCTION audit_order_items_changes()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id UUID;
    current_ip INET;
    current_user_agent TEXT;
    related_order_id UUID;
BEGIN
    -- Get current user from session variable (set by application)
    BEGIN
        current_user_id := current_setting('app.current_user_id', true)::UUID;
    EXCEPTION WHEN OTHERS THEN
        current_user_id := NULL;
    END;

    -- Try to get IP address from session
    BEGIN
        current_ip := current_setting('app.client_ip', true)::INET;
    EXCEPTION WHEN OTHERS THEN
        current_ip := NULL;
    END;

    -- Try to get user agent from session
    BEGIN
        current_user_agent := current_setting('app.user_agent', true);
    EXCEPTION WHEN OTHERS THEN
        current_user_agent := NULL;
    END;

    -- Get related order_id
    IF TG_OP = 'DELETE' THEN
        related_order_id := OLD.order_id;
    ELSE
        related_order_id := NEW.order_id;
    END IF;

    -- If user not in session, try to get from related order
    IF current_user_id IS NULL AND related_order_id IS NOT NULL THEN
        SELECT created_by INTO current_user_id FROM orders WHERE id = related_order_id;
    END IF;

    -- Handle INSERT operation
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO order_items_audit (
            order_item_id,
            order_id,
            action,
            new_data,
            changed_by,
            ip_address,
            user_agent
        )
        VALUES (
            NEW.id,
            related_order_id,
            'INSERT',
            row_to_json(NEW)::JSONB,
            current_user_id,
            current_ip,
            current_user_agent
        );
        RETURN NEW;

    -- Handle UPDATE operation
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Only log if something actually changed
        IF row_to_json(OLD)::JSONB != row_to_json(NEW)::JSONB THEN
            INSERT INTO order_items_audit (
                order_item_id,
                order_id,
                action,
                old_data,
                new_data,
                changed_by,
                ip_address,
                user_agent
            )
            VALUES (
                NEW.id,
                related_order_id,
                'UPDATE',
                row_to_json(OLD)::JSONB,
                row_to_json(NEW)::JSONB,
                current_user_id,
                current_ip,
                current_user_agent
            );
        END IF;
        RETURN NEW;

    -- Handle DELETE operation
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO order_items_audit (
            order_item_id,
            order_id,
            action,
            old_data,
            changed_by,
            ip_address,
            user_agent
        )
        VALUES (
            OLD.id,
            related_order_id,
            'DELETE',
            row_to_json(OLD)::JSONB,
            current_user_id,
            current_ip,
            current_user_agent
        );
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update order_item_deliveries_audit trigger function
CREATE OR REPLACE FUNCTION audit_order_item_deliveries_changes()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id UUID;
    current_ip INET;
    current_user_agent TEXT;
    related_order_id UUID;
    related_order_item_id UUID;
BEGIN
    -- Get current user from session variable (set by application)
    BEGIN
        current_user_id := current_setting('app.current_user_id', true)::UUID;
    EXCEPTION WHEN OTHERS THEN
        current_user_id := NULL;
    END;

    -- Try to get IP address from session
    BEGIN
        current_ip := current_setting('app.client_ip', true)::INET;
    EXCEPTION WHEN OTHERS THEN
        current_ip := NULL;
    END;

    -- Try to get user agent from session
    BEGIN
        current_user_agent := current_setting('app.user_agent', true);
    EXCEPTION WHEN OTHERS THEN
        current_user_agent := NULL;
    END;

    -- Get related order_item_id and order_id
    IF TG_OP = 'DELETE' THEN
        related_order_item_id := OLD.order_item_id;
        -- Get order_id from order_items
        SELECT order_id INTO related_order_id FROM order_items WHERE id = OLD.order_item_id;
    ELSE
        related_order_item_id := NEW.order_item_id;
        -- Get order_id from order_items
        SELECT order_id INTO related_order_id FROM order_items WHERE id = NEW.order_item_id;
    END IF;

    -- If user not in session, try to get from related order
    IF current_user_id IS NULL AND related_order_id IS NOT NULL THEN
        SELECT created_by INTO current_user_id FROM orders WHERE id = related_order_id;
    END IF;

    -- Handle INSERT operation
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO order_item_deliveries_audit (
            delivery_id,
            order_item_id,
            order_id,
            action,
            new_data,
            changed_by,
            ip_address,
            user_agent
        )
        VALUES (
            NEW.id,
            related_order_item_id,
            related_order_id,
            'INSERT',
            row_to_json(NEW)::JSONB,
            current_user_id,
            current_ip,
            current_user_agent
        );
        RETURN NEW;

    -- Handle UPDATE operation
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Only log if something actually changed
        IF row_to_json(OLD)::JSONB != row_to_json(NEW)::JSONB THEN
            INSERT INTO order_item_deliveries_audit (
                delivery_id,
                order_item_id,
                order_id,
                action,
                old_data,
                new_data,
                changed_by,
                ip_address,
                user_agent
            )
            VALUES (
                NEW.id,
                related_order_item_id,
                related_order_id,
                'UPDATE',
                row_to_json(OLD)::JSONB,
                row_to_json(NEW)::JSONB,
                current_user_id,
                current_ip,
                current_user_agent
            );
        END IF;
        RETURN NEW;

    -- Handle DELETE operation
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO order_item_deliveries_audit (
            delivery_id,
            order_item_id,
            order_id,
            action,
            old_data,
            changed_by,
            ip_address,
            user_agent
        )
        VALUES (
            OLD.id,
            related_order_item_id,
            related_order_id,
            'DELETE',
            row_to_json(OLD)::JSONB,
            current_user_id,
            current_ip,
            current_user_agent
        );
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Print completion message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '';
    RAISE NOTICE ' Audit triggers updated with user fallback';
    RAISE NOTICE '';
    RAISE NOTICE '';
    RAISE NOTICE 'Changes:';
    RAISE NOTICE '   order_items audit now falls back to order.created_by';
    RAISE NOTICE '   order_item_deliveries audit now falls back to order.created_by';
    RAISE NOTICE '';
    RAISE NOTICE 'This ensures that even if session context is not set,';
    RAISE NOTICE 'the user will be captured from the related order record.';
    RAISE NOTICE '';
END $$;
