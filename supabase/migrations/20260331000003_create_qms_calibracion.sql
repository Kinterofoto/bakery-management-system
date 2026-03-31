-- ============================================================================
-- QMS - Programa de Calibración de Equipos de Medición
-- Resolución 2674/2013, Decreto 1471/2014
-- ============================================================================

-- Seed: Programa de Calibración
INSERT INTO "qms"."sanitation_programs" ("name", "description", "code", "icon", "color", "frequency") VALUES
('Programa de Calibración', 'Verificación y calibración de equipos de medición (termómetros, balanzas y básculas). Verificaciones quincenales internas y certificación anual por laboratorio acreditado ONAC.', 'calibracion', 'Gauge', 'amber', 'quincenal');

-- ============================================================================
-- Actividades Quincenales (cada 15 días)
-- ============================================================================

-- 1. Verificación de Termómetros (quincenal)
INSERT INTO "qms"."program_activities" ("program_id", "title", "description", "activity_type", "frequency", "area", "requires_evidence", "form_fields") VALUES
((SELECT id FROM "qms"."sanitation_programs" WHERE code = 'calibracion'),
 'Verificación de Termómetros',
 'Verificación interna de termómetros comparando con termómetro patrón calibrado. Tolerancia: ±1.0°C. Método: 3 lecturas en mezcla agua-hielo.',
 'monitoreo', 'quincenal', 'Planta General', false,
 '[
   {"name":"equipo","label":"Equipo","type":"select","options":["TER-01 Empaque","TER-02 Amasado","TER-03 I+D","TER-04 Cuarto Frío","TER-05 Hornos"],"required":true},
   {"name":"lectura_1","label":"Lectura 1 (°C)","type":"number","required":true},
   {"name":"lectura_2","label":"Lectura 2 (°C)","type":"number","required":true},
   {"name":"lectura_3","label":"Lectura 3 (°C)","type":"number","required":true},
   {"name":"promedio_equipo","label":"Promedio Equipo (°C)","type":"number","required":true},
   {"name":"lectura_patron","label":"Lectura Patrón (°C)","type":"number","required":true},
   {"name":"correccion_certificado","label":"Corrección Certificado (°C)","type":"number","required":false},
   {"name":"diferencia","label":"Diferencia (°C)","type":"number","required":true},
   {"name":"cumple","label":"Cumple (±1.0°C)","type":"select","options":["Sí","No"],"required":true},
   {"name":"accion","label":"Acción Tomada","type":"select","options":["Ninguna","Ajuste","Retiro de Servicio"],"required":false}
 ]'::jsonb);

-- 2. Verificación de Balanzas (quincenal)
INSERT INTO "qms"."program_activities" ("program_id", "title", "description", "activity_type", "frequency", "area", "requires_evidence", "form_fields") VALUES
((SELECT id FROM "qms"."sanitation_programs" WHERE code = 'calibracion'),
 'Verificación de Balanzas',
 'Verificación interna de balanzas con masas patrón OIML. Prueba de repetibilidad con 5 lecturas. Tolerancia: ±0.2 kg.',
 'monitoreo', 'quincenal', 'Producción', false,
 '[
   {"name":"equipo","label":"Equipo","type":"select","options":["BAL-01 Producción","BAL-02 Empaque","BAL-03 I+D","BAL-04 Almacén MP"],"required":true},
   {"name":"masa_patron","label":"Masa Patrón (kg)","type":"number","required":true},
   {"name":"lectura_1","label":"Lectura 1 (kg)","type":"number","required":true},
   {"name":"lectura_2","label":"Lectura 2 (kg)","type":"number","required":true},
   {"name":"lectura_3","label":"Lectura 3 (kg)","type":"number","required":true},
   {"name":"lectura_4","label":"Lectura 4 (kg)","type":"number","required":true},
   {"name":"lectura_5","label":"Lectura 5 (kg)","type":"number","required":true},
   {"name":"variacion","label":"Variación Máx (kg)","type":"number","required":true},
   {"name":"cumple","label":"Cumple (±0.2 kg)","type":"select","options":["Sí","No"],"required":true},
   {"name":"accion","label":"Acción Tomada","type":"select","options":["Ninguna","Mantenimiento","Retiro de Servicio"],"required":false}
 ]'::jsonb);

-- 3. Verificación de Básculas (quincenal)
INSERT INTO "qms"."program_activities" ("program_id", "title", "description", "activity_type", "frequency", "area", "requires_evidence", "form_fields") VALUES
((SELECT id FROM "qms"."sanitation_programs" WHERE code = 'calibracion'),
 'Verificación de Básculas',
 'Verificación interna de básculas industriales con masas patrón OIML. Prueba de repetibilidad y excentricidad. Tolerancia: ±0.5 kg.',
 'monitoreo', 'quincenal', 'Despacho / Recepción', false,
 '[
   {"name":"equipo","label":"Equipo","type":"select","options":["BAS-01 Recepción MP","BAS-02 Despacho PT","BAS-03 Producción"],"required":true},
   {"name":"masa_patron","label":"Masa Patrón (kg)","type":"number","required":true},
   {"name":"lectura_centro","label":"Lectura Centro (kg)","type":"number","required":true},
   {"name":"lectura_esq_1","label":"Lectura Esquina 1 (kg)","type":"number","required":true},
   {"name":"lectura_esq_2","label":"Lectura Esquina 2 (kg)","type":"number","required":true},
   {"name":"lectura_esq_3","label":"Lectura Esquina 3 (kg)","type":"number","required":true},
   {"name":"lectura_esq_4","label":"Lectura Esquina 4 (kg)","type":"number","required":true},
   {"name":"variacion","label":"Variación Máx (kg)","type":"number","required":true},
   {"name":"cumple","label":"Cumple (±0.5 kg)","type":"select","options":["Sí","No"],"required":true},
   {"name":"accion","label":"Acción Tomada","type":"select","options":["Ninguna","Mantenimiento","Retiro de Servicio"],"required":false}
 ]'::jsonb);

-- ============================================================================
-- Actividades Anuales (certificación externa)
-- ============================================================================

-- 4. Certificado de Calibración - Termómetros (anual)
INSERT INTO "qms"."program_activities" ("program_id", "title", "description", "activity_type", "frequency", "area", "requires_evidence", "form_fields") VALUES
((SELECT id FROM "qms"."sanitation_programs" WHERE code = 'calibracion'),
 'Certificado Calibración - Termómetros',
 'Calibración externa anual del termómetro patrón y equipos por laboratorio acreditado ONAC. Se genera certificado oficial de calibración.',
 'certificado', 'anual', 'Laboratorio Externo', true,
 '[
   {"name":"equipo","label":"Equipo Calibrado","type":"text","required":true},
   {"name":"laboratorio","label":"Laboratorio Acreditado","type":"text","required":true},
   {"name":"numero_certificado","label":"No. Certificado","type":"text","required":true},
   {"name":"fecha_calibracion","label":"Fecha de Calibración","type":"date","required":true},
   {"name":"fecha_vencimiento","label":"Fecha Vencimiento","type":"date","required":true},
   {"name":"incertidumbre","label":"Incertidumbre (°C)","type":"number","required":false},
   {"name":"resultado","label":"Resultado","type":"select","options":["Aprobado","Rechazado"],"required":true}
 ]'::jsonb);

-- 5. Certificado de Calibración - Balanzas (anual)
INSERT INTO "qms"."program_activities" ("program_id", "title", "description", "activity_type", "frequency", "area", "requires_evidence", "form_fields") VALUES
((SELECT id FROM "qms"."sanitation_programs" WHERE code = 'calibracion'),
 'Certificado Calibración - Balanzas',
 'Calibración externa anual de balanzas por laboratorio acreditado ONAC. Incluye pruebas de exactitud, repetibilidad, excentricidad y punto cero.',
 'certificado', 'anual', 'Laboratorio Externo', true,
 '[
   {"name":"equipo","label":"Equipo Calibrado","type":"text","required":true},
   {"name":"laboratorio","label":"Laboratorio Acreditado","type":"text","required":true},
   {"name":"numero_certificado","label":"No. Certificado","type":"text","required":true},
   {"name":"fecha_calibracion","label":"Fecha de Calibración","type":"date","required":true},
   {"name":"fecha_vencimiento","label":"Fecha Vencimiento","type":"date","required":true},
   {"name":"incertidumbre","label":"Incertidumbre (g)","type":"number","required":false},
   {"name":"resultado","label":"Resultado","type":"select","options":["Aprobado","Rechazado"],"required":true}
 ]'::jsonb);

-- 6. Certificado de Calibración - Básculas (anual)
INSERT INTO "qms"."program_activities" ("program_id", "title", "description", "activity_type", "frequency", "area", "requires_evidence", "form_fields") VALUES
((SELECT id FROM "qms"."sanitation_programs" WHERE code = 'calibracion'),
 'Certificado Calibración - Básculas',
 'Calibración externa anual de básculas industriales por laboratorio acreditado ONAC. Incluye pruebas NTC 2031 completas.',
 'certificado', 'anual', 'Laboratorio Externo', true,
 '[
   {"name":"equipo","label":"Equipo Calibrado","type":"text","required":true},
   {"name":"laboratorio","label":"Laboratorio Acreditado","type":"text","required":true},
   {"name":"numero_certificado","label":"No. Certificado","type":"text","required":true},
   {"name":"fecha_calibracion","label":"Fecha de Calibración","type":"date","required":true},
   {"name":"fecha_vencimiento","label":"Fecha Vencimiento","type":"date","required":true},
   {"name":"incertidumbre","label":"Incertidumbre (kg)","type":"number","required":false},
   {"name":"resultado","label":"Resultado","type":"select","options":["Aprobado","Rechazado"],"required":true}
 ]'::jsonb);
