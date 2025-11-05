-- Fix storage policies for visit-photos bucket

-- First, ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'visit-photos',
  'visit-photos',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Drop all existing policies for this bucket
DROP POLICY IF EXISTS "Allow authenticated users to upload visit photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to read visit photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete their visit photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update visit photos" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload visit photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read visit photos" ON storage.objects;

-- Create new comprehensive policies

-- Allow anyone (authenticated or anon) to INSERT/upload
CREATE POLICY "Anyone can upload to visit-photos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'visit-photos');

-- Allow anyone to SELECT/read (since bucket is public)
CREATE POLICY "Anyone can read visit-photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'visit-photos');

-- Allow anyone to UPDATE
CREATE POLICY "Anyone can update visit-photos"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'visit-photos')
WITH CHECK (bucket_id = 'visit-photos');

-- Allow anyone to DELETE
CREATE POLICY "Anyone can delete visit-photos"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'visit-photos');

-- Verify the bucket configuration
DO $$
DECLARE
    bucket_exists boolean;
    bucket_is_public boolean;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM storage.buckets WHERE id = 'visit-photos'
    ) INTO bucket_exists;

    SELECT public INTO bucket_is_public
    FROM storage.buckets
    WHERE id = 'visit-photos';

    RAISE NOTICE 'Bucket "visit-photos" exists: %', bucket_exists;
    RAISE NOTICE 'Bucket "visit-photos" is public: %', bucket_is_public;

    IF bucket_exists AND bucket_is_public THEN
        RAISE NOTICE 'Storage bucket configured successfully!';
    ELSE
        RAISE WARNING 'Storage bucket may not be configured correctly.';
    END IF;
END $$;
