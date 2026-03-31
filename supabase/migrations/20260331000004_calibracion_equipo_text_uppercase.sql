-- Change calibration "equipo" fields from select to free-text with uppercase normalization
-- Affects: Verificación de Termómetros, Verificación de Balanzas, Verificación de Básculas

-- Verificación de Termómetros
UPDATE "qms"."program_activities"
SET form_fields = jsonb_set(
  form_fields,
  '{0}',
  '{"name":"equipo","label":"Equipo","type":"text","required":true,"uppercase":true}'::jsonb
)
WHERE program_id = (SELECT id FROM "qms"."sanitation_programs" WHERE code = 'calibracion')
  AND title = 'Verificación de Termómetros';

-- Verificación de Balanzas
UPDATE "qms"."program_activities"
SET form_fields = jsonb_set(
  form_fields,
  '{0}',
  '{"name":"equipo","label":"Equipo","type":"text","required":true,"uppercase":true}'::jsonb
)
WHERE program_id = (SELECT id FROM "qms"."sanitation_programs" WHERE code = 'calibracion')
  AND title = 'Verificación de Balanzas';

-- Verificación de Básculas
UPDATE "qms"."program_activities"
SET form_fields = jsonb_set(
  form_fields,
  '{0}',
  '{"name":"equipo","label":"Equipo","type":"text","required":true,"uppercase":true}'::jsonb
)
WHERE program_id = (SELECT id FROM "qms"."sanitation_programs" WHERE code = 'calibracion')
  AND title = 'Verificación de Básculas';
