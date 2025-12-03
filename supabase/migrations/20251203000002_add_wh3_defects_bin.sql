-- Migration: Add WH3-DEFECTS bin location for bad units
-- Description: Creates a dedicated bin location for receiving defective/bad units from production

-- Insert WH3-DEFECTS bin location
INSERT INTO inventario.locations (
  code,
  name,
  location_type,
  parent_id,
  level,
  bin_type,
  is_virtual,
  is_active,
  path
)
SELECT
  'WH3-DEFECTS',
  'Unidades Defectuosas',
  'bin',
  id,  -- WH3 warehouse as parent
  2,   -- Level 2 (bin under warehouse)
  'quarantine',  -- Type for defective units
  true,  -- Virtual bin
  true,
  path || '/WH3-DEFECTS'  -- Append to WH3 path
FROM inventario.locations
WHERE code = 'WH3'
ON CONFLICT (code) DO NOTHING;

-- Add comment
COMMENT ON TABLE inventario.locations IS 'Storage locations including warehouses, zones, and bins. WH3-DEFECTS is for bad/defective units from production.';
