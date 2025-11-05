-- Script para agregar campo route_number con consecutivo automático
-- Ejecutar en Supabase SQL Editor

-- 1. Agregar la columna route_number
ALTER TABLE public.routes 
ADD COLUMN route_number integer;

-- 2. Crear una secuencia para el consecutivo
CREATE SEQUENCE IF NOT EXISTS route_number_seq START 1;

-- 3. Actualizar las rutas existentes con números consecutivos (usando una subconsulta)
WITH numbered_routes AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as new_number
  FROM public.routes 
  WHERE route_number IS NULL
)
UPDATE public.routes 
SET route_number = numbered_routes.new_number
FROM numbered_routes 
WHERE public.routes.id = numbered_routes.id;

-- 4. Hacer que el campo sea NOT NULL y único
ALTER TABLE public.routes 
ALTER COLUMN route_number SET NOT NULL;

-- 5. Agregar constraint de unicidad
ALTER TABLE public.routes 
ADD CONSTRAINT routes_route_number_unique UNIQUE (route_number);

-- 6. Crear función para asignar automáticamente el próximo número de ruta
CREATE OR REPLACE FUNCTION assign_route_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo asignar número si no viene especificado
  IF NEW.route_number IS NULL THEN
    NEW.route_number := nextval('route_number_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Crear trigger para ejecutar la función antes de insertar
DROP TRIGGER IF EXISTS trigger_assign_route_number ON public.routes;
CREATE TRIGGER trigger_assign_route_number
  BEFORE INSERT ON public.routes
  FOR EACH ROW
  EXECUTE FUNCTION assign_route_number();

-- 8. Crear índice para mejorar performance
CREATE INDEX IF NOT EXISTS idx_routes_route_number 
ON public.routes USING btree (route_number);

-- Verificar que todo se creó correctamente
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'routes' 
  AND table_schema = 'public'
  AND column_name = 'route_number';