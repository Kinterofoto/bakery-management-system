-- Remove the "tanque" select field from "Lavado y Desinfección de Tanques" activity
-- since all tanks are always washed together and selection is unnecessary.
UPDATE "qms"."program_activities"
SET form_fields = '[{"name":"empresa","label":"Empresa Ejecutora","type":"text","required":true},{"name":"metodo","label":"Método Utilizado","type":"text","required":true}]'::jsonb
WHERE title = 'Lavado y Desinfección de Tanques'
  AND program_id = (SELECT id FROM "qms"."sanitation_programs" WHERE code = 'agua_potable');
