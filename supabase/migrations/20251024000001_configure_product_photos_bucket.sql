-- =====================================================
-- Configuración del bucket Fotos_producto
-- =====================================================
-- IMPORTANTE: El bucket debe existir antes de ejecutar esto
-- Crear en Supabase Dashboard → Storage → "Fotos_producto"
-- =====================================================

-- Políticas de acceso para el bucket Fotos_producto
-- Permitir lectura pública
CREATE POLICY "Public Access for Product Photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'Fotos_producto');

-- Permitir subida de archivos a usuarios autenticados
CREATE POLICY "Authenticated users can upload product photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'Fotos_producto');

-- Permitir actualización de archivos a usuarios autenticados
CREATE POLICY "Authenticated users can update product photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'Fotos_producto');

-- Permitir eliminación de archivos a usuarios autenticados
CREATE POLICY "Authenticated users can delete product photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'Fotos_producto');
