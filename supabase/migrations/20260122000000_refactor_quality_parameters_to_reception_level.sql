-- Migration: Refactor quality parameters to separate reception-level from item-level
-- Description: Splits quality parameters into reception-level (general) and item-level (temperature only)

-- 1. Create reception_quality_parameters table for general parameters
CREATE TABLE inventario.reception_quality_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Temperatura del vehículo (OPCIONAL)
  vehicle_temperature NUMERIC(5,2) CHECK (vehicle_temperature >= -50 AND vehicle_temperature <= 100),

  -- URL de certificado de calidad (foto almacenada en bucket certificados_calidad)
  quality_certificate_url TEXT,

  -- Checklist de calidad (todos true por defecto)
  check_dotacion BOOLEAN NOT NULL DEFAULT true,
  check_food_handling BOOLEAN NOT NULL DEFAULT true,
  check_vehicle_health BOOLEAN NOT NULL DEFAULT true,
  check_arl BOOLEAN NOT NULL DEFAULT true,
  check_vehicle_clean BOOLEAN NOT NULL DEFAULT true,
  check_pest_free BOOLEAN NOT NULL DEFAULT true,
  check_toxic_free BOOLEAN NOT NULL DEFAULT true,
  check_baskets_clean BOOLEAN NOT NULL DEFAULT true,
  check_pallets_good BOOLEAN NOT NULL DEFAULT true,
  check_packaging_good BOOLEAN NOT NULL DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Index for faster lookups
CREATE INDEX idx_reception_quality_parameters_id ON inventario.reception_quality_parameters(id);

-- Comments for documentation
COMMENT ON TABLE inventario.reception_quality_parameters IS 'Reception-level quality parameters (general for entire material reception)';
COMMENT ON COLUMN inventario.reception_quality_parameters.vehicle_temperature IS 'Vehicle temperature at delivery (OPTIONAL, -50 to 100°C)';
COMMENT ON COLUMN inventario.reception_quality_parameters.quality_certificate_url IS 'URL to quality certificate photo in certificados_calidad bucket (compressed to max 50KB)';

-- 2. Add reference to reception_quality_parameters in quality_parameters table
ALTER TABLE inventario.quality_parameters
ADD COLUMN reception_quality_id UUID REFERENCES inventario.reception_quality_parameters(id) ON DELETE CASCADE;

-- 3. Remove general fields from quality_parameters (keep only item-level temperature)
ALTER TABLE inventario.quality_parameters
DROP COLUMN IF EXISTS vehicle_temperature,
DROP COLUMN IF EXISTS quality_certificate_url,
DROP COLUMN IF EXISTS check_dotacion,
DROP COLUMN IF EXISTS check_food_handling,
DROP COLUMN IF EXISTS check_vehicle_health,
DROP COLUMN IF EXISTS check_arl,
DROP COLUMN IF EXISTS check_vehicle_clean,
DROP COLUMN IF EXISTS check_pest_free,
DROP COLUMN IF EXISTS check_toxic_free,
DROP COLUMN IF EXISTS check_baskets_clean,
DROP COLUMN IF EXISTS check_pallets_good,
DROP COLUMN IF EXISTS check_packaging_good;

-- Update comments
COMMENT ON TABLE inventario.quality_parameters IS 'Item-level quality parameters (temperature per product in material reception)';
COMMENT ON COLUMN inventario.quality_parameters.temperature IS 'Product temperature at reception (REQUIRED, -50 to 100°C)';
COMMENT ON COLUMN inventario.quality_parameters.reception_quality_id IS 'Reference to general reception quality parameters';

-- 4. Row Level Security for reception_quality_parameters
ALTER TABLE inventario.reception_quality_parameters ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read reception quality parameters
CREATE POLICY "Allow all authenticated users to read reception quality parameters"
ON inventario.reception_quality_parameters FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow authenticated users to insert reception quality parameters
CREATE POLICY "Allow authenticated users to insert reception quality parameters"
ON inventario.reception_quality_parameters FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Allow authenticated users to update reception quality parameters
CREATE POLICY "Allow authenticated users to update reception quality parameters"
ON inventario.reception_quality_parameters FOR UPDATE
TO authenticated
USING (true);

-- Policy: Allow authenticated users to delete reception quality parameters
CREATE POLICY "Allow authenticated users to delete reception quality parameters"
ON inventario.reception_quality_parameters FOR DELETE
TO authenticated
USING (true);
