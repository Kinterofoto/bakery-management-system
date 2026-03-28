-- Add fields required for ficha técnica de producto terminado
-- Reference: FO-77 format used in production

-- New columns on product_technical_specs
ALTER TABLE product_technical_specs
  ADD COLUMN IF NOT EXISTS notificacion_sanitaria text,
  ADD COLUMN IF NOT EXISTS uso_previsto text,
  ADD COLUMN IF NOT EXISTS proceso_elaboracion text,
  ADD COLUMN IF NOT EXISTS instrucciones_preparacion text,
  ADD COLUMN IF NOT EXISTS manipulacion_transporte text,
  ADD COLUMN IF NOT EXISTS normatividad text,
  ADD COLUMN IF NOT EXISTS empaque_primario text[],
  ADD COLUMN IF NOT EXISTS empaque_secundario text[],
  ADD COLUMN IF NOT EXISTS condiciones_almacenamiento_temp jsonb,
  ADD COLUMN IF NOT EXISTS vida_util_ambiente_horas integer,
  ADD COLUMN IF NOT EXISTS peso_medio numeric,
  ADD COLUMN IF NOT EXISTS peso_minimo numeric,
  ADD COLUMN IF NOT EXISTS peso_maximo numeric,
  ADD COLUMN IF NOT EXISTS codigo_ficha text,
  ADD COLUMN IF NOT EXISTS version_ficha text,
  ADD COLUMN IF NOT EXISTS fecha_publicacion_ficha date,
  ADD COLUMN IF NOT EXISTS elaborado_por text,
  ADD COLUMN IF NOT EXISTS cargo_elaborado text,
  ADD COLUMN IF NOT EXISTS aprobado_por text,
  ADD COLUMN IF NOT EXISTS cargo_aprobado text,
  ADD COLUMN IF NOT EXISTS fecha_elaboracion date,
  ADD COLUMN IF NOT EXISTS fecha_aprobacion date,
  ADD COLUMN IF NOT EXISTS trazas_alergenos text[];

-- Add comments for documentation
COMMENT ON COLUMN product_technical_specs.condiciones_almacenamiento_temp IS 'JSON array: [{label, min_temp, max_temp}] for transport/storage temperature ranges';
COMMENT ON COLUMN product_technical_specs.empaque_primario IS 'Primary packaging materials (e.g. BOPP, PEAD, PP)';
COMMENT ON COLUMN product_technical_specs.empaque_secundario IS 'Secondary packaging materials (e.g. Cartón corrugado, Canastilla plástica)';
COMMENT ON COLUMN product_technical_specs.trazas_alergenos IS 'Possible allergen traces (e.g. SOYA, MANÍ)';
