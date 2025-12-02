-- =====================================================
-- Migration: Restore work_center.location_id relationships
-- =====================================================
-- Purpose: Restore the relationship between work_centers and locations
--          using the work_center_id stored in location metadata
-- Date: 2025-12-02
-- =====================================================

DO $$
DECLARE
  loc RECORD;
  wc_id UUID;
  updated_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting restoration of work_center.location_id relationships...';

  -- Iterate through all locations that have work_center_id in metadata
  FOR loc IN
    SELECT
      id,
      code,
      name,
      metadata::jsonb->>'work_center_id' as work_center_id
    FROM inventario.locations
    WHERE metadata IS NOT NULL
      AND metadata::jsonb ? 'work_center_id'
      AND location_type = 'bin'
      AND bin_type = 'production'
  LOOP
    -- Convert work_center_id string to UUID
    wc_id := loc.work_center_id::UUID;

    -- Update the work center with this location_id
    UPDATE produccion.work_centers
    SET location_id = loc.id
    WHERE id = wc_id;

    IF FOUND THEN
      updated_count := updated_count + 1;
      RAISE NOTICE 'Updated work center % with location %', loc.name, loc.code;
    ELSE
      RAISE WARNING 'Work center not found for location % (work_center_id: %)', loc.code, loc.work_center_id;
    END IF;
  END LOOP;

  RAISE NOTICE 'Restoration complete: % work centers updated', updated_count;

  -- Verify the results
  DECLARE
    missing_count INTEGER;
    total_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO total_count FROM produccion.work_centers WHERE is_active = true;
    SELECT COUNT(*) INTO missing_count FROM produccion.work_centers WHERE location_id IS NULL AND is_active = true;

    RAISE NOTICE 'Summary: % active work centers, % still missing location_id', total_count, missing_count;

    IF missing_count > 0 THEN
      RAISE NOTICE 'Work centers still missing location_id:';
      FOR loc IN
        SELECT id, code, name
        FROM produccion.work_centers
        WHERE location_id IS NULL AND is_active = true
      LOOP
        RAISE NOTICE '  - % (%)', loc.name, loc.code;
      END LOOP;
    END IF;
  END;
END $$;

-- Create a helpful view to see the relationships
CREATE OR REPLACE VIEW produccion.work_centers_with_locations AS
SELECT
  wc.id as work_center_id,
  wc.code as work_center_code,
  wc.name as work_center_name,
  wc.location_id,
  l.code as location_code,
  l.name as location_name,
  l.path as location_path,
  CASE
    WHEN wc.location_id IS NULL THEN '❌ Missing'
    ELSE '✅ Linked'
  END as status
FROM produccion.work_centers wc
LEFT JOIN inventario.locations l ON wc.location_id = l.id
ORDER BY wc.code;

COMMENT ON VIEW produccion.work_centers_with_locations IS
'Helper view to verify work_center to location relationships';
