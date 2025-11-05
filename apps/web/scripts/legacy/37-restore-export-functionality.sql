-- Restore Export Functionality
-- Script 37: Restaurar funcionalidad de exportación sin afectar flujo normal

-- Restore simple and working get_orders_for_remision function
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
      -- Should go to remision if client is 'remision' type OR order has requires_remision override
      AND (c.billing_type = 'remision' OR o.requires_remision = TRUE)
      -- Only exclude if order already has remision AND it's been processed
      AND NOT EXISTS (
          SELECT 1 FROM remisions rem
          WHERE rem.order_id = o.id
          AND o.is_invoiced_from_remision IS NOT NULL
      )
      AND EXISTS (
          SELECT 1 FROM order_items oi
          WHERE oi.order_id = o.id
            AND oi.quantity_available > 0
      )
    ORDER BY r.route_name, o.order_number;
END;
$$ LANGUAGE plpgsql;

-- Ensure get_orders_for_direct_billing works normally
CREATE OR REPLACE FUNCTION get_orders_for_direct_billing(route_ids UUID[])
RETURNS TABLE (
    order_id UUID,
    order_number VARCHAR(100),
    client_name VARCHAR(255),
    total_value DECIMAL(12,2),
    route_name VARCHAR(255),
    expected_delivery_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.id as order_id,
        o.order_number,
        c.name as client_name,
        o.total_value,
        r.route_name,
        o.expected_delivery_date
    FROM orders o
    JOIN clients c ON o.client_id = c.id
    JOIN routes r ON o.assigned_route_id = r.id
    WHERE o.assigned_route_id = ANY(route_ids)
      AND o.status = 'ready_dispatch'
      AND (o.is_invoiced = FALSE OR o.is_invoiced IS NULL)
      AND (o.is_invoiced_from_remision = FALSE OR o.is_invoiced_from_remision IS NULL)
      -- Should go direct to billing if client is 'facturable' type AND order doesn't have remision override
      AND (c.billing_type = 'facturable' AND (o.requires_remision = FALSE OR o.requires_remision IS NULL))
      AND EXISTS (
          SELECT 1 FROM order_items oi
          WHERE oi.order_id = o.id
            AND oi.quantity_available > 0
      )
    ORDER BY r.route_name, o.order_number;
END;
$$ LANGUAGE plpgsql;

-- Print completion message
DO $$
BEGIN
    RAISE NOTICE '=== Export Functionality Restored ===';
    RAISE NOTICE '• get_orders_for_remision: Fixed to work with existing logic';
    RAISE NOTICE '• get_orders_for_direct_billing: Restored normal functionality';
    RAISE NOTICE '• Orders should now appear properly in export summaries';
    RAISE NOTICE '• Both facturable and remision orders should be detected correctly';
END $$;