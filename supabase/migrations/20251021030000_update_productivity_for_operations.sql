-- Modificar tabla de productividad para usar operaciones en lugar de centros de trabajo
-- Agregar operation_id y hacer work_center_id opcional

ALTER TABLE produccion.production_productivity
ADD COLUMN IF NOT EXISTS operation_id UUID REFERENCES produccion.operations(id) ON DELETE CASCADE;

-- Hacer work_center_id nullable
ALTER TABLE produccion.production_productivity
ALTER COLUMN work_center_id DROP NOT NULL;

-- Actualizar constraint único para usar operation_id
ALTER TABLE produccion.production_productivity
DROP CONSTRAINT IF EXISTS production_productivity_product_work_center_key;

-- Nuevo constraint: un producto solo puede tener una configuración de productividad por operación
ALTER TABLE produccion.production_productivity
ADD CONSTRAINT production_productivity_product_operation_key
UNIQUE (product_id, operation_id);

-- Índice para mejorar búsquedas por operación
CREATE INDEX IF NOT EXISTS idx_production_productivity_operation
ON produccion.production_productivity(operation_id);

-- Comentario
COMMENT ON COLUMN produccion.production_productivity.operation_id IS 'Operación para la cual se define la productividad (unidades por hora)';
