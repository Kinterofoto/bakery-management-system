-- Fix Audit Triggers to Use Session Variable Instead of auth.uid()
-- auth.uid() only works in RLS policies, not in triggers
-- We need to use current_setting('app.current_user_id') which is set by the frontend

-- ============================================================================
-- 1. ACTUALIZAR FUNCIÓN DE AUDITORÍA PARA ORDER_ITEMS
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_order_items_changes()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id UUID;
    current_ip INET;
    current_user_agent TEXT;
    related_order_id UUID;
BEGIN
    -- Get current user from session variable (set by application via set_audit_context)
    BEGIN
        current_user_id := current_setting('app.current_user_id', true)::UUID;
    EXCEPTION WHEN OTHERS THEN
        current_user_id := NULL;
    END;

    -- Try to get IP address from session (optional metadata)
    BEGIN
        current_ip := current_setting('app.client_ip', true)::INET;
    EXCEPTION WHEN OTHERS THEN
        current_ip := NULL;
    END;

    -- Try to get user agent from session (optional metadata)
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

    -- Fallback: If user not in session, try to get from related order
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

-- ============================================================================
-- 2. ACTUALIZAR FUNCIÓN DE AUDITORÍA PARA ORDER_ITEM_DELIVERIES
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_order_item_deliveries_changes()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id UUID;
    current_ip INET;
    current_user_agent TEXT;
    related_order_id UUID;
    related_order_item_id UUID;
BEGIN
    -- Get current user from session variable (set by application via set_audit_context)
    BEGIN
        current_user_id := current_setting('app.current_user_id', true)::UUID;
    EXCEPTION WHEN OTHERS THEN
        current_user_id := NULL;
    END;

    -- Try to get IP address from session (optional metadata)
    BEGIN
        current_ip := current_setting('app.client_ip', true)::INET;
    EXCEPTION WHEN OTHERS THEN
        current_ip := NULL;
    END;

    -- Try to get user agent from session (optional metadata)
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

    -- Fallback: If user not in session, try to get from related order
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

-- ============================================================================
-- 3. ACTUALIZAR FUNCIÓN DE AUDITORÍA PARA ORDERS (para completitud)
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_orders_changes()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id UUID;
    current_ip INET;
    current_user_agent TEXT;
BEGIN
    -- Get current user from session variable (set by application via set_audit_context)
    BEGIN
        current_user_id := current_setting('app.current_user_id', true)::UUID;
    EXCEPTION WHEN OTHERS THEN
        current_user_id := NULL;
    END;

    -- Try to get IP address from session (optional metadata)
    BEGIN
        current_ip := current_setting('app.client_ip', true)::INET;
    EXCEPTION WHEN OTHERS THEN
        current_ip := NULL;
    END;

    -- Try to get user agent from session (optional metadata)
    BEGIN
        current_user_agent := current_setting('app.user_agent', true);
    EXCEPTION WHEN OTHERS THEN
        current_user_agent := NULL;
    END;

    -- Fallback: If user not in session, try to get from record
    IF current_user_id IS NULL THEN
        IF TG_OP = 'DELETE' THEN
            current_user_id := OLD.created_by;
        ELSE
            current_user_id := NEW.created_by;
        END IF;
    END IF;

    -- Handle INSERT operation
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO orders_audit (
            order_id,
            action,
            new_data,
            changed_by,
            ip_address,
            user_agent
        )
        VALUES (
            NEW.id,
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
            INSERT INTO orders_audit (
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
        INSERT INTO orders_audit (
            order_id,
            action,
            old_data,
            changed_by,
            ip_address,
            user_agent
        )
        VALUES (
            OLD.id,
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
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '✓ Triggers de auditoría actualizados para usar session variables';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '';
    RAISE NOTICE 'Cambios aplicados:';
    RAISE NOTICE '  • audit_orders_changes() usa current_setting(app.current_user_id)';
    RAISE NOTICE '  • audit_order_items_changes() usa current_setting(app.current_user_id)';
    RAISE NOTICE '  • audit_order_item_deliveries_changes() usa current_setting(app.current_user_id)';
    RAISE NOTICE '';
    RAISE NOTICE 'Nota: auth.uid() solo funciona en RLS policies, no en triggers';
    RAISE NOTICE 'El frontend configura app.current_user_id via set_audit_context()';
    RAISE NOTICE '';
END $$;
