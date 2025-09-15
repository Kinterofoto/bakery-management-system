-- Add Dual Billing System with Remisions (Alternative Version)
-- Script 35-alt: Sistema de facturación dual sin constraint de status

-- 1. Add billing_type column to clients table
DO $$
BEGIN
    -- Create enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_type_enum') THEN
        CREATE TYPE billing_type_enum AS ENUM ('facturable', 'remision');
    END IF;
END $$;

ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_type billing_type_enum DEFAULT 'facturable';

-- 2. Add requires_remision column to orders table (for per-order override)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS requires_remision BOOLEAN DEFAULT FALSE;

-- 3. NOTE: Skip status constraint update to avoid conflicts
-- The application will handle 'remisionado' status validation
RAISE NOTICE 'Skipping status constraint update - application will handle remisionado status';

-- 4. Create remisions table
CREATE TABLE IF NOT EXISTS remisions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    remision_number VARCHAR(50) UNIQUE NOT NULL,
    client_data JSONB NOT NULL, -- Store client data snapshot at time of remision
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    pdf_path VARCHAR(500), -- Path to generated PDF file
    pdf_data BYTEA, -- Store PDF data for re-download
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Ensure one remision per order
    UNIQUE(order_id)
);

-- 5. Create remision_items table
CREATE TABLE IF NOT EXISTS remision_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    remision_id UUID REFERENCES remisions(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL, -- Store product name snapshot
    quantity_delivered DECIMAL(10,3) NOT NULL DEFAULT 0, -- Use quantity_available for remision
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    product_unit VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Add is_invoiced_from_remision flag to orders for tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_invoiced_from_remision BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS remision_invoiced_at TIMESTAMP;

-- 7. Create system config entries for remision numbering
INSERT INTO system_config (config_key, config_value, description)
VALUES
    ('remision_number_start', '1', 'Número inicial para consecutivo de remisiones')
ON CONFLICT (config_key) DO NOTHING;

INSERT INTO system_config (config_key, config_value, description)
VALUES
    ('remision_number_current', '1', 'Número actual del consecutivo de remisiones')
ON CONFLICT (config_key) DO NOTHING;

-- Continue with the rest of the script...
-- (Copy remaining content from main script starting from section 8)

RAISE NOTICE 'Alternative script executed successfully - status constraint skipped';