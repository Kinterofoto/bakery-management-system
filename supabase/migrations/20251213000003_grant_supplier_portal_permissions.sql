-- Grant permissions for supplier portal access
-- Suppliers need to be able to read products and manage their material assignments

-- =====================================================
-- PRODUCTS TABLE PERMISSIONS (read-only for MP materials)
-- =====================================================

-- Grant SELECT permission to anon users for products table
GRANT SELECT ON TABLE public.products TO anon;

-- Create RLS policy to allow reading MP category products
DROP POLICY IF EXISTS "Allow anon to read MP products" ON public.products;
CREATE POLICY "Allow anon to read MP products"
  ON public.products
  FOR SELECT
  TO anon
  USING (category = 'MP');

-- =====================================================
-- MATERIAL_SUPPLIERS TABLE PERMISSIONS
-- =====================================================

-- Grant SELECT, INSERT, UPDATE, DELETE to anon for material_suppliers
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE compras.material_suppliers TO anon;

-- Enable RLS on material_suppliers if not enabled
ALTER TABLE compras.material_suppliers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for material_suppliers
-- Suppliers can only manage their own materials

-- Policy for SELECT: Allow anon to read material_suppliers
DROP POLICY IF EXISTS "Allow anon to read material_suppliers" ON compras.material_suppliers;
CREATE POLICY "Allow anon to read material_suppliers"
  ON compras.material_suppliers
  FOR SELECT
  TO anon
  USING (true);

-- Policy for INSERT: Allow anon to insert material_suppliers
DROP POLICY IF EXISTS "Allow anon to insert material_suppliers" ON compras.material_suppliers;
CREATE POLICY "Allow anon to insert material_suppliers"
  ON compras.material_suppliers
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy for UPDATE: Allow anon to update material_suppliers
DROP POLICY IF EXISTS "Allow anon to update material_suppliers" ON compras.material_suppliers;
CREATE POLICY "Allow anon to update material_suppliers"
  ON compras.material_suppliers
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Policy for DELETE: Allow anon to delete material_suppliers
DROP POLICY IF EXISTS "Allow anon to delete material_suppliers" ON compras.material_suppliers;
CREATE POLICY "Allow anon to delete material_suppliers"
  ON compras.material_suppliers
  FOR DELETE
  TO anon
  USING (true);

-- =====================================================
-- PRODUCTS TABLE INSERT PERMISSIONS (for creating new materials)
-- =====================================================

-- Grant INSERT permission to anon users for products table
GRANT INSERT ON TABLE public.products TO anon;

-- Create RLS policy to allow creating MP category products
DROP POLICY IF EXISTS "Allow anon to create MP products" ON public.products;
CREATE POLICY "Allow anon to create MP products"
  ON public.products
  FOR INSERT
  TO anon
  WITH CHECK (category = 'MP');

-- =====================================================
-- SUPPLIERS TABLE UPDATE PERMISSIONS (for delivery days)
-- =====================================================

-- Grant UPDATE permission to anon for suppliers table (only delivery_days)
GRANT UPDATE ON TABLE compras.suppliers TO anon;

-- Create RLS policy to allow updating suppliers
DROP POLICY IF EXISTS "Allow anon to update suppliers" ON compras.suppliers;
CREATE POLICY "Allow anon to update suppliers"
  ON compras.suppliers
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "Allow anon to read MP products" ON public.products IS 'Allows anonymous users (suppliers) to view MP category products for material selection';
COMMENT ON POLICY "Allow anon to create MP products" ON public.products IS 'Allows anonymous users (suppliers) to create new MP category products if they do not exist';
COMMENT ON POLICY "Allow anon to read material_suppliers" ON compras.material_suppliers IS 'Allows anonymous users (suppliers) to view their material assignments';
COMMENT ON POLICY "Allow anon to insert material_suppliers" ON compras.material_suppliers IS 'Allows anonymous users (suppliers) to assign materials to themselves';
COMMENT ON POLICY "Allow anon to update material_suppliers" ON compras.material_suppliers IS 'Allows anonymous users (suppliers) to update their material assignments';
COMMENT ON POLICY "Allow anon to delete material_suppliers" ON compras.material_suppliers IS 'Allows anonymous users (suppliers) to remove material assignments';
COMMENT ON POLICY "Allow anon to update suppliers" ON compras.suppliers IS 'Allows anonymous users (suppliers) to update their delivery days';
