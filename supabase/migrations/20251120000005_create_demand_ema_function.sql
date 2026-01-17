-- Create function to calculate demand EMA (Exponential Moving Average)
-- Uses 8 weeks of historical data with alpha=0.3 for recent week bias

CREATE OR REPLACE FUNCTION public.get_product_demand_ema(
  p_product_id uuid,
  p_weeks integer DEFAULT 8,
  p_alpha numeric DEFAULT 0.3
)
RETURNS numeric AS $$
DECLARE
  v_ema numeric := 0;
  v_week_demand numeric;
  v_current_week integer;
  v_week_offset integer;
  v_demand_record RECORD;
BEGIN
  -- Get weekly demand data for the last N weeks
  FOR v_current_week IN 0..(p_weeks - 1) LOOP
    -- Get demand for this week (quantity_requested - quantity_delivered)
    SELECT COALESCE(SUM(oi.quantity_requested - COALESCE(oi.quantity_delivered, 0)), 0)
    INTO v_week_demand
    FROM public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
    WHERE oi.product_id = p_product_id
      AND o.status NOT IN ('cancelled', 'returned')
      AND DATE_TRUNC('week', o.created_at) = DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 week' * v_current_week);

    -- Calculate EMA: EMA_new = α * current_demand + (1-α) * EMA_previous
    IF v_current_week = 0 THEN
      -- First iteration (most recent week): initialize with current week demand
      v_ema := v_week_demand;
    ELSE
      -- Subsequent iterations: apply EMA formula
      v_ema := (p_alpha * v_week_demand) + ((1 - p_alpha) * v_ema);
    END IF;
  END LOOP;

  RETURN COALESCE(v_ema, 0)::numeric;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_product_demand_ema(uuid, integer, numeric) TO authenticated, anon;
