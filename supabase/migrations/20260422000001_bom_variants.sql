-- Multi-variant BOM support.
--
-- Before this change produccion.bill_of_materials enforced UNIQUE
-- (product_id, operation_id, material_id) so a product could have exactly
-- one recipe. Operations like "con recorte / sin recorte" forced users to
-- duplicate the product SKU. This migration introduces BOM variants so the
-- same product can carry multiple recipes.
--
-- Strategy:
--   1. Create produccion.bom_variants keyed by product_id with a partial
--      unique index to guarantee one default variant per product.
--   2. Backfill a "Principal" default variant for every product that already
--      has BOM rows.
--   3. Add variant_id to bill_of_materials, backfill, make NOT NULL,
--      replace the old UNIQUE so the triple is now scoped to a variant.
--   4. Expose produccion.bom_default_rows(product_id) as the single read
--      path used by cascade/planning/ficha-técnica so those callers keep
--      their existing semantics without a variant parameter.
--   5. Flag raw/semi-finished materials that represent recorte so the
--      pesaje auto-select logic does not depend on string matching.

BEGIN;

-- 1. bom_variants table --------------------------------------------------
CREATE TABLE IF NOT EXISTS produccion.bom_variants (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id    uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name          varchar(80) NOT NULL,
    description   text,
    is_default    boolean NOT NULL DEFAULT false,
    sort_order    integer NOT NULL DEFAULT 0,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT bom_variants_product_name_key UNIQUE (product_id, name)
);

COMMENT ON TABLE produccion.bom_variants IS
  'Named BOM variants per product (e.g. "Principal", "Con recorte"). Exactly one row per product has is_default = true.';

CREATE UNIQUE INDEX IF NOT EXISTS bom_variants_one_default_per_product
  ON produccion.bom_variants (product_id) WHERE is_default;

CREATE INDEX IF NOT EXISTS bom_variants_product_sort_idx
  ON produccion.bom_variants (product_id, sort_order);

ALTER TABLE produccion.bom_variants OWNER TO postgres;
GRANT ALL ON TABLE produccion.bom_variants TO anon;
GRANT ALL ON TABLE produccion.bom_variants TO authenticated;
GRANT ALL ON TABLE produccion.bom_variants TO service_role;

-- Keep updated_at fresh on every write
CREATE OR REPLACE FUNCTION produccion.bom_variants_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bom_variants_touch_updated_at ON produccion.bom_variants;
CREATE TRIGGER bom_variants_touch_updated_at
    BEFORE UPDATE ON produccion.bom_variants
    FOR EACH ROW EXECUTE FUNCTION produccion.bom_variants_touch_updated_at();

-- 2. Backfill a default variant for every product with existing BOM rows
--    (products without BOM get a variant lazily the first time the UI adds
--    a row, avoiding a pile of empty variants for catalog items that will
--    never be produced).
INSERT INTO produccion.bom_variants (product_id, name, is_default, sort_order)
SELECT DISTINCT bom.product_id, 'Principal', true, 0
FROM produccion.bill_of_materials bom
WHERE bom.product_id IS NOT NULL
ON CONFLICT (product_id, name) DO NOTHING;

-- 3. Extend bill_of_materials -------------------------------------------
ALTER TABLE produccion.bill_of_materials
    ADD COLUMN IF NOT EXISTS variant_id uuid
        REFERENCES produccion.bom_variants(id) ON DELETE CASCADE;

-- Backfill variant_id to the default variant of each product.
UPDATE produccion.bill_of_materials bom
SET variant_id = bv.id
FROM produccion.bom_variants bv
WHERE bom.variant_id IS NULL
  AND bv.product_id = bom.product_id
  AND bv.is_default;

-- Enforce NOT NULL after backfill.
ALTER TABLE produccion.bill_of_materials
    ALTER COLUMN variant_id SET NOT NULL;

-- Swap the uniqueness scope from product to variant.
ALTER TABLE produccion.bill_of_materials
    DROP CONSTRAINT IF EXISTS bill_of_materials_product_operation_material_key;

ALTER TABLE produccion.bill_of_materials
    ADD CONSTRAINT bill_of_materials_variant_operation_material_key
    UNIQUE (variant_id, operation_id, material_id);

CREATE INDEX IF NOT EXISTS idx_bill_of_materials_variant
    ON produccion.bill_of_materials (variant_id);

COMMENT ON COLUMN produccion.bill_of_materials.variant_id IS
  'BOM variant this row belongs to. Cascade/planning/ficha técnica read only rows whose variant is the default; pesaje can pick a non-default variant based on recorte inventory.';

-- 4. Helper read function used by every non-pesaje consumer.
CREATE OR REPLACE FUNCTION produccion.bom_default_rows(p_product_id uuid)
RETURNS SETOF produccion.bill_of_materials
LANGUAGE sql
STABLE
AS $$
    SELECT bom.*
    FROM produccion.bill_of_materials bom
    JOIN produccion.bom_variants bv
      ON bv.id = bom.variant_id AND bv.is_default
    WHERE bom.product_id = p_product_id
      AND bom.is_active;
$$;

COMMENT ON FUNCTION produccion.bom_default_rows(uuid) IS
  'Returns bill_of_materials rows for the default BOM variant of the given product. Used by cascade, planning, purchasing, and ficha técnica so they stay independent of the multi-variant pesaje flow.';

GRANT EXECUTE ON FUNCTION produccion.bom_default_rows(uuid) TO anon;
GRANT EXECUTE ON FUNCTION produccion.bom_default_rows(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION produccion.bom_default_rows(uuid) TO service_role;

-- 5. Recorte flag on products -------------------------------------------
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS is_recorte boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.products.is_recorte IS
  'True for raw or semi-finished products that represent recorte/scrap inputs. Used by the pesaje auto-select logic to decide when to offer the "con recorte" variant.';

COMMIT;
