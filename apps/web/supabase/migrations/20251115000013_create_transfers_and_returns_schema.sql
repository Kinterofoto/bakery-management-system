-- Create Material Transfers and Returns System
-- Enables transfers of raw materials from central inventory to work centers
-- and returns from work centers back to central inventory

-- =====================================================
-- MATERIAL_TRANSFERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS compras.material_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number VARCHAR(20) UNIQUE NOT NULL, -- Auto-generated: TF2400001
  work_center_id UUID NOT NULL REFERENCES produccion.work_centers(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending_receipt', -- pending_receipt, received, partially_received
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  received_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- User who received the transfer
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  received_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TRANSFER_ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS compras.transfer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES compras.material_transfers(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity_requested DECIMAL(12, 3) NOT NULL,
  quantity_received DECIMAL(12, 3),
  batch_number VARCHAR(100),
  expiry_date DATE,
  unit_of_measure VARCHAR(50) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MATERIAL_RETURNS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS compras.material_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number VARCHAR(20) UNIQUE NOT NULL, -- Auto-generated: DV2400001
  work_center_id UUID NOT NULL REFERENCES produccion.work_centers(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending_receipt', -- pending_receipt, received
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- User who accepted the return
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP WITH TIME ZONE,
  reason TEXT, -- Reason for return (excess, waste, wrong material, etc.)
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- RETURN_ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS compras.return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES compras.material_returns(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity_returned DECIMAL(12, 3) NOT NULL,
  batch_number VARCHAR(100),
  expiry_date DATE,
  unit_of_measure VARCHAR(50) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- WORK_CENTER_INVENTORY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS produccion.work_center_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_center_id UUID NOT NULL REFERENCES produccion.work_centers(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity_available DECIMAL(12, 3) NOT NULL DEFAULT 0,
  quantity_consumed DECIMAL(12, 3) NOT NULL DEFAULT 0, -- Total consumed so far
  batch_number VARCHAR(100),
  expiry_date DATE,
  unit_of_measure VARCHAR(50) NOT NULL,
  transferred_at TIMESTAMP WITH TIME ZONE NOT NULL, -- When the material was transferred here
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(work_center_id, material_id, batch_number, expiry_date)
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_material_transfers_work_center ON compras.material_transfers(work_center_id);
CREATE INDEX IF NOT EXISTS idx_material_transfers_status ON compras.material_transfers(status);
CREATE INDEX IF NOT EXISTS idx_material_transfers_requested_by ON compras.material_transfers(requested_by);
CREATE INDEX IF NOT EXISTS idx_transfer_items_transfer ON compras.transfer_items(transfer_id);
CREATE INDEX IF NOT EXISTS idx_transfer_items_material ON compras.transfer_items(material_id);
CREATE INDEX IF NOT EXISTS idx_material_returns_work_center ON compras.material_returns(work_center_id);
CREATE INDEX IF NOT EXISTS idx_material_returns_status ON compras.material_returns(status);
CREATE INDEX IF NOT EXISTS idx_return_items_return ON compras.return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_return_items_material ON compras.return_items(material_id);
CREATE INDEX IF NOT EXISTS idx_work_center_inventory_work_center ON produccion.work_center_inventory(work_center_id);
CREATE INDEX IF NOT EXISTS idx_work_center_inventory_material ON produccion.work_center_inventory(material_id);
CREATE INDEX IF NOT EXISTS idx_work_center_inventory_expiry ON produccion.work_center_inventory(expiry_date);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE compras.material_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras.transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras.material_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras.return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE produccion.work_center_inventory ENABLE ROW LEVEL SECURITY;

-- Policies for material_transfers
CREATE POLICY "material_transfers_allow_authenticated_select" ON compras.material_transfers
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "material_transfers_allow_authenticated_insert" ON compras.material_transfers
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "material_transfers_allow_authenticated_update" ON compras.material_transfers
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Policies for transfer_items
CREATE POLICY "transfer_items_allow_authenticated_select" ON compras.transfer_items
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "transfer_items_allow_authenticated_insert" ON compras.transfer_items
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "transfer_items_allow_authenticated_update" ON compras.transfer_items
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Policies for material_returns
CREATE POLICY "material_returns_allow_authenticated_select" ON compras.material_returns
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "material_returns_allow_authenticated_insert" ON compras.material_returns
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "material_returns_allow_authenticated_update" ON compras.material_returns
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Policies for return_items
CREATE POLICY "return_items_allow_authenticated_select" ON compras.return_items
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "return_items_allow_authenticated_insert" ON compras.return_items
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "return_items_allow_authenticated_update" ON compras.return_items
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Policies for work_center_inventory
CREATE POLICY "work_center_inventory_allow_authenticated_select" ON produccion.work_center_inventory
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "work_center_inventory_allow_authenticated_insert" ON produccion.work_center_inventory
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "work_center_inventory_allow_authenticated_update" ON produccion.work_center_inventory
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- =====================================================
-- SEQUENCES AND FUNCTIONS FOR AUTO-GENERATED NUMBERS
-- =====================================================

-- Sequence for transfer numbers
CREATE SEQUENCE IF NOT EXISTS compras.transfer_number_seq START 1;

-- Sequence for return numbers
CREATE SEQUENCE IF NOT EXISTS compras.return_number_seq START 1;

-- Function to generate transfer number
CREATE OR REPLACE FUNCTION compras.generate_transfer_number()
RETURNS VARCHAR AS $$
DECLARE
  v_year VARCHAR(2);
  v_sequence INTEGER;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YY');
  v_sequence := nextval('compras.transfer_number_seq');
  RETURN 'TF' || v_year || '00' || LPAD(v_sequence::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to generate return number
CREATE OR REPLACE FUNCTION compras.generate_return_number()
RETURNS VARCHAR AS $$
DECLARE
  v_year VARCHAR(2);
  v_sequence INTEGER;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YY');
  v_sequence := nextval('compras.return_number_seq');
  RETURN 'DV' || v_year || '00' || LPAD(v_sequence::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: Auto-generate transfer number
-- =====================================================
CREATE OR REPLACE FUNCTION compras.assign_transfer_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transfer_number IS NULL THEN
    NEW.transfer_number := compras.generate_transfer_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transfer_number_trigger
BEFORE INSERT ON compras.material_transfers
FOR EACH ROW
EXECUTE FUNCTION compras.assign_transfer_number();

-- =====================================================
-- TRIGGER: Auto-generate return number
-- =====================================================
CREATE OR REPLACE FUNCTION compras.assign_return_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.return_number IS NULL THEN
    NEW.return_number := compras.generate_return_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER return_number_trigger
BEFORE INSERT ON compras.material_returns
FOR EACH ROW
EXECUTE FUNCTION compras.assign_return_number();

-- =====================================================
-- TRIGGER: Create inventory movement on transfer
-- =====================================================
CREATE OR REPLACE FUNCTION compras.create_movement_on_transfer()
RETURNS TRIGGER AS $$
BEGIN
  -- Create inventory movement for each transfer item
  INSERT INTO compras.inventory_movements (
    material_id,
    movement_type,
    quantity_change,
    unit_of_measure,
    reference_id,
    reference_type,
    location,
    notes,
    recorded_by,
    movement_date
  )
  SELECT
    ti.material_id,
    'transfer',
    -ti.quantity_requested,
    ti.unit_of_measure,
    NEW.id,
    'material_transfer',
    'Centro: ' || wc.code,
    'Traslado a ' || wc.name || ' - Lote: ' || COALESCE(ti.batch_number, 'N/A'),
    NEW.requested_by,
    CURRENT_TIMESTAMP
  FROM compras.transfer_items ti
  JOIN produccion.work_centers wc ON wc.id = NEW.work_center_id
  WHERE ti.transfer_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inventory_movement_on_transfer
AFTER INSERT ON compras.material_transfers
FOR EACH ROW
EXECUTE FUNCTION compras.create_movement_on_transfer();

-- =====================================================
-- TRIGGER: Create inventory movement on return receipt
-- =====================================================
CREATE OR REPLACE FUNCTION compras.create_movement_on_return_receipt()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create movement when return is accepted
  IF NEW.status = 'received' AND OLD.status = 'pending_receipt' THEN
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
    )
    SELECT
      ri.material_id,
      'return',
      ri.quantity_returned,
      ri.unit_of_measure,
      NEW.id,
      'material_return',
      'Devolución desde ' || wc.name || ' - Motivo: ' || COALESCE(NEW.reason, 'N/A'),
      NEW.accepted_by,
      CURRENT_TIMESTAMP
    FROM compras.return_items ri
    JOIN compras.material_returns mr ON mr.id = NEW.id
    JOIN produccion.work_centers wc ON wc.id = mr.work_center_id
    WHERE ri.return_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inventory_movement_on_return_receipt
AFTER UPDATE ON compras.material_returns
FOR EACH ROW
EXECUTE FUNCTION compras.create_movement_on_return_receipt();

-- =====================================================
-- TRIGGER: Update work center inventory on transfer receipt
-- =====================================================
CREATE OR REPLACE FUNCTION compras.update_work_center_inventory_on_receipt()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or insert into work_center_inventory
  INSERT INTO produccion.work_center_inventory (
    work_center_id,
    material_id,
    quantity_available,
    batch_number,
    expiry_date,
    unit_of_measure,
    transferred_at
  )
  SELECT
    mr.work_center_id,
    ti.material_id,
    COALESCE(NEW.quantity_received, ti.quantity_requested),
    ti.batch_number,
    ti.expiry_date,
    ti.unit_of_measure,
    CURRENT_TIMESTAMP
  FROM compras.transfer_items ti
  JOIN compras.material_transfers mr ON mr.id = NEW.transfer_id
  WHERE ti.transfer_id = NEW.transfer_id
  ON CONFLICT (work_center_id, material_id, batch_number, expiry_date)
  DO UPDATE SET
    quantity_available = work_center_inventory.quantity_available + EXCLUDED.quantity_available,
    updated_at = CURRENT_TIMESTAMP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER work_center_inventory_on_transfer_receipt
AFTER UPDATE ON compras.transfer_items
FOR EACH ROW
WHEN (NEW.quantity_received IS NOT NULL AND OLD.quantity_received IS NULL)
EXECUTE FUNCTION compras.update_work_center_inventory_on_receipt();

-- =====================================================
-- TRIGGER: Update work center inventory on return
-- =====================================================
CREATE OR REPLACE FUNCTION compras.update_work_center_inventory_on_return()
RETURNS TRIGGER AS $$
BEGIN
  -- Decrement inventory when return is created
  UPDATE produccion.work_center_inventory
  SET quantity_available = quantity_available - ri.quantity_returned,
      updated_at = CURRENT_TIMESTAMP
  FROM compras.return_items ri
  WHERE ri.return_id = NEW.id
    AND work_center_inventory.work_center_id = NEW.work_center_id
    AND work_center_inventory.material_id = ri.material_id
    AND work_center_inventory.batch_number = ri.batch_number
    AND work_center_inventory.expiry_date = ri.expiry_date;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER work_center_inventory_on_return
AFTER INSERT ON compras.material_returns
FOR EACH ROW
EXECUTE FUNCTION compras.update_work_center_inventory_on_return();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE compras.material_transfers IS 'Headers for material transfers from central inventory to work centers';
COMMENT ON TABLE compras.transfer_items IS 'Individual items within a transfer';
COMMENT ON TABLE compras.material_returns IS 'Headers for material returns from work centers to central inventory';
COMMENT ON TABLE compras.return_items IS 'Individual items within a return';
COMMENT ON TABLE produccion.work_center_inventory IS 'Local inventory tracking per work center';
