-- Fix Remision Invoicing Status Logic
-- Script 37: Corregir estado de facturación de pedidos remisionados

-- Update function to work with delivered/partially_delivered status instead of 'remisionado'
CREATE OR REPLACE FUNCTION mark_remision_orders_as_invoiced(
    order_ids UUID[],
    export_history_id UUID,
    invoice_start INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    current_order_id UUID;
    invoice_counter INTEGER := invoice_start;
    updated_count INTEGER := 0;
BEGIN
    -- Loop through each order and mark as invoiced from remision
    FOREACH current_order_id IN ARRAY order_ids
    LOOP
        -- Update order (remove status filter since remision orders are delivered/partially_delivered)
        UPDATE orders
        SET
            is_invoiced = TRUE,
            is_invoiced_from_remision = TRUE,
            invoiced_at = NOW(),
            remision_invoiced_at = NOW(),
            invoice_export_id = mark_remision_orders_as_invoiced.export_history_id,
            updated_at = NOW()
        WHERE id = current_order_id
          AND EXISTS (SELECT 1 FROM remisions WHERE order_id = orders.id)  -- Must have remision
          AND (is_invoiced = FALSE OR is_invoiced IS NULL);

        -- Check if update was successful
        IF FOUND THEN
            -- Create invoice record with special note for remision
            INSERT INTO order_invoices (
                order_id,
                export_history_id,
                invoice_number,
                invoice_date,
                order_amount,
                client_name,
                route_name
            )
            SELECT
                o.id,
                mark_remision_orders_as_invoiced.export_history_id,
                invoice_counter,
                CURRENT_DATE,
                o.total_value,
                c.name || ' (Anteriormente Remisionado)',  -- Special label
                r.route_name
            FROM orders o
            LEFT JOIN clients c ON o.client_id = c.id
            LEFT JOIN routes r ON o.assigned_route_id = r.id
            WHERE o.id = current_order_id;

            invoice_counter := invoice_counter + 1;
            updated_count := updated_count + 1;
        END IF;
    END LOOP;

    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Print completion message
DO $$
BEGIN
    RAISE NOTICE '=== Remision Invoicing Status Fixed ===';
    RAISE NOTICE '• Updated mark_remision_orders_as_invoiced to work with delivered/partially_delivered orders';
    RAISE NOTICE '• Removed restrictive status filter, now uses remision existence check';
    RAISE NOTICE '• Maintains special label "Anteriormente Remisionado" in invoices';
    RAISE NOTICE '• Orders will now disappear from "Pedidos No Facturados" after invoicing';
END $$;