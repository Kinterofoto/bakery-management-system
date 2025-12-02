-- =====================================================
-- Migration: Activate trigger for automatic location creation
-- =====================================================
-- Purpose: Ensure the trigger is active to create locations
--          automatically when new work centers are created
-- Date: 2025-12-02
-- =====================================================

-- Drop trigger if it exists (to ensure clean recreation)
DROP TRIGGER IF EXISTS trg_create_location_for_work_center
ON produccion.work_centers;

-- Create the trigger that fires AFTER INSERT on work_centers
CREATE TRIGGER trg_create_location_for_work_center
  AFTER INSERT ON produccion.work_centers
  FOR EACH ROW
  EXECUTE FUNCTION produccion.create_location_for_work_center();

COMMENT ON TRIGGER trg_create_location_for_work_center ON produccion.work_centers IS
'Automatically creates an inventory location (bin) under the production warehouse whenever a new work center is created';

-- Verify the trigger is active
DO $$
DECLARE
  v_trigger_count int;
BEGIN
  SELECT COUNT(*) INTO v_trigger_count
  FROM information_schema.triggers
  WHERE event_object_schema = 'produccion'
    AND event_object_table = 'work_centers'
    AND trigger_name = 'trg_create_location_for_work_center';

  IF v_trigger_count > 0 THEN
    RAISE NOTICE '✅ Trigger trg_create_location_for_work_center is ACTIVE';
  ELSE
    RAISE WARNING '❌ Trigger trg_create_location_for_work_center was NOT created';
  END IF;
END $$;
