-- Add supplier_commercial_name to material_suppliers table
-- This allows each supplier to specify their own commercial name for the material

ALTER TABLE compras.material_suppliers
ADD COLUMN IF NOT EXISTS supplier_commercial_name VARCHAR(255);

COMMENT ON COLUMN compras.material_suppliers.supplier_commercial_name IS 'Commercial name that the supplier uses for this material. Can differ from the official product name.';

-- Example: Product name is "Harina de Trigo", but:
-- - Supplier A calls it "Harina Panadera"
-- - Supplier B calls it "Harina tipo 000"
