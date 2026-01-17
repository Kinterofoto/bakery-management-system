-- Configure Permissions for Compras Schema
-- This migration grants necessary permissions for authenticated users to access the compras schema

-- =====================================================
-- GRANT USAGE ON COMPRAS SCHEMA
-- =====================================================

-- Grant usage on the schema to authenticated users
GRANT USAGE ON SCHEMA compras TO authenticated;
GRANT USAGE ON SCHEMA compras TO service_role;

-- =====================================================
-- GRANT TABLE PERMISSIONS
-- =====================================================

-- Suppliers table
GRANT SELECT, INSERT, UPDATE, DELETE ON compras.suppliers TO authenticated;
GRANT ALL ON compras.suppliers TO service_role;

-- Material Suppliers table
GRANT SELECT, INSERT, UPDATE, DELETE ON compras.material_suppliers TO authenticated;
GRANT ALL ON compras.material_suppliers TO service_role;

-- Purchase Orders table
GRANT SELECT, INSERT, UPDATE, DELETE ON compras.purchase_orders TO authenticated;
GRANT ALL ON compras.purchase_orders TO service_role;

-- Purchase Order Items table
GRANT SELECT, INSERT, UPDATE, DELETE ON compras.purchase_order_items TO authenticated;
GRANT ALL ON compras.purchase_order_items TO service_role;

-- Material Explosion History table
GRANT SELECT, INSERT, UPDATE, DELETE ON compras.material_explosion_history TO authenticated;
GRANT ALL ON compras.material_explosion_history TO service_role;

-- Material Explosion Items table
GRANT SELECT, INSERT, UPDATE, DELETE ON compras.material_explosion_items TO authenticated;
GRANT ALL ON compras.material_explosion_items TO service_role;

-- =====================================================
-- GRANT SEQUENCE PERMISSIONS (if any auto-increment columns)
-- =====================================================

-- Note: We're using UUID gen_random_uuid() so no sequences needed

-- =====================================================
-- GRANT FUNCTION PERMISSIONS
-- =====================================================

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION generate_purchase_order_number() TO authenticated;
GRANT EXECUTE ON FUNCTION update_purchase_order_total() TO authenticated;
GRANT EXECUTE ON FUNCTION update_purchase_order_status() TO authenticated;
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO authenticated;

-- =====================================================
-- COMMENT
-- =====================================================

COMMENT ON SCHEMA compras IS 'Schema for purchase management module including suppliers, purchase orders, and material explosion';
