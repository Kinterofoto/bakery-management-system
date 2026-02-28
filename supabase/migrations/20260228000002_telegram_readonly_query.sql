-- RPC function for executing read-only queries from the Telegram bot AI agent.
-- Validates SELECT-only, blocks dangerous keywords, enforces timeout and row limits.

CREATE OR REPLACE FUNCTION execute_readonly_query(query_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '5s'
AS $$
DECLARE
  result JSONB;
  clean_query TEXT;
BEGIN
  clean_query := LOWER(TRIM(query_text));

  -- Only SELECT and WITH (CTEs) allowed
  IF NOT (clean_query LIKE 'select%' OR clean_query LIKE 'with%') THEN
    RAISE EXCEPTION 'Solo se permiten consultas SELECT';
  END IF;

  -- Block dangerous operations
  IF clean_query ~ '\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|execute|copy|pg_sleep)\b' THEN
    RAISE EXCEPTION 'Operacion no permitida en consulta de solo lectura';
  END IF;

  -- Execute with 50 row limit, return as JSONB array
  EXECUTE format(
    'SELECT COALESCE(jsonb_agg(t), ''[]''::jsonb) FROM (SELECT * FROM (%s) sub LIMIT 50) t',
    query_text
  ) INTO result;

  RETURN result;
END;
$$;
