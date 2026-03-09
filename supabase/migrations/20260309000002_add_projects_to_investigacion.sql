-- Add projects table to investigacion schema
-- Projects group multiple prototypes together

CREATE TABLE IF NOT EXISTS "investigacion"."projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(255) NOT NULL,
  "description" text,
  "status" varchar(30) DEFAULT 'active' CHECK ("status" IN ('active', 'completed', 'archived')),
  "created_by" uuid REFERENCES auth.users(id),
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

-- Add project_id to prototypes
ALTER TABLE "investigacion"."prototypes"
  ADD COLUMN IF NOT EXISTS "project_id" uuid REFERENCES "investigacion"."projects"("id") ON DELETE SET NULL;

-- Index for filtering prototypes by project
CREATE INDEX IF NOT EXISTS "idx_prototypes_project_id" ON "investigacion"."prototypes" ("project_id");

-- RLS for projects
ALTER TABLE "investigacion"."projects" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_select_projects" ON "investigacion"."projects"
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_insert_projects" ON "investigacion"."projects"
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated_update_projects" ON "investigacion"."projects"
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_delete_projects" ON "investigacion"."projects"
  FOR DELETE TO authenticated USING (true);

-- Updated_at trigger
CREATE TRIGGER "update_projects_updated_at"
  BEFORE UPDATE ON "investigacion"."projects"
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
