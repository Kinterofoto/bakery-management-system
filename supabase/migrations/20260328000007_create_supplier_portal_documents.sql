-- Migration: Supplier portal documents and ficha técnica
-- Adds document management for supplier compliance in the purchasing portal

-- 1. Create supplier_documents table for compliance documents
CREATE TABLE IF NOT EXISTS compras.supplier_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES compras.suppliers(id) ON DELETE CASCADE,
  category varchar(50) NOT NULL CHECK (category IN (
    'registro_sanitario',
    'analisis_microbiologico',
    'concepto_sanitario_vehiculo',
    'carne_manipulador_alimentos',
    'concepto_sanitario'
  )),
  file_url text NOT NULL,
  file_name varchar(500) NOT NULL,
  file_type varchar(100),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Add ficha técnica columns to material_suppliers
ALTER TABLE compras.material_suppliers
  ADD COLUMN IF NOT EXISTS ficha_tecnica_url text,
  ADD COLUMN IF NOT EXISTS ficha_tecnica_file_name varchar(500);

-- 3. Create storage bucket for supplier portal documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('supplier-portal-docs', 'supplier-portal-docs', true)
ON CONFLICT (id) DO NOTHING;

-- 4. RLS policies for supplier_documents
ALTER TABLE compras.supplier_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated on supplier_documents"
  ON compras.supplier_documents
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all for anon on supplier_documents"
  ON compras.supplier_documents
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- 5. Storage policies for supplier-portal-docs bucket
CREATE POLICY "Allow read supplier-portal-docs"
  ON storage.objects FOR SELECT
  TO authenticated, anon
  USING (bucket_id = 'supplier-portal-docs');

CREATE POLICY "Allow insert supplier-portal-docs"
  ON storage.objects FOR INSERT
  TO authenticated, anon
  WITH CHECK (bucket_id = 'supplier-portal-docs');

CREATE POLICY "Allow update supplier-portal-docs"
  ON storage.objects FOR UPDATE
  TO authenticated, anon
  USING (bucket_id = 'supplier-portal-docs');

CREATE POLICY "Allow delete supplier-portal-docs"
  ON storage.objects FOR DELETE
  TO authenticated, anon
  USING (bucket_id = 'supplier-portal-docs');

-- 6. Index for fast lookup by supplier
CREATE INDEX IF NOT EXISTS idx_supplier_documents_supplier_id
  ON compras.supplier_documents(supplier_id);

CREATE INDEX IF NOT EXISTS idx_supplier_documents_category
  ON compras.supplier_documents(supplier_id, category);
