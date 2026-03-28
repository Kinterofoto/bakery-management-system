-- Consolidate sensor_readings: 1 row per reading instead of 3
-- Add new columns
ALTER TABLE sensor_readings
  ADD COLUMN IF NOT EXISTS temperatura numeric,
  ADD COLUMN IF NOT EXISTS humedad numeric,
  ADD COLUMN IF NOT EXISTS indice_calor numeric;

-- Remove NOT NULL on metric and value before migration (skip if columns already dropped)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sensor_readings' AND column_name = 'metric') THEN
    ALTER TABLE sensor_readings ALTER COLUMN metric DROP NOT NULL;
    ALTER TABLE sensor_readings ALTER COLUMN value DROP NOT NULL;

    -- Migrate existing data: pivot metric/value into columns
    WITH pivoted AS (
      SELECT
        device_id,
        date_trunc('second', created_at) AS reading_time,
        MAX(CASE WHEN metric = 'temperatura' THEN value END) AS temperatura,
        MAX(CASE WHEN metric = 'humedad' THEN value END) AS humedad,
        MAX(CASE WHEN metric = 'indice_calor' THEN value END) AS indice_calor
      FROM sensor_readings
      WHERE metric IS NOT NULL
      GROUP BY device_id, date_trunc('second', created_at)
    )
    INSERT INTO sensor_readings (device_id, temperatura, humedad, indice_calor, created_at)
    SELECT device_id, temperatura, humedad, indice_calor, reading_time
    FROM pivoted;

    -- Delete old metric-based rows
    DELETE FROM sensor_readings WHERE metric IS NOT NULL;

    -- Drop old columns
    ALTER TABLE sensor_readings
      DROP COLUMN IF EXISTS metric,
      DROP COLUMN IF EXISTS value;
  END IF;
END $$;

-- Update index for new structure
DROP INDEX IF EXISTS idx_sensor_readings_device_metric_time;
CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_time
  ON sensor_readings (device_id, created_at DESC);
