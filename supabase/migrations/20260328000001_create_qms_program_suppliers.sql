-- ============================================================================
-- QMS Program Suppliers
-- Proveedores por programa de saneamiento con documentación legal
-- ============================================================================

-- 1. Proveedores por programa
CREATE TABLE "qms"."program_suppliers" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "program_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "category" varchar(255),
  "contact_person" varchar(255),
  "contact_phone" varchar(50),
  "contact_email" varchar(255),
  "nit" varchar(50),
  "address" text,
  "notes" text,
  "status" varchar(20) DEFAULT 'activo' CHECK ("status" IN ('activo','inactivo')),
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "program_suppliers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "program_suppliers_program_fkey" FOREIGN KEY ("program_id") REFERENCES "qms"."sanitation_programs"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_program_suppliers_program" ON "qms"."program_suppliers"("program_id");

-- 2. Documentos de proveedores
CREATE TABLE "qms"."supplier_documents" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "supplier_id" uuid NOT NULL,
  "document_name" varchar(255) NOT NULL,
  "document_type" varchar(100),
  "file_url" text NOT NULL,
  "file_name" varchar(500) NOT NULL,
  "file_type" varchar(100),
  "expiry_date" date,
  "uploaded_by" uuid,
  "created_at" timestamptz DEFAULT now(),
  CONSTRAINT "supplier_documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supplier_documents_supplier_fkey" FOREIGN KEY ("supplier_id") REFERENCES "qms"."program_suppliers"("id") ON DELETE CASCADE,
  CONSTRAINT "supplier_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL
);

CREATE INDEX "idx_supplier_documents_supplier" ON "qms"."supplier_documents"("supplier_id");

-- 3. RLS
ALTER TABLE "qms"."program_suppliers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "qms"."supplier_documents" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "program_suppliers_select" ON "qms"."program_suppliers"
  FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "program_suppliers_insert" ON "qms"."program_suppliers"
  FOR INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "program_suppliers_update" ON "qms"."program_suppliers"
  FOR UPDATE TO "authenticated" USING (true);
CREATE POLICY "program_suppliers_delete" ON "qms"."program_suppliers"
  FOR DELETE TO "authenticated" USING (true);

CREATE POLICY "supplier_documents_select" ON "qms"."supplier_documents"
  FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "supplier_documents_insert" ON "qms"."supplier_documents"
  FOR INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "supplier_documents_update" ON "qms"."supplier_documents"
  FOR UPDATE TO "authenticated" USING (true);
CREATE POLICY "supplier_documents_delete" ON "qms"."supplier_documents"
  FOR DELETE TO "authenticated" USING (true);

-- 4. Storage bucket for supplier documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('qms-supplier-docs', 'qms-supplier-docs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "qms_supplier_docs_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'qms-supplier-docs');
CREATE POLICY "qms_supplier_docs_upload" ON storage.objects
  FOR INSERT TO "authenticated" WITH CHECK (bucket_id = 'qms-supplier-docs');
CREATE POLICY "qms_supplier_docs_update" ON storage.objects
  FOR UPDATE TO "authenticated" USING (bucket_id = 'qms-supplier-docs');
CREATE POLICY "qms_supplier_docs_delete" ON storage.objects
  FOR DELETE TO "authenticated" USING (bucket_id = 'qms-supplier-docs');
