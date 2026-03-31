-- ============================================================================
-- QMS - Programa de Muestreo Microbiológico
-- Cronograma de Muestreo 2026 (CR-06 V2.0)
-- ============================================================================

-- Seed: Programa de Microbiología
INSERT INTO "qms"."sanitation_programs" ("name", "description", "code", "icon", "color", "frequency") VALUES
('Programa de Muestreo Microbiológico', 'Cronograma de muestreo microbiológico 2026: análisis de materia prima, producto terminado, material de empaque, ambientes, superficies, manipuladores y agua potable según CR-06 V2.0.', 'microbiologia', 'Microscope', 'indigo', 'mensual');

-- ============================================================================
-- Actividades Mensuales por Categoría
-- ============================================================================

-- 1. Materia Prima
INSERT INTO "qms"."program_activities" ("program_id", "title", "description", "activity_type", "frequency", "area", "requires_evidence", "form_fields") VALUES
((SELECT id FROM "qms"."sanitation_programs" WHERE code = 'microbiologia'),
 'Muestreo Materia Prima',
 'Análisis microbiológico mensual de materias primas según cronograma CR-06 V2.0.',
 'monitoreo', 'mensual', 'Recepción / Almacén', true,
 '[
   {"name":"muestra","label":"Muestra","type":"text","required":true},
   {"name":"lote","label":"Lote","type":"text","required":false},
   {"name":"proveedor","label":"Proveedor","type":"text","required":false},
   {"name":"laboratorio","label":"Laboratorio","type":"text","required":false},
   {"name":"resultado","label":"Resultado","type":"select","options":["Conforme","No Conforme","Pendiente"],"required":true},
   {"name":"observaciones","label":"Observaciones","type":"text","required":false}
 ]'::jsonb);

-- 2. Producto Terminado
INSERT INTO "qms"."program_activities" ("program_id", "title", "description", "activity_type", "frequency", "area", "requires_evidence", "form_fields") VALUES
((SELECT id FROM "qms"."sanitation_programs" WHERE code = 'microbiologia'),
 'Muestreo Producto Terminado',
 'Análisis microbiológico mensual de productos terminados según cronograma CR-06 V2.0.',
 'monitoreo', 'mensual', 'Producción / Empaque', true,
 '[
   {"name":"muestra","label":"Muestra","type":"text","required":true},
   {"name":"lote","label":"Lote","type":"text","required":false},
   {"name":"fecha_produccion","label":"Fecha Producción","type":"date","required":false},
   {"name":"laboratorio","label":"Laboratorio","type":"text","required":false},
   {"name":"resultado","label":"Resultado","type":"select","options":["Conforme","No Conforme","Pendiente"],"required":true},
   {"name":"observaciones","label":"Observaciones","type":"text","required":false}
 ]'::jsonb);

-- 3. Material de Empaque
INSERT INTO "qms"."program_activities" ("program_id", "title", "description", "activity_type", "frequency", "area", "requires_evidence", "form_fields") VALUES
((SELECT id FROM "qms"."sanitation_programs" WHERE code = 'microbiologia'),
 'Muestreo Material de Empaque',
 'Análisis microbiológico bimestral de materiales de empaque según cronograma CR-06 V2.0.',
 'monitoreo', 'mensual', 'Almacén Empaque', true,
 '[
   {"name":"muestra","label":"Muestra","type":"text","required":true},
   {"name":"lote","label":"Lote","type":"text","required":false},
   {"name":"proveedor","label":"Proveedor","type":"text","required":false},
   {"name":"laboratorio","label":"Laboratorio","type":"text","required":false},
   {"name":"resultado","label":"Resultado","type":"select","options":["Conforme","No Conforme","Pendiente"],"required":true},
   {"name":"observaciones","label":"Observaciones","type":"text","required":false}
 ]'::jsonb);

-- 4. Ambiente
INSERT INTO "qms"."program_activities" ("program_id", "title", "description", "activity_type", "frequency", "area", "requires_evidence", "form_fields") VALUES
((SELECT id FROM "qms"."sanitation_programs" WHERE code = 'microbiologia'),
 'Muestreo Ambiental',
 'Análisis microbiológico mensual de ambientes de producción según cronograma CR-06 V2.0.',
 'monitoreo', 'mensual', 'Planta Producción', true,
 '[
   {"name":"muestra","label":"Zona/Área","type":"text","required":true},
   {"name":"laboratorio","label":"Laboratorio","type":"text","required":false},
   {"name":"resultado","label":"Resultado","type":"select","options":["Conforme","No Conforme","Pendiente"],"required":true},
   {"name":"observaciones","label":"Observaciones","type":"text","required":false}
 ]'::jsonb);

-- 5. Superficie
INSERT INTO "qms"."program_activities" ("program_id", "title", "description", "activity_type", "frequency", "area", "requires_evidence", "form_fields") VALUES
((SELECT id FROM "qms"."sanitation_programs" WHERE code = 'microbiologia'),
 'Muestreo de Superficies',
 'Análisis microbiológico mensual de superficies en contacto con alimentos según cronograma CR-06 V2.0.',
 'monitoreo', 'mensual', 'Planta Producción', true,
 '[
   {"name":"muestra","label":"Superficie/Equipo","type":"text","required":true},
   {"name":"laboratorio","label":"Laboratorio","type":"text","required":false},
   {"name":"resultado","label":"Resultado","type":"select","options":["Conforme","No Conforme","Pendiente"],"required":true},
   {"name":"observaciones","label":"Observaciones","type":"text","required":false}
 ]'::jsonb);

-- 6. Manipulador
INSERT INTO "qms"."program_activities" ("program_id", "title", "description", "activity_type", "frequency", "area", "requires_evidence", "form_fields") VALUES
((SELECT id FROM "qms"."sanitation_programs" WHERE code = 'microbiologia'),
 'Muestreo de Manipuladores',
 'Análisis microbiológico mensual de manipuladores de alimentos (frotis de manos) según cronograma CR-06 V2.0.',
 'monitoreo', 'mensual', 'Planta Producción', true,
 '[
   {"name":"muestra","label":"Manipulador/Área","type":"text","required":true},
   {"name":"laboratorio","label":"Laboratorio","type":"text","required":false},
   {"name":"resultado","label":"Resultado","type":"select","options":["Conforme","No Conforme","Pendiente"],"required":true},
   {"name":"observaciones","label":"Observaciones","type":"text","required":false}
 ]'::jsonb);

-- 7. Agua Potable (Microbiológico)
INSERT INTO "qms"."program_activities" ("program_id", "title", "description", "activity_type", "frequency", "area", "requires_evidence", "form_fields") VALUES
((SELECT id FROM "qms"."sanitation_programs" WHERE code = 'microbiologia'),
 'Muestreo Agua Potable (Microbiológico)',
 'Análisis microbiológico trimestral de agua potable en puntos de muestreo según cronograma CR-06 V2.0.',
 'monitoreo', 'trimestral', 'Planta General', true,
 '[
   {"name":"muestra","label":"Punto de Muestreo","type":"text","required":true},
   {"name":"laboratorio","label":"Laboratorio","type":"text","required":false},
   {"name":"resultado","label":"Resultado","type":"select","options":["Conforme","No Conforme","Pendiente"],"required":true},
   {"name":"observaciones","label":"Observaciones","type":"text","required":false}
 ]'::jsonb);
