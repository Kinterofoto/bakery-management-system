-- Add location_id to inventories table
-- This allows each inventory to be directly associated with a specific location
-- instead of using inventory_type mapped to bin_type

-- Add location_id column
ALTER TABLE public.inventories
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES inventario.locations(id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_inventories_location_id
ON public.inventories(location_id);

-- Add comment
COMMENT ON COLUMN public.inventories.location_id IS
'Direct reference to the specific location being counted. Replaces the inventory_type mapping to bin_type approach.';

-- Note: inventory_type is kept for backward compatibility but location_id takes precedence
COMMENT ON COLUMN public.inventories.inventory_type IS
'DEPRECATED: Use location_id instead. Kept for backward compatibility only.';
