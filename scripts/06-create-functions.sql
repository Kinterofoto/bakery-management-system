-- Create the calculate_order_total function
CREATE OR REPLACE FUNCTION calculate_order_total(order_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
  total DECIMAL(12,2);
BEGIN
  SELECT COALESCE(SUM(quantity_requested * unit_price), 0)
  INTO total
  FROM order_items
  WHERE order_id = order_uuid;
  
  UPDATE orders SET total_value = total WHERE id = order_uuid;
  
  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function for order status history
CREATE OR REPLACE FUNCTION update_order_status_history()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by, change_reason)
    VALUES (NEW.id, OLD.status, NEW.status, NEW.created_by, 'Status updated');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS order_status_change_trigger ON orders;
CREATE TRIGGER order_status_change_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_order_status_history();

-- Create order_status_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  changed_by UUID REFERENCES users(id),
  change_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Test the function with existing orders
SELECT calculate_order_total(id) FROM orders;
