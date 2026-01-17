-- Create production_schedules table in produccion schema
CREATE TABLE produccion.production_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint: end_date must be after start_date
    CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

-- Create indexes for efficient queries
CREATE INDEX idx_production_schedules_resource_id ON produccion.production_schedules(resource_id);
CREATE INDEX idx_production_schedules_product_id ON produccion.production_schedules(product_id);
CREATE INDEX idx_production_schedules_dates ON produccion.production_schedules(start_date, end_date);

-- Enable RLS
ALTER TABLE produccion.production_schedules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to read production_schedules"
    ON produccion.production_schedules
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to create production_schedules"
    ON produccion.production_schedules
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update production_schedules"
    ON produccion.production_schedules
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete production_schedules"
    ON produccion.production_schedules
    FOR DELETE
    TO authenticated
    USING (true);

-- Create function to validate no overlapping schedules
CREATE OR REPLACE FUNCTION produccion.check_no_overlapping_schedules()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if there's any overlapping schedule for the same resource
  IF EXISTS (
    SELECT 1 FROM produccion.production_schedules
    WHERE resource_id = NEW.resource_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')
    AND start_date < NEW.end_date
    AND end_date > NEW.start_date
  ) THEN
    RAISE EXCEPTION 'Esta máquina ya tiene una programación en ese rango de fechas';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION produccion.update_production_schedules_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate no overlaps before insert/update
CREATE TRIGGER check_no_overlapping_schedules_trigger
    BEFORE INSERT OR UPDATE ON produccion.production_schedules
    FOR EACH ROW
    EXECUTE FUNCTION produccion.check_no_overlapping_schedules();

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_production_schedules_timestamp
    BEFORE UPDATE ON produccion.production_schedules
    FOR EACH ROW
    EXECUTE FUNCTION produccion.update_production_schedules_timestamp();

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON produccion.production_schedules TO authenticated;
GRANT USAGE ON SCHEMA produccion TO authenticated;
