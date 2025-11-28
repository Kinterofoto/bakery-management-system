-- Grant Permissions for Explosion Purchase Tracking
-- This migration grants necessary permissions for authenticated users to access the explosion_purchase_tracking table

-- =====================================================
-- GRANT TABLE PERMISSIONS
-- =====================================================

-- Explosion Purchase Tracking table
GRANT SELECT, INSERT, UPDATE, DELETE ON compras.explosion_purchase_tracking TO authenticated;
GRANT ALL ON compras.explosion_purchase_tracking TO service_role;

-- =====================================================
-- GRANT FUNCTION PERMISSIONS
-- =====================================================

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION compras.update_explosion_tracking_status() TO authenticated;
GRANT EXECUTE ON FUNCTION compras.update_explosion_on_reception() TO authenticated;

-- =====================================================
-- COMMENT
-- =====================================================

COMMENT ON TABLE compras.explosion_purchase_tracking IS 'Tracks ordering status of material requirements from explosion analysis - permissions granted to authenticated users';
