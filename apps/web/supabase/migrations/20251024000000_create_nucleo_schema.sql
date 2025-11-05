-- =====================================================
-- Núcleo Module: Extended Product Information Management
-- =====================================================
-- This schema centralizes all product information in one place
-- 
-- IMPORTANT: This schema does NOT duplicate existing tables:
--   - produccion.materials (already exists)
--   - produccion.bill_of_materials (already exists)
--   - produccion.material_consumptions (already exists)
--   - produccion.production_productivity (already exists)
--   - produccion.production_routes (already exists)
-- 
-- The Núcleo module references these existing tables for:
--   - Bill of Materials information
--   - Production process data
--   - Material costs
-- =====================================================

-- Product Technical Specifications
CREATE TABLE IF NOT EXISTS product_technical_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  dimensions JSONB, -- {length, width, height, unit}
  shelf_life_days INTEGER,
  storage_conditions TEXT,
  packaging_type TEXT,
  packaging_units_per_box INTEGER,
  net_weight DECIMAL(10,3),
  gross_weight DECIMAL(10,3),
  allergens TEXT[],
  certifications TEXT[],
  custom_attributes JSONB, -- Flexible for any custom technical data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Quality Specifications
CREATE TABLE IF NOT EXISTS product_quality_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quality_parameters JSONB, -- [{parameter, min_value, max_value, unit, tolerance}]
  sensory_attributes JSONB, -- {color, texture, flavor, aroma, appearance}
  microbiological_specs JSONB,
  physical_chemical_specs JSONB,
  control_frequency TEXT, -- daily, weekly, per_batch, etc
  inspection_points TEXT[],
  rejection_criteria TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Production Process
-- NOTE: This table complements produccion.production_routes which defines 
-- the sequence of work centers. This table adds detailed instructions per step.
CREATE TABLE IF NOT EXISTS product_production_process (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  process_steps JSONB, -- [{step_number, name, description, work_center_id, duration_minutes, temperature, instructions}]
  total_cycle_time_minutes INTEGER,
  theoretical_yield_percentage DECIMAL(5,2),
  labor_hours_per_batch DECIMAL(6,2),
  quality_checkpoints JSONB,
  process_diagrams TEXT[], -- URLs or paths to diagrams
  notes TEXT,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Costs and Financial Data
CREATE TABLE IF NOT EXISTS product_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  material_cost DECIMAL(12,2) DEFAULT 0,
  labor_cost DECIMAL(12,2) DEFAULT 0,
  overhead_cost DECIMAL(12,2) DEFAULT 0,
  packaging_cost DECIMAL(12,2) DEFAULT 0,
  total_production_cost DECIMAL(12,2) GENERATED ALWAYS AS (
    COALESCE(material_cost, 0) + 
    COALESCE(labor_cost, 0) + 
    COALESCE(overhead_cost, 0) + 
    COALESCE(packaging_cost, 0)
  ) STORED,
  base_selling_price DECIMAL(12,2),
  profit_margin_percentage DECIMAL(5,2),
  break_even_units INTEGER,
  cost_calculation_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Price Lists (multiple price lists per product)
CREATE TABLE IF NOT EXISTS product_price_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price_list_name TEXT NOT NULL, -- "Mayorista", "Minorista", "Especial", "Canal Moderno", etc
  price DECIMAL(12,2) NOT NULL,
  min_quantity INTEGER DEFAULT 1,
  max_quantity INTEGER,
  client_category TEXT, -- CAFE, HOTEL, UNIVERSIDAD, etc
  is_active BOOLEAN DEFAULT true,
  valid_from DATE,
  valid_until DATE,
  discount_percentage DECIMAL(5,2),
  currency TEXT DEFAULT 'COP',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Commercial Information
CREATE TABLE IF NOT EXISTS product_commercial_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  commercial_name TEXT,
  brand TEXT,
  marketing_description TEXT,
  target_market TEXT[],
  sales_channel TEXT[], -- ["retail", "wholesale", "ecommerce", "food_service"]
  seasonality TEXT, -- "all_year", "seasonal", "special_dates"
  promotional_tags TEXT[],
  competitor_products JSONB, -- [{name, brand, price, notes}]
  usp TEXT, -- Unique Selling Proposition
  sales_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Media (images, documents, videos)
CREATE TABLE IF NOT EXISTS product_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL, -- "image", "video", "document", "diagram"
  media_category TEXT, -- "product_photo", "packaging", "process", "certificate", "technical_sheet"
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size_kb INTEGER,
  thumbnail_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Inventory Configuration
CREATE TABLE IF NOT EXISTS product_inventory_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE UNIQUE,
  reorder_point INTEGER DEFAULT 0,
  safety_stock INTEGER DEFAULT 0,
  max_stock_level INTEGER,
  lead_time_days INTEGER DEFAULT 0,
  abc_classification TEXT, -- A, B, C for inventory management
  rotation_classification TEXT, -- fast, medium, slow
  storage_location TEXT,
  requires_cold_chain BOOLEAN DEFAULT false,
  is_perishable BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Completeness Tracking (calculated view)
CREATE OR REPLACE VIEW product_completeness AS
SELECT 
  p.id as product_id,
  p.name,
  p.category,
  -- Basic info completeness
  CASE 
    WHEN p.description IS NOT NULL 
      AND p.unit IS NOT NULL 
      AND p.price IS NOT NULL 
    THEN true ELSE false 
  END as basic_info_complete,
  
  -- Technical specs completeness
  EXISTS(SELECT 1 FROM product_technical_specs WHERE product_id = p.id) as has_technical_specs,
  
  -- Quality specs completeness
  EXISTS(SELECT 1 FROM product_quality_specs WHERE product_id = p.id) as has_quality_specs,
  
  -- Production process completeness
  EXISTS(
    SELECT 1 FROM product_production_process 
    WHERE product_id = p.id AND is_active = true
  ) as has_production_process,
  
  -- Bill of materials completeness (from existing produccion schema)
  EXISTS(
    SELECT 1 FROM produccion.bill_of_materials 
    WHERE product_id = p.id
  ) as has_bill_of_materials,
  
  -- Costs completeness
  EXISTS(SELECT 1 FROM product_costs WHERE product_id = p.id) as has_costs,
  
  -- Price lists completeness
  EXISTS(
    SELECT 1 FROM product_price_lists 
    WHERE product_id = p.id AND is_active = true
  ) as has_price_lists,
  
  -- Commercial info completeness
  EXISTS(SELECT 1 FROM product_commercial_info WHERE product_id = p.id) as has_commercial_info,
  
  -- Media completeness
  EXISTS(SELECT 1 FROM product_media WHERE product_id = p.id) as has_media,
  
  -- Inventory config completeness
  EXISTS(SELECT 1 FROM product_inventory_config WHERE product_id = p.id) as has_inventory_config,
  
  -- Overall completeness percentage
  (
    CASE WHEN p.description IS NOT NULL AND p.unit IS NOT NULL AND p.price IS NOT NULL THEN 11.11 ELSE 0 END +
    CASE WHEN EXISTS(SELECT 1 FROM product_technical_specs WHERE product_id = p.id) THEN 11.11 ELSE 0 END +
    CASE WHEN EXISTS(SELECT 1 FROM product_quality_specs WHERE product_id = p.id) THEN 11.11 ELSE 0 END +
    CASE WHEN EXISTS(SELECT 1 FROM product_production_process WHERE product_id = p.id AND is_active = true) THEN 11.11 ELSE 0 END +
    CASE WHEN EXISTS(SELECT 1 FROM produccion.bill_of_materials WHERE product_id = p.id) THEN 11.11 ELSE 0 END +
    CASE WHEN EXISTS(SELECT 1 FROM product_costs WHERE product_id = p.id) THEN 11.11 ELSE 0 END +
    CASE WHEN EXISTS(SELECT 1 FROM product_price_lists WHERE product_id = p.id AND is_active = true) THEN 11.11 ELSE 0 END +
    CASE WHEN EXISTS(SELECT 1 FROM product_commercial_info WHERE product_id = p.id) THEN 11.11 ELSE 0 END +
    CASE WHEN EXISTS(SELECT 1 FROM product_media WHERE product_id = p.id) THEN 11.11 ELSE 0 END
  ) as completeness_percentage
FROM products p;

-- Create indexes for performance
CREATE INDEX idx_product_technical_specs_product ON product_technical_specs(product_id);
CREATE INDEX idx_product_quality_specs_product ON product_quality_specs(product_id);
CREATE INDEX idx_product_production_process_product ON product_production_process(product_id);
CREATE INDEX idx_product_production_process_active ON product_production_process(product_id, is_active);
CREATE INDEX idx_product_costs_product ON product_costs(product_id);
CREATE INDEX idx_product_price_lists_product ON product_price_lists(product_id);
CREATE INDEX idx_product_price_lists_active ON product_price_lists(product_id, is_active);
CREATE INDEX idx_product_commercial_info_product ON product_commercial_info(product_id);
CREATE INDEX idx_product_media_product ON product_media(product_id);
CREATE INDEX idx_product_media_primary ON product_media(product_id, is_primary);
CREATE INDEX idx_product_inventory_config_product ON product_inventory_config(product_id);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_product_technical_specs_updated_at BEFORE UPDATE ON product_technical_specs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_quality_specs_updated_at BEFORE UPDATE ON product_quality_specs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_production_process_updated_at BEFORE UPDATE ON product_production_process
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_costs_updated_at BEFORE UPDATE ON product_costs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_price_lists_updated_at BEFORE UPDATE ON product_price_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_commercial_info_updated_at BEFORE UPDATE ON product_commercial_info
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_inventory_config_updated_at BEFORE UPDATE ON product_inventory_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (adjust as needed)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON product_completeness TO authenticated;
