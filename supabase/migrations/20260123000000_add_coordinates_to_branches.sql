-- Add latitude and longitude columns to branches table
-- These coordinates will be captured from Google Places API autocomplete

ALTER TABLE public.branches
  ADD COLUMN latitude double precision,
  ADD COLUMN longitude double precision;

-- Create index for geospatial queries (future optimization)
CREATE INDEX idx_branches_coordinates
  ON public.branches (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.branches.latitude IS 'Latitude from Google Places API';
COMMENT ON COLUMN public.branches.longitude IS 'Longitude from Google Places API';
