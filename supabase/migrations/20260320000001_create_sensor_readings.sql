-- Tabla para lecturas de sensores IoT (ESP32)
CREATE TABLE IF NOT EXISTS sensor_readings (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  device_id text NOT NULL,
  metric text NOT NULL,
  value numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index para queries por dispositivo + métrica + tiempo
CREATE INDEX idx_sensor_readings_device_metric_time
  ON sensor_readings (device_id, metric, created_at DESC);

-- Habilitar RLS
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;

-- Policy: lectura para usuarios autenticados
CREATE POLICY "Authenticated users can read sensor_readings"
  ON sensor_readings FOR SELECT
  TO authenticated
  USING (true);

-- Policy: service role puede insertar (bridge)
CREATE POLICY "Service role can insert sensor_readings"
  ON sensor_readings FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Habilitar realtime para esta tabla
ALTER PUBLICATION supabase_realtime ADD TABLE sensor_readings;

-- Agregar permiso IoT a usuarios super_admin y administrator existentes
UPDATE users
SET permissions = permissions || '{"iot": true}'::jsonb
WHERE role IN ('super_admin', 'administrator')
  AND permissions IS NOT NULL;
