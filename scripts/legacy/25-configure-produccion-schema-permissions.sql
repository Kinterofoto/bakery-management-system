-- Configure permissions for produccion schema to be accessible via Supabase API

-- Grant usage on the schema to all Supabase roles
GRANT USAGE ON SCHEMA produccion TO anon, authenticated, service_role, postgres;

-- Grant permissions on all existing tables in the schema
GRANT ALL ON ALL TABLES IN SCHEMA produccion TO anon, authenticated, service_role, postgres;

-- Grant permissions on all existing sequences in the schema  
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA produccion TO anon, authenticated, service_role, postgres;

-- Configure default privileges for future tables created in the schema
ALTER DEFAULT PRIVILEGES IN SCHEMA produccion GRANT ALL ON TABLES TO anon, authenticated, service_role, postgres;

-- Configure default privileges for future sequences created in the schema
ALTER DEFAULT PRIVILEGES IN SCHEMA produccion GRANT ALL ON SEQUENCES IN SCHEMA produccion TO anon, authenticated, service_role, postgres;

-- Grant execute permissions on functions in the schema
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA produccion TO anon, authenticated, service_role, postgres;

-- Configure default privileges for future functions
ALTER DEFAULT PRIVILEGES IN SCHEMA produccion GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role, postgres;

-- Verify the permissions were applied correctly
DO $$
DECLARE
    schema_exists boolean;
    table_count integer;
BEGIN
    -- Check if schema exists
    SELECT EXISTS(
        SELECT 1 FROM information_schema.schemata 
        WHERE schema_name = 'produccion'
    ) INTO schema_exists;
    
    -- Count tables in the schema
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'produccion';
    
    -- Output results
    RAISE NOTICE 'Schema "produccion" exists: %', schema_exists;
    RAISE NOTICE 'Tables in schema: %', table_count;
    
    IF schema_exists AND table_count > 0 THEN
        RAISE NOTICE 'Schema permissions configured successfully!';
        RAISE NOTICE 'Next step: Add "produccion" to "Exposed schemas" in Supabase Dashboard → Settings → API';
    ELSE
        RAISE WARNING 'Schema or tables not found. Please run 24-create-production-tables.sql first.';
    END IF;
END $$;