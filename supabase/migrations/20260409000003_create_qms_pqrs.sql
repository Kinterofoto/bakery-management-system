-- PQRS Module: Peticiones, Quejas, Reclamos y Sugerencias
-- Public submission by clients, internal resolution workflow

-- PQRS type enum
DO $$ BEGIN
  CREATE TYPE qms.pqrs_type AS ENUM ('peticion', 'queja', 'reclamo', 'sugerencia');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- PQRS status enum
DO $$ BEGIN
  CREATE TYPE qms.pqrs_status AS ENUM ('recibida', 'en_revision', 'en_progreso', 'resuelta', 'cerrada');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Main PQRS table
CREATE TABLE IF NOT EXISTS qms.pqrs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Client info
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  -- PQRS classification
  pqrs_type qms.pqrs_type NOT NULL,
  description TEXT NOT NULL,
  -- Product info
  product_id UUID REFERENCES public.products(id),
  product_name TEXT, -- denormalized for display even if product changes
  product_lot TEXT,
  expiry_date DATE,
  purchase_date DATE,
  purchase_location TEXT,
  -- Resolution
  status qms.pqrs_status NOT NULL DEFAULT 'recibida',
  resolution_notes TEXT, -- draft resolution notes (markdown)
  resolution_method TEXT, -- method used to resolve
  action_plan TEXT, -- plan de accion
  resolved_by UUID REFERENCES auth.users(id),
  resolution_date TIMESTAMPTZ,
  -- Email tracking
  resolution_email_sent BOOLEAN DEFAULT FALSE,
  resolution_email_sent_at TIMESTAMPTZ,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- PQRS attachments (both client uploads and resolution evidence)
CREATE TABLE IF NOT EXISTS qms.pqrs_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pqrs_id UUID NOT NULL REFERENCES qms.pqrs(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  is_resolution BOOLEAN DEFAULT FALSE, -- true = internal resolution evidence, false = client upload
  uploaded_by UUID REFERENCES auth.users(id), -- null for client uploads
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Storage bucket for PQRS files
INSERT INTO storage.buckets (id, name, public)
VALUES ('qms-pqrs', 'qms-pqrs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public read qms-pqrs" ON storage.objects
  FOR SELECT USING (bucket_id = 'qms-pqrs');

CREATE POLICY "Anyone can upload to qms-pqrs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'qms-pqrs');

CREATE POLICY "Authenticated delete qms-pqrs" ON storage.objects
  FOR DELETE USING (bucket_id = 'qms-pqrs' AND auth.role() = 'authenticated');

-- RLS policies for PQRS
ALTER TABLE qms.pqrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms.pqrs_attachments ENABLE ROW LEVEL SECURITY;

-- Authenticated users can do everything
CREATE POLICY "authenticated_all_pqrs" ON qms.pqrs
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_all_pqrs_attachments" ON qms.pqrs_attachments
  FOR ALL USING (auth.role() = 'authenticated');

-- Anonymous users can INSERT pqrs (public form submission)
CREATE POLICY "anon_insert_pqrs" ON qms.pqrs
  FOR INSERT WITH CHECK (auth.role() = 'anon');

-- Anonymous users can INSERT attachments (public form)
CREATE POLICY "anon_insert_pqrs_attachments" ON qms.pqrs_attachments
  FOR INSERT WITH CHECK (auth.role() = 'anon');

-- Anonymous users can read products (for the product dropdown)
-- (products table is in public schema, should already be accessible)

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pqrs_status ON qms.pqrs(status);
CREATE INDEX IF NOT EXISTS idx_pqrs_type ON qms.pqrs(pqrs_type);
CREATE INDEX IF NOT EXISTS idx_pqrs_created_at ON qms.pqrs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pqrs_product_id ON qms.pqrs(product_id);
CREATE INDEX IF NOT EXISTS idx_pqrs_attachments_pqrs_id ON qms.pqrs_attachments(pqrs_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION qms.update_pqrs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pqrs_updated_at
  BEFORE UPDATE ON qms.pqrs
  FOR EACH ROW EXECUTE FUNCTION qms.update_pqrs_updated_at();

-- Seed PQRS program in sanitation_programs (frequency NULL since PQRS is on-demand)
INSERT INTO qms.sanitation_programs (name, description, code, icon, color, status)
VALUES (
  'PQRS',
  'Gestión de Peticiones, Quejas, Reclamos y Sugerencias de clientes',
  'pqrs',
  'MessageSquareWarning',
  '#ef4444',
  'activo'
) ON CONFLICT (code) DO NOTHING;
