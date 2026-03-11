-- ============================================================================
-- QMS (Quality Management System) Schema
-- Programas de Saneamiento Básico - INVIMA Resolución 2674/2013
-- ============================================================================

-- 1. CREATE SCHEMA
CREATE SCHEMA IF NOT EXISTS "qms";

-- 2. GRANT PERMISSIONS
GRANT USAGE ON SCHEMA "qms" TO "anon", "authenticated", "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "qms"
  GRANT ALL ON TABLES TO "postgres", "anon", "authenticated", "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "qms"
  GRANT ALL ON SEQUENCES TO "postgres", "anon", "authenticated", "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "qms"
  GRANT ALL ON FUNCTIONS TO "postgres", "anon", "authenticated", "service_role";

-- 3. EXPOSE SCHEMA VIA API
ALTER ROLE "authenticator" SET pgrst.db_schemas TO 'public,produccion,compras,inventario,visitas,workflows,qms';
NOTIFY pgrst, 'reload config';

-- ============================================================================
-- 4. TABLES
-- ============================================================================

-- 4.1 Programas de Saneamiento
CREATE TABLE "qms"."sanitation_programs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "code" varchar(50) NOT NULL UNIQUE,
  "icon" varchar(50),
  "color" varchar(50),
  "frequency" varchar(30) DEFAULT 'mensual' CHECK ("frequency" IN ('diario','semanal','quincenal','mensual','trimestral','semestral','anual')),
  "responsible_id" uuid,
  "status" varchar(20) DEFAULT 'activo' CHECK ("status" IN ('activo','inactivo')),
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "sanitation_programs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sanitation_programs_responsible_fkey" FOREIGN KEY ("responsible_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL
);

-- 4.2 Actividades Programadas
CREATE TABLE "qms"."program_activities" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "program_id" uuid NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "activity_type" varchar(50) DEFAULT 'registro' CHECK ("activity_type" IN ('registro','inspeccion','certificado','limpieza','fumigacion','monitoreo','capacitacion','mantenimiento','auditoria')),
  "frequency" varchar(30) DEFAULT 'diario' CHECK ("frequency" IN ('diario','semanal','quincenal','mensual','trimestral','semestral','anual')),
  "day_of_week" integer,
  "day_of_month" integer,
  "month_of_year" integer,
  "area" varchar(255),
  "responsible_id" uuid,
  "requires_evidence" boolean DEFAULT false,
  "form_fields" jsonb DEFAULT '[]'::jsonb,
  "status" varchar(20) DEFAULT 'activo' CHECK ("status" IN ('activo','inactivo')),
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "program_activities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "program_activities_program_fkey" FOREIGN KEY ("program_id") REFERENCES "qms"."sanitation_programs"("id") ON DELETE CASCADE,
  CONSTRAINT "program_activities_responsible_fkey" FOREIGN KEY ("responsible_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL
);

-- 4.3 Registros de Actividades
CREATE TABLE "qms"."activity_records" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "activity_id" uuid NOT NULL,
  "program_id" uuid NOT NULL,
  "scheduled_date" date NOT NULL,
  "completed_date" timestamptz,
  "status" varchar(20) DEFAULT 'pendiente' CHECK ("status" IN ('pendiente','en_progreso','completado','vencido','no_aplica')),
  "recorded_by" uuid,
  "observations" text,
  "values" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "activity_records_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "activity_records_activity_fkey" FOREIGN KEY ("activity_id") REFERENCES "qms"."program_activities"("id") ON DELETE CASCADE,
  CONSTRAINT "activity_records_program_fkey" FOREIGN KEY ("program_id") REFERENCES "qms"."sanitation_programs"("id") ON DELETE CASCADE,
  CONSTRAINT "activity_records_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL
);

-- 4.4 Evidencias / Archivos Adjuntos
CREATE TABLE "qms"."record_attachments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "record_id" uuid NOT NULL,
  "file_url" text NOT NULL,
  "file_name" varchar(500) NOT NULL,
  "file_type" varchar(100),
  "uploaded_by" uuid,
  "created_at" timestamptz DEFAULT now(),
  CONSTRAINT "record_attachments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "record_attachments_record_fkey" FOREIGN KEY ("record_id") REFERENCES "qms"."activity_records"("id") ON DELETE CASCADE,
  CONSTRAINT "record_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL
);

-- ============================================================================
-- 5. INDEXES
-- ============================================================================

CREATE INDEX "idx_programs_code" ON "qms"."sanitation_programs" ("code");
CREATE INDEX "idx_programs_status" ON "qms"."sanitation_programs" ("status");

CREATE INDEX "idx_activities_program" ON "qms"."program_activities" ("program_id");
CREATE INDEX "idx_activities_status" ON "qms"."program_activities" ("status");
CREATE INDEX "idx_activities_type" ON "qms"."program_activities" ("activity_type");

CREATE INDEX "idx_records_activity" ON "qms"."activity_records" ("activity_id");
CREATE INDEX "idx_records_program" ON "qms"."activity_records" ("program_id");
CREATE INDEX "idx_records_scheduled" ON "qms"."activity_records" ("scheduled_date");
CREATE INDEX "idx_records_status" ON "qms"."activity_records" ("status");

CREATE INDEX "idx_attachments_record" ON "qms"."record_attachments" ("record_id");

-- ============================================================================
-- 6. TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION "qms"."update_updated_at_column"()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "set_updated_at_sanitation_programs"
  BEFORE UPDATE ON "qms"."sanitation_programs"
  FOR EACH ROW EXECUTE FUNCTION "qms"."update_updated_at_column"();

CREATE TRIGGER "set_updated_at_program_activities"
  BEFORE UPDATE ON "qms"."program_activities"
  FOR EACH ROW EXECUTE FUNCTION "qms"."update_updated_at_column"();

CREATE TRIGGER "set_updated_at_activity_records"
  BEFORE UPDATE ON "qms"."activity_records"
  FOR EACH ROW EXECUTE FUNCTION "qms"."update_updated_at_column"();

-- ============================================================================
-- 7. RLS POLICIES
-- ============================================================================

ALTER TABLE "qms"."sanitation_programs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "qms"."program_activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "qms"."activity_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "qms"."record_attachments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all_sanitation_programs" ON "qms"."sanitation_programs"
  FOR ALL USING ("auth"."role"() = 'authenticated');

CREATE POLICY "authenticated_all_program_activities" ON "qms"."program_activities"
  FOR ALL USING ("auth"."role"() = 'authenticated');

CREATE POLICY "authenticated_all_activity_records" ON "qms"."activity_records"
  FOR ALL USING ("auth"."role"() = 'authenticated');

CREATE POLICY "authenticated_all_record_attachments" ON "qms"."record_attachments"
  FOR ALL USING ("auth"."role"() = 'authenticated');

-- ============================================================================
-- 8. STORAGE BUCKET
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('qms-attachments', 'qms-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "authenticated_upload_qms"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'qms-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "public_read_qms"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'qms-attachments');

CREATE POLICY "authenticated_update_qms"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'qms-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "authenticated_delete_qms"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'qms-attachments' AND auth.role() = 'authenticated');

-- ============================================================================
-- 9. SEED DATA - Programas de Saneamiento Básico INVIMA
-- ============================================================================

INSERT INTO "qms"."sanitation_programs" ("name", "description", "code", "icon", "color", "frequency") VALUES
('Programa de Agua Potable', 'Control y monitoreo de la calidad del agua potable. Incluye medición de cloro residual, pH, y limpieza de tanques de almacenamiento.', 'agua_potable', 'Droplets', 'cyan', 'diario'),
('Programa de Gestión Integral de Residuos Sólidos', 'Manejo adecuado de residuos sólidos incluyendo separación en la fuente, almacenamiento temporal, y disposición final con gestores autorizados.', 'residuos_solidos', 'Recycle', 'green', 'diario'),
('Programa de Limpieza y Desinfección', 'Procedimientos operativos estandarizados de saneamiento (POES) para todas las áreas, equipos y utensilios de la planta.', 'limpieza_desinfeccion', 'SprayCan', 'purple', 'diario'),
('Programa de Manejo Integral de Plagas', 'Control preventivo y correctivo de plagas (insectos, roedores, aves) mediante monitoreo de estaciones y servicios de fumigación programados.', 'manejo_plagas', 'Bug', 'orange', 'mensual');

-- Actividades del Programa de Agua Potable
INSERT INTO "qms"."program_activities" ("program_id", "title", "description", "activity_type", "frequency", "area", "requires_evidence", "form_fields") VALUES
((SELECT id FROM "qms"."sanitation_programs" WHERE code = 'agua_potable'), 'Medición de Cloro Residual y pH', 'Registro diario de cloro residual libre y pH del agua en puntos de muestreo', 'monitoreo', 'diario', 'Planta General', true, '[{"name":"cloro_residual","label":"Cloro Residual (mg/L)","type":"number","min":0.3,"max":2.0,"required":true},{"name":"ph","label":"pH","type":"number","min":6.5,"max":9.0,"required":true},{"name":"punto_muestreo","label":"Punto de Muestreo","type":"select","options":["Entrada","Tanque","Producción","Baños"],"required":true},{"name":"temperatura","label":"Temperatura (°C)","type":"number","required":false}]'),
((SELECT id FROM "qms"."sanitation_programs" WHERE code = 'agua_potable'), 'Lavado y Desinfección de Tanques', 'Limpieza y desinfección de tanques de almacenamiento de agua', 'limpieza', 'semestral', 'Tanques de Agua', true, '[{"name":"tanque","label":"Tanque","type":"select","options":["Tanque Principal","Tanque Secundario"],"required":true},{"name":"empresa","label":"Empresa Ejecutora","type":"text","required":true},{"name":"metodo","label":"Método Utilizado","type":"text","required":true}]'),
((SELECT id FROM "qms"."sanitation_programs" WHERE code = 'agua_potable'), 'Análisis Microbiológico de Agua', 'Análisis de laboratorio para verificar calidad microbiológica del agua', 'certificado', 'trimestral', 'Laboratorio Externo', true, '[{"name":"laboratorio","label":"Laboratorio","type":"text","required":true},{"name":"coliformes_totales","label":"Coliformes Totales (UFC/100mL)","type":"number","required":true},{"name":"e_coli","label":"E. Coli (UFC/100mL)","type":"number","required":true},{"name":"cumple","label":"Cumple","type":"select","options":["Sí","No"],"required":true}]');

-- Actividades del Programa de Residuos
INSERT INTO "qms"."program_activities" ("program_id", "title", "description", "activity_type", "frequency", "area", "requires_evidence", "form_fields") VALUES
((SELECT id FROM "qms"."sanitation_programs" WHERE code = 'residuos_solidos'), 'Registro de Generación de Residuos', 'Registro diario de residuos generados por tipo y peso', 'registro', 'diario', 'Cuarto de Residuos', false, '[{"name":"tipo_residuo","label":"Tipo de Residuo","type":"select","options":["Orgánico","Reciclable","Ordinario","Peligroso"],"required":true},{"name":"peso_kg","label":"Peso (kg)","type":"number","required":true},{"name":"disposicion","label":"Disposición","type":"select","options":["Contenedor Orgánico","Contenedor Reciclaje","Contenedor Ordinario","Almacenamiento Temporal"],"required":true}]'),
((SELECT id FROM "qms"."sanitation_programs" WHERE code = 'residuos_solidos'), 'Recolección por Gestor Autorizado', 'Entrega de residuos a gestor ambiental autorizado con certificado de disposición final', 'certificado', 'mensual', 'Zona de Acopio', true, '[{"name":"gestor","label":"Gestor Autorizado","type":"text","required":true},{"name":"peso_total_kg","label":"Peso Total (kg)","type":"number","required":true},{"name":"certificado_num","label":"No. Certificado","type":"text","required":true}]'),
((SELECT id FROM "qms"."sanitation_programs" WHERE code = 'residuos_solidos'), 'Inspección de Puntos Ecológicos', 'Verificación del estado y señalización de puntos ecológicos', 'inspeccion', 'semanal', 'Toda la Planta', false, '[{"name":"punto","label":"Punto Ecológico","type":"select","options":["Producción","Oficinas","Comedor","Entrada"],"required":true},{"name":"estado","label":"Estado","type":"select","options":["Conforme","No Conforme"],"required":true},{"name":"observacion","label":"Observación","type":"text","required":false}]');

-- Actividades del Programa de L&D
INSERT INTO "qms"."program_activities" ("program_id", "title", "description", "activity_type", "frequency", "area", "requires_evidence", "form_fields") VALUES
((SELECT id FROM "qms"."sanitation_programs" WHERE code = 'limpieza_desinfeccion'), 'Limpieza Operacional de Áreas', 'Verificación de limpieza y desinfección de áreas productivas según POES', 'limpieza', 'diario', 'Producción', false, '[{"name":"area","label":"Área","type":"select","options":["Hornos","Mezcladoras","Empaque","Decoración","Almacén MP","Almacén PT","Cuarto Frío"],"required":true},{"name":"turno","label":"Turno","type":"select","options":["Mañana","Tarde","Noche"],"required":true},{"name":"cumple_poes","label":"Cumple POES","type":"select","options":["Sí","No"],"required":true},{"name":"producto_utilizado","label":"Producto Utilizado","type":"text","required":true},{"name":"concentracion","label":"Concentración","type":"text","required":true}]'),
((SELECT id FROM "qms"."sanitation_programs" WHERE code = 'limpieza_desinfeccion'), 'Limpieza Profunda Programada', 'Limpieza y desinfección profunda de áreas según cronograma', 'limpieza', 'semanal', 'Toda la Planta', true, '[{"name":"area","label":"Área","type":"select","options":["Techos","Paredes","Pisos","Desagües","Luminarias","Ventilación"],"required":true},{"name":"metodo","label":"Método","type":"text","required":true},{"name":"responsable","label":"Responsable","type":"text","required":true}]'),
((SELECT id FROM "qms"."sanitation_programs" WHERE code = 'limpieza_desinfeccion'), 'Evaluación Estándar de Limpieza', 'Evaluación visual y/o microbiológica del estado de limpieza por área', 'inspeccion', 'quincenal', 'Todas las Áreas', true, '[{"name":"area_evaluada","label":"Área Evaluada","type":"text","required":true},{"name":"calificacion","label":"Calificación (1-5)","type":"number","min":1,"max":5,"required":true},{"name":"tipo_evaluacion","label":"Tipo Evaluación","type":"select","options":["Visual","Bioluminiscencia","Hisopo"],"required":true},{"name":"resultado","label":"Resultado","type":"select","options":["Aprobado","Rechazado"],"required":true}]'),
((SELECT id FROM "qms"."sanitation_programs" WHERE code = 'limpieza_desinfeccion'), 'Verificación de Productos Químicos', 'Control de inventario y fichas técnicas de productos de limpieza y desinfección', 'registro', 'mensual', 'Almacén Químicos', false, '[{"name":"producto","label":"Producto","type":"text","required":true},{"name":"lote","label":"Lote","type":"text","required":true},{"name":"fecha_vencimiento","label":"Fecha Vencimiento","type":"date","required":true},{"name":"cantidad_disponible","label":"Cantidad Disponible","type":"number","required":true},{"name":"ficha_tecnica","label":"Ficha Técnica Vigente","type":"select","options":["Sí","No"],"required":true}]');

-- Actividades del Programa de Plagas
INSERT INTO "qms"."program_activities" ("program_id", "title", "description", "activity_type", "frequency", "area", "requires_evidence", "form_fields") VALUES
((SELECT id FROM "qms"."sanitation_programs" WHERE code = 'manejo_plagas'), 'Inspección de Estaciones de Monitoreo', 'Revisión de estaciones de cebo, trampas y lámparas UV', 'inspeccion', 'quincenal', 'Perímetro y Planta', false, '[{"name":"tipo_estacion","label":"Tipo Estación","type":"select","options":["Cebo Rodenticida","Trampa Pegante","Lámpara UV","Trampa Mecánica"],"required":true},{"name":"numero_estacion","label":"No. Estación","type":"text","required":true},{"name":"estado","label":"Estado","type":"select","options":["Sin Actividad","Con Actividad","Requiere Cambio","Dañada"],"required":true},{"name":"accion","label":"Acción Tomada","type":"text","required":false}]'),
((SELECT id FROM "qms"."sanitation_programs" WHERE code = 'manejo_plagas'), 'Servicio de Fumigación', 'Aplicación de tratamiento químico por empresa especializada', 'fumigacion', 'mensual', 'Toda la Planta', true, '[{"name":"empresa","label":"Empresa","type":"text","required":true},{"name":"tipo_servicio","label":"Tipo Servicio","type":"select","options":["Desinsectación","Desratización","Desinfección","Integral"],"required":true},{"name":"productos_aplicados","label":"Productos Aplicados","type":"text","required":true},{"name":"certificado_num","label":"No. Certificado","type":"text","required":true},{"name":"tecnico","label":"Técnico Responsable","type":"text","required":true}]'),
((SELECT id FROM "qms"."sanitation_programs" WHERE code = 'manejo_plagas'), 'Diagnóstico de Condiciones Sanitarias', 'Evaluación de condiciones que favorecen la presencia de plagas', 'inspeccion', 'trimestral', 'Toda la Planta', true, '[{"name":"area","label":"Área","type":"text","required":true},{"name":"hallazgo","label":"Hallazgo","type":"select","options":["Conforme","Abertura/Grieta","Acumulación Residuos","Humedad","Vegetación"],"required":true},{"name":"riesgo","label":"Nivel de Riesgo","type":"select","options":["Bajo","Medio","Alto","Crítico"],"required":true},{"name":"accion_correctiva","label":"Acción Correctiva","type":"text","required":false}]');
