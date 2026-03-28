-- Update "Medición de Cloro Residual y pH" activity:
-- 1. Replace punto_muestreo options with actual sampling points
-- 2. Remove temperatura field (not used)

UPDATE qms.program_activities
SET form_fields = '[
  {
    "name": "punto_muestreo",
    "label": "Punto de Muestreo",
    "type": "select",
    "options": ["Esclusa", "Lavado", "Cocción", "Pasillo", "Chiller", "Leggo", "Leudado"],
    "required": true
  },
  {
    "name": "cloro_residual",
    "label": "Cloro Residual (mg/L)",
    "type": "number",
    "min": 0.3,
    "max": 2.0,
    "required": true
  },
  {
    "name": "ph",
    "label": "pH",
    "type": "number",
    "min": 6.5,
    "max": 9.0,
    "required": true
  }
]'::jsonb
WHERE title = 'Medición de Cloro Residual y pH'
  AND program_id = (SELECT id FROM qms.sanitation_programs WHERE code = 'agua_potable');
