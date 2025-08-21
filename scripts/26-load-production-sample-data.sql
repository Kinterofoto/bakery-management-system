-- Cargar datos de ejemplo para completar el módulo de producción
-- Este script debe ejecutarse después de 24-create-production-tables.sql

-- Obtener IDs de productos y materiales para las relaciones
DO $$
DECLARE
    -- Variables para productos
    pan_integral_id UUID;
    pan_blanco_id UUID;
    croissant_id UUID;
    pan_hamburguesa_id UUID;
    pan_dulce_id UUID;
    baguette_id UUID;
    
    -- Variables para materiales
    harina_id UUID;
    azucar_id UUID;
    sal_id UUID;
    levadura_id UUID;
    mantequilla_id UUID;
    huevos_id UUID;
    leche_id UUID;
    pollo_id UUID;
    
    -- Variables para centros de trabajo
    amasado_id UUID;
    armado_id UUID;
    horneado_id UUID;
    decorado_id UUID;
    empacado_id UUID;
BEGIN
    -- Obtener IDs de productos
    SELECT id INTO pan_integral_id FROM products WHERE name = 'Pan Integral';
    SELECT id INTO pan_blanco_id FROM products WHERE name = 'Pan Blanco';
    SELECT id INTO croissant_id FROM products WHERE name = 'Croissant';
    SELECT id INTO pan_hamburguesa_id FROM products WHERE name = 'Pan de Hamburguesa';
    SELECT id INTO pan_dulce_id FROM products WHERE name = 'Pan Dulce';
    SELECT id INTO baguette_id FROM products WHERE name = 'Baguette';
    
    -- Obtener IDs de materiales
    SELECT id INTO harina_id FROM produccion.materials WHERE name = 'Harina de Trigo';
    SELECT id INTO azucar_id FROM produccion.materials WHERE name = 'Azúcar';
    SELECT id INTO sal_id FROM produccion.materials WHERE name = 'Sal';
    SELECT id INTO levadura_id FROM produccion.materials WHERE name = 'Levadura';
    SELECT id INTO mantequilla_id FROM produccion.materials WHERE name = 'Mantequilla';
    SELECT id INTO huevos_id FROM produccion.materials WHERE name = 'Huevos';
    SELECT id INTO leche_id FROM produccion.materials WHERE name = 'Leche';
    SELECT id INTO pollo_id FROM produccion.materials WHERE name = 'Pollo';
    
    -- Obtener IDs de centros de trabajo
    SELECT id INTO amasado_id FROM produccion.work_centers WHERE code = 'AMAS001';
    SELECT id INTO armado_id FROM produccion.work_centers WHERE code = 'ARMA001';
    SELECT id INTO horneado_id FROM produccion.work_centers WHERE code = 'HORN001';
    SELECT id INTO decorado_id FROM produccion.work_centers WHERE code = 'DECO001';
    SELECT id INTO empacado_id FROM produccion.work_centers WHERE code = 'EMPA001';

    -- =====================================================
    -- BILL OF MATERIALS - Lista de materiales por producto
    -- =====================================================
    
    RAISE NOTICE 'Insertando Bill of Materials...';
    
    -- Pan Integral (500g)
    IF pan_integral_id IS NOT NULL AND harina_id IS NOT NULL THEN
        INSERT INTO produccion.bill_of_materials (product_id, material_id, quantity_needed, unit_name, unit_equivalence_grams) VALUES
        (pan_integral_id, harina_id, 320, 'gramos', 1),           -- 320g harina
        (pan_integral_id, sal_id, 8, 'gramos', 1),               -- 8g sal
        (pan_integral_id, levadura_id, 6, 'gramos', 1),          -- 6g levadura
        (pan_integral_id, azucar_id, 12, 'gramos', 1);           -- 12g azúcar
    END IF;
    
    -- Pan Blanco (400g)
    IF pan_blanco_id IS NOT NULL AND harina_id IS NOT NULL THEN
        INSERT INTO produccion.bill_of_materials (product_id, material_id, quantity_needed, unit_name, unit_equivalence_grams) VALUES
        (pan_blanco_id, harina_id, 280, 'gramos', 1),            -- 280g harina
        (pan_blanco_id, sal_id, 6, 'gramos', 1),                 -- 6g sal
        (pan_blanco_id, levadura_id, 5, 'gramos', 1),            -- 5g levadura
        (pan_blanco_id, azucar_id, 15, 'gramos', 1),             -- 15g azúcar
        (pan_blanco_id, mantequilla_id, 20, 'gramos', 1);        -- 20g mantequilla
    END IF;
    
    -- Croissant (unidad ~80g)
    IF croissant_id IS NOT NULL AND harina_id IS NOT NULL THEN
        INSERT INTO produccion.bill_of_materials (product_id, material_id, quantity_needed, unit_name, unit_equivalence_grams) VALUES
        (croissant_id, harina_id, 45, 'gramos', 1),              -- 45g harina
        (croissant_id, mantequilla_id, 15, 'gramos', 1),         -- 15g mantequilla
        (croissant_id, sal_id, 1, 'gramos', 1),                  -- 1g sal
        (croissant_id, levadura_id, 2, 'gramos', 1),             -- 2g levadura
        (croissant_id, huevos_id, 8, 'gramos', 1);               -- 8g huevo
    END IF;
    
    -- Pan de Hamburguesa (unidad ~60g)
    IF pan_hamburguesa_id IS NOT NULL AND harina_id IS NOT NULL THEN
        INSERT INTO produccion.bill_of_materials (product_id, material_id, quantity_needed, unit_name, unit_equivalence_grams) VALUES
        (pan_hamburguesa_id, harina_id, 42, 'gramos', 1),        -- 42g harina
        (pan_hamburguesa_id, sal_id, 1, 'gramos', 1),            -- 1g sal
        (pan_hamburguesa_id, levadura_id, 2, 'gramos', 1),       -- 2g levadura
        (pan_hamburguesa_id, azucar_id, 3, 'gramos', 1),         -- 3g azúcar
        (pan_hamburguesa_id, huevos_id, 5, 'gramos', 1);         -- 5g huevo
    END IF;
    
    -- Pan Dulce con pasas
    IF pan_dulce_id IS NOT NULL AND harina_id IS NOT NULL THEN
        INSERT INTO produccion.bill_of_materials (product_id, material_id, quantity_needed, unit_name, unit_equivalence_grams) VALUES
        (pan_dulce_id, harina_id, 65, 'gramos', 1),              -- 65g harina
        (pan_dulce_id, azucar_id, 18, 'gramos', 1),              -- 18g azúcar
        (pan_dulce_id, mantequilla_id, 12, 'gramos', 1),         -- 12g mantequilla
        (pan_dulce_id, huevos_id, 10, 'gramos', 1),              -- 10g huevo
        (pan_dulce_id, leche_id, 15, 'gramos', 1),               -- 15g leche
        (pan_dulce_id, levadura_id, 3, 'gramos', 1);             -- 3g levadura
    END IF;
    
    -- Baguette Francesa
    IF baguette_id IS NOT NULL AND harina_id IS NOT NULL THEN
        INSERT INTO produccion.bill_of_materials (product_id, material_id, quantity_needed, unit_name, unit_equivalence_grams) VALUES
        (baguette_id, harina_id, 85, 'gramos', 1),               -- 85g harina
        (baguette_id, sal_id, 2, 'gramos', 1),                   -- 2g sal
        (baguette_id, levadura_id, 3, 'gramos', 1);              -- 3g levadura
    END IF;
    
    -- =====================================================
    -- PRODUCTION ROUTES - Rutas de producción por producto
    -- =====================================================
    
    RAISE NOTICE 'Insertando rutas de producción...';
    
    -- Ruta para Pan Integral: Amasado → Armado → Horneado → Empacado
    IF pan_integral_id IS NOT NULL AND amasado_id IS NOT NULL THEN
        INSERT INTO produccion.production_routes (product_id, work_center_id, sequence_order) VALUES
        (pan_integral_id, amasado_id, 1),
        (pan_integral_id, armado_id, 2),
        (pan_integral_id, horneado_id, 3),
        (pan_integral_id, empacado_id, 4);
    END IF;
    
    -- Ruta para Pan Blanco: Amasado → Armado → Horneado → Empacado
    IF pan_blanco_id IS NOT NULL AND amasado_id IS NOT NULL THEN
        INSERT INTO produccion.production_routes (product_id, work_center_id, sequence_order) VALUES
        (pan_blanco_id, amasado_id, 1),
        (pan_blanco_id, armado_id, 2),
        (pan_blanco_id, horneado_id, 3),
        (pan_blanco_id, empacado_id, 4);
    END IF;
    
    -- Ruta para Croissant: Amasado → Armado → Horneado → Decorado → Empacado
    IF croissant_id IS NOT NULL AND amasado_id IS NOT NULL THEN
        INSERT INTO produccion.production_routes (product_id, work_center_id, sequence_order) VALUES
        (croissant_id, amasado_id, 1),
        (croissant_id, armado_id, 2),
        (croissant_id, horneado_id, 3),
        (croissant_id, decorado_id, 4),
        (croissant_id, empacado_id, 5);
    END IF;
    
    -- Ruta para Pan de Hamburguesa: Amasado → Armado → Horneado → Empacado
    IF pan_hamburguesa_id IS NOT NULL AND amasado_id IS NOT NULL THEN
        INSERT INTO produccion.production_routes (product_id, work_center_id, sequence_order) VALUES
        (pan_hamburguesa_id, amasado_id, 1),
        (pan_hamburguesa_id, armado_id, 2),
        (pan_hamburguesa_id, horneado_id, 3),
        (pan_hamburguesa_id, empacado_id, 4);
    END IF;
    
    -- Ruta para Pan Dulce: Amasado → Armado → Horneado → Decorado → Empacado
    IF pan_dulce_id IS NOT NULL AND amasado_id IS NOT NULL THEN
        INSERT INTO produccion.production_routes (product_id, work_center_id, sequence_order) VALUES
        (pan_dulce_id, amasado_id, 1),
        (pan_dulce_id, armado_id, 2),
        (pan_dulce_id, horneado_id, 3),
        (pan_dulce_id, decorado_id, 4),
        (pan_dulce_id, empacado_id, 5);
    END IF;
    
    -- Ruta para Baguette: Amasado → Armado → Horneado → Empacado
    IF baguette_id IS NOT NULL AND amasado_id IS NOT NULL THEN
        INSERT INTO produccion.production_routes (product_id, work_center_id, sequence_order) VALUES
        (baguette_id, amasado_id, 1),
        (baguette_id, armado_id, 2),
        (baguette_id, horneado_id, 3),
        (baguette_id, empacado_id, 4);
    END IF;
    
    -- =====================================================
    -- PRODUCTION PRODUCTIVITY - Parámetros de productividad
    -- =====================================================
    
    RAISE NOTICE 'Insertando parámetros de productividad...';
    
    -- Productividad para Pan Integral
    IF pan_integral_id IS NOT NULL AND amasado_id IS NOT NULL THEN
        INSERT INTO produccion.production_productivity (product_id, work_center_id, units_per_hour) VALUES
        (pan_integral_id, amasado_id, 150),      -- 150 panes/hora en amasado
        (pan_integral_id, armado_id, 180),       -- 180 panes/hora en armado
        (pan_integral_id, horneado_id, 120),     -- 120 panes/hora en horneado (limitante)
        (pan_integral_id, empacado_id, 200);     -- 200 panes/hora en empacado
    END IF;
    
    -- Productividad para Pan Blanco
    IF pan_blanco_id IS NOT NULL AND amasado_id IS NOT NULL THEN
        INSERT INTO produccion.production_productivity (product_id, work_center_id, units_per_hour) VALUES
        (pan_blanco_id, amasado_id, 160),        -- 160 panes/hora en amasado
        (pan_blanco_id, armado_id, 200),         -- 200 panes/hora en armado
        (pan_blanco_id, horneado_id, 130),       -- 130 panes/hora en horneado (limitante)
        (pan_blanco_id, empacado_id, 220);       -- 220 panes/hora en empacado
    END IF;
    
    -- Productividad para Croissant
    IF croissant_id IS NOT NULL AND amasado_id IS NOT NULL THEN
        INSERT INTO produccion.production_productivity (product_id, work_center_id, units_per_hour) VALUES
        (croissant_id, amasado_id, 80),          -- 80 croissants/hora en amasado
        (croissant_id, armado_id, 90),           -- 90 croissants/hora en armado (formado)
        (croissant_id, horneado_id, 60),         -- 60 croissants/hora en horneado (limitante)
        (croissant_id, decorado_id, 100),        -- 100 croissants/hora en decorado
        (croissant_id, empacado_id, 120);        -- 120 croissants/hora en empacado
    END IF;
    
    -- Productividad para Pan de Hamburguesa
    IF pan_hamburguesa_id IS NOT NULL AND amasado_id IS NOT NULL THEN
        INSERT INTO produccion.production_productivity (product_id, work_center_id, units_per_hour) VALUES
        (pan_hamburguesa_id, amasado_id, 200),   -- 200 panes/hora en amasado
        (pan_hamburguesa_id, armado_id, 250),    -- 250 panes/hora en armado
        (pan_hamburguesa_id, horneado_id, 180),  -- 180 panes/hora en horneado
        (pan_hamburguesa_id, empacado_id, 300);  -- 300 panes/hora en empacado
    END IF;
    
    -- Productividad para Pan Dulce
    IF pan_dulce_id IS NOT NULL AND amasado_id IS NOT NULL THEN
        INSERT INTO produccion.production_productivity (product_id, work_center_id, units_per_hour) VALUES
        (pan_dulce_id, amasado_id, 100),         -- 100 panes/hora en amasado
        (pan_dulce_id, armado_id, 120),          -- 120 panes/hora en armado
        (pan_dulce_id, horneado_id, 80),         -- 80 panes/hora en horneado (limitante)
        (pan_dulce_id, decorado_id, 90),         -- 90 panes/hora en decorado
        (pan_dulce_id, empacado_id, 140);        -- 140 panes/hora en empacado
    END IF;
    
    -- Productividad para Baguette
    IF baguette_id IS NOT NULL AND amasado_id IS NOT NULL THEN
        INSERT INTO produccion.production_productivity (product_id, work_center_id, units_per_hour) VALUES
        (baguette_id, amasado_id, 120),          -- 120 baguettes/hora en amasado
        (baguette_id, armado_id, 140),           -- 140 baguettes/hora en armado
        (baguette_id, horneado_id, 100),         -- 100 baguettes/hora en horneado (limitante)
        (baguette_id, empacado_id, 160);         -- 160 baguettes/hora en empacado
    END IF;
    
    RAISE NOTICE 'Datos de ejemplo cargados exitosamente!';
    RAISE NOTICE '=== RESUMEN DE DATOS CARGADOS ===';
    RAISE NOTICE 'Bill of Materials: % productos configurados', (SELECT COUNT(DISTINCT product_id) FROM produccion.bill_of_materials);
    RAISE NOTICE 'Rutas de Producción: % productos con rutas', (SELECT COUNT(DISTINCT product_id) FROM produccion.production_routes);
    RAISE NOTICE 'Parámetros Productividad: % combinaciones producto-centro', (SELECT COUNT(*) FROM produccion.production_productivity);
    RAISE NOTICE '';
    RAISE NOTICE '🎯 PRODUCTOS CON DATOS COMPLETOS:';
    RAISE NOTICE '• Pan Integral (4 materiales, 4 centros, productividad configurada)';
    RAISE NOTICE '• Pan Blanco (5 materiales, 4 centros, productividad configurada)';
    RAISE NOTICE '• Croissant (5 materiales, 5 centros, productividad configurada)';
    RAISE NOTICE '• Pan de Hamburguesa (5 materiales, 4 centros, productividad configurada)';
    RAISE NOTICE '• Pan Dulce (6 materiales, 5 centros, productividad configurada)';
    RAISE NOTICE '• Baguette (3 materiales, 4 centros, productividad configurada)';
    RAISE NOTICE '';
    RAISE NOTICE '✅ El módulo de producción está listo para usar!';
    RAISE NOTICE '📋 Prueba iniciando un turno en cualquier centro de trabajo.';

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error cargando datos de ejemplo: %', SQLERRM;
END $$;