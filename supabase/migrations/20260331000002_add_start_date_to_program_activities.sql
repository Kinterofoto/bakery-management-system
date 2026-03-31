-- Add start_date to program_activities for frequency cycle calculation
ALTER TABLE "qms"."program_activities"
  ADD COLUMN "start_date" date;
