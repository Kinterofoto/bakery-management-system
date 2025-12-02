-- =====================================================
-- Migration: Add location_id column to work_centers
-- =====================================================
-- Purpose: Add location_id foreign key to work_centers table
--          and sync it with existing inventory locations
-- Date: 2025-12-02
-- =====================================================

-- Step 1: Add location_id column to work_centers
ALTER TABLE produccion.work_centers
ADD COLUMN IF NOT EXISTS location_id uuid;

-- Step 2: Add foreign key constraint
ALTER TABLE produccion.work_centers
ADD CONSTRAINT work_centers_location_id_fkey
FOREIGN KEY (location_id)
REFERENCES inventario.locations(id)
ON DELETE SET NULL;

-- Step 3: Create index for performance
CREATE INDEX IF NOT EXISTS idx_work_centers_location
ON produccion.work_centers USING btree (location_id);

-- Step 4: Sync location_id for existing work centers
-- This will match work_centers with their corresponding locations
-- based on the work_center_id stored in location metadata
DO $$
DECLARE
  v_wc_record RECORD;
  v_location_id uuid;
BEGIN
  FOR v_wc_record IN
    SELECT id, code
    FROM produccion.work_centers
    WHERE location_id IS NULL
  LOOP
    -- Try to find the location by the work_center_id in metadata
    SELECT l.id INTO v_location_id
    FROM inventario.locations l
    WHERE l.metadata->>'work_center_id' = v_wc_record.id::text;

    -- If not found by metadata, try by code matching
    IF v_location_id IS NULL THEN
      SELECT l.id INTO v_location_id
      FROM inventario.locations l
      WHERE l.code = 'WC-' || v_wc_record.code;
    END IF;

    -- Update the work center if location was found
    IF v_location_id IS NOT NULL THEN
      UPDATE produccion.work_centers
      SET location_id = v_location_id
      WHERE id = v_wc_record.id;

      RAISE NOTICE 'Synced location % for work center %', v_location_id, v_wc_record.code;
    ELSE
      RAISE WARNING 'No location found for work center %', v_wc_record.code;
    END IF;
  END LOOP;

  RAISE NOTICE 'Finished syncing location_ids for all work centers';
END $$;

-- Step 5: Add comment to document the column
COMMENT ON COLUMN produccion.work_centers.location_id IS
'Foreign key to inventory location (bin) representing this work center in the inventory system';
