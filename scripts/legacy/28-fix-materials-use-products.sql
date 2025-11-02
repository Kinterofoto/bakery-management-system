-- Corregir el módulo de producción para usar la tabla products existente
-- Eliminar tabla materials y actualizar bill_of_materials para usar products

-- =====================================================
-- 1. RESPALDAR DATOS EXISTENTES (por si hay información importante)
-- =====================================================

-- Crear tabla temporal para respaldar cualquier dato de materials
CREATE TABLE IF NOT EXISTS temp_materials_backup AS 
SELECT * FROM produccion.materials;

-- =====================================================
-- 2. ELIMINAR RESTRICCIONES Y TABLA MATERIALS
-- =====================================================

-- Eliminar restricciones de foreign key que referencian materials
ALTER TABLE produccion.bill_of_materials DROP CONSTRAINT IF EXISTS bill_of_materials_material_id_fkey;
ALTER TABLE produccion.material_consumptions DROP CONSTRAINT IF EXISTS material_consumptions_material_id_fkey;

-- Eliminar la tabla materials
DROP TABLE IF EXISTS produccion.materials CASCADE;

-- =====================================================  
-- 3. ACTUALIZAR BILL_OF_MATERIALS PARA USAR PRODUCTS
-- =====================================================

-- Agregar nueva columna que referencia products (materias primas)
ALTER TABLE produccion.bill_of_materials 
ADD COLUMN material_product_id UUID REFERENCES public.products(id);

-- Eliminar la columna antigua material_id
ALTER TABLE produccion.bill_of_materials 
DROP COLUMN IF EXISTS material_id;

-- Renombrar la nueva columna
ALTER TABLE produccion.bill_of_materials 
RENAME COLUMN material_product_id TO material_id;

-- =====================================================
-- 4. ACTUALIZAR MATERIAL_CONSUMPTIONS PARA USAR PRODUCTS  
-- =====================================================

-- Agregar nueva columna que referencia products (materias primas)
ALTER TABLE produccion.material_consumptions 
ADD COLUMN material_product_id UUID REFERENCES public.products(id);

-- Eliminar la columna antigua material_id
ALTER TABLE produccion.material_consumptions 
DROP COLUMN IF EXISTS material_id;

-- Renombrar la nueva columna
ALTER TABLE produccion.material_consumptions 
RENAME COLUMN material_product_id TO material_id;

-- =====================================================
-- 5. ACTUALIZAR FUNCIÓN SQL calculate_theoretical_consumption
-- =====================================================

CREATE OR REPLACE FUNCTION produccion.calculate_theoretical_consumption(
  p_product_id UUID,
  p_units_produced INTEGER
)
RETURNS TABLE(material_id UUID, material_name VARCHAR, theoretical_quantity DECIMAL, unit_name VARCHAR) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bom.material_id,
    p.name,  -- Ahora usar products.name en lugar de materials.name
    (bom.quantity_needed * p_units_produced) as theoretical_quantity,
    bom.unit_name
  FROM produccion.bill_of_materials bom
  JOIN public.products p ON p.id = bom.material_id  -- Join con products
  WHERE bom.product_id = p_product_id 
    AND bom.is_active = true
    AND p.category = 'MP';  -- Solo materias primas
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. CREAR DATOS DE EJEMPLO USANDO PRODUCTS EXISTENTES
-- =====================================================

-- Verificar qué productos MP (materias primas) existen
DO $$
DECLARE
    mp_count INTEGER;
    pt_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO mp_count FROM products WHERE category = 'MP';
    SELECT COUNT(*) INTO pt_count FROM products WHERE category = 'PT';
    
    RAISE NOTICE '=== PRODUCTOS DISPONIBLES ===';
    RAISE NOTICE 'Productos Terminados (PT): %', pt_count;
    RAISE NOTICE 'Materias Primas (MP): %', mp_count;
    
    IF mp_count = 0 THEN
        RAISE NOTICE '⚠️  No hay materias primas (MP) en la tabla products';
        RAISE NOTICE 'Será necesario agregar algunos productos con category = ''MP''';
    END IF;
END $$;

-- Insertar algunas materias primas de ejemplo si no existen
INSERT INTO products (name, description, unit, category, price) 
SELECT * FROM (VALUES
    ('Harina de Trigo', 'Harina refinada para panificación', 'kg', 'MP', 2500.00),
    ('Sal', 'Sal común para panificación', 'kg', 'MP', 1200.00),
    ('Azúcar', 'Azúcar refinada blanca', 'kg', 'MP', 3200.00),
    ('Levadura', 'Levadura fresca para pan', 'kg', 'MP', 8500.00),
    ('Mantequilla', 'Mantequilla sin sal', 'kg', 'MP', 12000.00),
    ('Huevos', 'Huevos frescos de gallina', 'kg', 'MP', 6500.00),
    ('Leche', 'Leche entera pasteurizada', 'litros', 'MP', 3800.00),
    ('Queso', 'Queso para rellenos', 'kg', 'MP', 15000.00)
) AS new_products(name, description, unit, category, price)
WHERE NOT EXISTS (
    SELECT 1 FROM products p 
    WHERE p.name = new_products.name AND p.category = 'MP'
);

-- =====================================================
-- 7. CREAR BILL OF MATERIALS PARA PALITO DE QUESO
-- =====================================================

-- Insertar BOM para Palito de queso usando products como materiales
INSERT INTO produccion.bill_of_materials (product_id, material_id, quantity_needed, unit_name, unit_equivalence_grams) 
SELECT 
    '00005197-0000-4000-8000-000051970000' as product_id,
    p.id as material_id,
    CASE 
        WHEN p.name = 'Harina de Trigo' THEN 35
        WHEN p.name = 'Queso' THEN 12  -- Ingrediente principal
        WHEN p.name = 'Mantequilla' THEN 8
        WHEN p.name = 'Huevos' THEN 6
        WHEN p.name = 'Leche' THEN 4
        WHEN p.name = 'Sal' THEN 1.5
    END as quantity_needed,
    'gramos' as unit_name,
    CASE 
        WHEN p.unit = 'kg' THEN 1000  -- 1 kg = 1000 gramos
        WHEN p.unit = 'litros' THEN 1000  -- 1 litro ≈ 1000 gramos
        ELSE 1
    END as unit_equivalence_grams
FROM products p
WHERE p.category = 'MP' 
AND p.name IN ('Harina de Trigo', 'Queso', 'Mantequilla', 'Huevos', 'Leche', 'Sal')
AND EXISTS (SELECT 1 FROM products WHERE id = '00005197-0000-4000-8000-000051970000');

-- =====================================================
-- 8. VERIFICACIÓN FINAL
-- =====================================================

DO $$
DECLARE
    bom_count INTEGER;
    mp_products INTEGER;
    pt_products INTEGER;
BEGIN
    -- Contar productos por categoría
    SELECT COUNT(*) INTO mp_products FROM products WHERE category = 'MP';
    SELECT COUNT(*) INTO pt_products FROM products WHERE category = 'PT';
    
    -- Contar BOM creados
    SELECT COUNT(*) INTO bom_count 
    FROM produccion.bill_of_materials 
    WHERE product_id = '00005197-0000-4000-8000-000051970000';
    
    RAISE NOTICE '=== CONFIGURACIÓN ACTUALIZADA ===';
    RAISE NOTICE '✅ Eliminada tabla produccion.materials';
    RAISE NOTICE '✅ bill_of_materials ahora usa products (MP)';
    RAISE NOTICE '✅ material_consumptions ahora usa products (MP)';
    RAISE NOTICE '✅ Función calculate_theoretical_consumption actualizada';
    RAISE NOTICE '';
    RAISE NOTICE '📊 RESUMEN DE PRODUCTOS:';
    RAISE NOTICE '• Productos Terminados (PT): %', pt_products;
    RAISE NOTICE '• Materias Primas (MP): %', mp_products;
    RAISE NOTICE '• BOM configurados para Palito de queso: %', bom_count;
    RAISE NOTICE '';
    RAISE NOTICE '🎯 PRÓXIMOS PASOS EN LA APLICACIÓN:';
    RAISE NOTICE '• Al crear producción: mostrar solo productos PT';
    RAISE NOTICE '• Al configurar BOM: mostrar solo productos MP';  
    RAISE NOTICE '• Análisis de materiales usando products.name';
    
END $$;

-- Limpiar tabla temporal de respaldo si todo salió bien
DROP TABLE IF EXISTS temp_materials_backup;