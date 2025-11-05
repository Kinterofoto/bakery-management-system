-- Add facturador and category columns to clients table

-- Add facturador column with enum values (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clients' AND column_name = 'facturador') THEN
        ALTER TABLE public.clients 
        ADD COLUMN facturador VARCHAR(20) CHECK (facturador IN ('LA FABRIKA CO', 'PASTRY CHEF'));
    END IF;
END $$;

-- Add category column with enum values (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clients' AND column_name = 'category') THEN
        ALTER TABLE public.clients 
        ADD COLUMN category VARCHAR(20) CHECK (category IN (
          'CAFE', 
          'UNIVERSIDAD', 
          'CONVENIENCIA', 
          'HOTEL', 
          'COLEGIO', 
          'CATERING', 
          'SUPERMERCADO', 
          'CLUB', 
          'RESTAURANTE', 
          'OTRO'
        ));
    END IF;
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_clients_facturador ON public.clients USING btree (facturador);
CREATE INDEX IF NOT EXISTS idx_clients_category ON public.clients USING btree (category);

-- Optional: Set default values for existing records if needed
-- UPDATE public.clients SET facturador = 'LA FABRIKA CO' WHERE facturador IS NULL;
-- UPDATE public.clients SET category = 'OTRO' WHERE category IS NULL;