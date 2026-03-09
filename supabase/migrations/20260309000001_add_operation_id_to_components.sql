-- Add operation_id to prototype_components so each component can be assigned to a PT operation
ALTER TABLE "investigacion"."prototype_components"
  ADD COLUMN "operation_id" uuid REFERENCES "investigacion"."prototype_operations"("id") ON DELETE SET NULL;

CREATE INDEX "idx_prototype_components_operation_id"
  ON "investigacion"."prototype_components" ("operation_id");
