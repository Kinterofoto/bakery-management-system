-- Add new fields to ordenes_compra table to match workflow requirements

ALTER TABLE workflows.ordenes_compra
  ADD COLUMN IF NOT EXISTS cliente_id UUID,
  ADD COLUMN IF NOT EXISTS sucursal_id UUID,
  ADD COLUMN IF NOT EXISTS order_number TEXT,
  ADD COLUMN IF NOT EXISTS fecha_orden DATE,
  ADD COLUMN IF NOT EXISTS valor_total NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS observaciones TEXT,
  ADD COLUMN IF NOT EXISTS braintrust_log_ids TEXT[];

-- Update status check constraint to match workflow statuses
ALTER TABLE workflows.ordenes_compra
  DROP CONSTRAINT IF EXISTS ordenes_compra_status_check;

ALTER TABLE workflows.ordenes_compra
  ADD CONSTRAINT ordenes_compra_status_check 
  CHECK (status IN ('pending', 'processed', 'error'));

-- Add fields to productos table
ALTER TABLE workflows.ordenes_compra_productos
  ADD COLUMN IF NOT EXISTS producto_id UUID,
  ADD COLUMN IF NOT EXISTS producto_nombre TEXT,
  ADD COLUMN IF NOT EXISTS unidad TEXT DEFAULT 'unidades',
  ADD COLUMN IF NOT EXISTS precio_unitario NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(3, 2) CHECK (confidence_score >= 0 AND confidence_score <= 1);

-- Rename cantidad_solicitada to cantidad for consistency
ALTER TABLE workflows.ordenes_compra_productos
  RENAME COLUMN cantidad_solicitada TO cantidad;

-- Drop old precio constraint and add new one
ALTER TABLE workflows.ordenes_compra_productos
  DROP CONSTRAINT IF EXISTS ordenes_compra_productos_precio_check;

ALTER TABLE workflows.ordenes_compra_productos
  ADD CONSTRAINT ordenes_compra_productos_precio_unitario_check 
  CHECK (precio_unitario >= 0);

-- Add index for order_number
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_order_number 
  ON workflows.ordenes_compra(order_number);

-- Add index for cliente_id and sucursal_id
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_cliente_id 
  ON workflows.ordenes_compra(cliente_id);

CREATE INDEX IF NOT EXISTS idx_ordenes_compra_sucursal_id 
  ON workflows.ordenes_compra(sucursal_id);

-- Add index for producto_id
CREATE INDEX IF NOT EXISTS idx_productos_producto_id 
  ON workflows.ordenes_compra_productos(producto_id);

-- Update comments
COMMENT ON COLUMN workflows.ordenes_compra.cliente_id IS 'Referencia al cliente identificado (puede ser NULL si no se encuentra)';
COMMENT ON COLUMN workflows.ordenes_compra.order_number IS 'Número de orden interno generado (ej: OC-20251106-001)';
COMMENT ON COLUMN workflows.ordenes_compra.braintrust_log_ids IS 'Array de IDs de logs en Braintrust para tracking';
COMMENT ON COLUMN workflows.ordenes_compra_productos.confidence_score IS 'Nivel de confianza del match de producto (0-1)';
COMMENT ON COLUMN workflows.ordenes_compra_productos.producto_nombre IS 'Nombre del producto extraído (puede diferir del nombre en BD)';
