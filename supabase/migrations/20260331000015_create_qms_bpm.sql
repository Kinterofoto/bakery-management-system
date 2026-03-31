-- ============================================================================
-- QMS - BPM: Set days_of_week on existing activity
-- ============================================================================

-- Update existing BPM activity with days_of_week (Mon=1, Wed=3, Sat=6)
UPDATE "qms"."program_activities"
SET days_of_week = ARRAY[1, 3, 6]
WHERE program_id = (SELECT id FROM "qms"."sanitation_programs" WHERE code = 'bpm')
  AND title = 'Inspección BPM Personal';
