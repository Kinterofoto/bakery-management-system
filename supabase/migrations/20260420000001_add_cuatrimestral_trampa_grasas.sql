-- Add 'cuatrimestral' (every 4 months) as a valid frequency and insert the
-- Limpieza de Trampa de Grasas activity for Residuos Sólidos.

-- 1. Expand frequency CHECK constraints to allow 'cuatrimestral'
ALTER TABLE "qms"."program_activities"
  DROP CONSTRAINT IF EXISTS "program_activities_frequency_check";

ALTER TABLE "qms"."program_activities"
  ADD CONSTRAINT "program_activities_frequency_check"
  CHECK ("frequency" IN ('diario','semanal','quincenal','mensual','trimestral','cuatrimestral','semestral','anual'));

ALTER TABLE "qms"."sanitation_programs"
  DROP CONSTRAINT IF EXISTS "sanitation_programs_frequency_check";

ALTER TABLE "qms"."sanitation_programs"
  ADD CONSTRAINT "sanitation_programs_frequency_check"
  CHECK ("frequency" IN ('diario','semanal','quincenal','mensual','trimestral','cuatrimestral','semestral','anual'));

-- 2. Insert the new activity (idempotent via NOT EXISTS guard)
INSERT INTO "qms"."program_activities"
  ("program_id", "title", "description", "activity_type", "frequency", "start_date", "area", "requires_evidence", "form_fields")
SELECT
  p."id",
  'Limpieza de Trampa de Grasas',
  'Mantenimiento y limpieza profunda de las trampas de grasa del sistema de drenaje realizada por proveedor externo mediante equipo vactor. Incluye extracción total del contenido y disposición final por gestor autorizado.',
  'limpieza',
  'cuatrimestral',
  DATE '2026-05-01',
  'Sistema de Drenaje',
  true,
  '[
    {"name":"empresa","label":"Empresa Proveedora","type":"text","required":true},
    {"name":"tecnico","label":"Técnico Responsable","type":"text","required":false},
    {"name":"certificado_num","label":"No. Certificado / Acta","type":"text","required":false}
  ]'::jsonb
FROM "qms"."sanitation_programs" p
WHERE p."code" = 'residuos_solidos'
  AND NOT EXISTS (
    SELECT 1 FROM "qms"."program_activities" a
    WHERE a."program_id" = p."id"
      AND a."title" = 'Limpieza de Trampa de Grasas'
  );
