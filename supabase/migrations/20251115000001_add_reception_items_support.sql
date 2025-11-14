-- Add Reception Items Support
-- Allows a single reception to contain multiple materials from a purchase order

-- =====================================================
-- RECEPTION_ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS compras.reception_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reception_id UUID NOT NULL REFERENCES compras.material_receptions(id) ON DELETE CASCADE,
  purchase_order_item_id UUID REFERENCES compras.purchase_order_items(id) ON DELETE SET NULL, -- For PO-based receptions
  material_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity_received DECIMAL(12, 3) NOT NULL,
  batch_number VARCHAR(100),
  lot_number VARCHAR(100),
  expiry_date DATE, -- Changed from lot_number to expiry_date
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_reception_items_reception ON compras.reception_items(reception_id);
CREATE INDEX IF NOT EXISTS idx_reception_items_material ON compras.reception_items(material_id);
CREATE INDEX IF NOT EXISTS idx_reception_items_po_item ON compras.reception_items(purchase_order_item_id);
CREATE INDEX IF NOT EXISTS idx_reception_items_expiry ON compras.reception_items(expiry_date);

-- Note: Existing material_receptions table columns remain for backward compatibility
-- New receptions will use reception_items for storing individual item details
-- The following columns in material_receptions become optional:
-- - batch_number (deprecated, moved to reception_items)
-- - lot_number (deprecated, replaced by expiry_date in reception_items)
-- - unit_of_measure (deprecated, comes from product definition)
-- - material_id (deprecated, moved to reception_items)

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE compras.reception_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reception_items_allow_authenticated_select" ON compras.reception_items
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "reception_items_allow_authenticated_insert" ON compras.reception_items
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "reception_items_allow_authenticated_update" ON compras.reception_items
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "reception_items_allow_authenticated_delete" ON compras.reception_items
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- =====================================================
-- FUNCTION: Update inventory movements for reception items
-- =====================================================
CREATE OR REPLACE FUNCTION compras.create_movement_on_reception_item()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO compras.inventory_movements (
    material_id,
    movement_type,
    quantity_change,
    unit_of_measure,
    reference_id,
    reference_type,
    notes,
    recorded_by,
    movement_date
  ) VALUES (
    NEW.material_id,
    'reception',
    NEW.quantity_received,
    (SELECT p.unit FROM public.products p WHERE p.id = NEW.material_id),
    NEW.reception_id,
    'reception_item',
    'Recepción: Lote ' || COALESCE(NEW.batch_number, '') || ' Vencimiento: ' || COALESCE(NEW.expiry_date::text, ''),
    (SELECT operator_id FROM compras.material_receptions WHERE id = NEW.reception_id),
    CURRENT_TIMESTAMP
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inventory_movement_on_reception ON compras.material_receptions;

CREATE TRIGGER inventory_movement_on_reception_item
AFTER INSERT ON compras.reception_items
FOR EACH ROW
EXECUTE FUNCTION compras.create_movement_on_reception_item();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE compras.reception_items IS 'Individual items received in a reception, supporting multiple materials per reception';
COMMENT ON COLUMN compras.reception_items.expiry_date IS 'Expiry/shelf date for the received material';
COMMENT ON COLUMN compras.reception_items.batch_number IS 'Batch or lot number from supplier';
