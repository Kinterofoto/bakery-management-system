-- Fix: allow anon role to read sensor_readings
-- The frontend supabase client uses anon key before auth token is set
CREATE POLICY "Anon users can read sensor_readings"
  ON sensor_readings FOR SELECT
  TO anon
  USING (true);
