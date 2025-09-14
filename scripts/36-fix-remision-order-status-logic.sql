-- Fix Remision Order Status Logic
-- Script 36: Corregir lógica de estado de pedidos con remisión

-- Update function to exclude orders with existing remisions from new remision creation
CREATE OR REPLACE FUNCTION get_orders_for_remision(route_ids UUID[])
RETURNS TABLE (
    order_id UUID,
    order_number VARCHAR(100),
    client_name VARCHAR(255),
    client_billing_type billing_type_enum,
    total_value DECIMAL(12,2),
    route_name VARCHAR(255),
    expected_delivery_date DATE,
    requires_remision_override BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.id as order_id,
        o.order_number,
        c.name as client_name,
        c.billing_type as client_billing_type,
        o.total_value,
        r.route_name,
        o.expected_delivery_date,
        o.requires_remision as requires_remision_override
    FROM orders o
    JOIN clients c ON o.client_id = c.id
    JOIN routes r ON o.assigned_route_id = r.id
    WHERE o.assigned_route_id = ANY(route_ids)
      AND o.status = 'ready_dispatch'
      AND (o.is_invoiced = FALSE OR o.is_invoiced IS NULL)
      AND (o.is_invoiced_from_remision IS NULL OR o.is_invoiced_from_remision = TRUE)  -- NULL or TRUE means no pending remision
      -- Should go to remision if client is 'remision' type OR order has requires_remision override
      AND (c.billing_type = 'remision' OR o.requires_remision = TRUE)
      -- Exclude orders that already have a remision created
      AND NOT EXISTS (
          SELECT 1 FROM remisions rem WHERE rem.order_id = o.id
      )
      AND EXISTS (
          SELECT 1 FROM order_items oi
          WHERE oi.order_id = o.id
            AND oi.quantity_available > 0
      )
    ORDER BY r.route_name, o.order_number;
END;
$$ LANGUAGE plpgsql;

-- Update function to get non-invoiced remision orders using proper logic
CREATE OR REPLACE FUNCTION get_non_invoiced_remision_orders(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    client_id_filter UUID DEFAULT NULL
)
RETURNS TABLE (
    order_id UUID,
    order_number VARCHAR(100),
    client_name VARCHAR(255),
    remision_number VARCHAR(50),
    remision_date DATE,
    total_value DECIMAL(12,2),
    route_name VARCHAR(255),
    expected_delivery_date DATE,
    delivered_quantity_items BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.id as order_id,
        o.order_number,
        c.name as client_name,
        r.remision_number,
        r.created_at::DATE as remision_date,
        o.total_value,
        rt.route_name,
        o.expected_delivery_date,
        COUNT(oid.id) as delivered_quantity_items
    FROM orders o
    JOIN clients c ON o.client_id = c.id
    LEFT JOIN routes rt ON o.assigned_route_id = rt.id
    JOIN remisions r ON o.id = r.order_id
    LEFT JOIN order_item_deliveries oid ON oid.order_item_id IN (
        SELECT oi.id FROM order_items oi WHERE oi.order_id = o.id
    )
    WHERE EXISTS (SELECT 1 FROM remisions rem WHERE rem.order_id = o.id)  -- Has remision
      AND (o.is_invoiced = FALSE OR o.is_invoiced IS NULL)                -- Not invoiced yet
      AND (o.is_invoiced_from_remision = FALSE)                          -- Not invoiced from remision yet (FALSE = has remision pending invoice)
      AND (start_date IS NULL OR r.created_at::DATE >= start_date)
      AND (end_date IS NULL OR r.created_at::DATE <= end_date)
      AND (client_id_filter IS NULL OR o.client_id = client_id_filter)
    GROUP BY o.id, o.order_number, c.name, r.remision_number, r.created_at,
             o.total_value, rt.route_name, o.expected_delivery_date
    ORDER BY r.created_at DESC, o.order_number;
END;
$$ LANGUAGE plpgsql;

-- Print completion message
DO $$
BEGIN
    RAISE NOTICE '=== Remision Order Status Logic Fixed ===';
    RAISE NOTICE '• Updated get_orders_for_remision to exclude orders with existing remisions';
    RAISE NOTICE '• Updated get_non_invoiced_remision_orders to use is_invoiced_from_remision = FALSE';
    RAISE NOTICE '• Orders with remisions will remain in ready_dispatch status';
    RAISE NOTICE '• is_invoiced_from_remision field tracks remision billing status:';
    RAISE NOTICE '  - NULL/TRUE: No pending remision';
    RAISE NOTICE '  - FALSE: Has remision but not yet invoiced';
    RAISE NOTICE '• System ready for proper remision workflow';
END $$;