-- Tabla principal de órdenes de compra
CREATE TABLE IF NOT EXISTS public.ordenes_compra (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Metadata del email
  email_id TEXT NOT NULL UNIQUE,
  email_subject TEXT NOT NULL,
  email_from TEXT NOT NULL,
  email_body_preview TEXT,
  received_at TIMESTAMPTZ NOT NULL,
  
  -- PDF info
  pdf_url TEXT NOT NULL,
  pdf_filename TEXT NOT NULL,
  openai_file_id TEXT,
  
  -- Datos extraídos de la OC
  cliente TEXT NOT NULL,
  sucursal TEXT,
  oc_number TEXT NOT NULL,
  direccion TEXT,
  
  -- Estado y logs
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'error')),
  processing_logs JSONB DEFAULT '[]'::jsonb,
  error_message TEXT,
  
  -- Braintrust tracking
  braintrust_classification_log_id TEXT,
  braintrust_extraction_log_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de productos de cada orden
CREATE TABLE IF NOT EXISTS public.ordenes_compra_productos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  orden_compra_id UUID NOT NULL REFERENCES public.ordenes_compra(id) ON DELETE CASCADE,
  
  producto TEXT NOT NULL,
  cantidad_solicitada INTEGER NOT NULL CHECK (cantidad_solicitada > 0),
  fecha_entrega DATE,
  precio NUMERIC(10, 2) CHECK (precio >= 0),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes para performance
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_oc_number 
  ON public.ordenes_compra(oc_number);

CREATE INDEX IF NOT EXISTS idx_ordenes_compra_cliente 
  ON public.ordenes_compra(cliente);

CREATE INDEX IF NOT EXISTS idx_ordenes_compra_status 
  ON public.ordenes_compra(status);

CREATE INDEX IF NOT EXISTS idx_ordenes_compra_received_at 
  ON public.ordenes_compra(received_at DESC);

CREATE INDEX IF NOT EXISTS idx_ordenes_compra_email_id 
  ON public.ordenes_compra(email_id);

CREATE INDEX IF NOT EXISTS idx_productos_orden_id 
  ON public.ordenes_compra_productos(orden_compra_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ordenes_compra_updated_at ON public.ordenes_compra;
CREATE TRIGGER update_ordenes_compra_updated_at 
  BEFORE UPDATE ON public.ordenes_compra
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE public.ordenes_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordenes_compra_productos ENABLE ROW LEVEL SECURITY;

-- Policy para admin y commercial
DROP POLICY IF EXISTS "Allow admin and commercial to view ordenes_compra" ON public.ordenes_compra;
CREATE POLICY "Allow admin and commercial to view ordenes_compra"
  ON public.ordenes_compra FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'commercial')
    )
  );

DROP POLICY IF EXISTS "Allow admin and commercial to view productos" ON public.ordenes_compra_productos;
CREATE POLICY "Allow admin and commercial to view productos"
  ON public.ordenes_compra_productos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'commercial')
    )
  );

-- Policy para service role (workflows)
DROP POLICY IF EXISTS "Allow service role full access to ordenes_compra" ON public.ordenes_compra;
CREATE POLICY "Allow service role full access to ordenes_compra"
  ON public.ordenes_compra FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service role full access to productos" ON public.ordenes_compra_productos;
CREATE POLICY "Allow service role full access to productos"
  ON public.ordenes_compra_productos FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comentarios para documentación
COMMENT ON TABLE public.ordenes_compra IS 'Órdenes de compra procesadas automáticamente desde emails';
COMMENT ON TABLE public.ordenes_compra_productos IS 'Productos extraídos de cada orden de compra';
COMMENT ON COLUMN public.ordenes_compra.email_id IS 'ID único del email de Outlook';
COMMENT ON COLUMN public.ordenes_compra.status IS 'Estado del procesamiento: pending, processed, error';
COMMENT ON COLUMN public.ordenes_compra.processing_logs IS 'Logs de procesamiento en formato JSONB';
