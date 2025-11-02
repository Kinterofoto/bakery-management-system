-- Modify client_credit_terms table to be client-level only
-- Script 33: Simplify credit terms to client level instead of client-branch level

-- Drop existing table and recreate with simpler structure
DROP TABLE IF EXISTS public.client_credit_terms CASCADE;

-- Create new simplified table
CREATE TABLE public.client_credit_terms (
  id SERIAL NOT NULL,
  client_id UUID NOT NULL,
  credit_days INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
  CONSTRAINT client_credit_terms_pkey PRIMARY KEY (id),
  CONSTRAINT client_credit_terms_client_id_key UNIQUE (client_id),
  CONSTRAINT client_credit_terms_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE,
  CONSTRAINT client_credit_terms_credit_days_check CHECK ((credit_days >= 0))
) TABLESPACE pg_default;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_client_credit_terms_client ON public.client_credit_terms USING btree (client_id) TABLESPACE pg_default;

-- Add comment to document the purpose
COMMENT ON TABLE public.client_credit_terms IS 'Días de crédito por cliente - aplica a todas las sucursales del cliente';
COMMENT ON COLUMN public.client_credit_terms.client_id IS 'ID del cliente';
COMMENT ON COLUMN public.client_credit_terms.credit_days IS 'Días de crédito (0 = contado)';

-- Print completion message
DO $$
BEGIN
    RAISE NOTICE 'Client credit terms table modified successfully';
    RAISE NOTICE '• Simplified to client-level only (no branch-specific terms)';
    RAISE NOTICE '• Removed branch_id column';
    RAISE NOTICE '• Added unique constraint on client_id';
    RAISE NOTICE '• Credit days now apply to all branches of a client';
END $$;