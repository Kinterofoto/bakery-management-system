-- Fix RLS Policies to Allow Anon Users
-- Update policies to support both authenticated and anonymous access

-- =====================================================
-- DROP EXISTING POLICIES
-- =====================================================

-- Material Receptions Policies
DROP POLICY IF EXISTS "material_receptions_allow_authenticated_select" ON compras.material_receptions;
DROP POLICY IF EXISTS "material_receptions_allow_authenticated_insert" ON compras.material_receptions;
DROP POLICY IF EXISTS "material_receptions_allow_authenticated_update" ON compras.material_receptions;
DROP POLICY IF EXISTS "material_receptions_allow_authenticated_delete" ON compras.material_receptions;

-- Inventory Movements Policies
DROP POLICY IF EXISTS "inventory_movements_allow_authenticated_select" ON compras.inventory_movements;
DROP POLICY IF EXISTS "inventory_movements_allow_authenticated_insert" ON compras.inventory_movements;
DROP POLICY IF EXISTS "inventory_movements_allow_authenticated_update" ON compras.inventory_movements;
DROP POLICY IF EXISTS "inventory_movements_allow_authenticated_delete" ON compras.inventory_movements;

-- =====================================================
-- RECREATE POLICIES FOR MATERIAL_RECEPTIONS
-- =====================================================

CREATE POLICY "material_receptions_select_all_authenticated" ON compras.material_receptions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "material_receptions_select_anon" ON compras.material_receptions
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "material_receptions_insert_authenticated" ON compras.material_receptions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "material_receptions_update_authenticated" ON compras.material_receptions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "material_receptions_delete_authenticated" ON compras.material_receptions
  FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- RECREATE POLICIES FOR INVENTORY_MOVEMENTS
-- =====================================================

CREATE POLICY "inventory_movements_select_all_authenticated" ON compras.inventory_movements
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "inventory_movements_select_anon" ON compras.inventory_movements
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "inventory_movements_insert_authenticated" ON compras.inventory_movements
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "inventory_movements_update_authenticated" ON compras.inventory_movements
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "inventory_movements_delete_authenticated" ON compras.inventory_movements
  FOR DELETE
  TO authenticated
  USING (true);
