-- =====================================================
-- Migration: Create calculate_order_total Function
-- =====================================================
-- Purpose: Calculate total value of an order based on its items
-- Date: 2025-12-04
-- =====================================================

CREATE OR REPLACE FUNCTION public.calculate_order_total(order_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_total DECIMAL;
BEGIN
  -- Calculate total by summing (quantity_requested * unit_price) for all order items
  SELECT COALESCE(SUM(
    COALESCE(oi.quantity_requested, 0) * COALESCE(oi.unit_price, 0)
  ), 0)
  INTO v_total
  FROM public.order_items oi
  WHERE oi.order_id = order_uuid;

  -- Update the order's total_value column
  UPDATE public.orders
  SET total_value = v_total
  WHERE id = order_uuid;

  RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.calculate_order_total(UUID) TO authenticated;

-- Comment
COMMENT ON FUNCTION public.calculate_order_total IS 'Calculates and updates the total value of an order based on its items unit prices and quantities';
