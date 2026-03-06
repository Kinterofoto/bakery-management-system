-- Expose the investigacion schema via PostgREST API
-- This is needed for supabase.schema("investigacion") to work

-- Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';

-- Grant API access to the investigacion schema for PostgREST
ALTER ROLE "authenticator" SET pgrst.db_schemas TO 'public,produccion,compras,investigacion';

-- Also ensure the anon and authenticated roles can use the schema
GRANT USAGE ON SCHEMA "investigacion" TO "anon";
GRANT USAGE ON SCHEMA "investigacion" TO "authenticated";
GRANT USAGE ON SCHEMA "investigacion" TO "service_role";

-- Reload PostgREST configuration
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
