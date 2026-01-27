-- Migration: Add rest time to production_routes for backward cascade
-- This field stores the rest time AFTER an operation completes (e.g., fermentation time)

ALTER TABLE produccion.production_routes
ADD COLUMN tiempo_reposo_horas NUMERIC(8,2) NULL DEFAULT 0;

COMMENT ON COLUMN produccion.production_routes.tiempo_reposo_horas IS
'Rest time in hours AFTER this operation completes (e.g., fermentation time). Used in backward cascade calculations.';

-- Optional: Migrate existing rest times from BOM to production_routes
-- This migrates rest times where applicable, but keeps BOM rest times for PP->PT relationships
UPDATE produccion.production_routes pr
SET tiempo_reposo_horas = bom.tiempo_reposo_horas
FROM produccion.bill_of_materials bom
INNER JOIN produccion.work_centers wc ON bom.operation_id = wc.operation_id
WHERE pr.work_center_id = wc.id
  AND pr.product_id = bom.product_id
  AND bom.tiempo_reposo_horas IS NOT NULL
  AND pr.tiempo_reposo_horas = 0;
