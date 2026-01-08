-- Migración para ajustar shift_numbers después del reordenamiento de turnos
-- ANTES: T1=6-14, T2=14-22, T3=22-6
-- AHORA: T1=22-6, T2=6-14, T3=14-22

-- IMPORTANTE: Ejecutar solo si tienes datos existentes que fueron creados con el orden antiguo

BEGIN;

-- Crear tabla temporal para guardar los schedules a actualizar
CREATE TEMP TABLE schedules_to_migrate AS
SELECT
  id,
  start_date,
  shift_number as old_shift_number,
  EXTRACT(HOUR FROM start_date) as start_hour,
  CASE
    -- Si empieza entre 6-14, era viejo T1, ahora es nuevo T2
    WHEN EXTRACT(HOUR FROM start_date) >= 6 AND EXTRACT(HOUR FROM start_date) < 14 THEN 2
    -- Si empieza entre 14-22, era viejo T2, ahora es nuevo T3
    WHEN EXTRACT(HOUR FROM start_date) >= 14 AND EXTRACT(HOUR FROM start_date) < 22 THEN 3
    -- Si empieza entre 22-24 o 0-6, era viejo T3, ahora es nuevo T1
    WHEN EXTRACT(HOUR FROM start_date) >= 22 OR EXTRACT(HOUR FROM start_date) < 6 THEN 1
  END as new_shift_number
FROM produccion.production_schedules
WHERE created_at < NOW() - INTERVAL '1 hour'; -- Solo schedules creados hace más de 1 hora

-- Mostrar qué se va a cambiar
SELECT
  id,
  TO_CHAR(start_date, 'YYYY-MM-DD HH24:MI') as start_time,
  start_hour,
  old_shift_number,
  new_shift_number,
  CASE
    WHEN old_shift_number != new_shift_number THEN '❌ NECESITA ACTUALIZACIÓN'
    ELSE '✓ OK'
  END as status
FROM schedules_to_migrate
ORDER BY start_date;

-- Descomentar las siguientes líneas para aplicar la migración:
-- UPDATE produccion.production_schedules ps
-- SET shift_number = stm.new_shift_number
-- FROM schedules_to_migrate stm
-- WHERE ps.id = stm.id
--   AND stm.old_shift_number != stm.new_shift_number;

-- SELECT COUNT(*) as schedules_actualizados
-- FROM schedules_to_migrate
-- WHERE old_shift_number != new_shift_number;

ROLLBACK; -- Cambiar a COMMIT cuando estés listo para aplicar los cambios
