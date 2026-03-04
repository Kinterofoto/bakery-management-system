-- Fix RLS: allow both anon and authenticated access to employee_directory
DROP POLICY IF EXISTS "Allow authenticated access to employee_directory" ON public.employee_directory;

CREATE POLICY "Allow full access to employee_directory"
  ON public.employee_directory
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
