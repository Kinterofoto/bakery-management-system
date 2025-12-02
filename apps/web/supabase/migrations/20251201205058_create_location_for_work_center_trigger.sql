-- =====================================================
-- Migration: Auto-create location for work centers
-- =====================================================
-- Purpose: Automatically create a corresponding location in inventario.locations
--          when a work center is created in produccion.work_centers
-- Date: 2025-12-01
-- =====================================================

-- Function to create location for work center
CREATE OR REPLACE FUNCTION produccion.create_location_for_work_center()
RETURNS TRIGGER AS $$
DECLARE
  v_warehouse_id uuid;
BEGIN
  -- Get the main warehouse location (assuming it exists with code 'WH1' or is the first warehouse)
  SELECT id INTO v_warehouse_id
  FROM inventario.locations
  WHERE location_type = 'warehouse' AND level = 1
  LIMIT 1;

  -- Create a location for this work center
  INSERT INTO inventario.locations (
    code,
    name,
    location_type,
    parent_id,
    level,
    is_virtual,
    bin_type,
    is_active,
    metadata,
    created_by
  ) VALUES (
    'WC-' || NEW.code,  -- Prefix with WC- to distinguish work center locations
    NEW.name,
    'bin',  -- Work centers are treated as bins in the location hierarchy
    v_warehouse_id,  -- Parent is the main warehouse
    2,  -- Level 2 (under warehouse)
    false,
    'production',  -- Mark as production bin type
    NEW.is_active,
    jsonb_build_object(
      'work_center_id', NEW.id,
      'work_center_code', NEW.code,
      'description', NEW.description
    ),
    NEW.created_at::timestamp with time zone
  );

  RAISE NOTICE 'Created location WC-% for work center %', NEW.code, NEW.name;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_create_location_for_work_center ON produccion.work_centers;

CREATE TRIGGER trigger_create_location_for_work_center
  AFTER INSERT ON produccion.work_centers
  FOR EACH ROW
  EXECUTE FUNCTION produccion.create_location_for_work_center();

-- Add location_id column to work_centers for easy reference (optional but recommended)
ALTER TABLE produccion.work_centers 
ADD COLUMN IF NOT EXISTS location_id uuid 
REFERENCES inventario.locations(id);

-- Create index on location_id
CREATE INDEX IF NOT EXISTS idx_work_centers_location 
ON produccion.work_centers(location_id);

-- Update function to also set the location_id reference
CREATE OR REPLACE FUNCTION produccion.create_location_for_work_center()
RETURNS TRIGGER AS $$
DECLARE
  v_warehouse_id uuid;
  v_location_id uuid;
BEGIN
  -- Get the main warehouse location
  SELECT id INTO v_warehouse_id
  FROM inventario.locations
  WHERE location_type = 'warehouse' AND level = 1
  LIMIT 1;

  -- Create a location for this work center
  INSERT INTO inventario.locations (
    code,
    name,
    location_type,
    parent_id,
    level,
    is_virtual,
    bin_type,
    is_active,
    metadata
  ) VALUES (
    'WC-' || NEW.code,
    NEW.name,
    'bin',
    v_warehouse_id,
    2,
    false,
    'production',
    NEW.is_active,
    jsonb_build_object(
      'work_center_id', NEW.id,
      'work_center_code', NEW.code,
      'description', NEW.description
    )
  ) RETURNING id INTO v_location_id;

  -- Update the work center with the location_id
  UPDATE produccion.work_centers
  SET location_id = v_location_id
  WHERE id = NEW.id;

  RAISE NOTICE 'Created location WC-% (%) for work center %', NEW.code, v_location_id, NEW.name;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create locations for existing work centers
DO $$
DECLARE
  v_warehouse_id uuid;
  v_location_id uuid;
  wc_record RECORD;
BEGIN
  -- Get main warehouse
  SELECT id INTO v_warehouse_id
  FROM inventario.locations
  WHERE location_type = 'warehouse' AND level = 1
  LIMIT 1;

  -- Create locations for existing work centers that don't have one
  FOR wc_record IN 
    SELECT * FROM produccion.work_centers 
    WHERE location_id IS NULL
  LOOP
    -- Check if location already exists
    SELECT id INTO v_location_id
    FROM inventario.locations
    WHERE code = 'WC-' || wc_record.code;

    IF v_location_id IS NULL THEN
      -- Create new location
      INSERT INTO inventario.locations (
        code,
        name,
        location_type,
        parent_id,
        level,
        is_virtual,
        bin_type,
        is_active,
        metadata
      ) VALUES (
        'WC-' || wc_record.code,
        wc_record.name,
        'bin',
        v_warehouse_id,
        2,
        false,
        'production',
        wc_record.is_active,
        jsonb_build_object(
          'work_center_id', wc_record.id,
          'work_center_code', wc_record.code,
          'description', wc_record.description
        )
      ) RETURNING id INTO v_location_id;

      RAISE NOTICE 'Created location WC-% for existing work center %', wc_record.code, wc_record.name;
    END IF;

    -- Update work center with location_id
    UPDATE produccion.work_centers
    SET location_id = v_location_id
    WHERE id = wc_record.id;
  END LOOP;
END $$;

COMMENT ON FUNCTION produccion.create_location_for_work_center() IS 
'Automatically creates a corresponding location in inventario.locations when a work center is created';

COMMENT ON COLUMN produccion.work_centers.location_id IS 
'Reference to the corresponding location in inventario.locations for inventory tracking';
