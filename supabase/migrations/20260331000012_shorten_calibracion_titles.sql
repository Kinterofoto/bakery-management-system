-- Shorten calibration activity titles for better tab display

UPDATE "qms"."program_activities"
SET title = 'Termómetros'
WHERE program_id = (SELECT id FROM "qms"."sanitation_programs" WHERE code = 'calibracion')
  AND title = 'Verificación de Termómetros';

UPDATE "qms"."program_activities"
SET title = 'Balanzas'
WHERE program_id = (SELECT id FROM "qms"."sanitation_programs" WHERE code = 'calibracion')
  AND title = 'Verificación de Balanzas';

UPDATE "qms"."program_activities"
SET title = 'Básculas'
WHERE program_id = (SELECT id FROM "qms"."sanitation_programs" WHERE code = 'calibracion')
  AND title = 'Verificación de Básculas';

UPDATE "qms"."program_activities"
SET title = 'Cert. Termómetros'
WHERE program_id = (SELECT id FROM "qms"."sanitation_programs" WHERE code = 'calibracion')
  AND title = 'Certificado Calibración - Termómetros';

UPDATE "qms"."program_activities"
SET title = 'Cert. Balanzas'
WHERE program_id = (SELECT id FROM "qms"."sanitation_programs" WHERE code = 'calibracion')
  AND title = 'Certificado Calibración - Balanzas';

UPDATE "qms"."program_activities"
SET title = 'Cert. Básculas'
WHERE program_id = (SELECT id FROM "qms"."sanitation_programs" WHERE code = 'calibracion')
  AND title = 'Certificado Calibración - Básculas';
