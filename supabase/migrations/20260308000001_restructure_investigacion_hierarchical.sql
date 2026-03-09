-- ============================================================================
-- Restructure investigacion schema: Hierarchical PT/PP model
-- PT (Producto Terminado) composed of PPs (Productos en Proceso) and MPs
-- Each PP has its own recipe, operations, and yield tracking
-- Versions allow different component ratios for same PT
-- ============================================================================

-- 1. Add new columns to prototypes
ALTER TABLE "investigacion"."prototypes"
  ADD COLUMN IF NOT EXISTS "pp_status" varchar(20) DEFAULT 'pending'
    CHECK ("pp_status" IN ('pending', 'recipe_done', 'operations_done', 'yield_done', 'complete')),
  ADD COLUMN IF NOT EXISTS "cost_per_gram" numeric(12,6),
  ADD COLUMN IF NOT EXISTS "total_input_grams" numeric(12,3),
  ADD COLUMN IF NOT EXISTS "total_output_grams" numeric(12,3);

-- Make product_name nullable (it might not be set yet for PP children created inline)
ALTER TABLE "investigacion"."prototypes"
  ALTER COLUMN "product_name" DROP NOT NULL;

-- 2. Create prototype_components table (BOM of PT: what PPs and MPs compose it)
CREATE TABLE "investigacion"."prototype_components" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "pt_prototype_id" uuid NOT NULL,
  "component_type" varchar(5) NOT NULL CHECK ("component_type" IN ('PP', 'MP')),
  "pp_prototype_id" uuid,
  "material_id" uuid,
  "material_name" varchar(255),
  "is_new_material" boolean DEFAULT false,
  "quantity_grams" numeric(12,3) NOT NULL,
  "unit_cost" numeric(12,4),
  "cost_per_gram" numeric(12,6),
  "display_order" integer DEFAULT 0,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "prototype_components_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "prototype_components_pt_fkey" FOREIGN KEY ("pt_prototype_id")
    REFERENCES "investigacion"."prototypes"("id") ON DELETE CASCADE,
  CONSTRAINT "prototype_components_pp_fkey" FOREIGN KEY ("pp_prototype_id")
    REFERENCES "investigacion"."prototypes"("id") ON DELETE SET NULL,
  CONSTRAINT "prototype_components_material_fkey" FOREIGN KEY ("material_id")
    REFERENCES "public"."products"("id")
);

CREATE INDEX "idx_prototype_components_pt" ON "investigacion"."prototype_components" ("pt_prototype_id");
CREATE INDEX "idx_prototype_components_pp" ON "investigacion"."prototype_components" ("pp_prototype_id");

-- 3. Create prototype_versions table
CREATE TABLE "investigacion"."prototype_versions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "pt_prototype_id" uuid NOT NULL,
  "version_number" integer NOT NULL,
  "version_name" varchar(255),
  "is_active" boolean DEFAULT true,
  "notes" text,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "prototype_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "prototype_versions_pt_fkey" FOREIGN KEY ("pt_prototype_id")
    REFERENCES "investigacion"."prototypes"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_prototype_versions_pt" ON "investigacion"."prototype_versions" ("pt_prototype_id");

-- 4. Create prototype_version_components table (per-version quantity overrides)
CREATE TABLE "investigacion"."prototype_version_components" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "version_id" uuid NOT NULL,
  "component_id" uuid NOT NULL,
  "quantity_grams" numeric(12,3) NOT NULL,
  "created_at" timestamptz DEFAULT now(),
  CONSTRAINT "prototype_version_components_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pvc_version_fkey" FOREIGN KEY ("version_id")
    REFERENCES "investigacion"."prototype_versions"("id") ON DELETE CASCADE,
  CONSTRAINT "pvc_component_fkey" FOREIGN KEY ("component_id")
    REFERENCES "investigacion"."prototype_components"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_pvc_version" ON "investigacion"."prototype_version_components" ("version_id");

-- 5. Enable RLS on new tables
ALTER TABLE "investigacion"."prototype_components" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "investigacion"."prototype_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "investigacion"."prototype_version_components" ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for new tables (authenticated full access)
CREATE POLICY "authenticated_all_components" ON "investigacion"."prototype_components"
  FOR ALL USING ("auth"."role"() = 'authenticated');

CREATE POLICY "authenticated_all_versions" ON "investigacion"."prototype_versions"
  FOR ALL USING ("auth"."role"() = 'authenticated');

CREATE POLICY "authenticated_all_version_components" ON "investigacion"."prototype_version_components"
  FOR ALL USING ("auth"."role"() = 'authenticated');

-- 7. updated_at triggers for new tables
CREATE TRIGGER "set_updated_at_prototype_components"
  BEFORE UPDATE ON "investigacion"."prototype_components"
  FOR EACH ROW EXECUTE FUNCTION "investigacion"."update_updated_at_column"();

CREATE TRIGGER "set_updated_at_prototype_versions"
  BEFORE UPDATE ON "investigacion"."prototype_versions"
  FOR EACH ROW EXECUTE FUNCTION "investigacion"."update_updated_at_column"();
