-- Grant SELECT permission on suppliers table to anon role
-- RLS policies don't work without table-level GRANT permissions

-- =====================================================
-- GRANT SELECT PERMISSION TO ANON
-- =====================================================

-- Grant SELECT permission on suppliers table to anon users (for NIT verification)
GRANT SELECT ON compras.suppliers TO anon;

-- =====================================================
-- COMMENT
-- =====================================================

COMMENT ON TABLE compras.suppliers IS 'Suppliers for raw materials. Anonymous users can SELECT (for NIT verification) and INSERT (for registration).';
