-- Script para arreglar las políticas de storage después de crear el bucket desde el Dashboard
-- PREREQUISITO: El bucket 'evidencia_de_entrega' debe existir (creado desde Dashboard > Storage)

-- Limpiar políticas existentes que puedan estar causando conflictos
DROP POLICY IF EXISTS "Allow authenticated users to upload evidence" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view evidence" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to evidence" ON storage.objects;

-- Política simple: permitir todo a usuarios autenticados para este bucket
CREATE POLICY "evidencia_entrega_authenticated_all" ON storage.objects
FOR ALL TO authenticated USING (
  bucket_id = 'evidencia_de_entrega'
) WITH CHECK (
  bucket_id = 'evidencia_de_entrega'
);

-- Política específica para eliminar: permitir que usuarios autenticados eliminen archivos
CREATE POLICY "evidencia_entrega_authenticated_delete" ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'evidencia_de_entrega'
);

-- Política adicional: permitir lectura pública para este bucket (ya que es público)
CREATE POLICY "evidencia_entrega_public_select" ON storage.objects
FOR SELECT TO public USING (
  bucket_id = 'evidencia_de_entrega'
);

-- Verificar que RLS está habilitado
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Verificar que el bucket existe
SELECT 
  id, 
  name, 
  public,
  CASE 
    WHEN public = true THEN '✅ Público'
    ELSE '❌ Privado'
  END as estado
FROM storage.buckets 
WHERE id = 'evidencia_de_entrega';

-- Mensaje de confirmación
SELECT 'Políticas de storage configuradas correctamente' as message;