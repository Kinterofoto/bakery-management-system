-- Add fields needed for contract generation
ALTER TABLE employee_directory
  ADD COLUMN IF NOT EXISTS document_expedition_date text,
  ADD COLUMN IF NOT EXISTS document_expedition_city text,
  ADD COLUMN IF NOT EXISTS nationality text DEFAULT 'Colombiana',
  ADD COLUMN IF NOT EXISTS beneficiaries text,
  ADD COLUMN IF NOT EXISTS employee_category text DEFAULT 'Operario';

COMMENT ON COLUMN employee_directory.document_expedition_date IS 'Fecha de expedición de la cédula';
COMMENT ON COLUMN employee_directory.document_expedition_city IS 'Ciudad de expedición de la cédula';
COMMENT ON COLUMN employee_directory.nationality IS 'Nacionalidad del trabajador';
COMMENT ON COLUMN employee_directory.beneficiaries IS 'Beneficiarios para efectos del contrato';
COMMENT ON COLUMN employee_directory.employee_category IS 'Categoría: Operario o Dirección, Manejo y Confianza';
