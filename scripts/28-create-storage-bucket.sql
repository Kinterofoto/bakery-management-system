-- Crear bucket para evidencias de entrega
-- Este script debe ejecutarse desde el Dashboard de Supabase o con privilegios de superusuario

-- Insertar el bucket en la tabla storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evidencia_de_entrega',
  'evidencia_de_entrega',
  true,
  52428800, -- 50MB en bytes
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Primero, eliminar políticas existentes si existen para evitar conflictos
DROP POLICY IF EXISTS "Allow authenticated users to upload evidence" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view evidence" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to evidence" ON storage.objects;

-- Crear política para permitir que usuarios autenticados suban archivos
CREATE POLICY "Allow authenticated users to upload evidence" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'evidencia_de_entrega'
);

-- Crear política para permitir que usuarios autenticados vean archivos  
CREATE POLICY "Allow authenticated users to view evidence" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'evidencia_de_entrega'
);

-- Crear política para permitir acceso público de lectura (ya que el bucket es público)
CREATE POLICY "Allow public read access to evidence" ON storage.objects
FOR SELECT TO public USING (
  bucket_id = 'evidencia_de_entrega'
);

-- Habilitar RLS en storage.objects si no está habilitado
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Mensaje de confirmación
SELECT 'Bucket evidencia_de_entrega creado exitosamente' as message;