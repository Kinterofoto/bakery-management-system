-- Modificar bill_of_materials para asociar materiales a operaciones
-- Un producto puede tener diferentes materiales dependiendo de la operación

-- Primero, agregar columna operation_id
ALTER TABLE produccion.bill_of_materials
ADD COLUMN IF NOT EXISTS operation_id UUID REFERENCES produccion.operations(id) ON DELETE CASCADE;

-- Crear índice para mejorar performance
CREATE INDEX IF NOT EXISTS idx_bill_of_materials_operation ON produccion.bill_of_materials(operation_id);

-- Actualizar constraint único para incluir operation_id
-- Primero eliminar el constraint antiguo
ALTER TABLE produccion.bill_of_materials
DROP CONSTRAINT IF EXISTS bill_of_materials_product_id_material_id_key;

-- Crear nuevo constraint único con operation_id
ALTER TABLE produccion.bill_of_materials
ADD CONSTRAINT bill_of_materials_product_operation_material_key
UNIQUE(product_id, operation_id, material_id);

-- Comentario actualizado
COMMENT ON COLUMN produccion.bill_of_materials.operation_id IS 'Operación en la que se consume este material. Un producto puede consumir diferentes materiales en diferentes operaciones.';
