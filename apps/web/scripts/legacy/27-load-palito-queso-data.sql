-- Cargar datos de ejemplo específicos para "Palito de queso"
-- Producto ID: 00005197-0000-4000-8000-000051970000

-- Verificar que el producto existe
DO $$
DECLARE
    producto_existe BOOLEAN;
    material_count INTEGER;
    centro_count INTEGER;
BEGIN
    -- Verificar producto
    SELECT EXISTS(
        SELECT 1 FROM products 
        WHERE id = '00005197-0000-4000-8000-000051970000'
    ) INTO producto_existe;
    
    -- Verificar materiales
    SELECT COUNT(*) INTO material_count FROM produccion.materials;
    
    -- Verificar centros de trabajo
    SELECT COUNT(*) INTO centro_count FROM produccion.work_centers;
    
    RAISE NOTICE '=== VERIFICACIÓN INICIAL ===';
    RAISE NOTICE 'Producto Palito de queso existe: %', producto_existe;
    RAISE NOTICE 'Materiales disponibles: %', material_count;
    RAISE NOTICE 'Centros de trabajo disponibles: %', centro_count;
    
    IF NOT producto_existe THEN
        RAISE EXCEPTION 'El producto Palito de queso con ID 00005197-0000-4000-8000-000051970000 no existe';
    END IF;
    
    IF material_count = 0 THEN
        RAISE EXCEPTION 'No hay materiales disponibles. Ejecuta primero el script 24-create-production-tables.sql';
    END IF;
    
    IF centro_count = 0 THEN
        RAISE EXCEPTION 'No hay centros de trabajo disponibles. Ejecuta primero el script 24-create-production-tables.sql';
    END IF;
END $$;

-- =====================================================
-- BILL OF MATERIALS - Palito de queso (65g por unidad)
-- =====================================================

INSERT INTO produccion.bill_of_materials (product_id, material_id, quantity_needed, unit_name, unit_equivalence_grams) 
VALUES 
-- Harina de Trigo (base del palito)
('00005197-0000-4000-8000-000051970000', 
 (SELECT id FROM produccion.materials WHERE name = 'Harina de Trigo' LIMIT 1), 
 35, 'gramos', 1),

-- Sal (para sabor)
('00005197-0000-4000-8000-000051970000', 
 (SELECT id FROM produccion.materials WHERE name = 'Sal' LIMIT 1), 
 1.5, 'gramos', 1),

-- Mantequilla (para textura)
('00005197-0000-4000-8000-000051970000', 
 (SELECT id FROM produccion.materials WHERE name = 'Mantequilla' LIMIT 1), 
 8, 'gramos', 1),

-- Huevos (para unir y dar color)
('00005197-0000-4000-8000-000051970000', 
 (SELECT id FROM produccion.materials WHERE name = 'Huevos' LIMIT 1), 
 6, 'gramos', 1),

-- Leche (para la masa)
('00005197-0000-4000-8000-000051970000', 
 (SELECT id FROM produccion.materials WHERE name = 'Leche' LIMIT 1), 
 4, 'gramos', 1);

-- =====================================================
-- PRODUCTION ROUTES - Ruta para Palito de queso
-- =====================================================

-- Ruta: Amasado → Armado → Horneado → Empacado
INSERT INTO produccion.production_routes (product_id, work_center_id, sequence_order) 
VALUES 
-- Amasado (preparar la masa)
('00005197-0000-4000-8000-000051970000', 
 (SELECT id FROM produccion.work_centers WHERE code = 'AMAS001' LIMIT 1), 
 1),

-- Armado (formar los palitos)
('00005197-0000-4000-8000-000051970000', 
 (SELECT id FROM produccion.work_centers WHERE code = 'ARMA001' LIMIT 1), 
 2),

-- Horneado (cocinar)
('00005197-0000-4000-8000-000051970000', 
 (SELECT id FROM produccion.work_centers WHERE code = 'HORN001' LIMIT 1), 
 3),

-- Empacado (empacar en presentación de 15 unidades)
('00005197-0000-4000-8000-000051970000', 
 (SELECT id FROM produccion.work_centers WHERE code = 'EMPA001' LIMIT 1), 
 4);

-- =====================================================
-- PRODUCTION PRODUCTIVITY - Parámetros para Palito de queso
-- =====================================================

INSERT INTO produccion.production_productivity (product_id, work_center_id, units_per_hour) 
VALUES 
-- Amasado: preparar masa para muchos palitos
('00005197-0000-4000-8000-000051970000', 
 (SELECT id FROM produccion.work_centers WHERE code = 'AMAS001' LIMIT 1), 
 300),

-- Armado: formar palitos individuales (más lento)
('00005197-0000-4000-8000-000051970000', 
 (SELECT id FROM produccion.work_centers WHERE code = 'ARMA001' LIMIT 1), 
 240),

-- Horneado: limitante por capacidad del horno
('00005197-0000-4000-8000-000051970000', 
 (SELECT id FROM produccion.work_centers WHERE code = 'HORN001' LIMIT 1), 
 180),

-- Empacado: rápido, empaque en grupos de 15
('00005197-0000-4000-8000-000051970000', 
 (SELECT id FROM produccion.work_centers WHERE code = 'EMPA001' LIMIT 1), 
 450);

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

DO $$
DECLARE
    bom_count INTEGER;
    route_count INTEGER;
    productivity_count INTEGER;
BEGIN
    -- Contar datos insertados
    SELECT COUNT(*) INTO bom_count 
    FROM produccion.bill_of_materials 
    WHERE product_id = '00005197-0000-4000-8000-000051970000';
    
    SELECT COUNT(*) INTO route_count 
    FROM produccion.production_routes 
    WHERE product_id = '00005197-0000-4000-8000-000051970000';
    
    SELECT COUNT(*) INTO productivity_count 
    FROM produccion.production_productivity 
    WHERE product_id = '00005197-0000-4000-8000-000051970000';
    
    RAISE NOTICE '=== DATOS CARGADOS PARA PALITO DE QUESO ===';
    RAISE NOTICE 'Bill of Materials: % materiales configurados', bom_count;
    RAISE NOTICE 'Ruta de Producción: % centros de trabajo', route_count;
    RAISE NOTICE 'Parámetros Productividad: % configuraciones', productivity_count;
    RAISE NOTICE '';
    
    IF bom_count > 0 AND route_count > 0 AND productivity_count > 0 THEN
        RAISE NOTICE '✅ CONFIGURACIÓN COMPLETA PARA PALITO DE QUESO';
        RAISE NOTICE '';
        RAISE NOTICE '📋 RESUMEN:';
        RAISE NOTICE '• Materiales: Harina (35g), Mantequilla (8g), Huevos (6g), Leche (4g), Sal (1.5g)';
        RAISE NOTICE '• Ruta: Amasado → Armado → Horneado → Empacado';
        RAISE NOTICE '• Productividad: 300→240→180→450 unidades/hora (Horneado es limitante)';
        RAISE NOTICE '';
        RAISE NOTICE '🎯 PRUEBA EL MÓDULO:';
        RAISE NOTICE '1. Ve a /produccion en la aplicación';
        RAISE NOTICE '2. Inicia un turno en cualquier centro';
        RAISE NOTICE '3. Selecciona "Palito de queso" como producto';
        RAISE NOTICE '4. Registra unidades producidas para ver análisis teórico vs real';
    ELSE
        RAISE WARNING 'Algunos datos no se insertaron correctamente';
        RAISE WARNING 'BOM: %, Routes: %, Productivity: %', bom_count, route_count, productivity_count;
    END IF;
END $$;