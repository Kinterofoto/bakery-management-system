-- ============================================================================
-- Schema: investigacion (I+D - Investigacion y Desarrollo)
-- Modulo para registro de prototipos de productos en vivo durante fabricacion
-- ============================================================================

-- 1. Create schema
CREATE SCHEMA IF NOT EXISTS "investigacion";

-- 2. Grants
GRANT USAGE ON SCHEMA "investigacion" TO "anon";
GRANT USAGE ON SCHEMA "investigacion" TO "authenticated";
GRANT USAGE ON SCHEMA "investigacion" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "investigacion"
  GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "investigacion"
  GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "investigacion"
  GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "investigacion"
  GRANT ALL ON SEQUENCES TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "investigacion"
  GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "investigacion"
  GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "investigacion"
  GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "investigacion"
  GRANT ALL ON TABLES TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "investigacion"
  GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "investigacion"
  GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "investigacion"
  GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "investigacion"
  GRANT ALL ON FUNCTIONS TO "service_role";

-- ============================================================================
-- 3. Tables
-- ============================================================================

-- 3.1 Prototypes (main entity)
CREATE TABLE "investigacion"."prototypes" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid,
  "product_name" varchar(255) NOT NULL,
  "product_category" varchar(10) DEFAULT 'PT' CHECK ("product_category" IN ('PT', 'PP')),
  "is_new_product" boolean DEFAULT false,
  "code" varchar(50) NOT NULL,
  "version" integer DEFAULT 1,
  "parent_prototype_id" uuid,
  "status" varchar(30) DEFAULT 'draft' CHECK ("status" IN (
    'draft', 'in_progress', 'sensory_review', 'approved', 'rejected', 'archived'
  )),
  "description" text,
  "objectives" text,
  "conclusions" text,
  "units_per_flow_pack" integer,
  "units_per_box" integer,
  "wizard_step" integer DEFAULT 1,
  "wizard_completed" boolean DEFAULT false,
  "sensory_token" varchar(255),
  "sensory_token_expires_at" timestamptz,
  "created_by" uuid,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "prototypes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "prototypes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id"),
  CONSTRAINT "prototypes_parent_prototype_id_fkey" FOREIGN KEY ("parent_prototype_id") REFERENCES "investigacion"."prototypes"("id"),
  CONSTRAINT "prototypes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id"),
  CONSTRAINT "prototypes_sensory_token_key" UNIQUE ("sensory_token")
);

CREATE INDEX "idx_prototypes_status" ON "investigacion"."prototypes" ("status");
CREATE INDEX "idx_prototypes_created_by" ON "investigacion"."prototypes" ("created_by");
CREATE INDEX "idx_prototypes_sensory_token" ON "investigacion"."prototypes" ("sensory_token");
CREATE INDEX "idx_prototypes_product_id" ON "investigacion"."prototypes" ("product_id");

-- 3.2 Prototype Operations (process steps)
-- Created before materials because materials reference operations
CREATE TABLE "investigacion"."prototype_operations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "prototype_id" uuid NOT NULL,
  "operation_id" uuid,
  "operation_name" varchar(255) NOT NULL,
  "is_custom_operation" boolean DEFAULT false,
  "step_number" integer NOT NULL,
  "duration_minutes" numeric(8,2),
  "temperature_celsius" numeric(6,2),
  "humidity_percentage" numeric(5,2),
  "speed_rpm" numeric(8,2),
  "timer_started_at" timestamptz,
  "timer_stopped_at" timestamptz,
  "timer_elapsed_seconds" integer,
  "input_weight_grams" numeric(12,3),
  "output_weight_grams" numeric(12,3),
  "yield_percentage" numeric(8,4),
  "waste_grams" numeric(12,3),
  "people_count" integer DEFAULT 1,
  "labor_time_minutes" numeric(8,2),
  "avg_assembly_time_seconds" numeric(8,2),
  "produces_sub_product" boolean DEFAULT false,
  "sub_product_name" varchar(255),
  "is_filling" boolean DEFAULT false,
  "sub_product_input_grams" numeric(12,3),
  "sub_product_output_grams" numeric(12,3),
  "sub_product_waste_grams" numeric(12,3),
  "has_trim" boolean DEFAULT false,
  "weight_before_trim_grams" numeric(12,3),
  "trim_weight_grams" numeric(12,3),
  "weight_after_trim_grams" numeric(12,3),
  "instructions" text,
  "observations" text,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "prototype_operations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "prototype_operations_prototype_id_fkey" FOREIGN KEY ("prototype_id")
    REFERENCES "investigacion"."prototypes"("id") ON DELETE CASCADE,
  CONSTRAINT "prototype_operations_operation_id_fkey" FOREIGN KEY ("operation_id")
    REFERENCES "produccion"."operations"("id")
);

CREATE INDEX "idx_prototype_operations_prototype_id" ON "investigacion"."prototype_operations" ("prototype_id");

-- 3.3 Prototype Materials (ingredients - BOM-compatible)
CREATE TABLE "investigacion"."prototype_materials" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "prototype_id" uuid NOT NULL,
  "material_id" uuid,
  "material_name" varchar(255) NOT NULL,
  "is_new_material" boolean DEFAULT false,
  "is_base_ingredient" boolean DEFAULT false,
  "quantity_needed" numeric(12,3) NOT NULL,
  "original_quantity" numeric(12,3) NOT NULL,
  "unit_name" varchar(100) NOT NULL DEFAULT 'gramos',
  "unit_equivalence_grams" numeric(12,3) NOT NULL DEFAULT 1,
  "baker_percentage" numeric(8,4),
  "engineering_percentage" numeric(8,4),
  "unit_cost" numeric(12,4),
  "total_cost" numeric(12,4),
  "operation_id" uuid,
  "tiempo_reposo_horas" numeric(8,2),
  "display_order" integer DEFAULT 0,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "prototype_materials_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "prototype_materials_prototype_id_fkey" FOREIGN KEY ("prototype_id")
    REFERENCES "investigacion"."prototypes"("id") ON DELETE CASCADE,
  CONSTRAINT "prototype_materials_material_id_fkey" FOREIGN KEY ("material_id")
    REFERENCES "public"."products"("id"),
  CONSTRAINT "prototype_materials_operation_id_fkey" FOREIGN KEY ("operation_id")
    REFERENCES "investigacion"."prototype_operations"("id") ON DELETE SET NULL
);

CREATE INDEX "idx_prototype_materials_prototype_id" ON "investigacion"."prototype_materials" ("prototype_id");

-- 3.4 Prototype Photos
CREATE TABLE "investigacion"."prototype_photos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "prototype_id" uuid NOT NULL,
  "prototype_operation_id" uuid,
  "photo_url" text NOT NULL,
  "file_name" varchar(255),
  "file_size_kb" numeric(8,2),
  "photo_type" varchar(30) DEFAULT 'general' CHECK ("photo_type" IN (
    'general', 'operation', 'quality', 'packaging', 'sensory'
  )),
  "caption" text,
  "display_order" integer DEFAULT 0,
  "created_at" timestamptz DEFAULT now(),
  CONSTRAINT "prototype_photos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "prototype_photos_prototype_id_fkey" FOREIGN KEY ("prototype_id")
    REFERENCES "investigacion"."prototypes"("id") ON DELETE CASCADE,
  CONSTRAINT "prototype_photos_operation_id_fkey" FOREIGN KEY ("prototype_operation_id")
    REFERENCES "investigacion"."prototype_operations"("id") ON DELETE SET NULL
);

CREATE INDEX "idx_prototype_photos_prototype_id" ON "investigacion"."prototype_photos" ("prototype_id");

-- 3.5 Prototype Quality (internal evaluation)
CREATE TABLE "investigacion"."prototype_quality" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "prototype_id" uuid NOT NULL,
  "prototype_operation_id" uuid,
  "texture_score" integer CHECK ("texture_score" BETWEEN 1 AND 5),
  "texture_notes" text,
  "color_score" integer CHECK ("color_score" BETWEEN 1 AND 5),
  "color_notes" text,
  "appearance_score" integer CHECK ("appearance_score" BETWEEN 1 AND 5),
  "appearance_notes" text,
  "taste_score" integer CHECK ("taste_score" BETWEEN 1 AND 5),
  "taste_notes" text,
  "aroma_score" integer CHECK ("aroma_score" BETWEEN 1 AND 5),
  "aroma_notes" text,
  "crumb_structure_score" integer CHECK ("crumb_structure_score" BETWEEN 1 AND 5),
  "crumb_structure_notes" text,
  "overall_score" numeric(3,2),
  "overall_notes" text,
  "approved" boolean,
  "evaluated_by" uuid,
  "evaluated_at" timestamptz DEFAULT now(),
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "prototype_quality_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "prototype_quality_prototype_id_fkey" FOREIGN KEY ("prototype_id")
    REFERENCES "investigacion"."prototypes"("id") ON DELETE CASCADE,
  CONSTRAINT "prototype_quality_operation_id_fkey" FOREIGN KEY ("prototype_operation_id")
    REFERENCES "investigacion"."prototype_operations"("id") ON DELETE SET NULL,
  CONSTRAINT "prototype_quality_evaluated_by_fkey" FOREIGN KEY ("evaluated_by")
    REFERENCES "auth"."users"("id")
);

CREATE INDEX "idx_prototype_quality_prototype_id" ON "investigacion"."prototype_quality" ("prototype_id");

-- 3.6 Sensory Evaluations (public - shareable link)
CREATE TABLE "investigacion"."sensory_evaluations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "prototype_id" uuid NOT NULL,
  "evaluator_name" varchar(255) NOT NULL,
  "evaluator_role" varchar(100),
  "texture_score" integer CHECK ("texture_score" BETWEEN 1 AND 5),
  "texture_notes" text,
  "color_score" integer CHECK ("color_score" BETWEEN 1 AND 5),
  "color_notes" text,
  "appearance_score" integer CHECK ("appearance_score" BETWEEN 1 AND 5),
  "appearance_notes" text,
  "taste_score" integer CHECK ("taste_score" BETWEEN 1 AND 5),
  "taste_notes" text,
  "aroma_score" integer CHECK ("aroma_score" BETWEEN 1 AND 5),
  "aroma_notes" text,
  "crumb_structure_score" integer CHECK ("crumb_structure_score" BETWEEN 1 AND 5),
  "crumb_structure_notes" text,
  "overall_score" numeric(3,2),
  "overall_notes" text,
  "purchase_intent" integer CHECK ("purchase_intent" BETWEEN 1 AND 5),
  "photos" jsonb DEFAULT '[]'::jsonb,
  "submitted_at" timestamptz DEFAULT now(),
  "created_at" timestamptz DEFAULT now(),
  CONSTRAINT "sensory_evaluations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sensory_evaluations_prototype_id_fkey" FOREIGN KEY ("prototype_id")
    REFERENCES "investigacion"."prototypes"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_sensory_evaluations_prototype_id" ON "investigacion"."sensory_evaluations" ("prototype_id");

-- 3.7 Prototype Yield Tracking
CREATE TABLE "investigacion"."prototype_yield_tracking" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "prototype_id" uuid NOT NULL,
  "total_input_weight_grams" numeric(12,3),
  "total_output_weight_grams" numeric(12,3),
  "total_output_units" integer,
  "unit_weight_grams" numeric(12,3),
  "overall_yield_percentage" numeric(8,4),
  "total_waste_grams" numeric(12,3),
  "total_waste_percentage" numeric(8,4),
  "formulation_with_trim" boolean DEFAULT false,
  "weight_before_trim_grams" numeric(12,3),
  "trim_weight_grams" numeric(12,3),
  "weight_after_trim_grams" numeric(12,3),
  "notes" text,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "prototype_yield_tracking_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "prototype_yield_tracking_prototype_id_fkey" FOREIGN KEY ("prototype_id")
    REFERENCES "investigacion"."prototypes"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_prototype_yield_prototype_id" ON "investigacion"."prototype_yield_tracking" ("prototype_id");

-- 3.8 Prototype Cost Estimates
CREATE TABLE "investigacion"."prototype_cost_estimates" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "prototype_id" uuid NOT NULL,
  "total_material_cost" numeric(12,4),
  "material_cost_per_unit" numeric(12,4),
  "total_labor_minutes" numeric(10,2),
  "labor_cost_per_minute" numeric(10,4),
  "total_labor_cost" numeric(12,4),
  "labor_cost_per_unit" numeric(12,4),
  "total_cost" numeric(12,4),
  "cost_per_unit" numeric(12,4),
  "total_units_produced" integer,
  "notes" text,
  "calculated_at" timestamptz DEFAULT now(),
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "prototype_cost_estimates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "prototype_cost_estimates_prototype_id_fkey" FOREIGN KEY ("prototype_id")
    REFERENCES "investigacion"."prototypes"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_prototype_costs_prototype_id" ON "investigacion"."prototype_cost_estimates" ("prototype_id");

-- ============================================================================
-- 4. Functions
-- ============================================================================

-- 4.1 Updated_at trigger function
CREATE OR REPLACE FUNCTION "investigacion"."update_updated_at_column"()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4.2 Generate sensory token (reuses pattern from compras.generate_supplier_token)
CREATE OR REPLACE FUNCTION "investigacion"."generate_sensory_token"()
RETURNS character varying AS $$
DECLARE
  new_token VARCHAR;
  token_exists BOOLEAN;
BEGIN
  LOOP
    new_token := encode(gen_random_bytes(32), 'base64');
    new_token := REPLACE(REPLACE(REPLACE(new_token, '+', ''), '/', ''), '=', '');
    new_token := SUBSTRING(new_token, 1, 40);
    SELECT EXISTS(
      SELECT 1 FROM "investigacion"."prototypes" WHERE "sensory_token" = new_token
    ) INTO token_exists;
    IF NOT token_exists THEN EXIT; END IF;
  END LOOP;
  RETURN new_token;
END;
$$ LANGUAGE plpgsql;

-- 4.3 Trigger to auto-generate sensory token on prototype creation
CREATE OR REPLACE FUNCTION "investigacion"."trigger_set_sensory_token"()
RETURNS trigger AS $$
BEGIN
  IF NEW."sensory_token" IS NULL THEN
    NEW."sensory_token" := "investigacion"."generate_sensory_token"();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4.4 Generate next prototype code
CREATE OR REPLACE FUNCTION "investigacion"."generate_prototype_code"()
RETURNS character varying AS $$
DECLARE
  current_year INTEGER;
  next_seq INTEGER;
  new_code VARCHAR;
BEGIN
  current_year := EXTRACT(YEAR FROM NOW());
  SELECT COALESCE(MAX(
    CAST(SUBSTRING("code" FROM 'PRO-\d{4}-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO next_seq
  FROM "investigacion"."prototypes"
  WHERE "code" LIKE 'PRO-' || current_year || '-%';

  new_code := 'PRO-' || current_year || '-' || LPAD(next_seq::TEXT, 3, '0');
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. Triggers
-- ============================================================================

-- updated_at triggers
CREATE TRIGGER "set_updated_at_prototypes"
  BEFORE UPDATE ON "investigacion"."prototypes"
  FOR EACH ROW EXECUTE FUNCTION "investigacion"."update_updated_at_column"();

CREATE TRIGGER "set_updated_at_prototype_materials"
  BEFORE UPDATE ON "investigacion"."prototype_materials"
  FOR EACH ROW EXECUTE FUNCTION "investigacion"."update_updated_at_column"();

CREATE TRIGGER "set_updated_at_prototype_operations"
  BEFORE UPDATE ON "investigacion"."prototype_operations"
  FOR EACH ROW EXECUTE FUNCTION "investigacion"."update_updated_at_column"();

CREATE TRIGGER "set_updated_at_prototype_quality"
  BEFORE UPDATE ON "investigacion"."prototype_quality"
  FOR EACH ROW EXECUTE FUNCTION "investigacion"."update_updated_at_column"();

CREATE TRIGGER "set_updated_at_prototype_yield"
  BEFORE UPDATE ON "investigacion"."prototype_yield_tracking"
  FOR EACH ROW EXECUTE FUNCTION "investigacion"."update_updated_at_column"();

CREATE TRIGGER "set_updated_at_prototype_costs"
  BEFORE UPDATE ON "investigacion"."prototype_cost_estimates"
  FOR EACH ROW EXECUTE FUNCTION "investigacion"."update_updated_at_column"();

-- sensory token auto-generation
CREATE TRIGGER "set_sensory_token"
  BEFORE INSERT ON "investigacion"."prototypes"
  FOR EACH ROW EXECUTE FUNCTION "investigacion"."trigger_set_sensory_token"();

-- ============================================================================
-- 6. RLS Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE "investigacion"."prototypes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "investigacion"."prototype_operations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "investigacion"."prototype_materials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "investigacion"."prototype_photos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "investigacion"."prototype_quality" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "investigacion"."sensory_evaluations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "investigacion"."prototype_yield_tracking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "investigacion"."prototype_cost_estimates" ENABLE ROW LEVEL SECURITY;

-- Authenticated users: full CRUD on all tables (except sensory_evaluations)
CREATE POLICY "authenticated_all_prototypes" ON "investigacion"."prototypes"
  FOR ALL USING ("auth"."role"() = 'authenticated');

CREATE POLICY "authenticated_all_operations" ON "investigacion"."prototype_operations"
  FOR ALL USING ("auth"."role"() = 'authenticated');

CREATE POLICY "authenticated_all_materials" ON "investigacion"."prototype_materials"
  FOR ALL USING ("auth"."role"() = 'authenticated');

CREATE POLICY "authenticated_all_photos" ON "investigacion"."prototype_photos"
  FOR ALL USING ("auth"."role"() = 'authenticated');

CREATE POLICY "authenticated_all_quality" ON "investigacion"."prototype_quality"
  FOR ALL USING ("auth"."role"() = 'authenticated');

CREATE POLICY "authenticated_all_yield" ON "investigacion"."prototype_yield_tracking"
  FOR ALL USING ("auth"."role"() = 'authenticated');

CREATE POLICY "authenticated_all_costs" ON "investigacion"."prototype_cost_estimates"
  FOR ALL USING ("auth"."role"() = 'authenticated');

-- Sensory evaluations: authenticated full + anon can insert/select
CREATE POLICY "authenticated_all_sensory" ON "investigacion"."sensory_evaluations"
  FOR ALL USING ("auth"."role"() = 'authenticated');

CREATE POLICY "anon_insert_sensory" ON "investigacion"."sensory_evaluations"
  FOR INSERT WITH CHECK (
    "auth"."role"() = 'anon'
    AND EXISTS (
      SELECT 1 FROM "investigacion"."prototypes"
      WHERE "id" = "prototype_id"
      AND "sensory_token" IS NOT NULL
      AND "status" IN ('draft', 'in_progress', 'sensory_review')
    )
  );

CREATE POLICY "anon_select_sensory" ON "investigacion"."sensory_evaluations"
  FOR SELECT USING (
    "auth"."role"() = 'anon'
    AND EXISTS (
      SELECT 1 FROM "investigacion"."prototypes"
      WHERE "id" = "prototype_id"
      AND "sensory_token" IS NOT NULL
    )
  );

-- Prototypes: anon can select limited info for sensory panel
CREATE POLICY "anon_select_prototypes_for_sensory" ON "investigacion"."prototypes"
  FOR SELECT USING (
    "auth"."role"() = 'anon'
    AND "sensory_token" IS NOT NULL
  );

-- Photos: anon can select (for sensory panel display) and insert (evaluator photos)
CREATE POLICY "anon_select_photos" ON "investigacion"."prototype_photos"
  FOR SELECT USING (
    "auth"."role"() = 'anon'
    AND EXISTS (
      SELECT 1 FROM "investigacion"."prototypes"
      WHERE "id" = "prototype_id"
      AND "sensory_token" IS NOT NULL
    )
  );

CREATE POLICY "anon_insert_photos" ON "investigacion"."prototype_photos"
  FOR INSERT WITH CHECK (
    "auth"."role"() = 'anon'
    AND "photo_type" = 'sensory'
    AND EXISTS (
      SELECT 1 FROM "investigacion"."prototypes"
      WHERE "id" = "prototype_id"
      AND "sensory_token" IS NOT NULL
      AND "status" IN ('in_progress', 'sensory_review')
    )
  );

-- ============================================================================
-- 7. Storage bucket for prototype photos
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('prototype-photos', 'prototype-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "authenticated_upload_prototype_photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'prototype-photos' AND auth.role() = 'authenticated');

CREATE POLICY "public_read_prototype_photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'prototype-photos');

CREATE POLICY "authenticated_delete_prototype_photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'prototype-photos' AND auth.role() = 'authenticated');

-- Allow anon to upload sensory photos
CREATE POLICY "anon_upload_sensory_photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'prototype-photos'
    AND auth.role() = 'anon'
    AND (storage.foldername(name))[1] = 'sensory'
  );
