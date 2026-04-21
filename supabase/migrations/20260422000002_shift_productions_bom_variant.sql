-- Persist the BOM variant chosen at pesaje so every downstream work center
-- working on the same shift_production renders the same recipe (amasado,
-- empastado, laminado, etc. inherit the operator's pesaje decision).

BEGIN;

ALTER TABLE produccion.shift_productions
    ADD COLUMN IF NOT EXISTS bom_variant_id uuid
        REFERENCES produccion.bom_variants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shift_productions_bom_variant
    ON produccion.shift_productions (bom_variant_id)
    WHERE bom_variant_id IS NOT NULL;

COMMENT ON COLUMN produccion.shift_productions.bom_variant_id IS
  'BOM variant selected at pesaje. When set, all downstream work centers for this production run must use this variant. NULL means "use the default variant".';

COMMIT;
