-- Migration: Add cascade batch tracking fields to production_schedules
-- Purpose: Support batch-based cascade production flow

-- 1. Add batch tracking columns to production_schedules
ALTER TABLE produccion.production_schedules
ADD COLUMN IF NOT EXISTS batch_number integer,
ADD COLUMN IF NOT EXISTS total_batches integer,
ADD COLUMN IF NOT EXISTS batch_size numeric(12,3);

COMMENT ON COLUMN produccion.production_schedules.batch_number
IS 'Sequential batch number within a production order (1-N)';
COMMENT ON COLUMN produccion.production_schedules.total_batches
IS 'Total number of batches in this production order';
COMMENT ON COLUMN produccion.production_schedules.batch_size
IS 'Number of units in this specific batch';

-- 2. Create index for efficient batch queries
CREATE INDEX IF NOT EXISTS idx_production_schedules_order_batch
ON produccion.production_schedules(production_order_number, batch_number);

-- 3. Function to get next production order number
CREATE OR REPLACE FUNCTION produccion.get_next_production_order_number()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_val integer;
BEGIN
  SELECT COALESCE(MAX(production_order_number), 0) + 1
  INTO next_val
  FROM produccion.production_schedules;
  RETURN next_val;
END;
$$;

-- 4. Drop existing function if it has different return type
DROP FUNCTION IF EXISTS produccion.get_production_order_schedules(integer);

-- Function to get all schedules for a production order
CREATE OR REPLACE FUNCTION produccion.get_production_order_schedules(p_order_number integer)
RETURNS TABLE (
  id uuid,
  resource_id text,
  product_id text,
  product_name text,
  quantity integer,
  start_date timestamptz,
  end_date timestamptz,
  cascade_level integer,
  cascade_source_id uuid,
  batch_number integer,
  total_batches integer,
  batch_size numeric,
  work_center_id uuid,
  work_center_name text,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.id,
    ps.resource_id::text,
    ps.product_id::text,
    p.name::text as product_name,
    ps.quantity,
    ps.start_date,
    ps.end_date,
    ps.cascade_level,
    ps.cascade_source_id,
    ps.batch_number,
    ps.total_batches,
    ps.batch_size,
    wc.id as work_center_id,
    wc.name::text as work_center_name,
    ps.status::text
  FROM produccion.production_schedules ps
  LEFT JOIN produccion.work_centers wc ON wc.id::text = ps.resource_id
  LEFT JOIN public.products p ON p.id::text = ps.product_id
  WHERE ps.production_order_number = p_order_number
  ORDER BY ps.cascade_level, ps.batch_number, ps.start_date;
END;
$$;

-- 5. Grant execute permissions
GRANT EXECUTE ON FUNCTION produccion.get_next_production_order_number() TO authenticated;
GRANT EXECUTE ON FUNCTION produccion.get_production_order_schedules(integer) TO authenticated;
