-- ============================================================================
-- MANTENIMIENTO (Maintenance Management) Schema
-- Gestion de Equipos, Ordenes de Trabajo, Cronogramas de Mantenimiento
-- ============================================================================

-- 1. CREATE SCHEMA
CREATE SCHEMA IF NOT EXISTS "mantenimiento";

-- 2. GRANT PERMISSIONS
GRANT USAGE ON SCHEMA "mantenimiento" TO "anon", "authenticated", "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "mantenimiento"
  GRANT ALL ON TABLES TO "postgres", "anon", "authenticated", "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "mantenimiento"
  GRANT ALL ON SEQUENCES TO "postgres", "anon", "authenticated", "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "mantenimiento"
  GRANT ALL ON FUNCTIONS TO "postgres", "anon", "authenticated", "service_role";

-- 3. EXPOSE SCHEMA VIA API
ALTER ROLE "authenticator" SET pgrst.db_schemas TO 'public,produccion,compras,inventario,visitas,workflows,qms,mantenimiento';
NOTIFY pgrst, 'reload config';

-- ============================================================================
-- 4. TABLES
-- ============================================================================

-- 4.1 Categorias de Equipos
CREATE TABLE "mantenimiento"."equipment_categories" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(100) NOT NULL UNIQUE,
  "description" text,
  "icon" varchar(50),
  "color" varchar(50),
  "created_at" timestamptz DEFAULT now(),
  CONSTRAINT "equipment_categories_pkey" PRIMARY KEY ("id")
);

-- 4.2 Equipos
CREATE TABLE "mantenimiento"."equipment" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "category_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "code" varchar(50) UNIQUE,
  "brand" varchar(100),
  "model" varchar(100),
  "serial_number" varchar(100),
  "year" integer,
  "location" varchar(255),
  "voltage" varchar(50),
  "power" varchar(50),
  "capacity" varchar(100),
  "dimensions" varchar(100),
  "weight" varchar(50),
  "supplier" varchar(255),
  "supplier_phone" varchar(50),
  "purchase_date" date,
  "warranty_expiry" date,
  "photo_url" text,
  "manual_url" text,
  "status" varchar(20) DEFAULT 'operativo' CHECK ("status" IN ('operativo','en_mantenimiento','fuera_servicio','dado_de_baja')),
  "notes" text,
  "specs" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "equipment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "equipment_category_fkey" FOREIGN KEY ("category_id") REFERENCES "mantenimiento"."equipment_categories"("id") ON DELETE RESTRICT
);

-- 4.3 Repuestos
CREATE TABLE "mantenimiento"."spare_parts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "equipment_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "part_number" varchar(100),
  "supplier" varchar(255),
  "quantity_in_stock" integer DEFAULT 0,
  "minimum_stock" integer DEFAULT 1,
  "unit_cost" numeric(12,2),
  "notes" text,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "spare_parts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "spare_parts_equipment_fkey" FOREIGN KEY ("equipment_id") REFERENCES "mantenimiento"."equipment"("id") ON DELETE CASCADE
);

-- 4.4 Cronograma de Mantenimiento (Templates)
CREATE TABLE "mantenimiento"."maintenance_schedules" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "equipment_id" uuid NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "maintenance_type" varchar(30) DEFAULT 'preventivo' CHECK ("maintenance_type" IN ('preventivo','correctivo','predictivo')),
  "frequency" varchar(30) DEFAULT 'mensual' CHECK ("frequency" IN ('diario','semanal','quincenal','mensual','trimestral','semestral','anual')),
  "checklist" jsonb DEFAULT '[]'::jsonb,
  "responsible" varchar(255),
  "estimated_duration_minutes" integer,
  "next_due_date" date,
  "status" varchar(20) DEFAULT 'activo' CHECK ("status" IN ('activo','inactivo')),
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "maintenance_schedules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "maintenance_schedules_equipment_fkey" FOREIGN KEY ("equipment_id") REFERENCES "mantenimiento"."equipment"("id") ON DELETE CASCADE
);

-- 4.5 Ordenes de Trabajo
CREATE TABLE "mantenimiento"."work_orders" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "order_number" serial,
  "equipment_id" uuid NOT NULL,
  "schedule_id" uuid,
  "title" varchar(255) NOT NULL,
  "description" text,
  "maintenance_type" varchar(30) DEFAULT 'preventivo' CHECK ("maintenance_type" IN ('preventivo','correctivo','predictivo')),
  "priority" varchar(20) DEFAULT 'media' CHECK ("priority" IN ('baja','media','alta','critica')),
  "status" varchar(20) DEFAULT 'pendiente' CHECK ("status" IN ('pendiente','en_progreso','completada','cancelada')),
  "checklist" jsonb DEFAULT '[]'::jsonb,
  "assigned_to" varchar(255),
  "requested_by" uuid,
  "scheduled_date" date,
  "started_at" timestamptz,
  "completed_at" timestamptz,
  "cost" numeric(12,2),
  "spare_parts_used" jsonb DEFAULT '[]'::jsonb,
  "observations" text,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_orders_equipment_fkey" FOREIGN KEY ("equipment_id") REFERENCES "mantenimiento"."equipment"("id") ON DELETE RESTRICT,
  CONSTRAINT "work_orders_schedule_fkey" FOREIGN KEY ("schedule_id") REFERENCES "mantenimiento"."maintenance_schedules"("id") ON DELETE SET NULL,
  CONSTRAINT "work_orders_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL
);

-- 4.6 Hojas de Vida (Equipment Life Records)
CREATE TABLE "mantenimiento"."equipment_life_records" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "equipment_id" uuid NOT NULL,
  "work_order_id" uuid,
  "record_date" date NOT NULL DEFAULT CURRENT_DATE,
  "intervention_type" varchar(30) DEFAULT 'preventivo' CHECK ("intervention_type" IN ('preventivo','correctivo','predictivo','instalacion','calibracion','inspeccion')),
  "description" text NOT NULL,
  "technician" varchar(255),
  "cost" numeric(12,2),
  "spare_parts_used" text,
  "downtime_hours" numeric(6,2),
  "observations" text,
  "recorded_by" uuid,
  "created_at" timestamptz DEFAULT now(),
  CONSTRAINT "equipment_life_records_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "equipment_life_records_equipment_fkey" FOREIGN KEY ("equipment_id") REFERENCES "mantenimiento"."equipment"("id") ON DELETE CASCADE,
  CONSTRAINT "equipment_life_records_work_order_fkey" FOREIGN KEY ("work_order_id") REFERENCES "mantenimiento"."work_orders"("id") ON DELETE SET NULL,
  CONSTRAINT "equipment_life_records_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL
);

-- 4.7 Registros Diarios
CREATE TABLE "mantenimiento"."daily_logs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "equipment_id" uuid NOT NULL,
  "log_date" date NOT NULL DEFAULT CURRENT_DATE,
  "shift" varchar(20) DEFAULT 'manana' CHECK ("shift" IN ('manana','tarde','noche')),
  "checks" jsonb DEFAULT '{}'::jsonb,
  "temperature" numeric(6,2),
  "vibration" numeric(6,2),
  "observations" text,
  "recorded_by" uuid,
  "created_at" timestamptz DEFAULT now(),
  CONSTRAINT "daily_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "daily_logs_equipment_fkey" FOREIGN KEY ("equipment_id") REFERENCES "mantenimiento"."equipment"("id") ON DELETE CASCADE,
  CONSTRAINT "daily_logs_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL
);

-- 4.8 Cronograma de Infraestructura
CREATE TABLE "mantenimiento"."infrastructure_schedules" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "area" varchar(100) NOT NULL,
  "category" varchar(50) NOT NULL CHECK ("category" IN ('electrico','hidraulico','estructural','sanitario','ventilacion','iluminacion','pisos','otro')),
  "title" varchar(255) NOT NULL,
  "description" text,
  "frequency" varchar(30) DEFAULT 'mensual' CHECK ("frequency" IN ('diario','semanal','quincenal','mensual','trimestral','semestral','anual')),
  "responsible" varchar(255),
  "next_due_date" date,
  "last_completed_date" date,
  "status" varchar(20) DEFAULT 'activo' CHECK ("status" IN ('activo','inactivo','vencido')),
  "notes" text,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "infrastructure_schedules_pkey" PRIMARY KEY ("id")
);

-- 4.9 Attachments (Polymorphic)
CREATE TABLE "mantenimiento"."attachments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "entity_type" varchar(50) NOT NULL CHECK ("entity_type" IN ('equipment','work_order','life_record','daily_log','infrastructure')),
  "entity_id" uuid NOT NULL,
  "file_url" text NOT NULL,
  "file_name" varchar(500) NOT NULL,
  "file_type" varchar(100),
  "uploaded_by" uuid,
  "created_at" timestamptz DEFAULT now(),
  CONSTRAINT "attachments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL
);

-- ============================================================================
-- 5. INDEXES
-- ============================================================================

CREATE INDEX "idx_equipment_category" ON "mantenimiento"."equipment" ("category_id");
CREATE INDEX "idx_equipment_status" ON "mantenimiento"."equipment" ("status");
CREATE INDEX "idx_equipment_code" ON "mantenimiento"."equipment" ("code");

CREATE INDEX "idx_spare_parts_equipment" ON "mantenimiento"."spare_parts" ("equipment_id");

CREATE INDEX "idx_schedules_equipment" ON "mantenimiento"."maintenance_schedules" ("equipment_id");
CREATE INDEX "idx_schedules_next_due" ON "mantenimiento"."maintenance_schedules" ("next_due_date");
CREATE INDEX "idx_schedules_status" ON "mantenimiento"."maintenance_schedules" ("status");

CREATE INDEX "idx_work_orders_equipment" ON "mantenimiento"."work_orders" ("equipment_id");
CREATE INDEX "idx_work_orders_status" ON "mantenimiento"."work_orders" ("status");
CREATE INDEX "idx_work_orders_scheduled" ON "mantenimiento"."work_orders" ("scheduled_date");
CREATE INDEX "idx_work_orders_type" ON "mantenimiento"."work_orders" ("maintenance_type");

CREATE INDEX "idx_life_records_equipment" ON "mantenimiento"."equipment_life_records" ("equipment_id");
CREATE INDEX "idx_life_records_date" ON "mantenimiento"."equipment_life_records" ("record_date");

CREATE INDEX "idx_daily_logs_equipment" ON "mantenimiento"."daily_logs" ("equipment_id");
CREATE INDEX "idx_daily_logs_date" ON "mantenimiento"."daily_logs" ("log_date");

CREATE INDEX "idx_infra_schedules_category" ON "mantenimiento"."infrastructure_schedules" ("category");
CREATE INDEX "idx_infra_schedules_next_due" ON "mantenimiento"."infrastructure_schedules" ("next_due_date");

CREATE INDEX "idx_attachments_entity" ON "mantenimiento"."attachments" ("entity_type", "entity_id");

-- ============================================================================
-- 6. TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION "mantenimiento"."update_updated_at_column"()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "set_updated_at_equipment"
  BEFORE UPDATE ON "mantenimiento"."equipment"
  FOR EACH ROW EXECUTE FUNCTION "mantenimiento"."update_updated_at_column"();

CREATE TRIGGER "set_updated_at_spare_parts"
  BEFORE UPDATE ON "mantenimiento"."spare_parts"
  FOR EACH ROW EXECUTE FUNCTION "mantenimiento"."update_updated_at_column"();

CREATE TRIGGER "set_updated_at_maintenance_schedules"
  BEFORE UPDATE ON "mantenimiento"."maintenance_schedules"
  FOR EACH ROW EXECUTE FUNCTION "mantenimiento"."update_updated_at_column"();

CREATE TRIGGER "set_updated_at_work_orders"
  BEFORE UPDATE ON "mantenimiento"."work_orders"
  FOR EACH ROW EXECUTE FUNCTION "mantenimiento"."update_updated_at_column"();

CREATE TRIGGER "set_updated_at_infrastructure_schedules"
  BEFORE UPDATE ON "mantenimiento"."infrastructure_schedules"
  FOR EACH ROW EXECUTE FUNCTION "mantenimiento"."update_updated_at_column"();

-- ============================================================================
-- 7. RLS POLICIES
-- ============================================================================

ALTER TABLE "mantenimiento"."equipment_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mantenimiento"."equipment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mantenimiento"."spare_parts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mantenimiento"."maintenance_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mantenimiento"."work_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mantenimiento"."equipment_life_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mantenimiento"."daily_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mantenimiento"."infrastructure_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mantenimiento"."attachments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all_equipment_categories" ON "mantenimiento"."equipment_categories"
  FOR ALL USING ("auth"."role"() = 'authenticated');

CREATE POLICY "authenticated_all_equipment" ON "mantenimiento"."equipment"
  FOR ALL USING ("auth"."role"() = 'authenticated');

CREATE POLICY "authenticated_all_spare_parts" ON "mantenimiento"."spare_parts"
  FOR ALL USING ("auth"."role"() = 'authenticated');

CREATE POLICY "authenticated_all_maintenance_schedules" ON "mantenimiento"."maintenance_schedules"
  FOR ALL USING ("auth"."role"() = 'authenticated');

CREATE POLICY "authenticated_all_work_orders" ON "mantenimiento"."work_orders"
  FOR ALL USING ("auth"."role"() = 'authenticated');

CREATE POLICY "authenticated_all_equipment_life_records" ON "mantenimiento"."equipment_life_records"
  FOR ALL USING ("auth"."role"() = 'authenticated');

CREATE POLICY "authenticated_all_daily_logs" ON "mantenimiento"."daily_logs"
  FOR ALL USING ("auth"."role"() = 'authenticated');

CREATE POLICY "authenticated_all_infrastructure_schedules" ON "mantenimiento"."infrastructure_schedules"
  FOR ALL USING ("auth"."role"() = 'authenticated');

CREATE POLICY "authenticated_all_attachments" ON "mantenimiento"."attachments"
  FOR ALL USING ("auth"."role"() = 'authenticated');

-- ============================================================================
-- 8. STORAGE BUCKET
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('mantenimiento-attachments', 'mantenimiento-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "authenticated_upload_mantenimiento"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'mantenimiento-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "public_read_mantenimiento"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'mantenimiento-attachments');

CREATE POLICY "authenticated_update_mantenimiento"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'mantenimiento-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "authenticated_delete_mantenimiento"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'mantenimiento-attachments' AND auth.role() = 'authenticated');

-- ============================================================================
-- 9. SEED DATA
-- ============================================================================

-- 9.1 Categorias
INSERT INTO "mantenimiento"."equipment_categories" ("name", "description", "icon", "color") VALUES
('Produccion', 'Equipos directamente involucrados en el proceso productivo de panaderia y pasteleria', 'Factory', 'blue'),
('Refrigeracion', 'Equipos de frio, congelacion y conservacion de materias primas y producto terminado', 'Thermometer', 'cyan'),
('Auxiliar', 'Equipos de soporte, empaque, transporte y servicios generales', 'Wrench', 'amber');

-- 9.2 Equipos de Produccion
INSERT INTO "mantenimiento"."equipment" ("category_id", "name", "code", "brand", "model", "serial_number", "location", "voltage", "power", "capacity", "dimensions", "supplier", "status", "specs") VALUES
-- Hornos
((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Produccion'),
 'Horno Rotativo 1', 'HR-001', 'Bongard', '8.64E', 'BNG-2019-001', 'Area de Hornos', '220V Trifasico', '45 kW', '18 bandejas 60x80cm', '180x130x250 cm', 'Bongard Colombia', 'operativo',
 '{"combustible":"Gas natural","temperatura_max":"300°C","sistema_vapor":"Automatico","tipo_quemador":"Modulante","consumo_gas":"6 m3/h"}'::jsonb),

((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Produccion'),
 'Horno Rotativo 2', 'HR-002', 'Bongard', '8.64E', 'BNG-2019-002', 'Area de Hornos', '220V Trifasico', '45 kW', '18 bandejas 60x80cm', '180x130x250 cm', 'Bongard Colombia', 'operativo',
 '{"combustible":"Gas natural","temperatura_max":"300°C","sistema_vapor":"Automatico","tipo_quemador":"Modulante","consumo_gas":"6 m3/h"}'::jsonb),

((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Produccion'),
 'Horno de Piso', 'HP-001', 'Pavailler', 'Topaze', 'PAV-2018-001', 'Area de Hornos', '220V Trifasico', '35 kW', '3 pisos, 9 bandejas', '200x150x180 cm', 'Pavailler SAS', 'operativo',
 '{"combustible":"Gas natural","temperatura_max":"350°C","pisos":3,"sistema_vapor":"Manual","tipo":"Piso refractario"}'::jsonb),

-- Amasadoras/Mezcladoras
((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Produccion'),
 'Amasadora Espiral 120L', 'AE-001', 'VMI', 'Berto 120', 'VMI-2020-001', 'Area de Amasado', '220V Trifasico', '7.5 kW', '120 litros / 75 kg harina', '90x55x130 cm', 'VMI Americas', 'operativo',
 '{"velocidades":2,"bol_extraible":true,"temporizador":"Digital","tipo":"Espiral","material_bol":"Acero inoxidable"}'::jsonb),

((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Produccion'),
 'Amasadora Espiral 80L', 'AE-002', 'VMI', 'Berto 80', 'VMI-2020-002', 'Area de Amasado', '220V Trifasico', '5.5 kW', '80 litros / 50 kg harina', '75x45x115 cm', 'VMI Americas', 'operativo',
 '{"velocidades":2,"bol_extraible":true,"temporizador":"Digital","tipo":"Espiral","material_bol":"Acero inoxidable"}'::jsonb),

((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Produccion'),
 'Batidora Planetaria 60L', 'BP-001', 'Hobart', 'H600', 'HOB-2019-001', 'Area de Pasteleria', '220V Monofasico', '2.2 kW', '60 litros', '65x55x130 cm', 'Hobart Colombia', 'operativo',
 '{"velocidades":3,"accesorios":"Globo, Paleta, Gancho","tipo":"Planetaria","material":"Acero inoxidable"}'::jsonb),

((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Produccion'),
 'Batidora Planetaria 40L', 'BP-002', 'Hobart', 'HL400', 'HOB-2019-002', 'Area de Pasteleria', '220V Monofasico', '1.5 kW', '40 litros', '55x50x110 cm', 'Hobart Colombia', 'operativo',
 '{"velocidades":3,"accesorios":"Globo, Paleta, Gancho","tipo":"Planetaria","material":"Acero inoxidable"}'::jsonb),

-- Laminadoras y formadoras
((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Produccion'),
 'Laminadora de Masa', 'LM-001', 'Rondo', 'Compas 2000', 'RND-2020-001', 'Area de Laminado', '220V Trifasico', '3 kW', 'Ancho 600mm', '200x80x120 cm', 'Rondo AG', 'operativo',
 '{"tipo":"Automatica","ancho_trabajo":"600mm","espesor_min":"1mm","espesor_max":"40mm","banda":"Teflon"}'::jsonb),

((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Produccion'),
 'Divisora Boleadora', 'DB-001', 'Erika Record', 'SD180', 'ERK-2019-001', 'Area de Formado', '220V Trifasico', '2.2 kW', '180-1800g, 30 pcs/min', '80x70x160 cm', 'Erika Record', 'operativo',
 '{"tipo":"Semi-automatica","rango_peso":"180-1800g","piezas_minuto":30,"material":"Acero inoxidable"}'::jsonb),

((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Produccion'),
 'Formadora de Pan', 'FP-001', 'Bongard', 'FAR/2', 'BNG-2020-001', 'Area de Formado', '220V Trifasico', '1.5 kW', '60 piezas/min', '200x65x120 cm', 'Bongard Colombia', 'operativo',
 '{"tipo":"Automatica","velocidad":"60 pcs/min","ancho_banda":"520mm"}'::jsonb),

-- Otros equipos de produccion
((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Produccion'),
 'Camara de Fermentacion', 'CF-001', 'Bongard', 'BFC16', 'BNG-2019-003', 'Area de Fermentacion', '220V Monofasico', '3.5 kW', '16 carros', '300x250x240 cm', 'Bongard Colombia', 'operativo',
 '{"temperatura_rango":"0-40°C","humedad_rango":"50-95%","control":"Digital programable","carros":16}'::jsonb),

((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Produccion'),
 'Camara de Fermentacion 2', 'CF-002', 'Bongard', 'BFC8', 'BNG-2019-004', 'Area de Fermentacion', '220V Monofasico', '2.5 kW', '8 carros', '200x200x240 cm', 'Bongard Colombia', 'operativo',
 '{"temperatura_rango":"0-40°C","humedad_rango":"50-95%","control":"Digital programable","carros":8}'::jsonb),

((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Produccion'),
 'Dosificador de Agua', 'DA-001', 'Diosna', 'WPM60', 'DIO-2020-001', 'Area de Amasado', '220V Monofasico', '0.5 kW', '60L/min', '40x35x120 cm', 'Diosna GmbH', 'operativo',
 '{"tipo":"Volumetrico con enfriamiento","rango_temperatura":"2-40°C","precision":"0.5%","pantalla":"Digital"}'::jsonb);

-- 9.3 Equipos de Refrigeracion
INSERT INTO "mantenimiento"."equipment" ("category_id", "name", "code", "brand", "model", "serial_number", "location", "voltage", "power", "capacity", "dimensions", "supplier", "status", "specs") VALUES
((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Refrigeracion'),
 'Cuarto Frio Materias Primas', 'CF-MP-001', 'Bohn', 'ADT090', 'BOH-2018-001', 'Almacen MP', '220V Trifasico', '5 kW', '25 m3', '500x300x280 cm', 'Bohn Heatcraft', 'operativo',
 '{"temperatura_trabajo":"2-8°C","refrigerante":"R-404A","tipo_evaporador":"Forzado","espesor_panel":"100mm","aislamiento":"Poliuretano"}'::jsonb),

((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Refrigeracion'),
 'Cuarto Frio Producto Terminado', 'CF-PT-001', 'Bohn', 'ADT120', 'BOH-2018-002', 'Almacen PT', '220V Trifasico', '7 kW', '35 m3', '600x350x280 cm', 'Bohn Heatcraft', 'operativo',
 '{"temperatura_trabajo":"2-8°C","refrigerante":"R-404A","tipo_evaporador":"Forzado","espesor_panel":"100mm","aislamiento":"Poliuretano"}'::jsonb),

((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Refrigeracion'),
 'Congelador Industrial', 'CG-001', 'Bohn', 'BHL300', 'BOH-2019-001', 'Almacen Congelados', '220V Trifasico', '10 kW', '30 m3', '400x300x280 cm', 'Bohn Heatcraft', 'operativo',
 '{"temperatura_trabajo":"-18 a -22°C","refrigerante":"R-404A","tipo_evaporador":"Forzado","espesor_panel":"150mm","aislamiento":"Poliuretano"}'::jsonb),

((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Refrigeracion'),
 'Nevera Vertical Exhibicion', 'NV-001', 'True', 'T-49', 'TRU-2020-001', 'Zona Despacho', '110V Monofasico', '0.75 kW', '1388 litros', '137x75x199 cm', 'True Manufacturing', 'operativo',
 '{"temperatura_trabajo":"1-7°C","puertas":2,"estantes":6,"iluminacion":"LED","refrigerante":"R-290"}'::jsonb);

-- 9.4 Equipos Auxiliares
INSERT INTO "mantenimiento"."equipment" ("category_id", "name", "code", "brand", "model", "serial_number", "location", "voltage", "power", "capacity", "dimensions", "supplier", "status", "specs") VALUES
((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Auxiliar'),
 'Empacadora al Vacio', 'EV-001', 'Multivac', 'C200', 'MUL-2020-001', 'Area de Empaque', '220V Monofasico', '1.2 kW', 'Camara 420x320mm', '52x44x45 cm', 'Multivac Colombia', 'operativo',
 '{"tipo":"Campana","ciclo":"20-30 seg","barra_sellado":"420mm","presion_vacio":"99.8%"}'::jsonb),

((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Auxiliar'),
 'Selladora de Bolsas', 'SB-001', 'Audion', 'Sealkid 321', 'AUD-2020-001', 'Area de Empaque', '110V Monofasico', '0.6 kW', 'Sellado hasta 310mm', '35x15x20 cm', 'Audion Elektro', 'operativo',
 '{"tipo":"Impulso","ancho_sellado":"310mm","tiempo_sellado":"Ajustable"}'::jsonb),

((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Auxiliar'),
 'Bascula Digital Industrial', 'BD-001', 'Ohaus', 'Defender 5000', 'OHA-2020-001', 'Area de Pesaje', '110V Monofasico', '0.02 kW', '150 kg', '50x40x90 cm', 'Ohaus Colombia', 'operativo',
 '{"precision":"0.02 kg","unidades":"kg/lb/oz","plataforma":"Acero inoxidable","conectividad":"RS232, USB"}'::jsonb),

((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Auxiliar'),
 'Compresor de Aire', 'CA-001', 'Atlas Copco', 'GA11', 'ATC-2019-001', 'Cuarto de Maquinas', '220V Trifasico', '11 kW', '1.71 m3/min', '120x70x115 cm', 'Atlas Copco Colombia', 'operativo',
 '{"tipo":"Tornillo","presion_max":"10 bar","tanque":"270L","aceite":"Roto-Inject Fluid"}'::jsonb),

((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Auxiliar'),
 'Planta Electrica', 'PE-001', 'Cummins', 'C150D5', 'CUM-2018-001', 'Cuarto de Maquinas', '220V Trifasico', '150 kVA', '120 kW', '280x110x170 cm', 'Cummins Colombia', 'operativo',
 '{"combustible":"Diesel","tanque":"350L","autonomia":"12 horas","transferencia":"Automatica","motor":"QSB7"}'::jsonb);

-- 9.5 Cronograma de Mantenimiento para equipos principales
INSERT INTO "mantenimiento"."maintenance_schedules" ("equipment_id", "title", "description", "maintenance_type", "frequency", "checklist", "responsible", "estimated_duration_minutes", "next_due_date") VALUES
-- Hornos
((SELECT id FROM "mantenimiento"."equipment" WHERE code = 'HR-001'),
 'Mantenimiento Preventivo Horno Rotativo 1', 'Limpieza de quemadores, revision de rodamientos, calibracion de temperatura, inspeccion de sellos y empaques',
 'preventivo', 'mensual',
 '[{"item":"Limpiar quemadores","done":false},{"item":"Revisar rodamientos del carro","done":false},{"item":"Calibrar termostato","done":false},{"item":"Inspeccionar sellos de puerta","done":false},{"item":"Verificar sistema de vapor","done":false},{"item":"Revisar correas y poleas","done":false},{"item":"Lubricar partes moviles","done":false}]'::jsonb,
 'Tecnico Bongard', 120, '2026-04-01'),

((SELECT id FROM "mantenimiento"."equipment" WHERE code = 'HR-002'),
 'Mantenimiento Preventivo Horno Rotativo 2', 'Limpieza de quemadores, revision de rodamientos, calibracion de temperatura',
 'preventivo', 'mensual',
 '[{"item":"Limpiar quemadores","done":false},{"item":"Revisar rodamientos del carro","done":false},{"item":"Calibrar termostato","done":false},{"item":"Inspeccionar sellos de puerta","done":false},{"item":"Verificar sistema de vapor","done":false},{"item":"Revisar correas y poleas","done":false},{"item":"Lubricar partes moviles","done":false}]'::jsonb,
 'Tecnico Bongard', 120, '2026-04-01'),

-- Amasadoras
((SELECT id FROM "mantenimiento"."equipment" WHERE code = 'AE-001'),
 'Mantenimiento Preventivo Amasadora 120L', 'Revision de correas, engranajes, lubricacion y verificacion electrica',
 'preventivo', 'trimestral',
 '[{"item":"Revisar correas de transmision","done":false},{"item":"Lubricar engranajes","done":false},{"item":"Verificar ajuste del gancho","done":false},{"item":"Revisar conexiones electricas","done":false},{"item":"Limpiar motor y ventilador","done":false}]'::jsonb,
 'Tecnico VMI', 90, '2026-06-01'),

-- Cuartos frios
((SELECT id FROM "mantenimiento"."equipment" WHERE code = 'CF-MP-001'),
 'Mantenimiento Preventivo Cuarto Frio MP', 'Limpieza de evaporador, revision de refrigerante, verificacion de sellos y drenaje',
 'preventivo', 'trimestral',
 '[{"item":"Limpiar evaporador","done":false},{"item":"Verificar nivel de refrigerante","done":false},{"item":"Revisar empaques de puerta","done":false},{"item":"Limpiar drenaje","done":false},{"item":"Verificar temperatura real vs display","done":false},{"item":"Revisar compresor","done":false}]'::jsonb,
 'Tecnico Refrigeracion', 90, '2026-05-01'),

-- Compresor
((SELECT id FROM "mantenimiento"."equipment" WHERE code = 'CA-001'),
 'Mantenimiento Preventivo Compresor', 'Cambio de filtros, verificacion de aceite, drenaje de condensado',
 'preventivo', 'trimestral',
 '[{"item":"Cambiar filtro de aire","done":false},{"item":"Verificar nivel de aceite","done":false},{"item":"Drenar condensado del tanque","done":false},{"item":"Revisar presion de trabajo","done":false},{"item":"Inspeccionar mangueras y conexiones","done":false}]'::jsonb,
 'Tecnico Atlas Copco', 60, '2026-05-15'),

-- Planta electrica
((SELECT id FROM "mantenimiento"."equipment" WHERE code = 'PE-001'),
 'Mantenimiento Preventivo Planta Electrica', 'Prueba de arranque, revision de baterias, verificacion de combustible y filtros',
 'preventivo', 'mensual',
 '[{"item":"Prueba de arranque en vacio","done":false},{"item":"Verificar nivel de combustible","done":false},{"item":"Revisar nivel de aceite motor","done":false},{"item":"Verificar baterias","done":false},{"item":"Revisar transferencia automatica","done":false},{"item":"Inspeccionar conexiones electricas","done":false}]'::jsonb,
 'Tecnico Cummins', 60, '2026-04-01');

-- 9.6 Cronograma de Infraestructura
INSERT INTO "mantenimiento"."infrastructure_schedules" ("area", "category", "title", "description", "frequency", "responsible", "next_due_date", "status") VALUES
('Planta General', 'electrico', 'Revision Tableros Electricos', 'Verificacion de tableros de distribucion, breakers, conexiones y aterrizamiento', 'trimestral', 'Electricista Contratista', '2026-04-15', 'activo'),
('Planta General', 'electrico', 'Termografia Electrica', 'Analisis termografico de tableros y conexiones para detectar puntos calientes', 'semestral', 'Empresa Especializada', '2026-06-01', 'activo'),
('Planta General', 'hidraulico', 'Revision Red Hidraulica', 'Inspeccion de tuberias, valvulas, llaves y desagues. Deteccion de fugas', 'trimestral', 'Plomero Contratista', '2026-04-20', 'activo'),
('Planta General', 'hidraulico', 'Limpieza Trampa de Grasas', 'Limpieza y desinfeccion de trampa de grasas y verificacion de funcionamiento', 'mensual', 'Personal Mantenimiento', '2026-04-01', 'activo'),
('Produccion', 'ventilacion', 'Limpieza Ductos de Extraccion', 'Limpieza de campanas extractoras, ductos y filtros de grasa', 'trimestral', 'Empresa Especializada', '2026-05-01', 'activo'),
('Produccion', 'ventilacion', 'Revision Ventiladores Industriales', 'Verificacion de funcionamiento, limpieza de aspas y revision de motores', 'mensual', 'Personal Mantenimiento', '2026-04-01', 'activo'),
('Planta General', 'estructural', 'Inspeccion Pisos y Paredes', 'Revision de estado de pisos epoxicos, paredes, uniones sanitarias', 'trimestral', 'Personal Mantenimiento', '2026-05-01', 'activo'),
('Planta General', 'estructural', 'Revision de Techos y Cubiertas', 'Inspeccion de goteras, estado de tejas, canaletas y bajantes', 'semestral', 'Contratista Civil', '2026-06-15', 'activo'),
('Planta General', 'sanitario', 'Revision Banos y Vestidores', 'Verificacion de funcionamiento de sanitarios, lavamanos, duchas, lockers', 'mensual', 'Personal Mantenimiento', '2026-04-01', 'activo'),
('Planta General', 'iluminacion', 'Revision Iluminacion General', 'Verificacion y reemplazo de luminarias, limpieza de lamparas, medicion de luxes', 'trimestral', 'Electricista Contratista', '2026-05-01', 'activo'),
('Exterior', 'otro', 'Mantenimiento Zonas Verdes', 'Poda de jardines, limpieza de andenes y estacionamiento', 'mensual', 'Jardinero Contratista', '2026-04-01', 'activo'),
('Planta General', 'otro', 'Fumigacion Industrial', 'Servicio de control de plagas en todas las areas de la planta', 'mensual', 'Empresa Control Plagas', '2026-04-01', 'activo');
