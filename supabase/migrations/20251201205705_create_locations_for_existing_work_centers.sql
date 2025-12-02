-- =====================================================
-- Migration: Create locations for existing work centers
-- =====================================================
-- Purpose: Manually create locations for all existing work centers
-- Date: 2025-12-01
-- =====================================================

DO $$
DECLARE
  v_warehouse_id uuid;
  v_location_id uuid;
  v_wc_id uuid;
  v_wc_code varchar;
  v_wc_name varchar;
  v_wc_description text;
  v_wc_is_active boolean;
BEGIN
  -- Get main warehouse location
  SELECT id INTO v_warehouse_id
  FROM inventario.locations
  WHERE location_type = 'warehouse' AND level = 1
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_warehouse_id IS NULL THEN
    RAISE EXCEPTION 'No warehouse location found. Please create a warehouse first.';
  END IF;

  RAISE NOTICE 'Using warehouse ID: %', v_warehouse_id;

  -- POLYLINE
  v_wc_id := '028eb924-0824-4678-8414-0d2c1895a749';
  v_wc_code := 'POLYLINE';
  v_wc_name := 'POLYLINE';
  v_wc_description := NULL;
  v_wc_is_active := true;

  SELECT id INTO v_location_id FROM inventario.locations WHERE code = 'WC-' || v_wc_code;
  IF v_location_id IS NULL THEN
    INSERT INTO inventario.locations (code, name, location_type, parent_id, level, is_virtual, bin_type, is_active, metadata)
    VALUES ('WC-' || v_wc_code, v_wc_name, 'bin', v_warehouse_id, 2, false, 'production', v_wc_is_active,
            jsonb_build_object('work_center_id', v_wc_id, 'work_center_code', v_wc_code, 'description', v_wc_description))
    RETURNING id INTO v_location_id;
    
    RAISE NOTICE 'Created location for POLYLINE: %', v_location_id;
  END IF;

  -- ULTRACOGELADOR_1
  v_wc_id := '1b9a2c36-6eea-435f-88cc-143557cc71a5';
  v_wc_code := 'ULTRACOGELADOR_1';
  v_wc_name := 'ULTRACOGELADOR  1';
  v_wc_description := NULL;
  v_wc_is_active := true;

  SELECT id INTO v_location_id FROM inventario.locations WHERE code = 'WC-' || v_wc_code;
  IF v_location_id IS NULL THEN
    INSERT INTO inventario.locations (code, name, location_type, parent_id, level, is_virtual, bin_type, is_active, metadata)
    VALUES ('WC-' || v_wc_code, v_wc_name, 'bin', v_warehouse_id, 2, false, 'production', v_wc_is_active,
            jsonb_build_object('work_center_id', v_wc_id, 'work_center_code', v_wc_code, 'description', v_wc_description))
    RETURNING id INTO v_location_id;
    
    RAISE NOTICE 'Created location for ULTRACOGELADOR_1: %', v_location_id;
  END IF;

  -- DECORADO
  v_wc_id := '5afec362-9d7c-459f-92dc-5431e42dc81b';
  v_wc_code := 'DECORADO';
  v_wc_name := 'DECORADO';
  v_wc_description := NULL;
  v_wc_is_active := true;

  SELECT id INTO v_location_id FROM inventario.locations WHERE code = 'WC-' || v_wc_code;
  IF v_location_id IS NULL THEN
    INSERT INTO inventario.locations (code, name, location_type, parent_id, level, is_virtual, bin_type, is_active, metadata)
    VALUES ('WC-' || v_wc_code, v_wc_name, 'bin', v_warehouse_id, 2, false, 'production', v_wc_is_active,
            jsonb_build_object('work_center_id', v_wc_id, 'work_center_code', v_wc_code, 'description', v_wc_description))
    RETURNING id INTO v_location_id;
    
    RAISE NOTICE 'Created location for DECORADO: %', v_location_id;
  END IF;

  -- PASTELERIA
  v_wc_id := '61895037-4be2-4470-bec8-cd26f6638c65';
  v_wc_code := 'PASTELERIA';
  v_wc_name := 'PASTELERIA';
  v_wc_description := NULL;
  v_wc_is_active := true;

  SELECT id INTO v_location_id FROM inventario.locations WHERE code = 'WC-' || v_wc_code;
  IF v_location_id IS NULL THEN
    INSERT INTO inventario.locations (code, name, location_type, parent_id, level, is_virtual, bin_type, is_active, metadata)
    VALUES ('WC-' || v_wc_code, v_wc_name, 'bin', v_warehouse_id, 2, false, 'production', v_wc_is_active,
            jsonb_build_object('work_center_id', v_wc_id, 'work_center_code', v_wc_code, 'description', v_wc_description))
    RETURNING id INTO v_location_id;
    
    RAISE NOTICE 'Created location for PASTELERIA: %', v_location_id;
  END IF;

  -- EMPAQUE
  v_wc_id := '7ee993ff-462f-4556-8bea-a8ce3127ac54';
  v_wc_code := 'EMPAQUE';
  v_wc_name := 'EMPAQUE';
  v_wc_description := NULL;
  v_wc_is_active := true;

  SELECT id INTO v_location_id FROM inventario.locations WHERE code = 'WC-' || v_wc_code;
  IF v_location_id IS NULL THEN
    INSERT INTO inventario.locations (code, name, location_type, parent_id, level, is_virtual, bin_type, is_active, metadata)
    VALUES ('WC-' || v_wc_code, v_wc_name, 'bin', v_warehouse_id, 2, false, 'production', v_wc_is_active,
            jsonb_build_object('work_center_id', v_wc_id, 'work_center_code', v_wc_code, 'description', v_wc_description))
    RETURNING id INTO v_location_id;
    
    RAISE NOTICE 'Created location for EMPAQUE: %', v_location_id;
  END IF;

  -- EMPASTADO_2
  v_wc_id := '84e186ac-a324-460d-8d31-8cc34e3c89b4';
  v_wc_code := 'EMPASTADO_2';
  v_wc_name := 'EMPASTADO 2';
  v_wc_description := NULL;
  v_wc_is_active := true;

  SELECT id INTO v_location_id FROM inventario.locations WHERE code = 'WC-' || v_wc_code;
  IF v_location_id IS NULL THEN
    INSERT INTO inventario.locations (code, name, location_type, parent_id, level, is_virtual, bin_type, is_active, metadata)
    VALUES ('WC-' || v_wc_code, v_wc_name, 'bin', v_warehouse_id, 2, false, 'production', v_wc_is_active,
            jsonb_build_object('work_center_id', v_wc_id, 'work_center_code', v_wc_code, 'description', v_wc_description))
    RETURNING id INTO v_location_id;
    
    RAISE NOTICE 'Created location for EMPASTADO_2: %', v_location_id;
  END IF;

  -- FERMENTACION
  v_wc_id := 'a6e95b73-19ba-47e8-9a86-3790d3ebb8a0';
  v_wc_code := 'FERMENTACION';
  v_wc_name := 'FERMENTACION';
  v_wc_description := NULL;
  v_wc_is_active := true;

  SELECT id INTO v_location_id FROM inventario.locations WHERE code = 'WC-' || v_wc_code;
  IF v_location_id IS NULL THEN
    INSERT INTO inventario.locations (code, name, location_type, parent_id, level, is_virtual, bin_type, is_active, metadata)
    VALUES ('WC-' || v_wc_code, v_wc_name, 'bin', v_warehouse_id, 2, false, 'production', v_wc_is_active,
            jsonb_build_object('work_center_id', v_wc_id, 'work_center_code', v_wc_code, 'description', v_wc_description))
    RETURNING id INTO v_location_id;
    
    RAISE NOTICE 'Created location for FERMENTACION: %', v_location_id;
  END IF;

  -- CROISSOMAT
  v_wc_id := 'b7ba9233-d43e-4bac-a979-acb8a74bf964';
  v_wc_code := 'CROISSOMAT';
  v_wc_name := 'CROISSOMAT';
  v_wc_description := NULL;
  v_wc_is_active := true;

  SELECT id INTO v_location_id FROM inventario.locations WHERE code = 'WC-' || v_wc_code;
  IF v_location_id IS NULL THEN
    INSERT INTO inventario.locations (code, name, location_type, parent_id, level, is_virtual, bin_type, is_active, metadata)
    VALUES ('WC-' || v_wc_code, v_wc_name, 'bin', v_warehouse_id, 2, false, 'production', v_wc_is_active,
            jsonb_build_object('work_center_id', v_wc_id, 'work_center_code', v_wc_code, 'description', v_wc_description))
    RETURNING id INTO v_location_id;
    
    RAISE NOTICE 'Created location for CROISSOMAT: %', v_location_id;
  END IF;

  -- EMPASTADO_1
  v_wc_id := 'bea4fb29-6b4d-44aa-b85f-cf4cc8a2ad16';
  v_wc_code := 'EMPASTADO_1';
  v_wc_name := 'EMPASTADO 1';
  v_wc_description := NULL;
  v_wc_is_active := true;

  SELECT id INTO v_location_id FROM inventario.locations WHERE code = 'WC-' || v_wc_code;
  IF v_location_id IS NULL THEN
    INSERT INTO inventario.locations (code, name, location_type, parent_id, level, is_virtual, bin_type, is_active, metadata)
    VALUES ('WC-' || v_wc_code, v_wc_name, 'bin', v_warehouse_id, 2, false, 'production', v_wc_is_active,
            jsonb_build_object('work_center_id', v_wc_id, 'work_center_code', v_wc_code, 'description', v_wc_description))
    RETURNING id INTO v_location_id;
    
    RAISE NOTICE 'Created location for EMPASTADO_1: %', v_location_id;
  END IF;

  -- PANADERIA
  v_wc_id := 'e5d01ccd-d375-4a3a-858a-49b6adb4932f';
  v_wc_code := 'PANADERIA';
  v_wc_name := 'PANADERIA';
  v_wc_description := NULL;
  v_wc_is_active := true;

  SELECT id INTO v_location_id FROM inventario.locations WHERE code = 'WC-' || v_wc_code;
  IF v_location_id IS NULL THEN
    INSERT INTO inventario.locations (code, name, location_type, parent_id, level, is_virtual, bin_type, is_active, metadata)
    VALUES ('WC-' || v_wc_code, v_wc_name, 'bin', v_warehouse_id, 2, false, 'production', v_wc_is_active,
            jsonb_build_object('work_center_id', v_wc_id, 'work_center_code', v_wc_code, 'description', v_wc_description))
    RETURNING id INTO v_location_id;
    
    RAISE NOTICE 'Created location for PANADERIA: %', v_location_id;
  END IF;

  -- AMASADO
  v_wc_id := 'ef87800c-1bcf-46ae-a85d-bc9372789fc6';
  v_wc_code := 'AMASADO';
  v_wc_name := 'AMASADO';
  v_wc_description := NULL;
  v_wc_is_active := true;

  SELECT id INTO v_location_id FROM inventario.locations WHERE code = 'WC-' || v_wc_code;
  IF v_location_id IS NULL THEN
    INSERT INTO inventario.locations (code, name, location_type, parent_id, level, is_virtual, bin_type, is_active, metadata)
    VALUES ('WC-' || v_wc_code, v_wc_name, 'bin', v_warehouse_id, 2, false, 'production', v_wc_is_active,
            jsonb_build_object('work_center_id', v_wc_id, 'work_center_code', v_wc_code, 'description', v_wc_description))
    RETURNING id INTO v_location_id;
    
    RAISE NOTICE 'Created location for AMASADO: %', v_location_id;
  END IF;

  RAISE NOTICE 'Finished creating locations for all work centers';
END $$;
