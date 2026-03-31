-- Add 3 new document categories: rut, camara_comercio, certificacion_bancaria
-- Drop and recreate the CHECK constraint on supplier_documents.category

ALTER TABLE compras.supplier_documents
  DROP CONSTRAINT IF EXISTS supplier_documents_category_check;

ALTER TABLE compras.supplier_documents
  ADD CONSTRAINT supplier_documents_category_check
  CHECK (category IN (
    'registro_sanitario',
    'analisis_microbiologico',
    'concepto_sanitario_vehiculo',
    'carne_manipulador_alimentos',
    'concepto_sanitario',
    'rut',
    'camara_comercio',
    'certificacion_bancaria'
  ));
