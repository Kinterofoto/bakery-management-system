-- Actualizar definiciones de turnos para reflejar el nuevo orden
-- T1: 22:00 (día anterior) - 06:00 (día actual)
-- T2: 06:00 - 14:00
-- T3: 14:00 - 22:00

BEGIN;

-- Mostrar valores actuales
SELECT
  id,
  name,
  start_hour,
  duration_hours,
  is_active,
  '❌ ORDEN ANTIGUO' as status
FROM produccion.shift_definitions
ORDER BY start_hour;

-- Método 1: Si los IDs son UUIDs, necesitamos recrear los registros con IDs fijos
-- Primero, guarda los IDs actuales para referencia
DO $$
DECLARE
  shift_6_id uuid;
  shift_14_id uuid;
  shift_22_id uuid;
BEGIN
  -- Encuentra los IDs actuales basados en start_hour
  SELECT id INTO shift_6_id FROM produccion.shift_definitions WHERE start_hour = 6;
  SELECT id INTO shift_14_id FROM produccion.shift_definitions WHERE start_hour = 14;
  SELECT id INTO shift_22_id FROM produccion.shift_definitions WHERE start_hour = 22;

  RAISE NOTICE 'Shift 6am ID: %', shift_6_id;
  RAISE NOTICE 'Shift 14pm ID: %', shift_14_id;
  RAISE NOTICE 'Shift 22pm ID: %', shift_22_id;

  -- Actualizar cada turno con los nuevos valores
  -- El que tiene start_hour=22 debe ser ID '1' (T1)
  UPDATE produccion.shift_definitions
  SET
    id = '00000000-0000-0000-0000-000000000001'::uuid,
    name = 'Turno 1',
    start_hour = 22,
    duration_hours = 8,
    updated_at = NOW()
  WHERE start_hour = 22;

  -- El que tiene start_hour=6 debe ser ID '2' (T2)
  UPDATE produccion.shift_definitions
  SET
    id = '00000000-0000-0000-0000-000000000002'::uuid,
    name = 'Turno 2',
    start_hour = 6,
    duration_hours = 8,
    updated_at = NOW()
  WHERE start_hour = 6;

  -- El que tiene start_hour=14 debe ser ID '3' (T3)
  UPDATE produccion.shift_definitions
  SET
    id = '00000000-0000-0000-0000-000000000003'::uuid,
    name = 'Turno 3',
    start_hour = 14,
    duration_hours = 8,
    updated_at = NOW()
  WHERE start_hour = 14;
END $$;

-- Verificar los nuevos valores (ordenados por ID)
SELECT
  id,
  name,
  start_hour,
  duration_hours,
  is_active,
  '✅ ORDEN NUEVO' as status
FROM produccion.shift_definitions
ORDER BY id;

COMMIT;

-- Si algo sale mal, ejecuta: ROLLBACK;
