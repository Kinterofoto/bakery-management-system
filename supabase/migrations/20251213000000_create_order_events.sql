-- Migration: Create order_events table for professional audit logging
-- This table tracks all significant changes to orders for compliance and debugging

CREATE TABLE IF NOT EXISTS order_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    payload JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON order_events(order_id);
CREATE INDEX IF NOT EXISTS idx_order_events_type ON order_events(event_type);
CREATE INDEX IF NOT EXISTS idx_order_events_created_at ON order_events(created_at DESC);

-- Common event types:
-- 'created' - Order was created
-- 'status_change' - Status transition
-- 'item_added' - New item added
-- 'item_updated' - Item modified (quantity, availability, lote)
-- 'item_removed' - Item removed
-- 'cancelled' - Order was cancelled
-- 'assigned_route' - Order assigned to delivery route
-- 'invoiced' - Order was invoiced

COMMENT ON TABLE order_events IS 'Audit log for all order changes - enterprise compliance';
COMMENT ON COLUMN order_events.event_type IS 'Type of event: created, status_change, item_added, item_updated, cancelled, etc.';
COMMENT ON COLUMN order_events.payload IS 'JSON payload with event-specific data (old_status, new_status, item_id, etc.)';

-- Grant permissions
GRANT SELECT, INSERT ON order_events TO authenticated;
GRANT SELECT ON order_events TO anon;
