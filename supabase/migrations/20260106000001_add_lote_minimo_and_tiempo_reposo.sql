-- Agregar lote_minimo a la tabla products
-- Este campo define el lote mínimo de producción para productos PT y PP
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS lote_minimo NUMERIC(12, 3) NULL;

COMMENT ON COLUMN public.products.lote_minimo IS 'Lote mínimo de producción para este producto (aplica para PT y PP)';

-- Agregar tiempo_reposo_horas a bill_of_materials
-- Este campo se usa cuando un PP es material de otro producto
ALTER TABLE produccion.bill_of_materials
ADD COLUMN IF NOT EXISTS tiempo_reposo_horas NUMERIC(8, 2) NULL;

COMMENT ON COLUMN produccion.bill_of_materials.tiempo_reposo_horas IS 'Tiempo de reposo en horas cuando el material es un PP (Producto en Proceso)';

-- Crear índice para mejorar consultas por productos con lote mínimo
CREATE INDEX IF NOT EXISTS idx_products_lote_minimo ON public.products(lote_minimo) WHERE lote_minimo IS NOT NULL;
