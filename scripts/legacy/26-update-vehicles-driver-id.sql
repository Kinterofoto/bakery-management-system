-- Script para actualizar la tabla vehicles para usar driver_id en lugar de driver_name
-- Este script debe ejecutarse en la base de datos de Supabase

-- 1. Agregar la nueva columna driver_id con referencia a users
ALTER TABLE public.vehicles 
ADD COLUMN driver_id UUID REFERENCES public.users(id);

-- 2. Migrar datos existentes (si los hay) de driver_name a driver_id
-- Nota: Este paso asume que los nombres en driver_name coinciden exactamente con users.name
-- Si no es el caso, esto debe ajustarse manualmente
UPDATE public.vehicles 
SET driver_id = (
    SELECT u.id 
    FROM public.users u 
    WHERE u.name = vehicles.driver_name 
    AND u.role = 'driver'
    LIMIT 1
)
WHERE driver_name IS NOT NULL;

-- 3. Eliminar la columna driver_name (después de verificar que la migración fue exitosa)
-- ADVERTENCIA: Ejecutar solo después de verificar que los datos se migraron correctamente
-- ALTER TABLE public.vehicles DROP COLUMN driver_name;

-- 4. Agregar índice para mejorar performance en consultas por driver_id
CREATE INDEX IF NOT EXISTS idx_vehicles_driver_id ON public.vehicles(driver_id);

-- 5. Comentario de verificación
-- Para verificar la migración, ejecuta:
-- SELECT v.*, u.name as driver_name FROM vehicles v LEFT JOIN users u ON v.driver_id = u.id;