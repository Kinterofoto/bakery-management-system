-- Agregar columna inventory_type a la tabla inventories
-- Tipos: producción, producto_terminado, producto_en_proceso, bodega_materias_primas

ALTER TABLE public.inventories
ADD COLUMN IF NOT EXISTS inventory_type VARCHAR(50);

-- Actualizar registros existentes con un valor por defecto
UPDATE public.inventories
SET inventory_type = 'produccion'
WHERE inventory_type IS NULL;

-- Hacer la columna NOT NULL después de actualizar los valores existentes
ALTER TABLE public.inventories
ALTER COLUMN inventory_type SET NOT NULL;

-- Agregar CHECK constraint con los 4 valores permitidos
ALTER TABLE public.inventories
ADD CONSTRAINT inventories_inventory_type_check
CHECK (
  inventory_type IN (
    'produccion',
    'producto_terminado',
    'producto_en_proceso',
    'bodega_materias_primas'
  )
);

-- Agregar índice para mejorar performance en queries filtrados por tipo
CREATE INDEX IF NOT EXISTS idx_inventories_inventory_type
ON public.inventories USING btree (inventory_type);

-- Comentario descriptivo
COMMENT ON COLUMN public.inventories.inventory_type IS
'Tipo de inventario: produccion, producto_terminado, producto_en_proceso, bodega_materias_primas';
