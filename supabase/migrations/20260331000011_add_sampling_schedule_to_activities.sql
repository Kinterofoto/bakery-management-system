-- Add sampling_schedule JSONB column to program_activities
-- Stores array of {period, sample, price} objects for sampling-type activities
-- period = 1-12 for monthly, 1-4 for quarterly, etc.
ALTER TABLE "qms"."program_activities"
ADD COLUMN IF NOT EXISTS "sampling_schedule" jsonb;

-- Seed initial sampling schedule data from Cronograma CR-06 V2.0
-- for the microbiologia program activities

-- 1. Materia Prima (mensual = 12 periods)
UPDATE "qms"."program_activities"
SET "sampling_schedule" = '[
  {"period":1,"sample":"Carne Descargue","price":130.9},
  {"period":2,"sample":"Queso Campesino","price":233.4},
  {"period":2,"sample":"Harina de trigo","price":112.1},
  {"period":3,"sample":"Mantequilla","price":233.4},
  {"period":4,"sample":"Queso Parmesano","price":209.2},
  {"period":5,"sample":"Jamón Cerdo","price":130.9},
  {"period":6,"sample":"Pechuga de pollo","price":112.1},
  {"period":7,"sample":"Hojaldrina","price":233.4},
  {"period":8,"sample":"Rico Hojaldre","price":233.4},
  {"period":8,"sample":"Queso Costeño","price":233.4},
  {"period":9,"sample":"Harina Almendras","price":112.1},
  {"period":10,"sample":"Pool Semillas","price":136.4},
  {"period":11,"sample":"Pool verduras","price":209.2},
  {"period":12,"sample":"Queso doble crema","price":233.4}
]'::jsonb
WHERE title = 'Muestreo Materia Prima'
  AND program_id = (SELECT id FROM "qms"."sanitation_programs" WHERE code = 'microbiologia');

-- 2. Producto Terminado (mensual)
UPDATE "qms"."program_activities"
SET "sampling_schedule" = '[
  {"period":1,"sample":"Croissant Almendras","price":112.1},
  {"period":1,"sample":"Pañuelo Napolitano","price":112.1},
  {"period":2,"sample":"Croissant Jamón y queso","price":112.1},
  {"period":3,"sample":"Pastel de pollo (x5 conformidad)","price":480},
  {"period":3,"sample":"Pastel de Carne Ranchero","price":112.1},
  {"period":4,"sample":"Croissant de queso","price":112.1},
  {"period":5,"sample":"Palito de queso","price":112.1},
  {"period":6,"sample":"Pastel de pollo","price":112.1},
  {"period":7,"sample":"Croissant Europa","price":112.1},
  {"period":7,"sample":"Croissant Margarina","price":112.1},
  {"period":8,"sample":"Flauta de chocolate","price":112.1},
  {"period":9,"sample":"Croissant Multicereal","price":112.1},
  {"period":9,"sample":"Flauta de queso y bocadillo","price":112.1},
  {"period":10,"sample":"Croissant Jamón y queso","price":112.1},
  {"period":10,"sample":"Pan Blandito","price":112.1},
  {"period":10,"sample":"Pan Pera","price":112.1},
  {"period":11,"sample":"Pan costeño","price":112.1},
  {"period":11,"sample":"Roscón de arequipe","price":112.1},
  {"period":11,"sample":"Almojábana","price":112.1},
  {"period":12,"sample":"Pan de bono","price":112.1},
  {"period":12,"sample":"Calentano","price":112.1}
]'::jsonb
WHERE title = 'Muestreo Producto Terminado'
  AND program_id = (SELECT id FROM "qms"."sanitation_programs" WHERE code = 'microbiologia');

-- 3. Material de Empaque (mensual, but only 5 months have samples)
UPDATE "qms"."program_activities"
SET "sampling_schedule" = '[
  {"period":1,"sample":"Bolsatina blanca","price":68.5},
  {"period":5,"sample":"Bolsatina Roja","price":68.5},
  {"period":7,"sample":"Lámina Plástico","price":68.5},
  {"period":9,"sample":"Bolsatina Verde","price":68.5},
  {"period":11,"sample":"Lámina BOPP","price":68.5}
]'::jsonb
WHERE title = 'Muestreo Material de Empaque'
  AND program_id = (SELECT id FROM "qms"."sanitation_programs" WHERE code = 'microbiologia');

-- 4. Ambiental (mensual)
UPDATE "qms"."program_activities"
SET "sampling_schedule" = '[
  {"period":1,"sample":"Cuarto frío de Materias primas","price":44.5},
  {"period":2,"sample":"Amasado","price":44.5},
  {"period":3,"sample":"Cuarto refrigeración","price":44.5},
  {"period":4,"sample":"Cocina","price":44.5},
  {"period":5,"sample":"Empaque","price":44.5},
  {"period":6,"sample":"Leudado","price":44.5},
  {"period":7,"sample":"Lego/Polilyne","price":44.5},
  {"period":8,"sample":"Pesaje","price":44.5},
  {"period":9,"sample":"Logística Materias Primas","price":44.5},
  {"period":10,"sample":"Batidos","price":44.5},
  {"period":11,"sample":"Lego/Pastelería","price":44.5},
  {"period":12,"sample":"Cuarto frío masas","price":44.5}
]'::jsonb
WHERE title = 'Muestreo Ambiental'
  AND program_id = (SELECT id FROM "qms"."sanitation_programs" WHERE code = 'microbiologia');

-- 5. Superficies (mensual)
UPDATE "qms"."program_activities"
SET "sampling_schedule" = '[
  {"period":1,"sample":"Mesa de empaque","price":239.1},
  {"period":1,"sample":"Mesa de pesaje","price":239.1},
  {"period":2,"sample":"Polilyne","price":239.1},
  {"period":3,"sample":"Croissomat","price":239.1},
  {"period":4,"sample":"Cocina","price":239.1},
  {"period":5,"sample":"Mesa Amasado","price":239.1},
  {"period":6,"sample":"Batidora","price":239.1},
  {"period":7,"sample":"Mesa Pastelería","price":239.1},
  {"period":8,"sample":"Amasadora Gris","price":239.1},
  {"period":9,"sample":"Banda Laminadora Semiautomática","price":239.1},
  {"period":10,"sample":"Flowpack","price":239.1},
  {"period":11,"sample":"Compactadora","price":239.1},
  {"period":12,"sample":"Mesa pesaje","price":239.1}
]'::jsonb
WHERE title = 'Muestreo de Superficies'
  AND program_id = (SELECT id FROM "qms"."sanitation_programs" WHERE code = 'microbiologia');

-- 6. Manipuladores (mensual, 2 per month)
UPDATE "qms"."program_activities"
SET "sampling_schedule" = '[
  {"period":1,"sample":"Panadería","price":39.1},
  {"period":1,"sample":"Cocina","price":39.1},
  {"period":2,"sample":"Polilyne (1)","price":39.1},
  {"period":2,"sample":"Polilyne (2)","price":39.1},
  {"period":3,"sample":"Croissomat (1)","price":39.1},
  {"period":3,"sample":"Croissomat (2)","price":39.1},
  {"period":4,"sample":"Batidos","price":39.1},
  {"period":4,"sample":"Latas","price":39.1},
  {"period":5,"sample":"Amasado","price":39.1},
  {"period":5,"sample":"Pastelería","price":39.1},
  {"period":6,"sample":"Pastelería","price":39.1},
  {"period":6,"sample":"Laminado","price":39.1},
  {"period":7,"sample":"Empaque (1)","price":39.1},
  {"period":7,"sample":"Empaque (2)","price":39.1},
  {"period":8,"sample":"Pesaje","price":39.1},
  {"period":8,"sample":"Amasado","price":39.1},
  {"period":9,"sample":"Leudado","price":39.1},
  {"period":9,"sample":"Pastelería","price":39.1},
  {"period":10,"sample":"I+D","price":39.1},
  {"period":10,"sample":"Logística","price":39.1},
  {"period":11,"sample":"Empastador","price":39.1},
  {"period":11,"sample":"Laminador","price":39.1},
  {"period":12,"sample":"Margarinas","price":39.1},
  {"period":12,"sample":"Batidos","price":39.1}
]'::jsonb
WHERE title = 'Muestreo de Manipuladores'
  AND program_id = (SELECT id FROM "qms"."sanitation_programs" WHERE code = 'microbiologia');

-- 7. Agua Potable Microbiológico (trimestral = 4 periods)
UPDATE "qms"."program_activities"
SET "sampling_schedule" = '[
  {"period":1,"sample":"Muelle","price":104.9},
  {"period":2,"sample":"Cocina","price":104.9},
  {"period":3,"sample":"Filtro Sanitario entrada","price":104.9},
  {"period":4,"sample":"Margarinas","price":104.9}
]'::jsonb
WHERE title = 'Muestreo Agua Potable (Microbiológico)'
  AND program_id = (SELECT id FROM "qms"."sanitation_programs" WHERE code = 'microbiologia');
