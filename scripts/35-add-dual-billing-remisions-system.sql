-- Add Dual Billing System with Remisions
-- Script 35: Sistema de facturación dual con remisiones y pedidos no facturados

-- 1. Add billing_type column to clients table
DO $$
BEGIN
    -- Create enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_type_enum') THEN
        CREATE TYPE billing_type_enum AS ENUM ('facturable', 'remision');
    END IF;
END $$;

ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_type billing_type_enum DEFAULT 'facturable';

-- 2. Add requires_remision column to orders table (for per-order override)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS requires_remision BOOLEAN DEFAULT FALSE;

-- 3. Update orders status to include 'remisionado'
-- First, let's see what status values currently exist and handle them
DO $$
DECLARE
    existing_statuses TEXT[];
BEGIN
    -- Get all unique status values currently in the orders table
    SELECT array_agg(DISTINCT status) INTO existing_statuses FROM orders;

    RAISE NOTICE 'Current status values in orders table: %', existing_statuses;

    -- Drop existing constraint
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

    -- Add the new constraint with all possible status values including 'remisionado'
    -- This includes common status values that might exist
    ALTER TABLE orders ADD CONSTRAINT orders_status_check
    CHECK (status IN (
        'received', 'review_area1', 'review_area2', 'ready_dispatch',
        'dispatched', 'in_delivery', 'delivered', 'partially_delivered',
        'returned', 'remisionado',
        -- Additional possible status values that might exist
        'pending', 'processing', 'completed', 'cancelled', 'on_hold'
    ));

    RAISE NOTICE 'Successfully added remisionado status to orders constraint';
EXCEPTION
    WHEN check_violation THEN
        RAISE NOTICE 'Constraint violation detected. Current status values: %', existing_statuses;
        -- If constraint still fails, we'll create a more permissive constraint
        ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
        RAISE NOTICE 'Removed constraint due to unknown status values. Please review and adjust manually.';
END $$;

-- 4. Create remisions table
CREATE TABLE IF NOT EXISTS remisions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    remision_number VARCHAR(50) UNIQUE NOT NULL,
    client_data JSONB NOT NULL, -- Store client data snapshot at time of remision
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    pdf_path VARCHAR(500), -- Path to generated PDF file
    pdf_data BYTEA, -- Store PDF data for re-download
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Ensure one remision per order
    UNIQUE(order_id)
);

-- 5. Create remision_items table
CREATE TABLE IF NOT EXISTS remision_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    remision_id UUID REFERENCES remisions(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL, -- Store product name snapshot
    quantity_delivered DECIMAL(10,3) NOT NULL DEFAULT 0, -- Use quantity_available for remision
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    product_unit VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Add is_invoiced_from_remision flag to orders for tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_invoiced_from_remision BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS remision_invoiced_at TIMESTAMP;

-- 7. Create system config entries for remision numbering
INSERT INTO system_config (config_key, config_value, description)
VALUES
    ('remision_number_start', '1', 'Número inicial para consecutivo de remisiones')
ON CONFLICT (config_key) DO NOTHING;

INSERT INTO system_config (config_key, config_value, description)
VALUES
    ('remision_number_current', '1', 'Número actual del consecutivo de remisiones')
ON CONFLICT (config_key) DO NOTHING;

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_billing_type ON clients(billing_type);
CREATE INDEX IF NOT EXISTS idx_orders_requires_remision ON orders(requires_remision);
CREATE INDEX IF NOT EXISTS idx_orders_status_remisionado ON orders(status) WHERE status = 'remisionado';
CREATE INDEX IF NOT EXISTS idx_orders_is_invoiced_from_remision ON orders(is_invoiced_from_remision);
CREATE INDEX IF NOT EXISTS idx_remisions_order_id ON remisions(order_id);
CREATE INDEX IF NOT EXISTS idx_remisions_remision_number ON remisions(remision_number);
CREATE INDEX IF NOT EXISTS idx_remisions_created_at ON remisions(created_at);
CREATE INDEX IF NOT EXISTS idx_remision_items_remision_id ON remision_items(remision_id);
CREATE INDEX IF NOT EXISTS idx_remision_items_product_id ON remision_items(product_id);

-- 9. Create function to get next remision number
CREATE OR REPLACE FUNCTION get_next_remision_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    current_number INTEGER;
    next_number INTEGER;
    remision_number VARCHAR(50);
BEGIN
    -- Get current remision number
    SELECT COALESCE(config_value::INTEGER, 1) INTO current_number
    FROM system_config
    WHERE config_key = 'remision_number_current';

    next_number := current_number + 1;

    -- Update the current number
    UPDATE system_config
    SET config_value = next_number::TEXT,
        updated_at = NOW()
    WHERE config_key = 'remision_number_current';

    -- Format remision number (e.g., REM-000001)
    remision_number := 'REM-' || LPAD(next_number::TEXT, 6, '0');

    RETURN remision_number;
END;
$$ LANGUAGE plpgsql;

-- 10. Create function to get orders that should go to remision during export
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
      AND (o.is_invoiced_from_remision = FALSE OR o.is_invoiced_from_remision IS NULL)
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

-- 11. Create function to get orders that should go directly to facturable export
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

-- 12. Create function to get non-invoiced orders (remisionados ready for billing)
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
      AND (o.is_invoiced_from_remision = FALSE)                          -- Not invoiced from remision yet
      AND (start_date IS NULL OR r.created_at::DATE >= start_date)
      AND (end_date IS NULL OR r.created_at::DATE <= end_date)
      AND (client_id_filter IS NULL OR o.client_id = client_id_filter)
    GROUP BY o.id, o.order_number, c.name, r.remision_number, r.created_at,
             o.total_value, rt.route_name, o.expected_delivery_date
    ORDER BY r.created_at DESC, o.order_number;
END;
$$ LANGUAGE plpgsql;

-- 13. Create function to mark remision orders as invoiced (different from regular invoicing)
CREATE OR REPLACE FUNCTION mark_remision_orders_as_invoiced(
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
    -- Loop through each order and mark as invoiced from remision
    FOREACH order_id IN ARRAY order_ids
    LOOP
        -- Update order
        UPDATE orders
        SET
            is_invoiced = TRUE,
            is_invoiced_from_remision = TRUE,
            invoiced_at = NOW(),
            remision_invoiced_at = NOW(),
            invoice_export_id = mark_remision_orders_as_invoiced.export_history_id,
            updated_at = NOW()
        WHERE id = order_id
          AND status = 'remisionado'
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
            WHERE o.id = order_id;

            invoice_counter := invoice_counter + 1;
            updated_count := updated_count + 1;
        END IF;
    END LOOP;

    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- 14. Create function to get remision statistics
CREATE OR REPLACE FUNCTION get_remision_statistics(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    total_remisions BIGINT,
    pending_remisions BIGINT,
    invoiced_remisions BIGINT,
    total_remision_amount DECIMAL(12,2),
    avg_remision_amount DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_remisions,
        COUNT(CASE WHEN (o.is_invoiced_from_remision = FALSE OR o.is_invoiced_from_remision IS NULL) THEN 1 END)::BIGINT as pending_remisions,
        COUNT(CASE WHEN o.is_invoiced_from_remision = TRUE THEN 1 END)::BIGINT as invoiced_remisions,
        COALESCE(SUM(r.total_amount), 0) as total_remision_amount,
        CASE
            WHEN COUNT(*) > 0 THEN COALESCE(AVG(r.total_amount), 0)
            ELSE 0::DECIMAL
        END as avg_remision_amount
    FROM remisions r
    JOIN orders o ON r.order_id = o.id
    WHERE (start_date IS NULL OR r.created_at::DATE >= start_date)
      AND (end_date IS NULL OR r.created_at::DATE <= end_date);
END;
$$ LANGUAGE plpgsql;

-- 15. Add triggers to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_remision_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_remisions_updated_at ON remisions;
CREATE TRIGGER trigger_update_remisions_updated_at
    BEFORE UPDATE ON remisions
    FOR EACH ROW
    EXECUTE FUNCTION update_remision_updated_at();

-- 16. Add comments for documentation
COMMENT ON COLUMN clients.billing_type IS 'Tipo de facturación del cliente: facturable (directo) o remision (requiere remisión previa)';
COMMENT ON COLUMN orders.requires_remision IS 'Override por pedido específico para requerir remisión independiente del tipo de cliente';
COMMENT ON COLUMN orders.is_invoiced_from_remision IS 'Flag para indicar que este pedido fue facturado después de haber sido remisionado';
COMMENT ON COLUMN orders.remision_invoiced_at IS 'Timestamp cuando el pedido remisionado fue facturado';
COMMENT ON TABLE remisions IS 'Tabla de remisiones generadas para pedidos que requieren este flujo';
COMMENT ON TABLE remision_items IS 'Items de las remisiones con cantidades disponibles al momento de la remisión';
COMMENT ON COLUMN remision_items.quantity_delivered IS 'Cantidad remisionada (basada en quantity_available del order_item)';

-- Print completion message
DO $$
DECLARE
    remision_clients_count INTEGER;
BEGIN
    -- Get count of clients that would be affected
    SELECT COUNT(*) INTO remision_clients_count FROM clients WHERE billing_type = 'facturable';

    RAISE NOTICE '=== Dual Billing System with Remisions created successfully ===';
    RAISE NOTICE '• Added billing_type column to clients table (facturable/remision)';
    RAISE NOTICE '• Added requires_remision override column to orders table';
    RAISE NOTICE '• Extended order status to include "remisionado" state';
    RAISE NOTICE '• Created remisions table for remision tracking';
    RAISE NOTICE '• Created remision_items table for detailed remision items';
    RAISE NOTICE '• Added remision invoicing tracking fields to orders';
    RAISE NOTICE '• Created system functions for remision workflow:';
    RAISE NOTICE '  - get_next_remision_number(): Auto-increment remision numbers';
    RAISE NOTICE '  - get_orders_for_remision(): Orders that need remision';
    RAISE NOTICE '  - get_orders_for_direct_billing(): Orders for direct billing';
    RAISE NOTICE '  - get_non_invoiced_remision_orders(): Remisioned orders pending billing';
    RAISE NOTICE '  - mark_remision_orders_as_invoiced(): Mark remision orders as invoiced';
    RAISE NOTICE '  - get_remision_statistics(): Remision statistics';
    RAISE NOTICE '• Created indexes for optimal performance';
    RAISE NOTICE '• All % existing clients set to "facturable" by default', remision_clients_count;
    RAISE NOTICE '• System ready for dual billing workflow implementation';
END $$;