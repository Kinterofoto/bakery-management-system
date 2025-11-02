-- Create Order Items Audit System
-- Script 43: Complete audit trail for all order_items changes

-- 1. Create order_items_audit table with JSONB structure
CREATE TABLE IF NOT EXISTS order_items_audit (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),

    -- Complete record snapshots in JSONB
    old_data JSONB, -- Full record before change (NULL for INSERT)
    new_data JSONB, -- Full record after change (NULL for DELETE)

    -- Audit metadata
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,

    -- Ensure we have at least one data field
    CONSTRAINT check_data_present CHECK (
        (action = 'INSERT' AND new_data IS NOT NULL) OR
        (action = 'UPDATE' AND old_data IS NOT NULL AND new_data IS NOT NULL) OR
        (action = 'DELETE' AND old_data IS NOT NULL)
    )
);

-- 2. Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_order_items_audit_order_item_id ON order_items_audit(order_item_id);
CREATE INDEX IF NOT EXISTS idx_order_items_audit_order_id ON order_items_audit(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_audit_action ON order_items_audit(action);
CREATE INDEX IF NOT EXISTS idx_order_items_audit_changed_by ON order_items_audit(changed_by);
CREATE INDEX IF NOT EXISTS idx_order_items_audit_changed_at ON order_items_audit(changed_at DESC);

-- GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_order_items_audit_old_data ON order_items_audit USING GIN (old_data);
CREATE INDEX IF NOT EXISTS idx_order_items_audit_new_data ON order_items_audit USING GIN (new_data);

-- 3. Create trigger function to automatically capture all changes
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

-- 4. Create trigger on order_items table
DROP TRIGGER IF EXISTS order_items_audit_trigger ON order_items;
CREATE TRIGGER order_items_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION audit_order_items_changes();

-- 5. Create view for easy querying with user information
CREATE OR REPLACE VIEW order_items_audit_with_user AS
SELECT
    oia.*,
    u.name as changed_by_name,
    u.email as changed_by_email,
    u.role as changed_by_role
FROM order_items_audit oia
LEFT JOIN users u ON oia.changed_by = u.id
ORDER BY oia.changed_at DESC;

-- 6. Add table comments for documentation
COMMENT ON TABLE order_items_audit IS 'Registro completo de auditoría para todas las operaciones en order_items. Captura cambios en productos, cantidades y precios.';
COMMENT ON COLUMN order_items_audit.order_item_id IS 'ID del item afectado';
COMMENT ON COLUMN order_items_audit.order_id IS 'ID de la orden a la que pertenece el item';
COMMENT ON COLUMN order_items_audit.action IS 'Tipo de operación: INSERT, UPDATE o DELETE';
COMMENT ON COLUMN order_items_audit.old_data IS 'Snapshot completo del registro antes del cambio (JSONB)';
COMMENT ON COLUMN order_items_audit.new_data IS 'Snapshot completo del registro después del cambio (JSONB)';

-- 7. Grant appropriate permissions
GRANT SELECT ON order_items_audit TO authenticated;
GRANT SELECT ON order_items_audit_with_user TO authenticated;

-- Print completion message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '✓ Sistema de auditoría de order_items creado exitosamente';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '';
    RAISE NOTICE 'Cambios capturados automáticamente:';
    RAISE NOTICE '  ✓ Agregar productos a orden';
    RAISE NOTICE '  ✓ Eliminar productos de orden';
    RAISE NOTICE '  ✓ Cambios en cantidades solicitadas';
    RAISE NOTICE '  ✓ Cambios en cantidades disponibles/faltantes';
    RAISE NOTICE '  ✓ Cambios en precios unitarios';
    RAISE NOTICE '  ✓ Cambios en cantidades despachadas/entregadas';
    RAISE NOTICE '';
END $$;
