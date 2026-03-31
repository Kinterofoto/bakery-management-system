-- Grant permissions on supplier_documents table
-- The table was missing GRANT statements, causing "permission denied" errors

GRANT ALL ON compras.supplier_documents TO authenticated;
GRANT ALL ON compras.supplier_documents TO anon;
GRANT ALL ON compras.supplier_documents TO service_role;
