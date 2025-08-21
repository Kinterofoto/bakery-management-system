-- Create production module tables in 'produccion' schema

-- Crear el schema si no existe
CREATE SCHEMA IF NOT EXISTS produccion;

-- Centros de trabajo
CREATE TABLE IF NOT EXISTS produccion.work_centers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Turnos de producción
CREATE TABLE IF NOT EXISTS produccion.production_shifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  work_center_id UUID REFERENCES produccion.work_centers(id) ON DELETE CASCADE,
  shift_name VARCHAR(255) NOT NULL,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  created_by UUID REFERENCES public.users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Rutas de producción (secuencia de centros de trabajo por producto)
CREATE TABLE IF NOT EXISTS produccion.production_routes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  work_center_id UUID REFERENCES produccion.work_centers(id) ON DELETE CASCADE,
  sequence_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(product_id, work_center_id, sequence_order)
);

-- Parámetros de productividad (unidades/hora por producto)
CREATE TABLE IF NOT EXISTS produccion.production_productivity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  work_center_id UUID REFERENCES produccion.work_centers(id) ON DELETE CASCADE,
  units_per_hour DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(product_id, work_center_id)
);

-- Materiales para bill of materials
CREATE TABLE IF NOT EXISTS produccion.materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  base_unit VARCHAR(50) NOT NULL DEFAULT 'gramos', -- unidad base en gramos
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Bill of materials (materiales por producto)
CREATE TABLE IF NOT EXISTS produccion.bill_of_materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  material_id UUID REFERENCES produccion.materials(id) ON DELETE CASCADE,
  quantity_needed DECIMAL(12,3) NOT NULL, -- cantidad necesaria en unidad base (gramos)
  unit_name VARCHAR(100) NOT NULL, -- nombre de la unidad personalizada (bulto, empaste, etc.)
  unit_equivalence_grams DECIMAL(12,3) NOT NULL, -- equivalencia en gramos de la unidad personalizada
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(product_id, material_id)
);

-- Producciones por turno y referencia
CREATE TABLE IF NOT EXISTS produccion.shift_productions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_id UUID REFERENCES produccion.production_shifts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  total_good_units INTEGER DEFAULT 0,
  total_bad_units INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Registros de producción (múltiples registros por producción)
CREATE TABLE IF NOT EXISTS produccion.production_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_production_id UUID REFERENCES produccion.shift_productions(id) ON DELETE CASCADE,
  good_units INTEGER DEFAULT 0,
  bad_units INTEGER DEFAULT 0,
  recorded_at TIMESTAMP DEFAULT NOW(),
  recorded_by UUID REFERENCES public.users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Consumos de materiales
CREATE TABLE IF NOT EXISTS produccion.material_consumptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_production_id UUID REFERENCES produccion.shift_productions(id) ON DELETE CASCADE,
  material_id UUID REFERENCES produccion.materials(id),
  quantity_consumed DECIMAL(12,3) NOT NULL, -- cantidad en gramos
  consumption_type VARCHAR(50) DEFAULT 'consumed' CHECK (consumption_type IN ('consumed', 'wasted')),
  recorded_at TIMESTAMP DEFAULT NOW(),
  recorded_by UUID REFERENCES public.users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Seguimiento de unidades a través de la ruta de producción
CREATE TABLE IF NOT EXISTS produccion.production_route_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id),
  work_center_id UUID REFERENCES produccion.work_centers(id),
  shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
  units_processed INTEGER DEFAULT 0,
  units_pending INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(product_id, work_center_id, shift_date)
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_production_shifts_work_center ON produccion.production_shifts(work_center_id);
CREATE INDEX IF NOT EXISTS idx_production_shifts_status ON produccion.production_shifts(status);
CREATE INDEX IF NOT EXISTS idx_shift_productions_shift_id ON produccion.shift_productions(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_productions_product_id ON produccion.shift_productions(product_id);
CREATE INDEX IF NOT EXISTS idx_production_records_shift_production ON produccion.production_records(shift_production_id);
CREATE INDEX IF NOT EXISTS idx_material_consumptions_shift_production ON produccion.material_consumptions(shift_production_id);
CREATE INDEX IF NOT EXISTS idx_production_route_tracking_date ON produccion.production_route_tracking(shift_date);

-- Función para calcular producción teórica basada en tiempo transcurrido
CREATE OR REPLACE FUNCTION produccion.calculate_theoretical_production(
  p_product_id UUID,
  p_work_center_id UUID,
  p_start_time TIMESTAMP,
  p_end_time TIMESTAMP DEFAULT NOW()
)
RETURNS DECIMAL AS $$
DECLARE
  units_per_hour DECIMAL(10,2);
  hours_worked DECIMAL(10,2);
  theoretical_units DECIMAL(12,2);
BEGIN
  -- Obtener unidades por hora para el producto y centro de trabajo
  SELECT pp.units_per_hour INTO units_per_hour
  FROM produccion.production_productivity pp
  WHERE pp.product_id = p_product_id 
    AND pp.work_center_id = p_work_center_id 
    AND pp.is_active = true;
  
  IF units_per_hour IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calcular horas trabajadas
  hours_worked := EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 3600.0;
  
  -- Calcular producción teórica
  theoretical_units := units_per_hour * hours_worked;
  
  RETURN COALESCE(theoretical_units, 0);
END;
$$ LANGUAGE plpgsql;

-- Función para calcular consumo teórico de materiales
CREATE OR REPLACE FUNCTION produccion.calculate_theoretical_consumption(
  p_product_id UUID,
  p_units_produced INTEGER
)
RETURNS TABLE(material_id UUID, material_name VARCHAR, theoretical_quantity DECIMAL, unit_name VARCHAR) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bom.material_id,
    m.name,
    (bom.quantity_needed * p_units_produced) as theoretical_quantity,
    bom.unit_name
  FROM produccion.bill_of_materials bom
  JOIN produccion.materials m ON m.id = bom.material_id
  WHERE bom.product_id = p_product_id 
    AND bom.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar totales de producción
CREATE OR REPLACE FUNCTION produccion.update_shift_production_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar totales en shift_productions
  UPDATE produccion.shift_productions 
  SET 
    total_good_units = (
      SELECT COALESCE(SUM(good_units), 0) 
      FROM produccion.production_records 
      WHERE shift_production_id = NEW.shift_production_id
    ),
    total_bad_units = (
      SELECT COALESCE(SUM(bad_units), 0) 
      FROM produccion.production_records 
      WHERE shift_production_id = NEW.shift_production_id
    ),
    updated_at = NOW()
  WHERE id = NEW.shift_production_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar totales automáticamente
DROP TRIGGER IF EXISTS update_production_totals_trigger ON produccion.production_records;
CREATE TRIGGER update_production_totals_trigger
  AFTER INSERT OR UPDATE OR DELETE ON produccion.production_records
  FOR EACH ROW
  EXECUTE FUNCTION produccion.update_shift_production_totals();

-- Insertar algunos materiales básicos de ejemplo
INSERT INTO produccion.materials (name, description, base_unit) VALUES
('Harina de Trigo', 'Harina refinada para panificación', 'gramos'),
('Azúcar', 'Azúcar refinada blanca', 'gramos'),
('Sal', 'Sal común para panificación', 'gramos'),
('Levadura', 'Levadura fresca para pan', 'gramos'),
('Mantequilla', 'Mantequilla sin sal', 'gramos'),
('Huevos', 'Huevos frescos de gallina', 'gramos'),
('Leche', 'Leche entera pasteurizada', 'gramos'),
('Pollo', 'Pollo deshuesado para rellenos', 'gramos')
ON CONFLICT DO NOTHING;

-- Insertar algunos centros de trabajo de ejemplo
INSERT INTO produccion.work_centers (code, name, description) VALUES
('AMAS001', 'Amasado', 'Centro de trabajo para preparación de masas'),
('ARMA001', 'Armado', 'Centro de trabajo para armado y relleno de productos'),
('HORN001', 'Horneado', 'Centro de trabajo para cocción de productos'),
('DECO001', 'Decorado', 'Centro de trabajo para decoración final'),
('EMPA001', 'Empacado', 'Centro de trabajo para empaque de productos terminados')
ON CONFLICT (code) DO NOTHING;

-- Configurar permisos del schema para el usuario de la aplicación
GRANT USAGE ON SCHEMA produccion TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA produccion TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA produccion TO postgres;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA produccion TO postgres;

-- Hacer que los permisos se apliquen a futuras tablas
ALTER DEFAULT PRIVILEGES IN SCHEMA produccion GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA produccion GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA produccion GRANT ALL ON FUNCTIONS TO postgres;

COMMENT ON SCHEMA produccion IS 'Schema dedicado al módulo de producción de la panadería';
COMMENT ON TABLE produccion.work_centers IS 'Centros de trabajo donde se realizan las operaciones de producción';
COMMENT ON TABLE produccion.production_shifts IS 'Turnos de producción por centro de trabajo';
COMMENT ON TABLE produccion.shift_productions IS 'Producciones específicas por producto dentro de un turno';
COMMENT ON TABLE produccion.production_records IS 'Registros múltiples de unidades producidas';
COMMENT ON TABLE produccion.material_consumptions IS 'Registros de consumo real de materiales';
COMMENT ON TABLE produccion.bill_of_materials IS 'Lista de materiales requeridos por producto con equivalencias personalizadas';
COMMENT ON TABLE produccion.production_productivity IS 'Parámetros de productividad teórica por producto y centro';