-- Configure permissions for visitas schema to be accessible via Supabase API

-- Grant usage on the schema to all Supabase roles
GRANT USAGE ON SCHEMA visitas TO anon, authenticated, service_role, postgres;

-- Grant permissions on all existing tables in the schema
GRANT ALL ON ALL TABLES IN SCHEMA visitas TO anon, authenticated, service_role, postgres;

-- Grant permissions on all existing sequences in the schema
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA visitas TO anon, authenticated, service_role, postgres;

-- Configure default privileges for future tables created in the schema
ALTER DEFAULT PRIVILEGES IN SCHEMA visitas GRANT ALL ON TABLES TO anon, authenticated, service_role, postgres;

-- Configure default privileges for future sequences created in the schema
ALTER DEFAULT PRIVILEGES IN SCHEMA visitas GRANT ALL ON SEQUENCES TO anon, authenticated, service_role, postgres;

-- Grant execute permissions on functions in the schema
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA visitas TO anon, authenticated, service_role, postgres;

-- Configure default privileges for future functions
ALTER DEFAULT PRIVILEGES IN SCHEMA visitas GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role, postgres;
