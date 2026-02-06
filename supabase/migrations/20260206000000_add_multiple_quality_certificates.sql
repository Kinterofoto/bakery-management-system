-- Migration: Add support for multiple quality certificates per reception
-- Description: Creates a new table to store multiple quality certificate photos
-- This migration is idempotent and safe to run multiple times

-- 1. Create reception_quality_certificates table (idempotent)
CREATE TABLE IF NOT EXISTS inventario.reception_quality_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reception_quality_id UUID NOT NULL REFERENCES inventario.reception_quality_parameters(id) ON DELETE CASCADE,
  certificate_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id),
  UNIQUE(reception_quality_id, certificate_url) -- Prevent duplicate URLs for same reception
);

-- 2. Create indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_reception_quality_certificates_reception_quality_id
  ON inventario.reception_quality_certificates(reception_quality_id);

-- 3. Add comments for documentation
COMMENT ON TABLE inventario.reception_quality_certificates IS 'Multiple quality certificate photos per reception';
COMMENT ON COLUMN inventario.reception_quality_certificates.reception_quality_id IS 'Reference to reception quality parameters';
COMMENT ON COLUMN inventario.reception_quality_certificates.certificate_url IS 'URL to quality certificate photo in certificados_calidad bucket';

-- 4. Row Level Security
DO $$
BEGIN
  -- Enable RLS if not already enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'inventario'
    AND tablename = 'reception_quality_certificates'
    AND rowsecurity = true
  ) THEN
    ALTER TABLE inventario.reception_quality_certificates ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist (to allow re-running migration)
DROP POLICY IF EXISTS "Allow all authenticated users to read quality certificates"
  ON inventario.reception_quality_certificates;
DROP POLICY IF EXISTS "Allow authenticated users to insert quality certificates"
  ON inventario.reception_quality_certificates;
DROP POLICY IF EXISTS "Allow authenticated users to delete quality certificates"
  ON inventario.reception_quality_certificates;

-- Policy: Allow all authenticated users to read certificates
CREATE POLICY "Allow all authenticated users to read quality certificates"
ON inventario.reception_quality_certificates FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow authenticated users to insert certificates
CREATE POLICY "Allow authenticated users to insert quality certificates"
ON inventario.reception_quality_certificates FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Allow authenticated users to delete certificates
CREATE POLICY "Allow authenticated users to delete quality certificates"
ON inventario.reception_quality_certificates FOR DELETE
TO authenticated
USING (true);

-- 5. Migrate existing single certificate URLs to new table (idempotent with ON CONFLICT)
-- Note: quality_certificate_url will be deprecated but kept for backward compatibility
INSERT INTO inventario.reception_quality_certificates (reception_quality_id, certificate_url, uploaded_at)
SELECT id, quality_certificate_url, created_at
FROM inventario.reception_quality_parameters
WHERE quality_certificate_url IS NOT NULL
  AND quality_certificate_url != ''
  AND quality_certificate_url <> ''
ON CONFLICT (reception_quality_id, certificate_url) DO NOTHING;

-- Add comment about deprecated field
COMMENT ON COLUMN inventario.reception_quality_parameters.quality_certificate_url IS 'DEPRECATED: Use reception_quality_certificates table instead. Kept for backward compatibility.';
