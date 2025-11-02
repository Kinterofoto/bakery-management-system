-- Create order_item_deliveries table for granular delivery tracking
CREATE TABLE IF NOT EXISTS order_item_deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  route_order_id UUID REFERENCES route_orders(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE,
  delivery_status VARCHAR(50) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'delivered', 'partial', 'rejected')),
  quantity_delivered INTEGER DEFAULT 0,
  quantity_rejected INTEGER DEFAULT 0,
  rejection_reason TEXT,
  evidence_url TEXT,
  delivery_notes TEXT,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_order_item_deliveries_route_order ON order_item_deliveries(route_order_id);
CREATE INDEX IF NOT EXISTS idx_order_item_deliveries_order_item ON order_item_deliveries(order_item_id);
CREATE INDEX IF NOT EXISTS idx_order_item_deliveries_status ON order_item_deliveries(delivery_status);

-- Add unique constraint to prevent duplicate deliveries for same route_order + order_item
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_item_deliveries_unique 
ON order_item_deliveries(route_order_id, order_item_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_order_item_deliveries_updated_at 
BEFORE UPDATE ON order_item_deliveries 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();