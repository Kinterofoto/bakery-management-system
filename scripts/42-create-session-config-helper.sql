-- Helper function for setting session variables
-- This allows the frontend to inject user context for audit triggers

CREATE OR REPLACE FUNCTION set_audit_context(
    setting_name TEXT,
    new_value TEXT,
    is_local BOOLEAN DEFAULT true
)
RETURNS TEXT AS $$
BEGIN
    PERFORM set_config(setting_name, new_value, is_local);
    RETURN new_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION set_audit_context(TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION set_audit_context(TEXT, TEXT, BOOLEAN) TO anon;

COMMENT ON FUNCTION set_audit_context IS 'Permite establecer variables de sesión para tracking de auditoría';

DO $$
BEGIN
    RAISE NOTICE '✓ Función set_audit_context creada para inyección de contexto de usuario';
END $$;
