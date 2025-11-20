-- Create operations table
CREATE TABLE IF NOT EXISTS produccion.operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create product_work_center_mapping table
CREATE TABLE IF NOT EXISTS produccion.product_work_center_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  operation_id UUID NOT NULL REFERENCES produccion.operations(id) ON DELETE CASCADE,
  work_center_id UUID NOT NULL REFERENCES produccion.work_centers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(product_id, operation_id)
);

-- Create indexes
CREATE INDEX idx_product_work_center_mapping_product_id ON produccion.product_work_center_mapping(product_id);
CREATE INDEX idx_product_work_center_mapping_operation_id ON produccion.product_work_center_mapping(operation_id);
CREATE INDEX idx_product_work_center_mapping_work_center_id ON produccion.product_work_center_mapping(work_center_id);

-- Enable RLS
ALTER TABLE produccion.operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE produccion.product_work_center_mapping ENABLE ROW LEVEL SECURITY;

-- Create policies for operations
CREATE POLICY "Allow authenticated users to select operations"
  ON produccion.operations FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admin to insert/update/delete operations"
  ON produccion.operations FOR ALL
  USING (auth.role() = 'authenticated');

-- Create policies for product_work_center_mapping
CREATE POLICY "Allow authenticated users to select product_work_center_mapping"
  ON produccion.product_work_center_mapping FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admin to insert/update/delete product_work_center_mapping"
  ON produccion.product_work_center_mapping FOR ALL
  USING (auth.role() = 'authenticated');
