-- =====================================================
-- Migration: Seed Initial Locations
-- =====================================================
-- Purpose: Create initial warehouse structure with special bins
-- Date: 2025-12-01
-- =====================================================

-- =====================================================
-- WAREHOUSE LEVEL (Level 1)
-- =====================================================

INSERT INTO inventario.locations (code, name, location_type, level, is_virtual, bin_type, is_active) VALUES
  ('WH1', 'Bodega Principal', 'warehouse', 1, false, NULL, true);

-- =====================================================
-- SPECIAL BINS - WAREHOUSE LEVEL (Level 2 - treated as zones)
-- =====================================================
-- These are virtual bins representing general areas within the warehouse

INSERT INTO inventario.locations (code, name, location_type, level, parent_id, is_virtual, bin_type, is_active)
SELECT
  'WH1-GENERAL',
  'Área General (sin ubicación específica)',
  'zone',
  2,
  (SELECT id FROM inventario.locations WHERE code = 'WH1'),
  true,
  'general',
  true
UNION ALL SELECT
  'WH1-RECEIVING',
  'Área de Recepción',
  'zone',
  2,
  (SELECT id FROM inventario.locations WHERE code = 'WH1'),
  true,
  'receiving',
  true
UNION ALL SELECT
  'WH1-SHIPPING',
  'Área de Despacho',
  'zone',
  2,
  (SELECT id FROM inventario.locations WHERE code = 'WH1'),
  true,
  'shipping',
  true
UNION ALL SELECT
  'WH1-QUARANTINE',
  'Cuarentena',
  'zone',
  2,
  (SELECT id FROM inventario.locations WHERE code = 'WH1'),
  true,
  'quarantine',
  true;

-- =====================================================
-- REAL ZONES (Level 2)
-- =====================================================

INSERT INTO inventario.locations (code, name, location_type, level, parent_id, is_virtual, bin_type, is_active)
SELECT
  'Z1',
  'Zona de Almacenaje 1',
  'zone',
  2,
  (SELECT id FROM inventario.locations WHERE code = 'WH1'),
  false,
  'storage',
  true
UNION ALL SELECT
  'Z2',
  'Zona de Producción',
  'zone',
  2,
  (SELECT id FROM inventario.locations WHERE code = 'WH1'),
  false,
  'production',
  true;

-- =====================================================
-- SPECIAL BINS - ZONE LEVEL
-- =====================================================

INSERT INTO inventario.locations (code, name, location_type, level, parent_id, is_virtual, bin_type, is_active)
SELECT
  'Z1-STORAGE',
  'Almacenaje General Z1 (sin posición específica)',
  'bin',
  4,  -- Treated as bin level for simplicity
  (SELECT id FROM inventario.locations WHERE code = 'Z1'),
  true,
  'storage',
  true
UNION ALL SELECT
  'Z2-PROD-GENERAL',
  'Producción General (sin posición específica)',
  'bin',
  4,
  (SELECT id FROM inventario.locations WHERE code = 'Z2'),
  true,
  'production',
  true;

-- =====================================================
-- AISLES (Level 3) - Example structure
-- =====================================================

INSERT INTO inventario.locations (code, name, location_type, level, parent_id, is_virtual, is_active)
SELECT
  'Z1-A1',
  'Pasillo A1',
  'aisle',
  3,
  (SELECT id FROM inventario.locations WHERE code = 'Z1'),
  false,
  true
UNION ALL SELECT
  'Z1-A2',
  'Pasillo A2',
  'aisle',
  3,
  (SELECT id FROM inventario.locations WHERE code = 'Z1'),
  false,
  true;

-- =====================================================
-- BINS (Level 4) - Example physical locations
-- =====================================================

INSERT INTO inventario.locations (code, name, location_type, level, parent_id, is_virtual, capacity, is_active)
SELECT
  'BIN-A1-01',
  'Posición A1-01',
  'bin',
  4,
  (SELECT id FROM inventario.locations WHERE code = 'Z1-A1'),
  false,
  10.0,  -- 10 m³ capacity
  true
UNION ALL SELECT
  'BIN-A1-02',
  'Posición A1-02',
  'bin',
  4,
  (SELECT id FROM inventario.locations WHERE code = 'Z1-A1'),
  false,
  10.0,
  true
UNION ALL SELECT
  'BIN-A1-03',
  'Posición A1-03',
  'bin',
  4,
  (SELECT id FROM inventario.locations WHERE code = 'Z1-A1'),
  false,
  10.0,
  true
UNION ALL SELECT
  'BIN-A2-01',
  'Posición A2-01',
  'bin',
  4,
  (SELECT id FROM inventario.locations WHERE code = 'Z1-A2'),
  false,
  10.0,
  true
UNION ALL SELECT
  'BIN-A2-02',
  'Posición A2-02',
  'bin',
  4,
  (SELECT id FROM inventario.locations WHERE code = 'Z1-A2'),
  false,
  10.0,
  true;

-- =====================================================
-- Summary of Created Locations
-- =====================================================

-- Warehouse: WH1
--
-- Special Bins (Virtual):
--   - WH1-GENERAL: Default for general inventory (when no specific location)
--   - WH1-RECEIVING: Default for purchase receptions
--   - WH1-SHIPPING: Default for shipments
--   - WH1-QUARANTINE: For items in quarantine
--
-- Real Zones:
--   - Z1: Storage Zone
--     - Z1-STORAGE: Virtual bin for general storage
--     - Z1-A1: Aisle A1
--       - BIN-A1-01, BIN-A1-02, BIN-A1-03
--     - Z1-A2: Aisle A2
--       - BIN-A2-01, BIN-A2-02
--
--   - Z2: Production Zone
--     - Z2-PROD-GENERAL: Virtual bin for production area
--
-- Total: 1 warehouse, 6 zones/special areas, 2 aisles, 7 bins
