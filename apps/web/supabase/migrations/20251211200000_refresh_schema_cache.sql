-- Refresh PostgREST schema cache
-- This is needed after adding new tables/columns to the workflows schema

-- Notify PostgREST to reload the schema
NOTIFY pgrst, 'reload schema';

-- Grant usage on workflows schema (ensure it's exposed)
GRANT USAGE ON SCHEMA workflows TO anon;
GRANT USAGE ON SCHEMA workflows TO authenticated;
GRANT USAGE ON SCHEMA workflows TO service_role;

-- Grant access to tables
GRANT ALL ON workflows.ordenes_compra TO service_role;
GRANT ALL ON workflows.ordenes_compra_productos TO service_role;
GRANT SELECT ON workflows.ordenes_compra TO authenticated;
GRANT SELECT ON workflows.ordenes_compra_productos TO authenticated;
