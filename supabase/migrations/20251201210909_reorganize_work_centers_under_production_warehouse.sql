-- =====================================================
-- Migration: Reorganize work centers under production warehouse
-- =====================================================
-- Purpose: Create a dedicated "Producción" warehouse and move all
--          work center locations to be bins under it
-- Date: 2025-12-01
-- =====================================================

DO $$
DECLARE
  v_production_warehouse_id uuid;
  v_wc_location_id uuid;
BEGIN
  -- Check if production warehouse already exists
  SELECT id INTO v_production_warehouse_id
  FROM inventario.locations
  WHERE code = 'WH-PROD' AND location_type = 'warehouse';

  -- Create production warehouse if it doesn't exist
  IF v_production_warehouse_id IS NULL THEN
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
      'WH-PROD',
      'Producción',
      'warehouse',
      NULL,  -- No parent, it's a top-level warehouse
      1,     -- Level 1
      false,
      NULL,  -- Warehouses don't have bin_type
      true,
      jsonb_build_object(
        'description', 'Bodega de producción - Centros de trabajo',
        'type', 'production'
      )
    ) RETURNING id INTO v_production_warehouse_id;

    RAISE NOTICE 'Created production warehouse WH-PROD: %', v_production_warehouse_id;
  ELSE
    RAISE NOTICE 'Production warehouse already exists: %', v_production_warehouse_id;
  END IF;

  -- Update all work center locations to be under production warehouse
  -- POLYLINE
  UPDATE inventario.locations
  SET parent_id = v_production_warehouse_id,
      level = 2
  WHERE code = 'WC-POLYLINE'
  RETURNING id INTO v_wc_location_id;
  IF v_wc_location_id IS NOT NULL THEN
    RAISE NOTICE 'Moved WC-POLYLINE under production warehouse';
  END IF;

  -- ULTRACOGELADOR_1
  UPDATE inventario.locations
  SET parent_id = v_production_warehouse_id,
      level = 2
  WHERE code = 'WC-ULTRACOGELADOR_1'
  RETURNING id INTO v_wc_location_id;
  IF v_wc_location_id IS NOT NULL THEN
    RAISE NOTICE 'Moved WC-ULTRACOGELADOR_1 under production warehouse';
  END IF;

  -- DECORADO
  UPDATE inventario.locations
  SET parent_id = v_production_warehouse_id,
      level = 2
  WHERE code = 'WC-DECORADO'
  RETURNING id INTO v_wc_location_id;
  IF v_wc_location_id IS NOT NULL THEN
    RAISE NOTICE 'Moved WC-DECORADO under production warehouse';
  END IF;

  -- PASTELERIA
  UPDATE inventario.locations
  SET parent_id = v_production_warehouse_id,
      level = 2
  WHERE code = 'WC-PASTELERIA'
  RETURNING id INTO v_wc_location_id;
  IF v_wc_location_id IS NOT NULL THEN
    RAISE NOTICE 'Moved WC-PASTELERIA under production warehouse';
  END IF;

  -- EMPAQUE
  UPDATE inventario.locations
  SET parent_id = v_production_warehouse_id,
      level = 2
  WHERE code = 'WC-EMPAQUE'
  RETURNING id INTO v_wc_location_id;
  IF v_wc_location_id IS NOT NULL THEN
    RAISE NOTICE 'Moved WC-EMPAQUE under production warehouse';
  END IF;

  -- EMPASTADO_2
  UPDATE inventario.locations
  SET parent_id = v_production_warehouse_id,
      level = 2
  WHERE code = 'WC-EMPASTADO_2'
  RETURNING id INTO v_wc_location_id;
  IF v_wc_location_id IS NOT NULL THEN
    RAISE NOTICE 'Moved WC-EMPASTADO_2 under production warehouse';
  END IF;

  -- FERMENTACION
  UPDATE inventario.locations
  SET parent_id = v_production_warehouse_id,
      level = 2
  WHERE code = 'WC-FERMENTACION'
  RETURNING id INTO v_wc_location_id;
  IF v_wc_location_id IS NOT NULL THEN
    RAISE NOTICE 'Moved WC-FERMENTACION under production warehouse';
  END IF;

  -- CROISSOMAT
  UPDATE inventario.locations
  SET parent_id = v_production_warehouse_id,
      level = 2
  WHERE code = 'WC-CROISSOMAT'
  RETURNING id INTO v_wc_location_id;
  IF v_wc_location_id IS NOT NULL THEN
    RAISE NOTICE 'Moved WC-CROISSOMAT under production warehouse';
  END IF;

  -- EMPASTADO_1
  UPDATE inventario.locations
  SET parent_id = v_production_warehouse_id,
      level = 2
  WHERE code = 'WC-EMPASTADO_1'
  RETURNING id INTO v_wc_location_id;
  IF v_wc_location_id IS NOT NULL THEN
    RAISE NOTICE 'Moved WC-EMPASTADO_1 under production warehouse';
  END IF;

  -- PANADERIA
  UPDATE inventario.locations
  SET parent_id = v_production_warehouse_id,
      level = 2
  WHERE code = 'WC-PANADERIA'
  RETURNING id INTO v_wc_location_id;
  IF v_wc_location_id IS NOT NULL THEN
    RAISE NOTICE 'Moved WC-PANADERIA under production warehouse';
  END IF;

  -- AMASADO
  UPDATE inventario.locations
  SET parent_id = v_production_warehouse_id,
      level = 2
  WHERE code = 'WC-AMASADO'
  RETURNING id INTO v_wc_location_id;
  IF v_wc_location_id IS NOT NULL THEN
    RAISE NOTICE 'Moved WC-AMASADO under production warehouse';
  END IF;

  RAISE NOTICE 'Finished reorganizing work centers under production warehouse';
END $$;

-- Update the trigger to create work center locations under production warehouse
CREATE OR REPLACE FUNCTION produccion.create_location_for_work_center()
RETURNS TRIGGER AS $$
DECLARE
  v_production_warehouse_id uuid;
  v_location_id uuid;
BEGIN
  -- Get the production warehouse
  SELECT id INTO v_production_warehouse_id
  FROM inventario.locations
  WHERE code = 'WH-PROD' AND location_type = 'warehouse';

  -- If production warehouse doesn't exist, create it
  IF v_production_warehouse_id IS NULL THEN
    INSERT INTO inventario.locations (
      code, name, location_type, parent_id, level, is_virtual, bin_type, is_active, metadata
    ) VALUES (
      'WH-PROD', 'Producción', 'warehouse', NULL, 1, false, NULL, true,
      jsonb_build_object('description', 'Bodega de producción - Centros de trabajo', 'type', 'production')
    ) RETURNING id INTO v_production_warehouse_id;
  END IF;

  -- Create a location for this work center under production warehouse
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
    v_production_warehouse_id,  -- Under production warehouse
    2,                           -- Level 2 (bins are under warehouses)
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

  RAISE NOTICE 'Created location WC-% (%) under production warehouse for work center %', 
    NEW.code, v_location_id, NEW.name;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION produccion.create_location_for_work_center() IS 
'Automatically creates a bin location under the production warehouse when a work center is created';
