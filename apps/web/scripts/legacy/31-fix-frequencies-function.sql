-- Corregir función get_active_frequencies_for_day para que coincida con los tipos reales de la DB
-- El problema es que branch.name y client.name son VARCHAR(255), no TEXT

-- Eliminar la función existente
DROP FUNCTION IF EXISTS get_active_frequencies_for_day(INTEGER);

-- Recrear la función con los tipos correctos
CREATE OR REPLACE FUNCTION get_active_frequencies_for_day(target_day INTEGER)
RETURNS TABLE (
  branch_id UUID,
  client_id UUID,
  branch_name VARCHAR(255),
  client_name VARCHAR(255),
  frequency_id UUID,
  notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id as branch_id,
    b.client_id,
    b.name as branch_name,
    c.name as client_name,
    cf.id as frequency_id,
    cf.notes
  FROM client_frequencies cf
  JOIN branches b ON cf.branch_id = b.id
  JOIN clients c ON b.client_id = c.id
  WHERE cf.day_of_week = target_day 
    AND cf.is_active = true
  ORDER BY c.name, b.name;
END;
$$ LANGUAGE plpgsql;

-- Mensaje de confirmación
SELECT 'Función get_active_frequencies_for_day corregida exitosamente' as message;