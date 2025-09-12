-- Add World Office export functionality
-- Script 30: Add fields and tables for World Office XLSX export

-- 1. Add purchase_order_number to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS purchase_order_number VARCHAR(100);

-- 2. Add World Office equivalence fields to products table  
ALTER TABLE products ADD COLUMN IF NOT EXISTS nombre_wo VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS codigo_wo VARCHAR(100);

-- 3. Create system_config table for global configuration
CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default system configuration
INSERT INTO system_config (config_key, config_value, description) 
VALUES 
    ('invoice_last_number', '63629', 'Último número de factura generado en World Office'),
    ('wo_company_name', 'PASTRY CHEF PASTELERIA Y COCINA GOURMET SAS', 'Nombre de la empresa para World Office'),
    ('wo_third_party_internal', '52197741', 'Tercero interno para World Office'),
    ('wo_third_party_external', '900236520', 'Tercero externo para World Office'),
    ('wo_document_type', 'FV', 'Tipo de documento para World Office'),
    ('wo_document_prefix', 'FE', 'Prefijo del documento para World Office'),
    ('wo_payment_method', 'Credito', 'Forma de pago para World Office'),
    ('wo_warehouse', 'PRINCIPAL', 'Bodega para World Office'),
    ('wo_unit_measure', 'Und.', 'Unidad de medida para World Office'),
    ('wo_iva_rate', '0.19', 'Tasa de IVA para World Office')
ON CONFLICT (config_key) DO NOTHING;

-- 4. Create client_credit_terms table
CREATE TABLE IF NOT EXISTS client_credit_terms (
    id SERIAL PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    credit_days INTEGER DEFAULT 30 CHECK (credit_days >= 0),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(client_id, branch_id)
);

-- 5. Create client_price_lists table for specific client pricing
CREATE TABLE IF NOT EXISTS client_price_lists (
    id SERIAL PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(product_id, client_id)
);

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(config_key);
CREATE INDEX IF NOT EXISTS idx_client_credit_terms_client ON client_credit_terms(client_id);
CREATE INDEX IF NOT EXISTS idx_client_credit_terms_branch ON client_credit_terms(branch_id);
CREATE INDEX IF NOT EXISTS idx_client_price_lists_product ON client_price_lists(product_id);
CREATE INDEX IF NOT EXISTS idx_client_price_lists_client ON client_price_lists(client_id);
CREATE INDEX IF NOT EXISTS idx_products_codigo_wo ON products(codigo_wo);

-- 7. Add comments to document the purpose
COMMENT ON TABLE system_config IS 'Global system configuration for World Office integration';
COMMENT ON TABLE client_credit_terms IS 'Credit terms (days) per client/branch for invoice due dates';
COMMENT ON TABLE client_price_lists IS 'Specific pricing per product per client';
COMMENT ON COLUMN orders.purchase_order_number IS 'Client purchase order number for World Office export';
COMMENT ON COLUMN products.nombre_wo IS 'Product name equivalence for World Office';
COMMENT ON COLUMN products.codigo_wo IS 'Product code equivalence for World Office';

-- Print completion message
DO $$
BEGIN
    RAISE NOTICE 'World Office export tables and fields created successfully';
    RAISE NOTICE '• Added purchase_order_number to orders';
    RAISE NOTICE '• Added nombre_wo and codigo_wo to products';
    RAISE NOTICE '• Created system_config table with default values';
    RAISE NOTICE '• Created client_credit_terms table';
    RAISE NOTICE '• Created client_price_lists table';
    RAISE NOTICE '• Created indexes for better performance';
END $$;