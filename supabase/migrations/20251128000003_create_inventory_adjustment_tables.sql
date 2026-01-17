-- Create tables for inventory adjustment system
-- This enables comparison of counted inventory vs actual inventory and applying adjustments

-- =====================================================
-- ADJUSTMENT_REASONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.adjustment_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reason TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default adjustment reasons
INSERT INTO public.adjustment_reasons (reason, description) VALUES
  ('Diferencia en conteo físico', 'El inventario físico no coincide con el sistema'),
  ('Error de registro', 'Error humano al registrar entradas o salidas'),
  ('Merma no registrada', 'Pérdida de material no documentada previamente'),
  ('Devolución sin registro', 'Material devuelto que no fue registrado correctamente'),
  ('Desperdicio en producción', 'Material desperdiciado durante producción no contabilizado'),
  ('Material vencido', 'Material que venció y debe ser dado de baja'),
  ('Daño o deterioro', 'Material dañado o deteriorado que debe ajustarse'),
  ('Reconciliación de inventario', 'Ajuste por proceso de reconciliación periódica'),
  ('Otros', 'Razón no especificada en las opciones anteriores')
ON CONFLICT (reason) DO NOTHING;

-- =====================================================
-- INVENTORY_ADJUSTMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.inventory_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID NOT NULL REFERENCES public.inventories(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,

  -- Counted vs actual inventory
  counted_quantity DECIMAL(12, 3) NOT NULL, -- From final inventory results
  actual_quantity DECIMAL(12, 3) NOT NULL, -- From compras.material_inventory_status
  difference DECIMAL(12, 3) NOT NULL, -- actual - counted (positive = surplus, negative = shortage)

  -- Adjustment details
  adjustment_type VARCHAR(20) NOT NULL CHECK (adjustment_type IN ('positive', 'negative')),
  adjustment_quantity DECIMAL(12, 3) NOT NULL, -- Absolute value of difference
  reason_id UUID REFERENCES public.adjustment_reasons(id),
  custom_reason TEXT, -- If user selects 'Otros' or wants to add details

  -- Status and approval
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,

  -- Movement tracking
  movement_id UUID REFERENCES compras.inventory_movements(id), -- Link to the movement created

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_inventory ON public.inventory_adjustments(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_product ON public.inventory_adjustments(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_status ON public.inventory_adjustments(status);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_created ON public.inventory_adjustments(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS
ALTER TABLE public.adjustment_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;

-- Adjustment Reasons Policies (read-only for all authenticated users)
CREATE POLICY "adjustment_reasons_allow_authenticated_select" ON public.adjustment_reasons
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Inventory Adjustments Policies
CREATE POLICY "inventory_adjustments_allow_authenticated_select" ON public.inventory_adjustments
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "inventory_adjustments_allow_authenticated_insert" ON public.inventory_adjustments
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "inventory_adjustments_allow_authenticated_update" ON public.inventory_adjustments
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "inventory_adjustments_allow_authenticated_delete" ON public.inventory_adjustments
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- =====================================================
-- TRIGGER: Auto-update updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_inventory_adjustments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inventory_adjustments_updated_at
  BEFORE UPDATE ON public.inventory_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_adjustments_updated_at();

CREATE TRIGGER adjustment_reasons_updated_at
  BEFORE UPDATE ON public.adjustment_reasons
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_adjustments_updated_at();

-- =====================================================
-- FUNCTION: Apply Adjustment and Create Movement
-- =====================================================
CREATE OR REPLACE FUNCTION public.apply_inventory_adjustment(
  p_adjustment_id UUID,
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_adjustment RECORD;
  v_movement_id UUID;
  v_movement_type VARCHAR(30);
  v_quantity_change DECIMAL(12, 3);
BEGIN
  -- Get adjustment details
  SELECT * INTO v_adjustment
  FROM public.inventory_adjustments
  WHERE id = p_adjustment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Adjustment not found';
  END IF;

  IF v_adjustment.status != 'pending' THEN
    RAISE EXCEPTION 'Adjustment already processed';
  END IF;

  -- Determine movement type and quantity
  IF v_adjustment.adjustment_type = 'positive' THEN
    v_movement_type := 'adjustment';
    v_quantity_change := v_adjustment.adjustment_quantity; -- Positive
  ELSE
    v_movement_type := 'adjustment';
    v_quantity_change := -v_adjustment.adjustment_quantity; -- Negative
  END IF;

  -- Create inventory movement
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
    v_adjustment.product_id,
    v_movement_type,
    v_quantity_change,
    'kg', -- Default unit, can be adjusted
    v_adjustment.inventory_id,
    'inventory_adjustment',
    CONCAT(
      'Ajuste de inventario - ',
      CASE WHEN v_adjustment.custom_reason IS NOT NULL
           THEN v_adjustment.custom_reason
           ELSE (SELECT reason FROM public.adjustment_reasons WHERE id = v_adjustment.reason_id)
      END
    ),
    p_user_id,
    CURRENT_TIMESTAMP
  ) RETURNING id INTO v_movement_id;

  -- Update adjustment record
  UPDATE public.inventory_adjustments
  SET
    status = 'approved',
    approved_by = p_user_id,
    approved_at = CURRENT_TIMESTAMP,
    movement_id = v_movement_id,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_adjustment_id;

  RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql;
