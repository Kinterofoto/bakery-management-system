-- Crear tabla de operaciones
CREATE TABLE IF NOT EXISTS produccion.operations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(50), -- Para identificación visual en la UI
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Agregar columna operation_id a work_centers
ALTER TABLE produccion.work_centers
ADD COLUMN IF NOT EXISTS operation_id UUID REFERENCES produccion.operations(id) ON DELETE SET NULL;

-- Crear índice para mejorar performance
CREATE INDEX IF NOT EXISTS idx_work_centers_operation ON produccion.work_centers(operation_id);

-- Insertar las 12 operaciones
INSERT INTO produccion.operations (code, name, description, color) VALUES
('AMASADO', 'Amasado', 'Preparación y amasado de masas', '#3B82F6'),
('PESAJES', 'Pesajes', 'Pesado y porcionado de masas', '#10B981'),
('LAMINADO', 'Laminado', 'Laminado y estirado de masas', '#8B5CF6'),
('EMBASTADO', 'Embastado', 'Embastado de productos', '#F59E0B'),
('ARMADO', 'Armado', 'Armado y formación de productos', '#EC4899'),
('FERMENTACION', 'Fermentación', 'Proceso de fermentación', '#14B8A6'),
('ULTRACONGELACION', 'Ultracongelación', 'Proceso de ultracongelación', '#06B6D4'),
('EMPAQUE', 'Empaque', 'Empacado de productos terminados', '#6366F1'),
('RELLENOS', 'Rellenos', 'Preparación y aplicación de rellenos', '#F97316'),
('COCCION', 'Cocción', 'Horneado y cocción de productos', '#EF4444'),
('BATIDOS', 'Batidos', 'Preparación de batidos y mezclas', '#A855F7'),
('MARGARINAS', 'Margarinas', 'Preparación de margarinas y grasas', '#84CC16')
ON CONFLICT (code) DO NOTHING;

-- Comentarios
COMMENT ON TABLE produccion.operations IS 'Catálogo de operaciones/procesos de producción';
COMMENT ON COLUMN produccion.work_centers.operation_id IS 'Operación asociada al centro de trabajo';
