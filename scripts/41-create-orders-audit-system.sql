-- Create Orders Audit System
-- Script 41: Complete audit trail for all order changes

-- 1. Create orders_audit table with JSONB structure
CREATE TABLE IF NOT EXISTS orders_audit (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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
CREATE INDEX IF NOT EXISTS idx_orders_audit_order_id ON orders_audit(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_audit_action ON orders_audit(action);
CREATE INDEX IF NOT EXISTS idx_orders_audit_changed_by ON orders_audit(changed_by);
CREATE INDEX IF NOT EXISTS idx_orders_audit_changed_at ON orders_audit(changed_at DESC);

-- GIN index for JSONB queries (allows fast field-specific searches)
CREATE INDEX IF NOT EXISTS idx_orders_audit_old_data ON orders_audit USING GIN (old_data);
CREATE INDEX IF NOT EXISTS idx_orders_audit_new_data ON orders_audit USING GIN (new_data);

-- 3. Create trigger function to automatically capture all changes
CREATE OR REPLACE FUNCTION audit_orders_changes()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id UUID;
    current_ip INET;
    current_user_agent TEXT;
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

    -- If user not in session, try to get from NEW/OLD record
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

-- 4. Create trigger on orders table
DROP TRIGGER IF EXISTS orders_audit_trigger ON orders;
CREATE TRIGGER orders_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION audit_orders_changes();

-- 5. Create helper function to get human-readable change summary
CREATE OR REPLACE FUNCTION get_order_change_summary(
    audit_log orders_audit
)
RETURNS TEXT AS $$
DECLARE
    summary TEXT := '';
    old_status TEXT;
    new_status TEXT;
    old_route TEXT;
    new_route TEXT;
BEGIN
    -- Summarize status changes
    IF audit_log.action = 'UPDATE' THEN
        old_status := audit_log.old_data->>'status';
        new_status := audit_log.new_data->>'status';

        IF old_status IS DISTINCT FROM new_status THEN
            summary := summary || 'Estado: ' || old_status || ' → ' || new_status || E'\n';
        END IF;

        -- Summarize route assignment
        old_route := audit_log.old_data->>'assigned_route_id';
        new_route := audit_log.new_data->>'assigned_route_id';

        IF old_route IS DISTINCT FROM new_route THEN
            IF new_route IS NULL THEN
                summary := summary || 'Ruta desasignada' || E'\n';
            ELSIF old_route IS NULL THEN
                summary := summary || 'Asignado a ruta' || E'\n';
            ELSE
                summary := summary || 'Ruta cambiada' || E'\n';
            END IF;
        END IF;
    ELSIF audit_log.action = 'INSERT' THEN
        summary := 'Orden creada';
    ELSIF audit_log.action = 'DELETE' THEN
        summary := 'Orden eliminada';
    END IF;

    RETURN TRIM(summary);
END;
$$ LANGUAGE plpgsql;

-- 6. Create view for easy querying with user information
CREATE OR REPLACE VIEW orders_audit_with_user AS
SELECT
    oa.*,
    u.name as changed_by_name,
    u.email as changed_by_email,
    u.role as changed_by_role,
    get_order_change_summary(oa.*) as change_summary
FROM orders_audit oa
LEFT JOIN users u ON oa.changed_by = u.id
ORDER BY oa.changed_at DESC;

-- 7. Add table comments for documentation
COMMENT ON TABLE orders_audit IS 'Registro completo de auditoría para todas las operaciones en orders. Captura automáticamente INSERT, UPDATE y DELETE con snapshots completos en JSONB.';
COMMENT ON COLUMN orders_audit.order_id IS 'ID de la orden afectada';
COMMENT ON COLUMN orders_audit.action IS 'Tipo de operación: INSERT, UPDATE o DELETE';
COMMENT ON COLUMN orders_audit.old_data IS 'Snapshot completo del registro antes del cambio (JSONB)';
COMMENT ON COLUMN orders_audit.new_data IS 'Snapshot completo del registro después del cambio (JSONB)';
COMMENT ON COLUMN orders_audit.changed_by IS 'Usuario que realizó el cambio';
COMMENT ON COLUMN orders_audit.changed_at IS 'Timestamp del cambio';
COMMENT ON COLUMN orders_audit.ip_address IS 'Dirección IP del cliente (si está disponible)';
COMMENT ON COLUMN orders_audit.user_agent IS 'User agent del navegador (si está disponible)';

-- 8. Grant appropriate permissions
GRANT SELECT ON orders_audit TO authenticated;
GRANT SELECT ON orders_audit_with_user TO authenticated;

-- Print completion message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '✓ Sistema de auditoría de orders creado exitosamente';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '';
    RAISE NOTICE 'Componentes creados:';
    RAISE NOTICE '  • Tabla orders_audit con estructura JSONB';
    RAISE NOTICE '  • Trigger automático para capturar todos los cambios';
    RAISE NOTICE '  • Índices optimizados (incluye GIN para JSONB)';
    RAISE NOTICE '  • Vista orders_audit_with_user con información de usuarios';
    RAISE NOTICE '  • Función get_order_change_summary() para resúmenes';
    RAISE NOTICE '';
    RAISE NOTICE 'Cambios capturados automáticamente:';
    RAISE NOTICE '  ✓ Creación de órdenes';
    RAISE NOTICE '  ✓ Cambios de estado';
    RAISE NOTICE '  ✓ Asignación/desasignación de rutas';
    RAISE NOTICE '  ✓ Cambios de cliente, sucursal, montos';
    RAISE NOTICE '  ✓ Modificación de fechas y observaciones';
    RAISE NOTICE '  ✓ Cambios de facturación y remisiones';
    RAISE NOTICE '  ✓ Eliminación de órdenes';
    RAISE NOTICE '';
    RAISE NOTICE 'Próximos pasos:';
    RAISE NOTICE '  1. Configurar cliente Supabase para inyectar app.current_user_id';
    RAISE NOTICE '  2. Crear hook use-order-audit.ts en frontend';
    RAISE NOTICE '  3. Crear componente OrderAuditHistory para visualización';
    RAISE NOTICE '';
END $$;
