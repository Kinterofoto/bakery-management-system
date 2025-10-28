-- Add subcategory column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- Update products with their corresponding subcategories

-- Croissants (including bicolors, jamón y queso, and crookie)
UPDATE products SET subcategory = 'Croissants' 
WHERE (name LIKE '%Croissant%' OR name LIKE '%CROISSANT%' OR name LIKE '%Crookie%') 
AND category = 'PT';

-- Hojaldres de dulce
UPDATE products SET subcategory = 'Hojaldres de dulce' 
WHERE (
  name LIKE '%Flauta de chocolate%' OR
  name LIKE '%Palito de bocadillo%' OR
  name LIKE '%Pan de chocolate%' OR
  name LIKE '%Pastel de arequipe%' OR
  name LIKE '%Pastel De Bocadillo%' OR
  name LIKE '%Pastel de manzana%' OR
  name LIKE '%Cinnamon roll%' OR
  name LIKE '%Rollo%canela%' OR
  name LIKE '%Pastel gloria%' OR
  name LIKE '%Palito de queso philadephia%'
) AND category = 'PT';

-- Hojaldres de sal
UPDATE products SET subcategory = 'Hojaldres de sal' 
WHERE (
  name LIKE '%Palito queso crema%' OR
  name LIKE '%Palito de queso crema%' OR
  name LIKE '%Pastel de carne%' OR
  name LIKE '%Pastel de espinaca%' OR
  name LIKE '%Pastel de Pollo%' OR
  name LIKE '%Pastel de pollo%' OR
  name LIKE '%Pañuelo%' OR
  name LIKE '%Palito de queso  65g%'
) 
AND name NOT LIKE '%Palito de queso philadephia%'
AND category = 'PT';

-- Panadería mini
UPDATE products SET subcategory = 'Panadería mini' 
WHERE (
  name IN (
    'Buñuelo', 'Pan de yuca', 'Pan de bono', 'Almojábana', 'Roscón de bocadillo',
    'Peras', 'Pan blando', 'Trenza', 'Costeñito', 'Mogolla integral', 'Pan de coco',
    'Calentano', 'Mojicón', 'Cucas', 'Mini roscon de arequipe'
  )
) AND category = 'PT';

-- Láminas
UPDATE products SET subcategory = 'Láminas' 
WHERE name LIKE '%Láminas de hojaldre%' 
AND category = 'PT';

-- Set NULL for empanadas, arepas, kibhes and test products (excluded from categories)
UPDATE products SET subcategory = NULL 
WHERE (
  UPPER(name) LIKE '%EMPANADA%' OR 
  UPPER(name) LIKE '%AREPA%' OR 
  UPPER(name) LIKE '%KIBBEH%' OR
  UPPER(name) LIKE '%KIBHEH%' OR
  UPPER(name) LIKE 'PASTEL MAIZ CARNE%' OR
  UPPER(name) LIKE 'TEST%' OR
  UPPER(name) LIKE 'NAPOLITANA%'
) AND category = 'PT';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_products_subcategory ON products(subcategory);
