-- Make inventory_type nullable since we now use location_id directly
-- This allows inventory_type to be deprecated while maintaining backward compatibility

-- Drop the NOT NULL constraint
ALTER TABLE public.inventories
ALTER COLUMN inventory_type DROP NOT NULL;

-- Update the check constraint to allow NULL
ALTER TABLE public.inventories
DROP CONSTRAINT IF EXISTS inventories_inventory_type_check;

ALTER TABLE public.inventories
ADD CONSTRAINT inventories_inventory_type_check CHECK (
  inventory_type IS NULL OR
  inventory_type::text = ANY (
    ARRAY[
      'produccion'::character varying,
      'producto_terminado'::character varying,
      'producto_en_proceso'::character varying,
      'bodega_materias_primas'::character varying,
      'producto_no_conforme'::character varying
    ]::text[]
  )
);

-- Add comment explaining the deprecation
COMMENT ON COLUMN public.inventories.inventory_type IS
  'DEPRECATED: Use location_id instead. This column is kept for backward compatibility but should be NULL for new records.';
