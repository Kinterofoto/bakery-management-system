-- Fix: Cast varchar columns to text to match function return type
DROP FUNCTION IF EXISTS produccion.get_production_order_schedules(integer);

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
