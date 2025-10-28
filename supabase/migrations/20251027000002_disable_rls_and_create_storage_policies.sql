-- Disable RLS on all visitas schema tables
ALTER TABLE visitas.store_visits DISABLE ROW LEVEL SECURITY;
ALTER TABLE visitas.product_evaluations DISABLE ROW LEVEL SECURITY;
ALTER TABLE visitas.visit_photos DISABLE ROW LEVEL SECURITY;

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('visit-photos', 'visit-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to upload visit photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to read visit photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete their visit photos" ON storage.objects;

-- Create storage policies for visit-photos bucket

-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated users to upload visit photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'visit-photos');

-- Allow public read access (since bucket is public)
CREATE POLICY "Allow public to read visit photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'visit-photos');

-- Allow authenticated users to delete
CREATE POLICY "Allow authenticated users to delete their visit photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'visit-photos');

-- Allow authenticated users to update
CREATE POLICY "Allow authenticated users to update visit photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'visit-photos');
