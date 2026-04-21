-- Apply default values for ficha técnica fields on all finished products (PT).
-- Defaults derived from the reference product "Pastel de Pollo 100g".
--
-- Fields affected:
--   * product_technical_specs.manipulacion_transporte         (text)
--   * product_technical_specs.condiciones_almacenamiento_temp (jsonb)
--   * product_quality_specs.microbiological_specs             (jsonb)
--
-- Behavior:
--   1. Existing rows: fill NULL columns with the default value. Do NOT
--      overwrite rows that already have data.
--   2. Products (category = 'PT') that don't yet have a row in the target
--      table: insert a new row populated with the defaults.
--   3. Add column-level DEFAULT clauses so future inserts that omit these
--      fields inherit the value automatically.

DO $migration$
DECLARE
  default_manipulacion_transporte constant text :=
    'Durante el transporte y almacenamiento mantener el producto bajo las condiciones de temperatura recomendada. No someter a variaciones de temperatura, mantener alejado de otros productos que puedan generar contaminación cruzada. Evitar dejar caer y golpear el producto.';

  default_condiciones_almacenamiento_temp constant jsonb := '[
    {"label": "Transporte primer destino (°C)", "min_temp": -18, "max_temp": -22},
    {"label": "Transporte segundo destino (°C)", "min_temp": -18, "max_temp": -22},
    {"label": "Recepción en cliente (°C)", "min_temp": -18, "max_temp": -22},
    {"label": "Recepción en cliente condicionado", "min_temp": -18, "max_temp": -22},
    {"label": "Almacenamiento en cliente (°C)", "min_temp": -18, "max_temp": -22}
  ]'::jsonb;

  default_microbiological_specs constant jsonb := '[
    {"parametro": "Salmonella sp.", "unidades": "Ausencia/Presencia/25 g ó mL", "especificacion": "Ausencia", "metodo": "ISO 6579-1:2017"},
    {"parametro": "Staphylococcus aureus coagulasa positiva (35°C)", "unidades": "UFC/g ó mL", "especificacion": "<100", "metodo": "ISO 6888-1:2021"},
    {"parametro": "Escherichia coli", "unidades": "UFC/g ó mL", "especificacion": "<10", "metodo": "NTC 4458:2018"},
    {"parametro": "Bacillus cereus", "unidades": "UFC/g ó mL", "especificacion": "<100", "metodo": "AOAC Ed. 22nd,2023. 980.31"}
  ]'::jsonb;
BEGIN
  -- 1) Backfill existing product_technical_specs rows
  UPDATE product_technical_specs
     SET manipulacion_transporte = default_manipulacion_transporte
   WHERE manipulacion_transporte IS NULL;

  UPDATE product_technical_specs
     SET condiciones_almacenamiento_temp = default_condiciones_almacenamiento_temp
   WHERE condiciones_almacenamiento_temp IS NULL;

  -- 2) Insert product_technical_specs for PT products missing a row
  INSERT INTO product_technical_specs (
    product_id,
    manipulacion_transporte,
    condiciones_almacenamiento_temp
  )
  SELECT
    p.id,
    default_manipulacion_transporte,
    default_condiciones_almacenamiento_temp
  FROM products p
  WHERE p.category = 'PT'
    AND NOT EXISTS (
      SELECT 1 FROM product_technical_specs t WHERE t.product_id = p.id
    );

  -- 3) Backfill existing product_quality_specs rows
  UPDATE product_quality_specs
     SET microbiological_specs = default_microbiological_specs
   WHERE microbiological_specs IS NULL
      OR microbiological_specs = '[]'::jsonb;

  -- 4) Insert product_quality_specs for PT products missing a row
  INSERT INTO product_quality_specs (
    product_id,
    microbiological_specs
  )
  SELECT
    p.id,
    default_microbiological_specs
  FROM products p
  WHERE p.category = 'PT'
    AND NOT EXISTS (
      SELECT 1 FROM product_quality_specs q WHERE q.product_id = p.id
    );
END
$migration$;

-- 5) Column-level defaults so future inserts that omit these fields get the defaults automatically.
ALTER TABLE product_technical_specs
  ALTER COLUMN manipulacion_transporte SET DEFAULT
    'Durante el transporte y almacenamiento mantener el producto bajo las condiciones de temperatura recomendada. No someter a variaciones de temperatura, mantener alejado de otros productos que puedan generar contaminación cruzada. Evitar dejar caer y golpear el producto.';

ALTER TABLE product_technical_specs
  ALTER COLUMN condiciones_almacenamiento_temp SET DEFAULT
    '[
      {"label": "Transporte primer destino (°C)", "min_temp": -18, "max_temp": -22},
      {"label": "Transporte segundo destino (°C)", "min_temp": -18, "max_temp": -22},
      {"label": "Recepción en cliente (°C)", "min_temp": -18, "max_temp": -22},
      {"label": "Recepción en cliente condicionado", "min_temp": -18, "max_temp": -22},
      {"label": "Almacenamiento en cliente (°C)", "min_temp": -18, "max_temp": -22}
    ]'::jsonb;

ALTER TABLE product_quality_specs
  ALTER COLUMN microbiological_specs SET DEFAULT
    '[
      {"parametro": "Salmonella sp.", "unidades": "Ausencia/Presencia/25 g ó mL", "especificacion": "Ausencia", "metodo": "ISO 6579-1:2017"},
      {"parametro": "Staphylococcus aureus coagulasa positiva (35°C)", "unidades": "UFC/g ó mL", "especificacion": "<100", "metodo": "ISO 6888-1:2021"},
      {"parametro": "Escherichia coli", "unidades": "UFC/g ó mL", "especificacion": "<10", "metodo": "NTC 4458:2018"},
      {"parametro": "Bacillus cereus", "unidades": "UFC/g ó mL", "especificacion": "<100", "metodo": "AOAC Ed. 22nd,2023. 980.31"}
    ]'::jsonb;
