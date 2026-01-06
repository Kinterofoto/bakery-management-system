-- Migration: Refresh demand materialized view and fix RPC functions
-- Ensures the view has the latest data with units_per_package multiplication

-- Drop and recreate the materialized view to ensure it has correct structure
DROP MATERIALIZED VIEW IF EXISTS produccion.daily_demand_history CASCADE;

CREATE MATERIALIZED VIEW produccion.daily_demand_history AS
SELECT
  oi.product_id::UUID as product_id,
  EXTRACT(DOW FROM o.expected_delivery_date)::INTEGER AS day_of_week, -- 0=Sunday, 6=Saturday
  o.expected_delivery_date::DATE AS delivery_date,
  SUM(
    (COALESCE(oi.quantity_requested, 0) - COALESCE(oi.quantity_returned, 0))
    * COALESCE(pc.units_per_package, 1)
  )::INTEGER AS demand_units
FROM public.order_items oi
JOIN public.orders o ON o.id = oi.order_id
LEFT JOIN public.product_config pc ON pc.product_id = oi.product_id
WHERE o.status NOT IN ('cancelled', 'returned')
  AND o.expected_delivery_date IS NOT NULL
GROUP BY oi.product_id, EXTRACT(DOW FROM o.expected_delivery_date), o.expected_delivery_date::DATE;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_daily_demand_product_dow
  ON produccion.daily_demand_history(product_id, day_of_week);

CREATE INDEX IF NOT EXISTS idx_daily_demand_date
  ON produccion.daily_demand_history(delivery_date);

-- Update the get_daily_forecast function to ensure units multiplication
CREATE OR REPLACE FUNCTION produccion.get_daily_forecast(
  p_product_id UUID,
  p_day_of_week INTEGER,
  p_target_date DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_historical_avg DECIMAL;
  v_current_orders INTEGER;
  v_result INTEGER;
BEGIN
  -- Calculate historical average for this day of week (last 8 weeks)
  SELECT COALESCE(AVG(demand_units), 0)
  INTO v_historical_avg
  FROM produccion.daily_demand_history
  WHERE product_id = p_product_id
    AND day_of_week = p_day_of_week
    AND delivery_date BETWEEN (p_target_date - INTERVAL '8 weeks') AND (p_target_date - INTERVAL '1 day');

  -- Get actual orders for this specific date (multiply by units_per_package)
  SELECT COALESCE(SUM(
    (COALESCE(oi.quantity_requested, 0) - COALESCE(oi.quantity_delivered, 0))
    * COALESCE(pc.units_per_package, 1)
  ), 0)::INTEGER
  INTO v_current_orders
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  LEFT JOIN public.product_config pc ON pc.product_id = oi.product_id
  WHERE oi.product_id = p_product_id
    AND o.expected_delivery_date::DATE = p_target_date
    AND o.status NOT IN ('cancelled', 'returned', 'delivered', 'partially_delivered');

  -- Return MAX(historical_average, current_orders)
  v_result := GREATEST(CEIL(v_historical_avg)::INTEGER, v_current_orders);

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

-- Update get_demand_breakdown_by_client to ensure units multiplication
CREATE OR REPLACE FUNCTION produccion.get_demand_breakdown_by_client(
  p_product_id UUID,
  p_target_date DATE
)
RETURNS TABLE (
  client_id UUID,
  client_name TEXT,
  order_id UUID,
  order_number TEXT,
  quantity_units INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id::UUID as client_id,
    c.name::TEXT as client_name,
    o.id::UUID as order_id,
    o.order_number::TEXT as order_number,
    ((COALESCE(oi.quantity_requested, 0) - COALESCE(oi.quantity_delivered, 0))
      * COALESCE(pc.units_per_package, 1))::INTEGER as quantity_units
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  JOIN public.clients c ON c.id = o.client_id
  LEFT JOIN public.product_config pc ON pc.product_id = oi.product_id
  WHERE oi.product_id = p_product_id
    AND o.expected_delivery_date::DATE = p_target_date
    AND o.status NOT IN ('cancelled', 'returned', 'delivered', 'partially_delivered')
    AND (COALESCE(oi.quantity_requested, 0) - COALESCE(oi.quantity_delivered, 0)) > 0
  ORDER BY c.name;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant permissions
GRANT SELECT ON produccion.daily_demand_history TO authenticated;
GRANT EXECUTE ON FUNCTION produccion.get_daily_forecast TO authenticated;
GRANT EXECUTE ON FUNCTION produccion.get_demand_breakdown_by_client TO authenticated;

-- Refresh the view with latest data
REFRESH MATERIALIZED VIEW produccion.daily_demand_history;
