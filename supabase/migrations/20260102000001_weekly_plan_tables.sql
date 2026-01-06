-- Migration: Weekly Plan Tables for Plan Master Grid
-- Creates tables and functions for weekly production planning

-- 1. Table for shift definitions (default shifts: 6-2, 2-10, 10-6)
CREATE TABLE IF NOT EXISTS produccion.shift_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  start_hour INTEGER NOT NULL CHECK (start_hour >= 0 AND start_hour < 24),
  duration_hours INTEGER NOT NULL DEFAULT 8 CHECK (duration_hours > 0 AND duration_hours <= 24),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default shifts
INSERT INTO produccion.shift_definitions (name, start_hour, duration_hours) VALUES
  ('Turno 1', 6, 8),   -- 6am - 2pm
  ('Turno 2', 14, 8),  -- 2pm - 10pm
  ('Turno 3', 22, 8)   -- 10pm - 6am (next day)
ON CONFLICT DO NOTHING;

-- 2. Table for weekly plans (groups schedules by week)
CREATE TABLE IF NOT EXISTS produccion.weekly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start_date DATE NOT NULL,
  week_number INTEGER GENERATED ALWAYS AS (EXTRACT(WEEK FROM week_start_date)::INTEGER) STORED,
  year INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM week_start_date)::INTEGER) STORED,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(week_start_date)
);

-- Index for quick lookup by year/week
CREATE INDEX IF NOT EXISTS idx_weekly_plans_year_week ON produccion.weekly_plans(year, week_number);

-- 3. Materialized view for historical demand by day of week
-- This aggregates all historical orders by product and day of week for forecast calculation
CREATE MATERIALIZED VIEW IF NOT EXISTS produccion.daily_demand_history AS
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

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_daily_demand_product_dow
  ON produccion.daily_demand_history(product_id, day_of_week);

CREATE INDEX IF NOT EXISTS idx_daily_demand_date
  ON produccion.daily_demand_history(delivery_date);

-- 4. Function to refresh the materialized view
CREATE OR REPLACE FUNCTION produccion.refresh_daily_demand_history()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW produccion.daily_demand_history;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to get daily forecast for a product
-- Returns MAX(historical_average, current_orders)
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

  -- Get actual orders for this specific date
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

-- 6. Function to get weekly forecast for all products
CREATE OR REPLACE FUNCTION produccion.get_weekly_forecast(
  p_week_start_date DATE
)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  day_0_forecast INTEGER, -- Sunday
  day_1_forecast INTEGER, -- Monday
  day_2_forecast INTEGER, -- Tuesday
  day_3_forecast INTEGER, -- Wednesday
  day_4_forecast INTEGER, -- Thursday
  day_5_forecast INTEGER, -- Friday
  day_6_forecast INTEGER, -- Saturday
  weekly_total INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id::UUID as product_id,
    p.name::TEXT as product_name,
    produccion.get_daily_forecast(p.id, 0, p_week_start_date)::INTEGER as day_0_forecast,
    produccion.get_daily_forecast(p.id, 1, p_week_start_date + INTERVAL '1 day')::INTEGER as day_1_forecast,
    produccion.get_daily_forecast(p.id, 2, p_week_start_date + INTERVAL '2 days')::INTEGER as day_2_forecast,
    produccion.get_daily_forecast(p.id, 3, p_week_start_date + INTERVAL '3 days')::INTEGER as day_3_forecast,
    produccion.get_daily_forecast(p.id, 4, p_week_start_date + INTERVAL '4 days')::INTEGER as day_4_forecast,
    produccion.get_daily_forecast(p.id, 5, p_week_start_date + INTERVAL '5 days')::INTEGER as day_5_forecast,
    produccion.get_daily_forecast(p.id, 6, p_week_start_date + INTERVAL '6 days')::INTEGER as day_6_forecast,
    (
      produccion.get_daily_forecast(p.id, 0, p_week_start_date) +
      produccion.get_daily_forecast(p.id, 1, p_week_start_date + INTERVAL '1 day') +
      produccion.get_daily_forecast(p.id, 2, p_week_start_date + INTERVAL '2 days') +
      produccion.get_daily_forecast(p.id, 3, p_week_start_date + INTERVAL '3 days') +
      produccion.get_daily_forecast(p.id, 4, p_week_start_date + INTERVAL '4 days') +
      produccion.get_daily_forecast(p.id, 5, p_week_start_date + INTERVAL '5 days') +
      produccion.get_daily_forecast(p.id, 6, p_week_start_date + INTERVAL '6 days')
    )::INTEGER as weekly_total
  FROM public.products p
  WHERE p.category = 'PT'
    AND p.is_active = true
  ORDER BY p.name;
END;
$$ LANGUAGE plpgsql STABLE;

-- 7. Function to get demand breakdown by client for a specific date and product
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

-- 8. Add columns to production_schedules for shift tracking
ALTER TABLE produccion.production_schedules
  ADD COLUMN IF NOT EXISTS shift_number INTEGER CHECK (shift_number BETWEEN 1 AND 3),
  ADD COLUMN IF NOT EXISTS week_plan_id UUID REFERENCES produccion.weekly_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6);

-- Index for efficient queries by week plan
CREATE INDEX IF NOT EXISTS idx_schedules_week_plan
  ON produccion.production_schedules(week_plan_id);

CREATE INDEX IF NOT EXISTS idx_schedules_resource_date
  ON produccion.production_schedules(resource_id, start_date);

-- 9. Function to calculate daily balance projection
CREATE OR REPLACE FUNCTION produccion.calculate_daily_balance(
  p_product_id UUID,
  p_date DATE,
  p_initial_balance INTEGER
)
RETURNS TABLE (
  balance_date DATE,
  opening_balance INTEGER,
  planned_production INTEGER,
  forecast_demand INTEGER,
  closing_balance INTEGER,
  is_deficit BOOLEAN
) AS $$
DECLARE
  v_production INTEGER;
  v_demand INTEGER;
  v_closing INTEGER;
BEGIN
  -- Get planned production for this date
  SELECT COALESCE(SUM(ps.quantity), 0)::INTEGER
  INTO v_production
  FROM produccion.production_schedules ps
  WHERE ps.product_id = p_product_id::TEXT
    AND ps.start_date::DATE = p_date;

  -- Get forecast demand for this date
  v_demand := produccion.get_daily_forecast(
    p_product_id,
    EXTRACT(DOW FROM p_date)::INTEGER,
    p_date
  );

  -- Calculate closing balance
  v_closing := p_initial_balance + v_production - v_demand;

  RETURN QUERY SELECT
    p_date,
    p_initial_balance,
    v_production,
    v_demand,
    v_closing,
    (v_closing < 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- 10. Function to get weekly balance projection for a product
CREATE OR REPLACE FUNCTION produccion.get_weekly_balance_projection(
  p_product_id UUID,
  p_week_start_date DATE
)
RETURNS TABLE (
  day_index INTEGER,
  balance_date DATE,
  day_name TEXT,
  opening_balance INTEGER,
  planned_production INTEGER,
  forecast_demand INTEGER,
  closing_balance INTEGER,
  is_deficit BOOLEAN
) AS $$
DECLARE
  v_current_balance INTEGER;
  v_day_date DATE;
  v_production INTEGER;
  v_demand INTEGER;
  v_closing INTEGER;
  v_day_names TEXT[] := ARRAY['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
BEGIN
  -- Get initial balance from inventory
  SELECT COALESCE(ib.quantity_on_hand, 0)::INTEGER
  INTO v_current_balance
  FROM inventario.inventory_balances ib
  WHERE ib.product_id = p_product_id
  LIMIT 1;

  IF v_current_balance IS NULL THEN
    v_current_balance := 0;
  END IF;

  -- Loop through each day of the week
  FOR i IN 0..6 LOOP
    v_day_date := p_week_start_date + (i || ' days')::INTERVAL;

    -- Get production for this day
    SELECT COALESCE(SUM(ps.quantity), 0)::INTEGER
    INTO v_production
    FROM produccion.production_schedules ps
    WHERE ps.product_id = p_product_id::TEXT
      AND ps.start_date::DATE = v_day_date;

    -- Get forecast demand
    v_demand := produccion.get_daily_forecast(p_product_id, i, v_day_date);

    -- Calculate closing
    v_closing := v_current_balance + v_production - v_demand;

    day_index := i;
    balance_date := v_day_date;
    day_name := v_day_names[i + 1];
    opening_balance := v_current_balance;
    planned_production := v_production;
    forecast_demand := v_demand;
    closing_balance := v_closing;
    is_deficit := v_closing < 0;

    RETURN NEXT;

    -- Update balance for next day
    v_current_balance := v_closing;
  END LOOP;
END;
$$ LANGUAGE plpgsql STABLE;

-- 11. Trigger to update updated_at on weekly_plans
CREATE OR REPLACE FUNCTION produccion.update_weekly_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_weekly_plans_updated_at ON produccion.weekly_plans;
CREATE TRIGGER trigger_weekly_plans_updated_at
  BEFORE UPDATE ON produccion.weekly_plans
  FOR EACH ROW
  EXECUTE FUNCTION produccion.update_weekly_plans_updated_at();

-- 12. Grant permissions
GRANT SELECT ON produccion.daily_demand_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON produccion.weekly_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON produccion.shift_definitions TO authenticated;
GRANT EXECUTE ON FUNCTION produccion.get_daily_forecast TO authenticated;
GRANT EXECUTE ON FUNCTION produccion.get_weekly_forecast TO authenticated;
GRANT EXECUTE ON FUNCTION produccion.get_demand_breakdown_by_client TO authenticated;
GRANT EXECUTE ON FUNCTION produccion.calculate_daily_balance TO authenticated;
GRANT EXECUTE ON FUNCTION produccion.get_weekly_balance_projection TO authenticated;
GRANT EXECUTE ON FUNCTION produccion.refresh_daily_demand_history TO authenticated;

-- Initial refresh of the materialized view
SELECT produccion.refresh_daily_demand_history();
