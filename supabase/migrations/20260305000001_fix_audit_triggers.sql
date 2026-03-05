-- Fix audit triggers: remove duplicates, fix fallback user attribution
-- Problem 1: order_items has 3 triggers calling the same function = double logging
-- Problem 2: When auth.uid() is NULL (service_role), fallback incorrectly attributes
--            changes to the order creator instead of the actual user

-- ============================================================
-- 0. Create RPC to set session variables from API (service_role)
-- ============================================================
DROP FUNCTION IF EXISTS public.set_audit_context(TEXT);
CREATE OR REPLACE FUNCTION public.set_audit_context(p_user_id TEXT DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    IF p_user_id IS NOT NULL AND p_user_id != '' THEN
        PERFORM set_config('app.current_user_id', p_user_id, true);
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_audit_context(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_audit_context(TEXT) TO authenticated;

-- ============================================================
-- 1. Remove duplicate triggers on order_items
-- ============================================================
-- Keep only: AFTER for INSERT/UPDATE, BEFORE for DELETE
DROP TRIGGER IF EXISTS audit_order_items_changes_trigger ON order_items;

-- ============================================================
-- 2. Fix audit_order_items_changes() - replace created_by fallback
--    with app.current_user_id session variable
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_order_items_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    current_user_id UUID;
    current_ip INET;
    current_user_agent TEXT;
    related_order_id UUID;
BEGIN
    -- Get current user from Supabase JWT (auth.uid())
    BEGIN
        current_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        current_user_id := NULL;
    END;

    -- Fallback: read from session variable (set by API/service-role callers)
    IF current_user_id IS NULL THEN
        BEGIN
            current_user_id := current_setting('app.current_user_id', true)::UUID;
        EXCEPTION WHEN OTHERS THEN
            current_user_id := NULL;
        END;
    END IF;

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

    -- Handle INSERT
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO order_items_audit (
            order_item_id, order_id, action, new_data,
            changed_by, ip_address, user_agent
        ) VALUES (
            NEW.id, related_order_id, 'INSERT',
            row_to_json(NEW)::JSONB,
            current_user_id, current_ip, current_user_agent
        );
        RETURN NEW;
    END IF;

    -- Handle UPDATE
    IF (TG_OP = 'UPDATE') THEN
        INSERT INTO order_items_audit (
            order_item_id, order_id, action, old_data, new_data,
            changed_by, ip_address, user_agent
        ) VALUES (
            NEW.id, related_order_id, 'UPDATE',
            row_to_json(OLD)::JSONB, row_to_json(NEW)::JSONB,
            current_user_id, current_ip, current_user_agent
        );
        RETURN NEW;
    END IF;

    -- Handle DELETE
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO order_items_audit (
            order_item_id, order_id, action, old_data,
            changed_by, ip_address, user_agent
        ) VALUES (
            OLD.id, related_order_id, 'DELETE',
            row_to_json(OLD)::JSONB,
            current_user_id, current_ip, current_user_agent
        );
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;

-- ============================================================
-- 3. Fix audit_order_item_deliveries_changes() - same fix
-- ============================================================
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
    -- Get current user from Supabase JWT (auth.uid())
    BEGIN
        current_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        current_user_id := NULL;
    END;

    -- Fallback: read from session variable (set by API/service-role callers)
    IF current_user_id IS NULL THEN
        BEGIN
            current_user_id := current_setting('app.current_user_id', true)::UUID;
        EXCEPTION WHEN OTHERS THEN
            current_user_id := NULL;
        END;
    END IF;

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
        SELECT order_id INTO related_order_id FROM order_items WHERE id = OLD.order_item_id;
    ELSE
        related_order_item_id := NEW.order_item_id;
        SELECT order_id INTO related_order_id FROM order_items WHERE id = NEW.order_item_id;
    END IF;

    -- Handle INSERT
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO order_item_deliveries_audit (
            order_item_delivery_id, order_id, action, new_data,
            changed_by, ip_address, user_agent
        ) VALUES (
            NEW.id, related_order_id, 'INSERT',
            row_to_json(NEW)::JSONB,
            current_user_id, current_ip, current_user_agent
        );
        RETURN NEW;
    END IF;

    -- Handle UPDATE
    IF (TG_OP = 'UPDATE') THEN
        INSERT INTO order_item_deliveries_audit (
            order_item_delivery_id, order_id, action, old_data, new_data,
            changed_by, ip_address, user_agent
        ) VALUES (
            NEW.id, related_order_id, 'UPDATE',
            row_to_json(OLD)::JSONB, row_to_json(NEW)::JSONB,
            current_user_id, current_ip, current_user_agent
        );
        RETURN NEW;
    END IF;

    -- Handle DELETE
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO order_item_deliveries_audit (
            order_item_delivery_id, order_id, action, old_data,
            changed_by, ip_address, user_agent
        ) VALUES (
            OLD.id, related_order_id, 'DELETE',
            row_to_json(OLD)::JSONB,
            current_user_id, current_ip, current_user_agent
        );
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;

-- ============================================================
-- 4. Fix audit_orders_changes() - add session variable fallback
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_orders_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    current_user_id UUID;
    current_ip INET;
    current_user_agent TEXT;
BEGIN
    -- Get current user from Supabase JWT (auth.uid())
    BEGIN
        current_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        current_user_id := NULL;
    END;

    -- Fallback: read from session variable (set by API/service-role callers)
    IF current_user_id IS NULL THEN
        BEGIN
            current_user_id := current_setting('app.current_user_id', true)::UUID;
        EXCEPTION WHEN OTHERS THEN
            current_user_id := NULL;
        END;
    END IF;

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

    -- Handle INSERT
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO orders_audit (
            order_id, action, new_data,
            changed_by, ip_address, user_agent
        ) VALUES (
            NEW.id, 'INSERT',
            row_to_json(NEW)::JSONB,
            current_user_id, current_ip, current_user_agent
        );
        RETURN NEW;
    END IF;

    -- Handle UPDATE
    IF (TG_OP = 'UPDATE') THEN
        INSERT INTO orders_audit (
            order_id, action, old_data, new_data,
            changed_by, ip_address, user_agent
        ) VALUES (
            NEW.id, 'UPDATE',
            row_to_json(OLD)::JSONB, row_to_json(NEW)::JSONB,
            current_user_id, current_ip, current_user_agent
        );
        RETURN NEW;
    END IF;

    -- Handle DELETE
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO orders_audit (
            order_id, action, old_data,
            changed_by, ip_address, user_agent
        ) VALUES (
            OLD.id, 'DELETE',
            row_to_json(OLD)::JSONB,
            current_user_id, current_ip, current_user_agent
        );
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;
