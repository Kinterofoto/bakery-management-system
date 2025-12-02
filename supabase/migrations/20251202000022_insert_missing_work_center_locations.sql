-- =====================================================
-- Migration: Insert missing work center locations
-- =====================================================
-- Purpose: Insert the 8 work center locations that were missing from the initial restore
-- Date: 2025-12-02
-- =====================================================

-- Insert missing work center locations
INSERT INTO inventario.locations
(id, code, name, location_type, parent_id, path, level, is_virtual, bin_type, is_active, capacity, temperature_control, metadata, created_at, updated_at, created_by)
VALUES
('6763d76e-92df-4dc6-ac38-e4c965357afb', 'WC-EMPAQUE', 'EMPAQUE', 'bin', '451fdd4d-7c80-460e-9089-585340e2d72b', '/WH1/WC-EMPAQUE', 2, false, 'production', true, NULL, false,
 '{"description": null, "work_center_id": "7ee993ff-462f-4556-8bea-a8ce3127ac54", "work_center_code": "EMPAQUE"}',
 '2025-12-02 01:57:49.805291+00', '2025-12-02 01:57:49.805291+00', NULL),

('34de464f-7a4c-4312-885f-e5d52c3a877c', 'WC-EMPASTADO_2', 'EMPASTADO 2', 'bin', '451fdd4d-7c80-460e-9089-585340e2d72b', '/WH1/WC-EMPASTADO_2', 2, false, 'production', true, NULL, false,
 '{"description": null, "work_center_id": "84e186ac-a324-460d-8d31-8cc34e3c89b4", "work_center_code": "EMPASTADO_2"}',
 '2025-12-02 01:57:49.805291+00', '2025-12-02 01:57:49.805291+00', NULL),

('d3f68919-0b45-4639-8b6c-9de6ab0efe52', 'WC-FERMENTACION', 'FERMENTACION', 'bin', '451fdd4d-7c80-460e-9089-585340e2d72b', '/WH1/WC-FERMENTACION', 2, false, 'production', true, NULL, false,
 '{"description": null, "work_center_id": "a6e95b73-19ba-47e8-9a86-3790d3ebb8a0", "work_center_code": "FERMENTACION"}',
 '2025-12-02 01:57:49.805291+00', '2025-12-02 01:57:49.805291+00', NULL),

('57c3c8eb-1cc7-4856-a417-35e1f453fd4b', 'WC-CROISSOMAT', 'CROISSOMAT', 'bin', '451fdd4d-7c80-460e-9089-585340e2d72b', '/WH1/WC-CROISSOMAT', 2, false, 'production', true, NULL, false,
 '{"description": null, "work_center_id": "b7ba9233-d43e-4bac-a979-acb8a74bf964", "work_center_code": "CROISSOMAT"}',
 '2025-12-02 01:57:49.805291+00', '2025-12-02 01:57:49.805291+00', NULL),

('baad9c50-975d-4046-b4f9-e774843e931e', 'WC-EMPASTADO_1', 'EMPASTADO 1', 'bin', '451fdd4d-7c80-460e-9089-585340e2d72b', '/WH1/WC-EMPASTADO_1', 2, false, 'production', true, NULL, false,
 '{"description": null, "work_center_id": "bea4fb29-6b4d-44aa-b85f-cf4cc8a2ad16", "work_center_code": "EMPASTADO_1"}',
 '2025-12-02 01:57:49.805291+00', '2025-12-02 01:57:49.805291+00', NULL),

('d28576c5-57b3-43e2-a34c-5df7921b36ce', 'WC-PANADERIA', 'PANADERIA', 'bin', '451fdd4d-7c80-460e-9089-585340e2d72b', '/WH1/WC-PANADERIA', 2, false, 'production', true, NULL, false,
 '{"description": null, "work_center_id": "e5d01ccd-d375-4a3a-858a-49b6adb4932f", "work_center_code": "PANADERIA"}',
 '2025-12-02 01:57:49.805291+00', '2025-12-02 01:57:49.805291+00', NULL),

('043e934e-bda0-416e-ada4-3f0b3bd35169', 'WC-AMASADO', 'AMASADO', 'bin', '451fdd4d-7c80-460e-9089-585340e2d72b', '/WH1/WC-AMASADO', 2, false, 'production', true, NULL, false,
 '{"description": null, "work_center_id": "ef87800c-1bcf-46ae-a85d-bc9372789fc6", "work_center_code": "AMASADO"}',
 '2025-12-02 01:57:49.805291+00', '2025-12-02 01:57:49.805291+00', NULL),

('39fd717b-c924-48af-aa87-f6244fe2c1ae', 'WC-POLYLINE', 'POLYLINE', 'bin', '451fdd4d-7c80-460e-9089-585340e2d72b', '/WH1/WC-POLYLINE', 2, false, 'production', true, NULL, false,
 '{"description": null, "work_center_id": "028eb924-0824-4678-8414-0d2c1895a749", "work_center_code": "POLYLINE"}',
 '2025-12-02 01:57:49.805291+00', '2025-12-02 01:57:49.805291+00', NULL)
ON CONFLICT (id) DO NOTHING;

-- Now restore the relationships for all work centers
DO $$
DECLARE
  loc RECORD;
  wc_id UUID;
  updated_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Restoring work_center.location_id relationships for all locations...';

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

COMMENT ON TABLE inventario.locations IS
'Hierarchical location structure for inventory management. Includes warehouse zones, aisles, bins, and work center locations.';
