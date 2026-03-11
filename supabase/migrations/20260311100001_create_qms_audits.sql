-- ============================================================================
-- QMS Audits Module
-- Internal/External Audits + Corrective Actions
-- ============================================================================

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- 1.1 Checklist templates (Basica, Intermedia, Avanzada)
CREATE TABLE "qms"."audit_checklists" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "level" varchar(20) NOT NULL CHECK ("level" IN ('basica','intermedia','avanzada')),
  "description" text,
  "items" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "status" varchar(20) DEFAULT 'activo' CHECK ("status" IN ('activo','inactivo')),
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "audit_checklists_pkey" PRIMARY KEY ("id")
);

-- 1.2 Internal audits
CREATE TABLE "qms"."internal_audits" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "checklist_id" uuid NOT NULL,
  "title" varchar(255) NOT NULL,
  "audit_date" date NOT NULL,
  "auditor_id" uuid,
  "overall_score" numeric(5,2),
  "total_items" integer DEFAULT 0,
  "conforming_items" integer DEFAULT 0,
  "status" varchar(20) DEFAULT 'en_progreso' CHECK ("status" IN ('en_progreso','completada','cerrada')),
  "observations" text,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "internal_audits_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "internal_audits_checklist_fkey" FOREIGN KEY ("checklist_id") REFERENCES "qms"."audit_checklists"("id") ON DELETE CASCADE,
  CONSTRAINT "internal_audits_auditor_fkey" FOREIGN KEY ("auditor_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL
);

-- 1.3 Audit item results (per-question scoring)
CREATE TABLE "qms"."audit_item_results" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "audit_id" uuid NOT NULL,
  "item_id" varchar(100) NOT NULL,
  "question" text NOT NULL,
  "category" varchar(255),
  "result" varchar(20) NOT NULL CHECK ("result" IN ('conforme','no_conforme','no_aplica')),
  "observations" text,
  "created_at" timestamptz DEFAULT now(),
  CONSTRAINT "audit_item_results_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "audit_item_results_audit_fkey" FOREIGN KEY ("audit_id") REFERENCES "qms"."internal_audits"("id") ON DELETE CASCADE
);

-- 1.4 External audits (free-form)
CREATE TABLE "qms"."external_audits" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "title" varchar(255) NOT NULL,
  "audit_date" date NOT NULL,
  "auditor_name" varchar(255),
  "organization" varchar(255),
  "observations" text,
  "status" varchar(20) DEFAULT 'en_progreso' CHECK ("status" IN ('en_progreso','completada','cerrada')),
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "external_audits_pkey" PRIMARY KEY ("id")
);

-- 1.5 Corrective actions (from internal or external audits)
CREATE TABLE "qms"."corrective_actions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "program_id" uuid NOT NULL,
  "internal_audit_id" uuid,
  "external_audit_id" uuid,
  "audit_item_result_id" uuid,
  "description" text NOT NULL,
  "scheduled_date" date,
  "due_date" date,
  "responsible_id" uuid,
  "status" varchar(20) DEFAULT 'pendiente' CHECK ("status" IN ('pendiente','en_progreso','completada','vencida')),
  "priority" varchar(20) DEFAULT 'media' CHECK ("priority" IN ('baja','media','alta','critica')),
  "resolution_notes" text,
  "completed_date" timestamptz,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "corrective_actions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "corrective_actions_program_fkey" FOREIGN KEY ("program_id") REFERENCES "qms"."sanitation_programs"("id") ON DELETE CASCADE,
  CONSTRAINT "corrective_actions_internal_audit_fkey" FOREIGN KEY ("internal_audit_id") REFERENCES "qms"."internal_audits"("id") ON DELETE SET NULL,
  CONSTRAINT "corrective_actions_external_audit_fkey" FOREIGN KEY ("external_audit_id") REFERENCES "qms"."external_audits"("id") ON DELETE SET NULL,
  CONSTRAINT "corrective_actions_item_result_fkey" FOREIGN KEY ("audit_item_result_id") REFERENCES "qms"."audit_item_results"("id") ON DELETE SET NULL,
  CONSTRAINT "corrective_actions_responsible_fkey" FOREIGN KEY ("responsible_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL
);

-- ============================================================================
-- 2. INDEXES
-- ============================================================================

CREATE INDEX "idx_audit_checklists_level" ON "qms"."audit_checklists" ("level");
CREATE INDEX "idx_internal_audits_status" ON "qms"."internal_audits" ("status");
CREATE INDEX "idx_internal_audits_checklist" ON "qms"."internal_audits" ("checklist_id");
CREATE INDEX "idx_internal_audits_date" ON "qms"."internal_audits" ("audit_date");
CREATE INDEX "idx_audit_item_results_audit" ON "qms"."audit_item_results" ("audit_id");
CREATE INDEX "idx_external_audits_status" ON "qms"."external_audits" ("status");
CREATE INDEX "idx_corrective_actions_program" ON "qms"."corrective_actions" ("program_id");
CREATE INDEX "idx_corrective_actions_status" ON "qms"."corrective_actions" ("status");
CREATE INDEX "idx_corrective_actions_scheduled" ON "qms"."corrective_actions" ("scheduled_date");
CREATE INDEX "idx_corrective_actions_internal_audit" ON "qms"."corrective_actions" ("internal_audit_id");
CREATE INDEX "idx_corrective_actions_external_audit" ON "qms"."corrective_actions" ("external_audit_id");

-- ============================================================================
-- 3. TRIGGERS
-- ============================================================================

CREATE TRIGGER "set_updated_at_audit_checklists"
  BEFORE UPDATE ON "qms"."audit_checklists"
  FOR EACH ROW EXECUTE FUNCTION "qms"."update_updated_at_column"();

CREATE TRIGGER "set_updated_at_internal_audits"
  BEFORE UPDATE ON "qms"."internal_audits"
  FOR EACH ROW EXECUTE FUNCTION "qms"."update_updated_at_column"();

CREATE TRIGGER "set_updated_at_external_audits"
  BEFORE UPDATE ON "qms"."external_audits"
  FOR EACH ROW EXECUTE FUNCTION "qms"."update_updated_at_column"();

CREATE TRIGGER "set_updated_at_corrective_actions"
  BEFORE UPDATE ON "qms"."corrective_actions"
  FOR EACH ROW EXECUTE FUNCTION "qms"."update_updated_at_column"();

-- ============================================================================
-- 4. RLS POLICIES
-- ============================================================================

ALTER TABLE "qms"."audit_checklists" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "qms"."internal_audits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "qms"."audit_item_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "qms"."external_audits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "qms"."corrective_actions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all_audit_checklists" ON "qms"."audit_checklists"
  FOR ALL USING ("auth"."role"() = 'authenticated');

CREATE POLICY "authenticated_all_internal_audits" ON "qms"."internal_audits"
  FOR ALL USING ("auth"."role"() = 'authenticated');

CREATE POLICY "authenticated_all_audit_item_results" ON "qms"."audit_item_results"
  FOR ALL USING ("auth"."role"() = 'authenticated');

CREATE POLICY "authenticated_all_external_audits" ON "qms"."external_audits"
  FOR ALL USING ("auth"."role"() = 'authenticated');

CREATE POLICY "authenticated_all_corrective_actions" ON "qms"."corrective_actions"
  FOR ALL USING ("auth"."role"() = 'authenticated');

-- ============================================================================
-- 5. SEED DATA - Checklist Templates
-- ============================================================================

-- Checklist Basica (~10 preguntas)
INSERT INTO "qms"."audit_checklists" ("name", "level", "description", "items") VALUES
('Lista de Verificacion Basica', 'basica', 'Verificacion rapida de condiciones sanitarias generales. Ideal para auditorias semanales de rutina.',
'[
  {"id":"b1","question":"Las areas de produccion se encuentran limpias y ordenadas","category":"Higiene General"},
  {"id":"b2","question":"Los operarios usan correctamente la dotacion (cofia, tapabocas, guantes)","category":"Higiene General"},
  {"id":"b3","question":"Los lavamanos cuentan con jabon, desinfectante y toallas","category":"Higiene General"},
  {"id":"b4","question":"Los recipientes de residuos estan debidamente identificados y con tapa","category":"Residuos"},
  {"id":"b5","question":"No se evidencia presencia de plagas ni indicios de actividad","category":"Plagas"},
  {"id":"b6","question":"Las estaciones de monitoreo de plagas estan en buen estado","category":"Plagas"},
  {"id":"b7","question":"El agua utilizada cumple con parametros de cloro residual (0.3-2.0 mg/L)","category":"Agua Potable"},
  {"id":"b8","question":"Los productos quimicos de limpieza estan almacenados correctamente","category":"Limpieza"},
  {"id":"b9","question":"Las superficies de contacto con alimentos estan limpias y desinfectadas","category":"Limpieza"},
  {"id":"b10","question":"La documentacion de registros del dia esta al dia","category":"Documentacion"}
]'::jsonb);

-- Checklist Intermedia (~20 preguntas)
INSERT INTO "qms"."audit_checklists" ("name", "level", "description", "items") VALUES
('Lista de Verificacion Intermedia', 'intermedia', 'Verificacion detallada de programas de saneamiento. Recomendada para auditorias mensuales.',
'[
  {"id":"m1","question":"Las areas de produccion se encuentran limpias y ordenadas","category":"Higiene General"},
  {"id":"m2","question":"Los operarios usan correctamente la dotacion completa","category":"Higiene General"},
  {"id":"m3","question":"Se realiza lavado de manos con la frecuencia y tecnica adecuada","category":"Higiene General"},
  {"id":"m4","question":"Los lavamanos cuentan con jabon antibacterial, desinfectante y toallas","category":"Higiene General"},
  {"id":"m5","question":"No se almacenan objetos personales en areas de produccion","category":"Higiene General"},
  {"id":"m6","question":"Los recipientes de residuos estan identificados por tipo y con tapa","category":"Residuos"},
  {"id":"m7","question":"La frecuencia de recoleccion interna de residuos es adecuada","category":"Residuos"},
  {"id":"m8","question":"El cuarto de residuos esta limpio y organizado","category":"Residuos"},
  {"id":"m9","question":"Se cuenta con certificados de disposicion final vigentes","category":"Residuos"},
  {"id":"m10","question":"No se evidencia presencia de plagas ni indicios de actividad","category":"Plagas"},
  {"id":"m11","question":"Las estaciones de monitoreo estan completas y en buen estado","category":"Plagas"},
  {"id":"m12","question":"Se cuenta con certificado de fumigacion vigente","category":"Plagas"},
  {"id":"m13","question":"No existen condiciones que favorezcan la presencia de plagas","category":"Plagas"},
  {"id":"m14","question":"El agua cumple parametros fisicoquimicos (cloro residual y pH)","category":"Agua Potable"},
  {"id":"m15","question":"Los tanques de agua estan protegidos y en buen estado","category":"Agua Potable"},
  {"id":"m16","question":"Se cuenta con analisis microbiologico vigente","category":"Agua Potable"},
  {"id":"m17","question":"Se siguen los POES para limpieza de cada area","category":"Limpieza"},
  {"id":"m18","question":"Los productos quimicos tienen ficha tecnica vigente","category":"Limpieza"},
  {"id":"m19","question":"Las concentraciones de desinfectantes son las correctas","category":"Limpieza"},
  {"id":"m20","question":"Los registros de limpieza diaria estan completos y firmados","category":"Limpieza"}
]'::jsonb);

-- Checklist Avanzada (~35 preguntas)
INSERT INTO "qms"."audit_checklists" ("name", "level", "description", "items") VALUES
('Lista de Verificacion Avanzada INVIMA', 'avanzada', 'Auditoria completa basada en Resolucion 2674/2013. Para auditorias trimestrales o preparacion para visitas INVIMA.',
'[
  {"id":"a1","question":"Las areas de produccion estan limpias, ordenadas y libres de material ajeno","category":"Higiene General"},
  {"id":"a2","question":"Los operarios portan dotacion completa: cofia, tapabocas, delantal, guantes","category":"Higiene General"},
  {"id":"a3","question":"Se realiza lavado y desinfeccion de manos al ingreso y con frecuencia adecuada","category":"Higiene General"},
  {"id":"a4","question":"Los lavamanos son accionamiento no manual y cuentan con todos los insumos","category":"Higiene General"},
  {"id":"a5","question":"No se evidencian objetos personales, alimentos o bebidas en areas de produccion","category":"Higiene General"},
  {"id":"a6","question":"El personal no presenta heridas expuestas, enfermedades respiratorias o cutaneas","category":"Higiene General"},
  {"id":"a7","question":"Existe y se cumple el programa de capacitacion en BPM","category":"Higiene General"},
  {"id":"a8","question":"Los puntos ecologicos estan correctamente identificados y en buen estado","category":"Residuos"},
  {"id":"a9","question":"La separacion en la fuente se realiza correctamente","category":"Residuos"},
  {"id":"a10","question":"La frecuencia de recoleccion interna evita acumulacion","category":"Residuos"},
  {"id":"a11","question":"El cuarto de residuos cumple condiciones: piso lavable, drenaje, ventilacion","category":"Residuos"},
  {"id":"a12","question":"Se cuenta con PGIRS documentado y actualizado","category":"Residuos"},
  {"id":"a13","question":"Los certificados de disposicion final estan vigentes y archivados","category":"Residuos"},
  {"id":"a14","question":"No se evidencia presencia de plagas (insectos, roedores, aves)","category":"Plagas"},
  {"id":"a15","question":"Todas las estaciones de cebo y trampas estan numeradas y en buen estado","category":"Plagas"},
  {"id":"a16","question":"El mapa de ubicacion de estaciones esta actualizado","category":"Plagas"},
  {"id":"a17","question":"Los productos utilizados en fumigacion tienen registro sanitario vigente","category":"Plagas"},
  {"id":"a18","question":"El certificado de fumigacion esta vigente y la empresa tiene licencia","category":"Plagas"},
  {"id":"a19","question":"Las condiciones fisicas de la planta previenen ingreso de plagas (angeos, sellado)","category":"Plagas"},
  {"id":"a20","question":"Los registros de monitoreo de estaciones estan al dia","category":"Plagas"},
  {"id":"a21","question":"El cloro residual del agua esta entre 0.3 y 2.0 mg/L","category":"Agua Potable"},
  {"id":"a22","question":"El pH del agua esta entre 6.5 y 9.0","category":"Agua Potable"},
  {"id":"a23","question":"Se realizan mediciones diarias de cloro y pH","category":"Agua Potable"},
  {"id":"a24","question":"Los tanques de almacenamiento estan protegidos, limpios y con tapa","category":"Agua Potable"},
  {"id":"a25","question":"El lavado de tanques se realiza semestralmente con certificado","category":"Agua Potable"},
  {"id":"a26","question":"El analisis microbiologico trimestral esta vigente y conforme","category":"Agua Potable"},
  {"id":"a27","question":"Se tiene identificada la fuente de agua y cumple normatividad","category":"Agua Potable"},
  {"id":"a28","question":"Existen POES documentados para cada area, equipo y utensilio","category":"Limpieza"},
  {"id":"a29","question":"Los POES especifican producto, concentracion, frecuencia y responsable","category":"Limpieza"},
  {"id":"a30","question":"Se siguen los POES en la practica (verificacion en campo)","category":"Limpieza"},
  {"id":"a31","question":"Los productos quimicos tienen ficha tecnica y hoja de seguridad","category":"Limpieza"},
  {"id":"a32","question":"Las concentraciones de uso son las indicadas por el fabricante","category":"Limpieza"},
  {"id":"a33","question":"Se realizan evaluaciones de limpieza (visual, hisopo, bioluminiscencia)","category":"Limpieza"},
  {"id":"a34","question":"Los resultados de evaluaciones de limpieza son conformes","category":"Limpieza"},
  {"id":"a35","question":"Los registros de limpieza diaria, profunda y evaluaciones estan completos","category":"Limpieza"}
]'::jsonb);
