-- Fix race condition in reception number generation
-- Add advisory lock to prevent duplicate numbers

CREATE OR REPLACE FUNCTION compras.generate_reception_number()
RETURNS VARCHAR AS $$
DECLARE
  year_part VARCHAR;
  counter INTEGER;
  new_number VARCHAR;
  lock_key BIGINT;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YY');

  -- Create a lock key based on current year (use advisory lock to prevent race conditions)
  lock_key := ('x' || md5('reception_number_' || year_part))::bit(64)::bigint;

  -- Acquire advisory lock (will wait if another transaction has it)
  PERFORM pg_advisory_xact_lock(lock_key);

  -- Get the next counter for this year
  counter := COALESCE(
    (SELECT CAST(SUBSTRING(reception_number, 4) AS INTEGER)
     FROM compras.material_receptions
     WHERE reception_number LIKE 'RC' || year_part || '%'
     ORDER BY CAST(SUBSTRING(reception_number, 4) AS INTEGER) DESC
     LIMIT 1),
    0
  ) + 1;

  new_number := 'RC' || year_part || LPAD(counter::TEXT, 5, '0');

  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION compras.generate_reception_number() IS
'Generates sequential reception numbers with format RC{YY}{NNNNN}. Uses advisory lock to prevent race conditions.';
