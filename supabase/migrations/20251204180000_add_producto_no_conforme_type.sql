-- Agregar tipo 'producto_no_conforme' al constraint de inventory_type
-- Primero eliminamos el constraint existente y lo recreamos con el nuevo tipo

ALTER TABLE public.inventories
DROP CONSTRAINT IF EXISTS inventories_inventory_type_check;

ALTER TABLE public.inventories
ADD CONSTRAINT inventories_inventory_type_check
CHECK (
  inventory_type IN (
    'produccion',
    'producto_terminado',
    'producto_en_proceso',
    'bodega_materias_primas',
    'producto_no_conforme'
  )
);

-- Actualizar comentario descriptivo
COMMENT ON COLUMN public.inventories.inventory_type IS
'Tipo de inventario: produccion, producto_terminado, producto_en_proceso, bodega_materias_primas, producto_no_conforme';
