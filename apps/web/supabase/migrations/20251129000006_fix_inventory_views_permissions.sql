-- Fix permissions for inventory views
-- Issue: Views are getting 403 Forbidden errors due to missing RLS policies

-- First, ensure views have proper grants
GRANT SELECT ON compras.warehouse_inventory_status TO authenticated;
GRANT SELECT ON compras.production_inventory_status TO authenticated;
GRANT SELECT ON compras.inventory_status_by_location TO authenticated;
GRANT SELECT ON compras.inventory_movements_debug TO authenticated;
GRANT SELECT ON compras.warehouse_inventory_debug TO authenticated;
GRANT SELECT ON compras.production_inventory_debug TO authenticated;
GRANT SELECT ON compras.inventory_calculation_debug TO authenticated;

-- Also grant to anon in case needed
GRANT SELECT ON compras.warehouse_inventory_status TO anon;
GRANT SELECT ON compras.production_inventory_status TO anon;
GRANT SELECT ON compras.inventory_status_by_location TO anon;

-- Enable RLS on views (views inherit RLS from underlying tables, but we can add explicit policies)
-- Note: PostgreSQL views don't have RLS directly, but we ensure base tables have correct RLS

-- Ensure products table has RLS enabled and policy
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow authenticated users to view products" ON public.products;

-- Create policy to allow all authenticated users to view products
CREATE POLICY "Allow authenticated users to view products"
  ON public.products
  FOR SELECT
  TO authenticated
  USING (true);

-- Ensure inventory_movements has RLS and policy
ALTER TABLE compras.inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to view inventory movements" ON compras.inventory_movements;

CREATE POLICY "Allow authenticated users to view inventory movements"
  ON compras.inventory_movements
  FOR SELECT
  TO authenticated
  USING (true);

-- Ensure work_center_inventory has RLS and policy
ALTER TABLE produccion.work_center_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to view work center inventory" ON produccion.work_center_inventory;

CREATE POLICY "Allow authenticated users to view work center inventory"
  ON produccion.work_center_inventory
  FOR SELECT
  TO authenticated
  USING (true);
