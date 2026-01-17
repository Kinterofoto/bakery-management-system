-- Complete Anonymous Supplier Registration Permissions
-- Adds missing SELECT permission and material_suppliers permissions for the public registration form

-- =====================================================
-- SUPPLIERS TABLE - ADD SELECT FOR ANON
-- =====================================================

-- Allow anonymous users to check if NIT already exists
CREATE POLICY "Enable select for anonymous users (NIT verification)" ON compras.suppliers
  FOR SELECT TO anon USING (true);

-- =====================================================
-- MATERIAL_SUPPLIERS TABLE - ADD ANON PERMISSIONS
-- =====================================================

-- Grant INSERT permission on material_suppliers table to anon users
GRANT INSERT ON compras.material_suppliers TO anon;

-- Allow anonymous users to insert material assignments during registration
CREATE POLICY "Enable insert for anonymous users (supplier registration)" ON compras.material_suppliers
  FOR INSERT TO anon WITH CHECK (true);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON POLICY "Enable select for anonymous users (NIT verification)" ON compras.suppliers IS
'Allows public form to verify if a NIT is already registered before submitting.';

COMMENT ON POLICY "Enable insert for anonymous users (supplier registration)" ON compras.material_suppliers IS
'Allows public supplier registration to assign materials to the newly created supplier.';
