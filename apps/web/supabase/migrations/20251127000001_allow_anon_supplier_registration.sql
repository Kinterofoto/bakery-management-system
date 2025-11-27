-- Allow Anonymous Supplier Registration
-- This migration allows non-authenticated users to register as suppliers through the public form
-- while keeping other operations restricted to authenticated users only

-- =====================================================
-- GRANT PERMISSIONS TO ANON ROLE
-- =====================================================

-- Grant usage on the schema to anon users
GRANT USAGE ON SCHEMA compras TO anon;

-- Grant INSERT permission on suppliers table to anon users
GRANT INSERT ON compras.suppliers TO anon;

-- =====================================================
-- ADD RLS POLICY FOR ANONYMOUS INSERT
-- =====================================================

-- Allow anonymous users to insert new supplier registrations
CREATE POLICY "Enable insert for anonymous users (supplier registration)" ON compras.suppliers
  FOR INSERT TO anon WITH CHECK (true);

-- =====================================================
-- COMMENT
-- =====================================================

COMMENT ON POLICY "Enable insert for anonymous users (supplier registration)" ON compras.suppliers IS
'Allows public supplier registration through the external form without authentication. Other operations (SELECT, UPDATE, DELETE) remain restricted to authenticated users only.';
