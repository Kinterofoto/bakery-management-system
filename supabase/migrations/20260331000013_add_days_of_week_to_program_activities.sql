-- ============================================================================
-- Add days_of_week column to program_activities
-- Supports activities that run on specific multiple days per week
-- Values: 1=Monday, 2=Tuesday, ..., 6=Saturday, 7=Sunday (ISO)
-- ============================================================================

ALTER TABLE "qms"."program_activities"
ADD COLUMN "days_of_week" integer[] DEFAULT NULL;
