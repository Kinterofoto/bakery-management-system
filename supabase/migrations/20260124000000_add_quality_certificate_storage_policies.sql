-- Migration: Add storage policies for certificados_calidad bucket
-- Description: Allows public read access to quality certificate images

-- Create bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificados_calidad', 'certificados_calidad', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policy: Allow authenticated users to upload to certificados_calidad bucket
CREATE POLICY "Allow authenticated users to upload quality certificates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'certificados_calidad');

-- Policy: Allow authenticated users to update their uploads
CREATE POLICY "Allow authenticated users to update quality certificates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'certificados_calidad');

-- Policy: Allow authenticated users to delete their uploads
CREATE POLICY "Allow authenticated users to delete quality certificates"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'certificados_calidad');

-- Policy: Allow public read access to quality certificates
CREATE POLICY "Allow public read access to quality certificates"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'certificados_calidad');
