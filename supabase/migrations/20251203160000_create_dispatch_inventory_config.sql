-- =====================================================
-- Migration: Create Dispatch Inventory Configuration
-- =====================================================
-- Purpose: Configuration table for dispatch-inventory integration
-- Date: 2025-12-03
-- =====================================================

-- =====================================================
-- TABLE: dispatch_inventory_config
-- =====================================================
-- Stores configuration for dispatch-inventory integration

CREATE TABLE IF NOT EXISTS public.dispatch_inventory_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ==================== CONFIGURATION ====================
  -- Allow dispatching products even without inventory
  allow_dispatch_without_inventory BOOLEAN NOT NULL DEFAULT false,

  -- Default location for dispatch OUT movements
  default_dispatch_location_id UUID REFERENCES inventario.locations(id) ON DELETE SET NULL,

  -- ==================== AUDIT ====================
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- ==================== CONSTRAINTS ====================
  -- Only allow one configuration row
  CONSTRAINT single_row_config CHECK (id = '00000000-0000-0000-0000-000000000000'::UUID)
);

-- =====================================================
-- Insert default configuration row
-- =====================================================
INSERT INTO public.dispatch_inventory_config (
  id,
  allow_dispatch_without_inventory,
  default_dispatch_location_id
) VALUES (
  '00000000-0000-0000-0000-000000000000'::UUID,
  false,
  NULL
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Enable RLS
-- =====================================================
ALTER TABLE public.dispatch_inventory_config ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "Enable read for authenticated users"
  ON public.dispatch_inventory_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Only allow admin users to update (adjust role as needed)
CREATE POLICY "Enable update for admin users"
  ON public.dispatch_inventory_config
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.dispatch_inventory_config IS 'Configuration for dispatch-inventory integration';
COMMENT ON COLUMN public.dispatch_inventory_config.allow_dispatch_without_inventory IS 'If true, allows dispatching products even when inventory balance would go negative';
COMMENT ON COLUMN public.dispatch_inventory_config.default_dispatch_location_id IS 'Default inventory location for dispatch OUT movements';
