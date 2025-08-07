-- Inventarios CountPro Module Tables

-- Tabla de inventarios (sesiones de conteo)
CREATE TABLE IF NOT EXISTS inventories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'cancelled')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Tabla de conteos (permite múltiples conteos por inventario para verificación)
CREATE TABLE IF NOT EXISTS inventory_counts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    inventory_id UUID REFERENCES inventories(id) ON DELETE CASCADE,
    count_number INTEGER NOT NULL DEFAULT 1, -- 1 = primer conteo, 2 = segundo conteo, etc.
    status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(inventory_id, count_number)
);

-- Tabla de ítems de conteo (productos contados en cada sesión)
CREATE TABLE IF NOT EXISTS inventory_count_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    inventory_count_id UUID REFERENCES inventory_counts(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity_units INTEGER NOT NULL DEFAULT 0, -- cantidad de bultos/unidades
    grams_per_unit DECIMAL(15,3) NOT NULL DEFAULT 1, -- gramos por bulto
    total_grams DECIMAL(15,3) GENERATED ALWAYS AS (quantity_units * grams_per_unit) STORED,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(inventory_count_id, product_id)
);

-- Tabla de conciliación entre conteos (para resolver diferencias)
CREATE TABLE IF NOT EXISTS inventory_reconciliations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    inventory_id UUID REFERENCES inventories(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    count1_quantity INTEGER,
    count1_grams_per_unit DECIMAL(15,3),
    count1_total_grams DECIMAL(15,3),
    count2_quantity INTEGER,
    count2_grams_per_unit DECIMAL(15,3),
    count2_total_grams DECIMAL(15,3),
    final_quantity INTEGER NOT NULL,
    final_grams_per_unit DECIMAL(15,3) NOT NULL,
    final_total_grams DECIMAL(15,3) GENERATED ALWAYS AS (final_quantity * final_grams_per_unit) STORED,
    variance_percentage DECIMAL(5,2),
    resolution_method VARCHAR(50) DEFAULT 'manual' CHECK (resolution_method IN ('accept_count1', 'accept_count2', 'manual', 'third_count')),
    notes TEXT,
    resolved_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de resultados finales del inventario (después de conciliación)
CREATE TABLE IF NOT EXISTS inventory_final_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    inventory_id UUID REFERENCES inventories(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    final_quantity INTEGER NOT NULL,
    final_grams_per_unit DECIMAL(15,3) NOT NULL,
    final_total_grams DECIMAL(15,3) GENERATED ALWAYS AS (final_quantity * final_grams_per_unit) STORED,
    final_value DECIMAL(15,2),
    variance_from_count1_percentage DECIMAL(5,2),
    variance_from_count2_percentage DECIMAL(5,2),
    resolution_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(inventory_id, product_id)
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_inventories_status ON inventories(status);
CREATE INDEX IF NOT EXISTS idx_inventories_created_by ON inventories(created_by);
CREATE INDEX IF NOT EXISTS idx_inventory_counts_inventory_id ON inventory_counts(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_count_items_count_id ON inventory_count_items(inventory_count_id);
CREATE INDEX IF NOT EXISTS idx_inventory_count_items_product_id ON inventory_count_items(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reconciliations_inventory_id ON inventory_reconciliations(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_final_results_inventory_id ON inventory_final_results(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_final_results_product_id ON inventory_final_results(product_id);

-- Triggers para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_inventories_updated_at BEFORE UPDATE ON inventories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_count_items_updated_at BEFORE UPDATE ON inventory_count_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para calcular variación porcentual entre conteos
CREATE OR REPLACE FUNCTION calculate_inventory_variance(
    count1_total DECIMAL,
    count2_total DECIMAL
)
RETURNS DECIMAL AS $$
BEGIN
    IF count1_total = 0 AND count2_total = 0 THEN
        RETURN 0;
    END IF;
    
    IF count1_total = 0 THEN
        RETURN 100;
    END IF;
    
    RETURN ABS(((count2_total - count1_total) / count1_total) * 100);
END;
$$ LANGUAGE plpgsql;

-- Función para obtener resumen de inventario
CREATE OR REPLACE FUNCTION get_inventory_summary(inventory_uuid UUID)
RETURNS TABLE (
    inventory_id UUID,
    inventory_name VARCHAR,
    total_products BIGINT,
    total_items_count1 BIGINT,
    total_grams_count1 DECIMAL,
    total_items_count2 BIGINT,
    total_grams_count2 DECIMAL,
    variance_percentage DECIMAL,
    status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id as inventory_id,
        i.name as inventory_name,
        COUNT(DISTINCT COALESCE(ici1.product_id, ici2.product_id)) as total_products,
        COALESCE(SUM(ici1.quantity_units), 0) as total_items_count1,
        COALESCE(SUM(ici1.total_grams), 0) as total_grams_count1,
        COALESCE(SUM(ici2.quantity_units), 0) as total_items_count2,
        COALESCE(SUM(ici2.total_grams), 0) as total_grams_count2,
        CASE 
            WHEN COALESCE(SUM(ici1.total_grams), 0) = 0 AND COALESCE(SUM(ici2.total_grams), 0) = 0 THEN 0
            WHEN COALESCE(SUM(ici1.total_grams), 0) = 0 THEN 100
            ELSE ABS(((COALESCE(SUM(ici2.total_grams), 0) - COALESCE(SUM(ici1.total_grams), 0)) / COALESCE(SUM(ici1.total_grams), 1)) * 100)
        END as variance_percentage,
        i.status
    FROM inventories i
    LEFT JOIN inventory_counts ic1 ON i.id = ic1.inventory_id AND ic1.count_number = 1
    LEFT JOIN inventory_counts ic2 ON i.id = ic2.inventory_id AND ic2.count_number = 2
    LEFT JOIN inventory_count_items ici1 ON ic1.id = ici1.inventory_count_id
    LEFT JOIN inventory_count_items ici2 ON ic2.id = ici2.inventory_count_id
    WHERE i.id = inventory_uuid
    GROUP BY i.id, i.name, i.status;
END;
$$ LANGUAGE plpgsql;