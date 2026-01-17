-- Fix demand function to use correct column names
-- quantity_requested instead of quantity
-- quantity_delivered instead of individual delivery records

DROP FUNCTION IF EXISTS public.get_product_pending_orders(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_product_pending_orders(p_product_id uuid)
RETURNS bigint AS $$
DECLARE
  total_pending bigint := 0;
BEGIN
  SELECT COALESCE(SUM(oi.quantity_requested - COALESCE(oi.quantity_delivered, 0)), 0)::bigint
  INTO total_pending
  FROM public.order_items oi
  JOIN public.orders o ON oi.order_id = o.id
  WHERE oi.product_id = p_product_id
    AND o.status NOT IN ('delivered', 'returned', 'cancelled')
    AND oi.quantity_requested > COALESCE(oi.quantity_delivered, 0);

  RETURN total_pending;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION public.get_product_pending_orders(uuid) TO authenticated, anon;
