-- Add Export History and Invoice Tracking System
-- Script 31: Advanced invoicing system with history and duplicate prevention

-- 1. Add invoice tracking fields to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_invoiced BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoiced_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_export_id UUID;

-- 2. Create export_history table for tracking all exports
CREATE TABLE IF NOT EXISTS export_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    export_date TIMESTAMP DEFAULT NOW(),
    invoice_number_start INTEGER NOT NULL,
    invoice_number_end INTEGER NOT NULL,
    total_orders INTEGER NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    routes_exported UUID[] NOT NULL DEFAULT '{}', -- Array of route UUIDs
    route_names TEXT[] NOT NULL DEFAULT '{}', -- Array of route names for display
    file_name VARCHAR(255) NOT NULL,
    file_data BYTEA, -- Store file for re-download
    export_summary JSONB, -- Additional export metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create order_invoices table for granular invoice tracking
CREATE TABLE IF NOT EXISTS order_invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    export_history_id UUID REFERENCES export_history(id) ON DELETE CASCADE,
    invoice_number INTEGER NOT NULL,
    invoice_date DATE NOT NULL,
    order_amount DECIMAL(10,2) DEFAULT 0,
    client_name VARCHAR(255),
    route_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(order_id, export_history_id)
);

-- 4. Add foreign key constraint for invoice_export_id in orders
ALTER TABLE orders ADD CONSTRAINT fk_orders_invoice_export 
    FOREIGN KEY (invoice_export_id) REFERENCES export_history(id);

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_is_invoiced ON orders(is_invoiced);
CREATE INDEX IF NOT EXISTS idx_orders_invoiced_at ON orders(invoiced_at);
CREATE INDEX IF NOT EXISTS idx_orders_invoice_export_id ON orders(invoice_export_id);
CREATE INDEX IF NOT EXISTS idx_export_history_created_by ON export_history(created_by);
CREATE INDEX IF NOT EXISTS idx_export_history_export_date ON export_history(export_date);
CREATE INDEX IF NOT EXISTS idx_order_invoices_order_id ON order_invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_order_invoices_export_history_id ON order_invoices(export_history_id);
CREATE INDEX IF NOT EXISTS idx_order_invoices_invoice_number ON order_invoices(invoice_number);

-- 6. Create function to get invoice statistics
CREATE OR REPLACE FUNCTION get_export_statistics(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    total_exports BIGINT,
    total_orders BIGINT,
    total_amount DECIMAL(12,2),
    avg_orders_per_export DECIMAL(10,2),
    latest_invoice_number INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_exports,
        COALESCE(SUM(eh.total_orders), 0)::BIGINT as total_orders,
        COALESCE(SUM(eh.total_amount), 0) as total_amount,
        CASE 
            WHEN COUNT(*) > 0 THEN COALESCE(SUM(eh.total_orders), 0)::DECIMAL / COUNT(*)::DECIMAL
            ELSE 0::DECIMAL
        END as avg_orders_per_export,
        COALESCE(MAX(eh.invoice_number_end), 0)::INTEGER as latest_invoice_number
    FROM export_history eh
    WHERE (start_date IS NULL OR eh.export_date::DATE >= start_date)
      AND (end_date IS NULL OR eh.export_date::DATE <= end_date);
END;
$$ LANGUAGE plpgsql;

-- 7. Create function to mark orders as invoiced
CREATE OR REPLACE FUNCTION mark_orders_as_invoiced(
    order_ids UUID[],
    export_history_id UUID,
    invoice_start INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    order_id UUID;
    invoice_counter INTEGER := invoice_start;
    updated_count INTEGER := 0;
BEGIN
    -- Loop through each order and mark as invoiced
    FOREACH order_id IN ARRAY order_ids
    LOOP
        -- Update order
        UPDATE orders 
        SET 
            is_invoiced = TRUE,
            invoiced_at = NOW(),
            invoice_export_id = mark_orders_as_invoiced.export_history_id,
            updated_at = NOW()
        WHERE id = order_id AND is_invoiced = FALSE;
        
        -- Check if update was successful
        IF FOUND THEN
            -- Create invoice record
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
                mark_orders_as_invoiced.export_history_id,
                invoice_counter,
                CURRENT_DATE,
                o.total_value,
                c.name,
                r.route_name
            FROM orders o
            LEFT JOIN clients c ON o.client_id = c.id
            LEFT JOIN routes r ON o.assigned_route_id = r.id
            WHERE o.id = order_id;
            
            invoice_counter := invoice_counter + 1;
            updated_count := updated_count + 1;
        END IF;
    END LOOP;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- 8. Create function to get pending orders for routes
CREATE OR REPLACE FUNCTION get_pending_orders_for_routes(route_ids UUID[])
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
      AND EXISTS (
          SELECT 1 FROM order_items oi 
          WHERE oi.order_id = o.id 
            AND oi.quantity_available > 0
      )
    ORDER BY r.route_name, o.order_number;
END;
$$ LANGUAGE plpgsql;

-- 9. Add comments for documentation
COMMENT ON TABLE export_history IS 'Tracks all World Office export operations with file storage for re-download';
COMMENT ON TABLE order_invoices IS 'Granular tracking of which orders were invoiced in which export';
COMMENT ON COLUMN orders.is_invoiced IS 'Flag indicating if order has been invoiced/exported to World Office';
COMMENT ON COLUMN orders.invoiced_at IS 'Timestamp when order was invoiced';
COMMENT ON COLUMN orders.invoice_export_id IS 'Reference to the export operation that invoiced this order';

-- Print completion message
DO $$
BEGIN
    RAISE NOTICE 'Export History System created successfully';
    RAISE NOTICE '• Added invoice tracking fields to orders table';
    RAISE NOTICE '• Created export_history table for export tracking';
    RAISE NOTICE '• Created order_invoices table for granular invoice tracking';
    RAISE NOTICE '• Created utility functions for statistics and order management';
    RAISE NOTICE '• Created indexes for optimal performance';
    RAISE NOTICE '• System ready for advanced invoice tracking and duplicate prevention';
END $$;