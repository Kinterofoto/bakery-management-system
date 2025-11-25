-- Create production_schedules table in produccion schema
CREATE TABLE produccion.production_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint: end_date must be after start_date
    CONSTRAINT valid_date_range CHECK (end_date > start_date),
    
    -- Constraint: no overlapping schedules for same resource
    CONSTRAINT no_overlapping_schedules EXCLUDE USING gist (
        resource_id WITH =,
        tsrange(start_date, end_date, '[)') WITH &&
    )
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

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION produccion.update_production_schedules_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_production_schedules_timestamp
    BEFORE UPDATE ON produccion.production_schedules
    FOR EACH ROW
    EXECUTE FUNCTION produccion.update_production_schedules_timestamp();

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON produccion.production_schedules TO authenticated;
GRANT USAGE ON SCHEMA produccion TO authenticated;
