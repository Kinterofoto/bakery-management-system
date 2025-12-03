-- Migration: Create WH3 Warehouse and Reception Tracking
-- Description: Creates WH3 (Producto Terminado) warehouse with bin locations
--              and adds tracking column to shift_productions for inventory receipt
-- Created: 2025-12-03

-- =====================================================
-- 1. Add received_to_inventory column to shift_productions
-- =====================================================

DO $$
BEGIN
  -- Add column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'produccion'
    AND table_name = 'shift_productions'
    AND column_name = 'received_to_inventory'
  ) THEN
    ALTER TABLE produccion.shift_productions
    ADD COLUMN received_to_inventory BOOLEAN NOT NULL DEFAULT false;

    COMMENT ON COLUMN produccion.shift_productions.received_to_inventory IS
    'Indicates whether this production has been received into inventory (WH3)';
  END IF;
END $$;

-- =====================================================
-- 2. Create WH3 Warehouse (Producto Terminado)
-- =====================================================

DO $$
DECLARE
  v_wh3_id UUID;
  v_wh3_general_id UUID;
BEGIN
  -- Check if WH3 warehouse already exists
  SELECT id INTO v_wh3_id
  FROM inventario.locations
  WHERE code = 'WH3';

  -- Create WH3 warehouse if it doesn't exist
  IF v_wh3_id IS NULL THEN
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
    )
    VALUES (
      'WH3',
      'Producto Terminado',
      'warehouse',
      NULL,
      1,
      false,
      NULL,
      true,
      jsonb_build_object('description', 'Almacén de productos terminados provenientes de producción')
    )
    RETURNING id INTO v_wh3_id;

    RAISE NOTICE 'Created WH3 warehouse with ID: %', v_wh3_id;
  ELSE
    RAISE NOTICE 'WH3 warehouse already exists with ID: %', v_wh3_id;
  END IF;

  -- Create WH3-GENERAL bin location if it doesn't exist
  SELECT id INTO v_wh3_general_id
  FROM inventario.locations
  WHERE code = 'WH3-GENERAL';

  IF v_wh3_general_id IS NULL THEN
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
    )
    VALUES (
      'WH3-GENERAL',
      'General PT',
      'bin',
      v_wh3_id,
      2,
      false,
      'general',
      true,
      jsonb_build_object('description', 'Ubicación general de producto terminado')
    )
    RETURNING id INTO v_wh3_general_id;

    RAISE NOTICE 'Created WH3-GENERAL bin with ID: %', v_wh3_general_id;
  ELSE
    RAISE NOTICE 'WH3-GENERAL bin already exists with ID: %', v_wh3_general_id;
  END IF;

  -- Create WH3-STAGING bin location for incoming products
  IF NOT EXISTS (
    SELECT 1 FROM inventario.locations WHERE code = 'WH3-STAGING'
  ) THEN
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
    )
    VALUES (
      'WH3-STAGING',
      'Staging PT',
      'bin',
      v_wh3_id,
      2,
      false,
      'staging',
      true,
      jsonb_build_object('description', 'Área de recepción temporal de producto terminado')
    );

    RAISE NOTICE 'Created WH3-STAGING bin';
  END IF;

  -- Create WH3-SHIPPING bin location for outbound products
  IF NOT EXISTS (
    SELECT 1 FROM inventario.locations WHERE code = 'WH3-SHIPPING'
  ) THEN
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
    )
    VALUES (
      'WH3-SHIPPING',
      'Despacho PT',
      'bin',
      v_wh3_id,
      2,
      false,
      'shipping',
      true,
      jsonb_build_object('description', 'Área de despacho de producto terminado')
    );

    RAISE NOTICE 'Created WH3-SHIPPING bin';
  END IF;
END $$;

-- =====================================================
-- 3. Add is_last_operation column to work_centers
-- =====================================================

DO $$
BEGIN
  -- Add column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'produccion'
    AND table_name = 'work_centers'
    AND column_name = 'is_last_operation'
  ) THEN
    ALTER TABLE produccion.work_centers
    ADD COLUMN is_last_operation BOOLEAN NOT NULL DEFAULT false;

    COMMENT ON COLUMN produccion.work_centers.is_last_operation IS
    'Indicates if this work center is the last operation in the production process (empaque, laminado, etc)';
  END IF;
END $$;

-- =====================================================
-- 4. Update existing work centers to mark last operations
-- =====================================================

-- Mark "EMPAQUE" and similar finishing work centers as last operation
UPDATE produccion.work_centers
SET is_last_operation = true
WHERE code IN ('EMPAQUE', 'EMPACADO', 'PACKAGING', 'LAMINADO', 'LAMINATING')
  OR name ILIKE '%empaque%'
  OR name ILIKE '%packaging%'
  OR name ILIKE '%laminado%'
  OR name ILIKE '%laminating%'
  OR name ILIKE '%finalizaci%';

-- =====================================================
-- 5. Create index for performance
-- =====================================================

-- Index on received_to_inventory for quick filtering
CREATE INDEX IF NOT EXISTS idx_shift_productions_received_to_inventory
ON produccion.shift_productions (received_to_inventory)
WHERE received_to_inventory = false;

-- Index on work_centers for last operation filtering
CREATE INDEX IF NOT EXISTS idx_work_centers_is_last_operation
ON produccion.work_centers (is_last_operation)
WHERE is_last_operation = true;

-- =====================================================
-- 6. Grant permissions
-- =====================================================

-- Grant permissions on new column
GRANT SELECT, UPDATE ON produccion.shift_productions TO authenticated;
GRANT SELECT, UPDATE ON produccion.work_centers TO authenticated;

-- =====================================================
-- Summary
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Created:';
  RAISE NOTICE '  - WH3 warehouse (Producto Terminado)';
  RAISE NOTICE '  - WH3-GENERAL bin (general storage)';
  RAISE NOTICE '  - WH3-STAGING bin (incoming reception)';
  RAISE NOTICE '  - WH3-SHIPPING bin (outbound shipping)';
  RAISE NOTICE '  - received_to_inventory column in shift_productions';
  RAISE NOTICE '  - is_last_operation column in work_centers';
  RAISE NOTICE '  - Indexes for performance optimization';
  RAISE NOTICE '=================================================';
END $$;
