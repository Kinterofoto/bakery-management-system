-- Add observations column to branches table

-- Add observations column (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'branches' AND column_name = 'observations') THEN
        ALTER TABLE public.branches 
        ADD COLUMN observations TEXT;
    END IF;
END $$;

-- Add index for better query performance (optional, useful for searching)
CREATE INDEX IF NOT EXISTS idx_branches_observations ON public.branches USING gin (to_tsvector('spanish', observations));

-- Optional: Add comment to document the column
COMMENT ON COLUMN public.branches.observations IS 'Observaciones y notas adicionales sobre la sucursal';