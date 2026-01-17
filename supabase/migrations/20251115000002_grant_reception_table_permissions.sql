-- Grant permissions for Material Reception and Inventory Modules
-- This migration grants necessary permissions for authenticated users to access reception tables

-- =====================================================
-- GRANT TABLE PERMISSIONS FOR MATERIAL_RECEPTIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON compras.material_receptions TO authenticated;
GRANT ALL ON compras.material_receptions TO service_role;

-- Grant permissions on the sequence if it exists
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA compras TO authenticated;

-- =====================================================
-- GRANT TABLE PERMISSIONS FOR RECEPTION_ITEMS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON compras.reception_items TO authenticated;
GRANT ALL ON compras.reception_items TO service_role;

-- =====================================================
-- GRANT TABLE PERMISSIONS FOR INVENTORY_MOVEMENTS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON compras.inventory_movements TO authenticated;
GRANT ALL ON compras.inventory_movements TO service_role;

-- =====================================================
-- GRANT VIEW PERMISSIONS
-- =====================================================

GRANT SELECT ON compras.material_inventory_status TO authenticated;
GRANT SELECT ON compras.material_inventory_status TO service_role;

-- =====================================================
-- GRANT FUNCTION PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION compras.generate_reception_number() TO authenticated;
GRANT EXECUTE ON FUNCTION compras.set_reception_number() TO authenticated;
GRANT EXECUTE ON FUNCTION compras.create_movement_on_reception() TO authenticated;

-- =====================================================
-- COMMENT
-- =====================================================

COMMENT ON TABLE compras.material_receptions IS 'Tracks material receptions from suppliers or purchase orders';
COMMENT ON TABLE compras.reception_items IS 'Individual items within a material reception with detailed tracking';
COMMENT ON TABLE compras.inventory_movements IS 'Audit trail of all inventory movements (reception, consumption, adjustment, etc)';
