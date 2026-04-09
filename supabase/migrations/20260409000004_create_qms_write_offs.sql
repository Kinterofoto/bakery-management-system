-- ============================================================
-- Migration: Create qms.write_offs table
-- Track product/material write-offs (bajas) with inventory integration
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS qms.write_offs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id),
  product_category VARCHAR NOT NULL, -- MP, PT, PP
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit VARCHAR NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  inventory_movement_id UUID, -- link to inventario.inventory_movements
  recorded_by UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for dashboard queries
CREATE INDEX idx_write_offs_created_at ON qms.write_offs(created_at DESC);
CREATE INDEX idx_write_offs_product_id ON qms.write_offs(product_id);
CREATE INDEX idx_write_offs_category ON qms.write_offs(product_category);

-- RLS
ALTER TABLE qms.write_offs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read write_offs"
  ON qms.write_offs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert write_offs"
  ON qms.write_offs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Expose to PostgREST
GRANT SELECT, INSERT ON qms.write_offs TO authenticated;
GRANT USAGE ON SCHEMA qms TO authenticated;

COMMIT;
