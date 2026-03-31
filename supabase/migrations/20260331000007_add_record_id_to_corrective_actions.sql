-- Add record_id to corrective_actions to link CAs to activity records
ALTER TABLE "qms"."corrective_actions"
  ADD COLUMN "record_id" uuid REFERENCES "qms"."activity_records"("id") ON DELETE SET NULL;

CREATE INDEX "idx_corrective_actions_record" ON "qms"."corrective_actions" ("record_id");
