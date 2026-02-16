-- Migration: Add fields for tracking PP backward cascade dependencies

-- Add fields to track which PT order a PP production was created for
ALTER TABLE produccion.production_schedules
ADD COLUMN produced_for_order_number INTEGER NULL,
ADD COLUMN cascade_type TEXT DEFAULT 'forward' CHECK (cascade_type IN ('forward', 'backward'));

COMMENT ON COLUMN produccion.production_schedules.produced_for_order_number IS
'If this is a PP production created for a PT order, references the PT production_order_number';

COMMENT ON COLUMN produccion.production_schedules.cascade_type IS
'Type of cascade: forward (normal PT production) or backward (PP dependency)';

-- Create index for efficient lookups of PP productions for a given PT order
CREATE INDEX idx_production_schedules_produced_for
ON produccion.production_schedules(produced_for_order_number)
WHERE produced_for_order_number IS NOT NULL;

-- Create index for cascade type filtering
CREATE INDEX idx_production_schedules_cascade_type
ON produccion.production_schedules(cascade_type);
