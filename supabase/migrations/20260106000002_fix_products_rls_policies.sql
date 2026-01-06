-- Verificar y configurar políticas RLS para la tabla products
-- Esto permite que los usuarios autenticados puedan actualizar productos

-- Si no existen políticas de UPDATE, créalas
DO $$
BEGIN
  -- Verificar si existe la política de UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'products'
    AND policyname = 'Enable update for authenticated users'
  ) THEN
    CREATE POLICY "Enable update for authenticated users"
    ON public.products
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);
  END IF;

  -- Verificar si existe la política de SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'products'
    AND policyname = 'Enable read access for all users'
  ) THEN
    CREATE POLICY "Enable read access for all users"
    ON public.products
    FOR SELECT
    TO public
    USING (true);
  END IF;
END $$;

-- Habilitar RLS si no está habilitado
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
