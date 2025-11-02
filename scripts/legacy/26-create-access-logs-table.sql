-- Tabla para registrar intentos de acceso denegado y auditoría de seguridad
CREATE TABLE IF NOT EXISTS public.access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  attempted_path TEXT NOT NULL,
  access_denied_reason TEXT,
  user_agent TEXT,
  ip_address TEXT,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento de consultas
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON public.access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_attempted_at ON public.access_logs(attempted_at);
CREATE INDEX IF NOT EXISTS idx_access_logs_path ON public.access_logs(attempted_path);
CREATE INDEX IF NOT EXISTS idx_access_logs_user_email ON public.access_logs(user_email);

-- Comentarios para documentación
COMMENT ON TABLE public.access_logs IS 'Registro de intentos de acceso a rutas protegidas para auditoría de seguridad';
COMMENT ON COLUMN public.access_logs.user_id IS 'ID del usuario que intentó acceder (puede ser null para usuarios no autenticados)';
COMMENT ON COLUMN public.access_logs.user_email IS 'Email del usuario para referencia rápida';
COMMENT ON COLUMN public.access_logs.attempted_path IS 'Ruta que se intentó acceder';
COMMENT ON COLUMN public.access_logs.access_denied_reason IS 'Razón por la cual se denegó el acceso';
COMMENT ON COLUMN public.access_logs.user_agent IS 'User agent del navegador';
COMMENT ON COLUMN public.access_logs.ip_address IS 'Dirección IP del cliente';

-- RLS (Row Level Security) - Solo admins pueden ver los logs
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- Política: Solo usuarios admin pueden leer los logs
CREATE POLICY "Solo admins pueden ver access_logs" ON public.access_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.auth_user_id = auth.uid()
            AND u.role = 'admin'
        )
    );

-- Política: El sistema puede insertar logs (sin restricciones para el service role)
CREATE POLICY "Sistema puede insertar access_logs" ON public.access_logs
    FOR INSERT
    WITH CHECK (true);

-- Función para limpiar logs antiguos (opcional, para mantenimiento)
CREATE OR REPLACE FUNCTION cleanup_old_access_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Eliminar logs más antiguos de 90 días
    DELETE FROM public.access_logs 
    WHERE attempted_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Comentario en la función
COMMENT ON FUNCTION cleanup_old_access_logs() IS 'Función para limpiar logs de acceso antiguos (>90 días)';

-- Configurar permisos para el schema público
GRANT SELECT, INSERT ON public.access_logs TO authenticated;
GRANT SELECT, INSERT ON public.access_logs TO service_role;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Tabla access_logs creada exitosamente con políticas RLS configuradas.';
    RAISE NOTICE 'Solo usuarios admin pueden consultar los logs de acceso.';
    RAISE NOTICE 'Para limpiar logs antiguos, ejecuta: SELECT cleanup_old_access_logs();';
END $$;