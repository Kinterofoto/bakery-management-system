-- =====================================================
-- Migration: Create Inventory Movements and Balances
-- =====================================================
-- Purpose: Unified movement tracking with automatic balance calculation
-- Date: 2025-12-01
-- =====================================================

-- =====================================================
-- TABLE: inventory_movements
-- =====================================================
-- Single source of truth for ALL inventory movements

CREATE TABLE inventario.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_number VARCHAR(50) UNIQUE NOT NULL,  -- MOV-2025-00001

  -- ==================== PRODUCT ====================
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity DECIMAL(12,3) NOT NULL CHECK (quantity > 0),
  unit_of_measure VARCHAR(50) NOT NULL,

  -- ==================== MOVEMENT TYPE ====================
  -- Controls balance calculation direction
  movement_type VARCHAR(20) NOT NULL CHECK (
    movement_type IN ('IN', 'OUT', 'TRANSFER_IN', 'TRANSFER_OUT')
  ),

  -- ==================== REASON TYPE ====================
  -- Why this movement happened (for reporting and analytics)
  reason_type VARCHAR(50) NOT NULL CHECK (
    reason_type IN (
      'purchase',       -- Compra a proveedor
      'production',     -- Producción terminada
      'sale',          -- Venta a cliente
      'consumption',   -- Consumo de producción
      'adjustment',    -- Ajuste de inventario
      'return',        -- Devolución
      'waste',         -- Desperdicio
      'transfer',      -- Transferencia entre ubicaciones
      'initial'        -- Inventario inicial
    )
  ),

  -- ==================== LOCATIONS ====================
  location_id_from UUID REFERENCES inventario.locations(id) ON DELETE RESTRICT,  -- Origin (NULL for IN)
  location_id_to UUID REFERENCES inventario.locations(id) ON DELETE RESTRICT,    -- Destination (NULL for OUT)

  -- ==================== TRANSFER LINKING ====================
  -- For transfers: links TRANSFER_OUT with its corresponding TRANSFER_IN
  linked_movement_id UUID REFERENCES inventario.inventory_movements(id),

  -- ==================== BALANCE TRACKING ====================
  -- Balance AFTER this movement (at the affected location)
  balance_after DECIMAL(12,3) NOT NULL CHECK (balance_after >= 0),

  -- ==================== DOCUMENT REFERENCE ====================
  -- Link to source document (reception, production order, sale, etc.)
  reference_id UUID,
  reference_type VARCHAR(50),  -- 'reception', 'production_order', 'sale_order', 'adjustment', etc.

  -- ==================== AUDIT ====================
  notes TEXT,
  recorded_by UUID NOT NULL REFERENCES auth.users(id),
  movement_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- ==================== CONSTRAINTS ====================
  -- Ensure location logic is valid per movement type
  CONSTRAINT valid_movement_locations CHECK (
    (movement_type = 'IN' AND location_id_from IS NULL AND location_id_to IS NOT NULL) OR
    (movement_type = 'OUT' AND location_id_from IS NOT NULL AND location_id_to IS NULL) OR
    (movement_type IN ('TRANSFER_IN', 'TRANSFER_OUT') AND location_id_from IS NOT NULL AND location_id_to IS NOT NULL)
  )
);

-- =====================================================
-- INDEXES for performance
-- =====================================================

-- Kardex queries (most frequent)
CREATE INDEX idx_movements_product_date ON inventario.inventory_movements(product_id, movement_date DESC);

-- Location-based queries
CREATE INDEX idx_movements_location_to ON inventario.inventory_movements(location_id_to, movement_date DESC);
CREATE INDEX idx_movements_location_from ON inventario.inventory_movements(location_id_from, movement_date DESC);

-- Reporting and analytics
CREATE INDEX idx_movements_type_reason ON inventario.inventory_movements(movement_type, reason_type);
CREATE INDEX idx_movements_reason_date ON inventario.inventory_movements(reason_type, movement_date DESC);

-- Document traceability
CREATE INDEX idx_movements_reference ON inventario.inventory_movements(reference_id, reference_type);

-- Transfer linking
CREATE INDEX idx_movements_linked ON inventario.inventory_movements(linked_movement_id) WHERE linked_movement_id IS NOT NULL;

-- User audit
CREATE INDEX idx_movements_recorded_by ON inventario.inventory_movements(recorded_by, movement_date DESC);

-- =====================================================
-- TABLE: inventory_balances
-- =====================================================
-- Current balance per product per location

CREATE TABLE inventario.inventory_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ==================== IDENTIFIERS ====================
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  location_id UUID NOT NULL REFERENCES inventario.locations(id) ON DELETE RESTRICT,

  -- ==================== BALANCE ====================
  quantity_on_hand DECIMAL(12,3) NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),

  -- ==================== TRACKING ====================
  last_movement_id UUID REFERENCES inventario.inventory_movements(id),
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- ==================== CONSTRAINTS ====================
  UNIQUE(product_id, location_id)
);

-- =====================================================
-- INDEXES for inventory_balances
-- =====================================================

-- Primary lookup (product + location)
CREATE UNIQUE INDEX idx_balances_product_location ON inventario.inventory_balances(product_id, location_id);

-- Product-based queries (all locations for a product)
CREATE INDEX idx_balances_product ON inventario.inventory_balances(product_id);

-- Location-based queries (all products at a location)
CREATE INDEX idx_balances_location ON inventario.inventory_balances(location_id);

-- Only products with stock (most common query)
CREATE INDEX idx_balances_positive ON inventario.inventory_balances(quantity_on_hand) WHERE quantity_on_hand > 0;

-- =====================================================
-- SEQUENCE for movement numbers
-- =====================================================

CREATE SEQUENCE inventario.movement_number_seq START 1;

-- =====================================================
-- Enable RLS
-- =====================================================

ALTER TABLE inventario.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario.inventory_balances ENABLE ROW LEVEL SECURITY;

-- Policies: Allow all for authenticated users (adjust as needed)
CREATE POLICY "Enable all for authenticated users"
  ON inventario.inventory_movements
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users"
  ON inventario.inventory_balances
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE inventario.inventory_movements IS 'Unified inventory movement tracking - single source of truth for all inventory transactions';
COMMENT ON COLUMN inventario.inventory_movements.movement_type IS 'Direction of movement: IN (increase), OUT (decrease), TRANSFER_IN/OUT (location change)';
COMMENT ON COLUMN inventario.inventory_movements.reason_type IS 'Business reason for movement: purchase, production, sale, consumption, adjustment, return, waste, transfer, initial';
COMMENT ON COLUMN inventario.inventory_movements.balance_after IS 'Balance at the affected location after this movement';
COMMENT ON COLUMN inventario.inventory_movements.linked_movement_id IS 'For transfers: links TRANSFER_OUT with TRANSFER_IN';

COMMENT ON TABLE inventario.inventory_balances IS 'Current inventory balance per product per location';
COMMENT ON COLUMN inventario.inventory_balances.quantity_on_hand IS 'Current available quantity (always >= 0)';
