-- Crear tabla para frecuencias de cliente
-- Esta tabla almacena los días de la semana en que cada sucursal tiene frecuencia de entrega

-- Crear tabla client_frequencies
CREATE TABLE IF NOT EXISTS client_frequencies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Evitar duplicados: una sucursal no puede tener dos frecuencias para el mismo día
  UNIQUE(branch_id, day_of_week)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_client_frequencies_branch_id ON client_frequencies(branch_id);
CREATE INDEX IF NOT EXISTS idx_client_frequencies_day_of_week ON client_frequencies(day_of_week);
CREATE INDEX IF NOT EXISTS idx_client_frequencies_active ON client_frequencies(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_client_frequencies_branch_day ON client_frequencies(branch_id, day_of_week);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_client_frequencies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_client_frequencies_updated_at
  BEFORE UPDATE ON client_frequencies
  FOR EACH ROW
  EXECUTE FUNCTION update_client_frequencies_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE client_frequencies IS 'Almacena los días de frecuencia de entrega por sucursal';
COMMENT ON COLUMN client_frequencies.day_of_week IS 'Día de la semana: 0=Domingo, 1=Lunes, ..., 6=Sábado';
COMMENT ON COLUMN client_frequencies.is_active IS 'Indica si la frecuencia está activa';
COMMENT ON COLUMN client_frequencies.notes IS 'Notas adicionales sobre la frecuencia';

-- Función para obtener frecuencias activas por día
CREATE OR REPLACE FUNCTION get_active_frequencies_for_day(target_day INTEGER)
RETURNS TABLE (
  branch_id UUID,
  client_id UUID,
  branch_name TEXT,
  client_name TEXT,
  frequency_id UUID,
  notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id as branch_id,
    b.client_id,
    b.name as branch_name,
    c.name as client_name,
    cf.id as frequency_id,
    cf.notes
  FROM client_frequencies cf
  JOIN branches b ON cf.branch_id = b.id
  JOIN clients c ON b.client_id = c.id
  WHERE cf.day_of_week = target_day 
    AND cf.is_active = true
  ORDER BY c.name, b.name;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar si una sucursal tiene frecuencia en un día específico
CREATE OR REPLACE FUNCTION has_frequency_for_day(target_branch_id UUID, target_day INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM client_frequencies 
    WHERE branch_id = target_branch_id 
      AND day_of_week = target_day 
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql;

-- Habilitar RLS (Row Level Security)
ALTER TABLE client_frequencies ENABLE ROW LEVEL SECURITY;

-- Política para permitir acceso completo a usuarios autenticados
CREATE POLICY "Allow all operations for authenticated users" ON client_frequencies
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Mensaje de confirmación
SELECT 'Tabla client_frequencies creada exitosamente con funciones auxiliares' as message;