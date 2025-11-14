-- Fix Grants for Material Inventory Views and Tables
-- Grant proper permissions to all roles for REST API access

-- =====================================================
-- GRANT PERMISSIONS ON VIEW
-- =====================================================
GRANT SELECT ON compras.material_inventory_status TO authenticated;
GRANT SELECT ON compras.material_inventory_status TO service_role;
GRANT SELECT ON compras.material_inventory_status TO anon;

-- =====================================================
-- GRANT PERMISSIONS ON TABLES (for dependencies)
-- =====================================================
GRANT SELECT ON compras.inventory_movements TO authenticated;
GRANT SELECT ON compras.inventory_movements TO service_role;
GRANT SELECT ON compras.inventory_movements TO anon;

GRANT SELECT ON compras.material_receptions TO authenticated;
GRANT SELECT ON compras.material_receptions TO service_role;
GRANT SELECT ON compras.material_receptions TO anon;

GRANT SELECT ON public.products TO authenticated;
GRANT SELECT ON public.products TO service_role;
GRANT SELECT ON public.products TO anon;

-- =====================================================
-- GRANT SCHEMA USAGE
-- =====================================================
GRANT USAGE ON SCHEMA compras TO authenticated;
GRANT USAGE ON SCHEMA compras TO service_role;
GRANT USAGE ON SCHEMA compras TO anon;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO anon;
