-- =====================================================
-- Migration: Create Locations Table (Hierarchical WMS)
-- =====================================================
-- Purpose: Create hierarchical location structure (warehouse → zone → aisle → bin)
-- Date: 2025-12-01
-- =====================================================

CREATE TABLE inventario.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificación
  code VARCHAR(50) UNIQUE NOT NULL,  -- WH1, Z1-A, BIN-001, WH1-GENERAL
  name VARCHAR(200) NOT NULL,        -- "Bodega Principal", "Zona A", etc.

  -- Jerarquía
  location_type VARCHAR(20) NOT NULL CHECK (location_type IN ('warehouse', 'zone', 'aisle', 'bin')),
  parent_id UUID REFERENCES inventario.locations(id) ON DELETE RESTRICT,
  path TEXT,  -- Materialized path: /WH1/Z1/A1/BIN-001
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 4),  -- 1=warehouse, 2=zone, 3=aisle, 4=bin

  -- Bins especiales (para ubicaciones generales)
  is_virtual BOOLEAN DEFAULT false,  -- true para WH1-GENERAL, WH1-RECEIVING, etc.
  bin_type VARCHAR(30) CHECK (bin_type IN ('storage', 'receiving', 'shipping', 'production', 'general', 'quarantine', 'staging')),

  -- Control
  is_active BOOLEAN DEFAULT true,
  capacity DECIMAL(12,3),  -- Capacidad en m³ o unidades

  -- Metadata adicional
  temperature_control BOOLEAN DEFAULT false,
  metadata JSONB,  -- Para datos adicionales como dimensiones, restricciones, etc.

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT valid_parent_hierarchy CHECK (
    (level = 1 AND parent_id IS NULL) OR  -- warehouse no tiene padre
    (level > 1 AND parent_id IS NOT NULL)  -- otros niveles sí
  )
);

-- =====================================================
-- Índices para performance
-- =====================================================

-- Búsqueda por código (muy frecuente)
CREATE UNIQUE INDEX idx_locations_code ON inventario.locations(code);

-- Búsqueda por jerarquía
CREATE INDEX idx_locations_parent ON inventario.locations(parent_id);
CREATE INDEX idx_locations_path ON inventario.locations USING gin(to_tsvector('simple', path));

-- Filtros comunes
CREATE INDEX idx_locations_type_active ON inventario.locations(location_type, is_active);
CREATE INDEX idx_locations_level ON inventario.locations(level);
CREATE INDEX idx_locations_bin_type ON inventario.locations(bin_type) WHERE bin_type IS NOT NULL;

-- =====================================================
-- Trigger para actualizar path automáticamente
-- =====================================================

CREATE OR REPLACE FUNCTION inventario.update_location_path()
RETURNS TRIGGER AS $$
DECLARE
  parent_path TEXT;
BEGIN
  IF NEW.parent_id IS NULL THEN
    -- Warehouse level: path = /code
    NEW.path := '/' || NEW.code;
  ELSE
    -- Get parent path
    SELECT path INTO parent_path
    FROM inventario.locations
    WHERE id = NEW.parent_id;

    -- Build path: parent_path/code
    NEW.path := parent_path || '/' || NEW.code;
  END IF;

  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_location_path
  BEFORE INSERT OR UPDATE OF code, parent_id ON inventario.locations
  FOR EACH ROW
  EXECUTE FUNCTION inventario.update_location_path();

-- =====================================================
-- Enable RLS
-- =====================================================

ALTER TABLE inventario.locations ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all for authenticated users
CREATE POLICY "Enable all for authenticated users"
  ON inventario.locations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE inventario.locations IS 'Hierarchical location structure for WMS (warehouse → zone → aisle → bin)';
COMMENT ON COLUMN inventario.locations.code IS 'Unique location code (WH1, Z1-A, BIN-001, WH1-GENERAL)';
COMMENT ON COLUMN inventario.locations.path IS 'Materialized path for hierarchical queries (/WH1/Z1/A1/BIN-001)';
COMMENT ON COLUMN inventario.locations.is_virtual IS 'True for special bins like WH1-GENERAL, WH1-RECEIVING (represent general areas)';
COMMENT ON COLUMN inventario.locations.bin_type IS 'Type of special bin: storage, receiving, shipping, production, general, quarantine, staging';
