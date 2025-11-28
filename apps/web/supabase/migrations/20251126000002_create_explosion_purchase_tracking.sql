-- Explosion Purchase Tracking
-- Tracks the ordering status of material requirements from explosion analysis
-- Allows visual tracking: not ordered → ordered (blue) → received (green)

-- =====================================================
-- EXPLOSION_PURCHASE_TRACKING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS compras.explosion_purchase_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  requirement_date DATE NOT NULL, -- Date when material is needed (explosion date)
  quantity_needed DECIMAL(12, 3) NOT NULL, -- Total quantity needed for this date
  quantity_ordered DECIMAL(12, 3) DEFAULT 0, -- Quantity already ordered
  quantity_received DECIMAL(12, 3) DEFAULT 0, -- Quantity already received
  status VARCHAR(20) NOT NULL DEFAULT 'not_ordered' CHECK (status IN ('not_ordered', 'ordered', 'partially_received', 'received')),
  purchase_order_item_id UUID REFERENCES compras.purchase_order_items(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Ensure one tracking record per material per date
  UNIQUE(material_id, requirement_date)
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_explosion_tracking_material ON compras.explosion_purchase_tracking(material_id);
CREATE INDEX IF NOT EXISTS idx_explosion_tracking_date ON compras.explosion_purchase_tracking(requirement_date);
CREATE INDEX IF NOT EXISTS idx_explosion_tracking_status ON compras.explosion_purchase_tracking(status);
CREATE INDEX IF NOT EXISTS idx_explosion_tracking_po_item ON compras.explosion_purchase_tracking(purchase_order_item_id);
CREATE INDEX IF NOT EXISTS idx_explosion_tracking_material_date ON compras.explosion_purchase_tracking(material_id, requirement_date);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE compras.explosion_purchase_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "explosion_tracking_allow_authenticated_select" ON compras.explosion_purchase_tracking;
CREATE POLICY "explosion_tracking_allow_authenticated_select" ON compras.explosion_purchase_tracking
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "explosion_tracking_allow_authenticated_insert" ON compras.explosion_purchase_tracking;
CREATE POLICY "explosion_tracking_allow_authenticated_insert" ON compras.explosion_purchase_tracking
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "explosion_tracking_allow_authenticated_update" ON compras.explosion_purchase_tracking;
CREATE POLICY "explosion_tracking_allow_authenticated_update" ON compras.explosion_purchase_tracking
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "explosion_tracking_allow_authenticated_delete" ON compras.explosion_purchase_tracking;
CREATE POLICY "explosion_tracking_allow_authenticated_delete" ON compras.explosion_purchase_tracking
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- =====================================================
-- FUNCTION: Auto-update status based on quantities
-- =====================================================
CREATE OR REPLACE FUNCTION compras.update_explosion_tracking_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update status based on ordered and received quantities
  IF NEW.quantity_received >= NEW.quantity_needed THEN
    NEW.status := 'received';
  ELSIF NEW.quantity_received > 0 THEN
    NEW.status := 'partially_received';
  ELSIF NEW.quantity_ordered > 0 THEN
    NEW.status := 'ordered';
  ELSE
    NEW.status := 'not_ordered';
  END IF;

  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_explosion_tracking_status_trigger ON compras.explosion_purchase_tracking;
CREATE TRIGGER update_explosion_tracking_status_trigger
BEFORE INSERT OR UPDATE ON compras.explosion_purchase_tracking
FOR EACH ROW
EXECUTE FUNCTION compras.update_explosion_tracking_status();

-- =====================================================
-- FUNCTION: Update tracking when PO items are received
-- =====================================================
CREATE OR REPLACE FUNCTION compras.update_explosion_on_reception()
RETURNS TRIGGER AS $$
BEGIN
  -- When a purchase order item is received, update the explosion tracking
  UPDATE compras.explosion_purchase_tracking
  SET
    quantity_received = quantity_received + NEW.quantity_received,
    updated_at = CURRENT_TIMESTAMP
  WHERE purchase_order_item_id = NEW.purchase_order_item_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_explosion_tracking_on_reception ON compras.reception_items;
CREATE TRIGGER update_explosion_tracking_on_reception
AFTER INSERT ON compras.reception_items
FOR EACH ROW
WHEN (NEW.purchase_order_item_id IS NOT NULL)
EXECUTE FUNCTION compras.update_explosion_on_reception();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE compras.explosion_purchase_tracking IS 'Tracks ordering status of material requirements from explosion analysis';
COMMENT ON COLUMN compras.explosion_purchase_tracking.requirement_date IS 'Date when material is needed (from explosion calculation)';
COMMENT ON COLUMN compras.explosion_purchase_tracking.status IS 'Visual status: not_ordered (default), ordered (blue), partially_received, received (green)';
COMMENT ON COLUMN compras.explosion_purchase_tracking.quantity_needed IS 'Total quantity required for this date from explosion';
COMMENT ON COLUMN compras.explosion_purchase_tracking.quantity_ordered IS 'Quantity ordered via purchase orders';
COMMENT ON COLUMN compras.explosion_purchase_tracking.quantity_received IS 'Quantity already received in inventory';
