-- Migration: Add quality parameters to material reception
-- Description: Creates quality_parameters table for storing temperature, checklist, and certificate data for material receptions (compras)

-- Create quality_parameters table in inventario schema
CREATE TABLE inventario.quality_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_id UUID NOT NULL REFERENCES inventario.inventory_movements(id) ON DELETE CASCADE,

  -- Temperaturas (OBLIGATORIO: temperature)
  temperature NUMERIC(5,2) NOT NULL CHECK (temperature >= -50 AND temperature <= 100),
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
  created_by UUID REFERENCES auth.users(id),

  -- Constraint: solo un registro de calidad por movimiento
  CONSTRAINT unique_quality_per_movement UNIQUE(movement_id)
);

-- Index for faster lookups
CREATE INDEX idx_quality_parameters_movement_id ON inventario.quality_parameters(movement_id);

-- Comments for documentation
COMMENT ON TABLE inventario.quality_parameters IS 'Quality parameters for material reception (compras). Only applies to purchase movements (reason_type = purchase).';
COMMENT ON COLUMN inventario.quality_parameters.temperature IS 'Product temperature at reception (REQUIRED, -50 to 100°C)';
COMMENT ON COLUMN inventario.quality_parameters.vehicle_temperature IS 'Vehicle temperature at delivery (OPTIONAL, -50 to 100°C)';
COMMENT ON COLUMN inventario.quality_parameters.quality_certificate_url IS 'URL to quality certificate photo in certificados_calidad bucket (compressed to max 50KB)';
COMMENT ON COLUMN inventario.quality_parameters.check_dotacion IS 'Checklist: Dotación';
COMMENT ON COLUMN inventario.quality_parameters.check_food_handling IS 'Checklist: Carné de manipulación de alimentos';
COMMENT ON COLUMN inventario.quality_parameters.check_vehicle_health IS 'Checklist: Acta sanitaria del vehículo';
COMMENT ON COLUMN inventario.quality_parameters.check_arl IS 'Checklist: ARL';
COMMENT ON COLUMN inventario.quality_parameters.check_vehicle_clean IS 'Checklist: Vehículo limpio';
COMMENT ON COLUMN inventario.quality_parameters.check_pest_free IS 'Checklist: Libre de plagas';
COMMENT ON COLUMN inventario.quality_parameters.check_toxic_free IS 'Checklist: Libre de sustancias tóxicas';
COMMENT ON COLUMN inventario.quality_parameters.check_baskets_clean IS 'Checklist: Canastillas limpias';
COMMENT ON COLUMN inventario.quality_parameters.check_pallets_good IS 'Checklist: Buen estado de estivas';
COMMENT ON COLUMN inventario.quality_parameters.check_packaging_good IS 'Checklist: Condiciones de embalaje';

-- Row Level Security
ALTER TABLE inventario.quality_parameters ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read quality parameters
CREATE POLICY "Allow all authenticated users to read quality parameters"
ON inventario.quality_parameters FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow authenticated users to insert quality parameters
CREATE POLICY "Allow authenticated users to insert quality parameters"
ON inventario.quality_parameters FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Allow authenticated users to update quality parameters
CREATE POLICY "Allow authenticated users to update quality parameters"
ON inventario.quality_parameters FOR UPDATE
TO authenticated
USING (true);

-- Policy: Allow authenticated users to delete quality parameters
CREATE POLICY "Allow authenticated users to delete quality parameters"
ON inventario.quality_parameters FOR DELETE
TO authenticated
USING (true);

-- Storage policies for certificados_calidad bucket
-- Note: Run these only if bucket doesn't already have policies

-- Allow authenticated users to upload certificates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Allow authenticated users to upload certificates'
  ) THEN
    CREATE POLICY "Allow authenticated users to upload certificates"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'certificados_calidad');
  END IF;
END$$;

-- Allow public read access to certificates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Allow public read access to certificates'
  ) THEN
    CREATE POLICY "Allow public read access to certificates"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'certificados_calidad');
  END IF;
END$$;

-- Allow authenticated users to delete their certificates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Allow authenticated users to delete their certificates'
  ) THEN
    CREATE POLICY "Allow authenticated users to delete their certificates"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'certificados_calidad');
  END IF;
END$$;
