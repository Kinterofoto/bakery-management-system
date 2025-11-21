-- Create function to get total pending orders for a product (ordered but not delivered)
CREATE OR REPLACE FUNCTION public.get_product_pending_orders(p_product_id uuid)
RETURNS bigint AS $$
DECLARE
  total_pending bigint := 0;
BEGIN
  SELECT COALESCE(SUM(oi.quantity), 0)::bigint
  INTO total_pending
  FROM public.order_items oi
  JOIN public.orders o ON oi.order_id = o.id
  WHERE oi.product_id = p_product_id
    AND o.status NOT IN ('delivered', 'returned', 'cancelled')
    AND oi.quantity > COALESCE((
      SELECT SUM(oid.quantity_delivered)
      FROM public.order_item_deliveries oid
      WHERE oid.order_item_id = oi.id
    ), 0);

  RETURN total_pending;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to get demand by product (same as pending orders)
CREATE OR REPLACE FUNCTION public.get_product_demanded_quantity(p_product_id uuid)
RETURNS bigint AS $$
BEGIN
  RETURN public.get_product_pending_orders(p_product_id);
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_product_pending_orders(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_product_demanded_quantity(uuid) TO authenticated, anon;
