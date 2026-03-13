-- ============================================================================
-- Add missing equipment from maintenance documents
-- Updates existing equipment with real specs and adds new equipment
-- ============================================================================

-- First, update existing equipment that had generic/placeholder data to match real docs

-- Update Horno Rotativo 1 -> Horno Turbolino (Zucchelli/Citalsa)
UPDATE "mantenimiento"."equipment"
SET "name" = 'Horno Turbolino 10 Latas',
    "brand" = 'Zucchelli',
    "model" = 'Turbolino 10',
    "voltage" = '110V Monofasico (panel control)',
    "power" = '2.0 kW',
    "capacity" = '10 latas 45x65cm, 50 kg/hora',
    "dimensions" = '140x100x197 cm',
    "supplier" = 'CI Talsa / Citalsa',
    "specs" = '{"combustible":"Gas propano","consumo_gas":"1 litro/hora","amperios":"20A","sistema_vapor":"Temporizado digital","inversor_giro":true,"control_flama":"Electronico con sensores","camara_combustion":"Acero termico 850°C","damper":"Anti-explosion"}'::jsonb
WHERE "code" = 'HR-001';

-- Update Horno Rotativo 2 -> keep as second Turbolino or different oven
UPDATE "mantenimiento"."equipment"
SET "name" = 'Horno Turbolino 10 Latas #2',
    "brand" = 'Zucchelli',
    "model" = 'Turbolino 10',
    "voltage" = '110V Monofasico (panel control)',
    "power" = '2.0 kW',
    "capacity" = '10 latas 45x65cm, 50 kg/hora',
    "dimensions" = '140x100x197 cm',
    "supplier" = 'CI Talsa / Citalsa',
    "specs" = '{"combustible":"Gas propano","consumo_gas":"1 litro/hora","amperios":"20A","sistema_vapor":"Temporizado digital","inversor_giro":true,"control_flama":"Electronico con sensores","camara_combustion":"Acero termico 850°C","damper":"Anti-explosion"}'::jsonb
WHERE "code" = 'HR-002';

-- Update Amasadora Espiral 120L -> keep but fix brand (Paramount SM-120T)
UPDATE "mantenimiento"."equipment"
SET "brand" = 'Paramount',
    "model" = 'SM-120T',
    "supplier" = 'Moffat / Paramount',
    "specs" = '{"velocidades":2,"bol_extraible":false,"temporizador":"Digital Touch 3 timers","tipo":"Espiral","material_bol":"Acero inoxidable","marca_original":"Paramount/Blue Seal"}'::jsonb
WHERE "code" = 'AE-001';

-- Update Amasadora Espiral 80L -> Paramount SM-80T
UPDATE "mantenimiento"."equipment"
SET "brand" = 'Paramount',
    "model" = 'SM-80T',
    "supplier" = 'Moffat / Paramount',
    "specs" = '{"velocidades":2,"bol_extraible":false,"temporizador":"Digital Touch 2 timers","tipo":"Espiral","material_bol":"Acero inoxidable","marca_original":"Paramount/Blue Seal"}'::jsonb
WHERE "code" = 'AE-002';

-- Update Laminadora -> Rondo Polyline (the actual one they have)
UPDATE "mantenimiento"."equipment"
SET "name" = 'Laminadora Rondo Polyline',
    "model" = 'Polyline',
    "supplier" = 'Rondo AG',
    "specs" = '{"tipo":"Linea de produccion automatica","modulos":"Laminadora, Guillotina, Dosificadora, Plegadores","ancho_trabajo":"600mm","direccion_cinta":"Bidireccional","alimentacion":"Automatica factible","limpieza":"Superficies lisas facil limpieza"}'::jsonb
WHERE "code" = 'LM-001';

-- Update Compresor -> FIAC New Silver (the actual one per documents)
UPDATE "mantenimiento"."equipment"
SET "brand" = 'FIAC',
    "model" = 'New Silver 15',
    "supplier" = 'Air Xpress Compresores',
    "specs" = '{"tipo":"Tornillo rotativo","presion_max":"10 bar","panel_control":"Easy 2","aceite":"Roto-Inject","secador_aire":"Incluido","valvula_termica":"Termostatica"}'::jsonb
WHERE "code" = 'CA-001';

-- Update Dosificador de Agua -> Bongard Fonto (the actual chiller per docs)
UPDATE "mantenimiento"."equipment"
SET "name" = 'Enfriador de Agua Bongard Fonto',
    "brand" = 'Bongard',
    "model" = 'Fonto',
    "power" = '230V Monofasico 50Hz',
    "capacity" = '45-180 L/hora de +20°C a +3°C',
    "supplier" = 'Bongard Colombia',
    "specs" = '{"tipo":"Enfriador ICE flujo continuo","evaporador":"Tubos de cobre","intercambiador":"Acero inoxidable food grade","compresor":"Integrado alta potencia","agitadores":"2-3 segun modelo","control_hielo":"Por sonda","tanques":1,"sin_bomba":true,"presion":"Natural del grifo"}'::jsonb
WHERE "code" = 'DA-001';

-- Now add all the MISSING equipment

-- Amasadora CI Talsa LM-50 (Produccion)
INSERT INTO "mantenimiento"."equipment" ("category_id", "name", "code", "brand", "model", "location", "voltage", "power", "capacity", "dimensions", "weight", "supplier", "status", "specs") VALUES
((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Produccion'),
 'Amasadora CI Talsa LM-50', 'AT-001', 'CI Talsa', 'LM-50', 'Area de Amasado', '110V Monofasico 60Hz', '2.7 kW', '20 kg max amasado / 11.25 kg harina', '99x55x92 cm', '133 kg', 'Citalsa', 'operativo',
 '{"velocidad_amasado":"185 rpm","velocidad_bowl":"15 rpm","capacidad_tazon":"20 kg","humedad_trabajo":"50-60%","procedencia":"China","tipo":"Espiral","repuestos":{"banda":"06030168","interruptor":"06030169","emergencia":"06030170","kit":"06030173"}}'::jsonb);

-- Abatidor/Congelador BFR202R (Refrigeracion)
INSERT INTO "mantenimiento"."equipment" ("category_id", "name", "code", "brand", "model", "serial_number", "location", "voltage", "power", "capacity", "dimensions", "weight", "supplier", "status", "specs") VALUES
((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Refrigeracion'),
 'Abatidor/Congelador Roll-In Grande', 'AB-001', 'Angelo Po', 'BFR202R', NULL, 'Area de Produccion', '400V 3N~ 50/60Hz', '5.3 kW', '210 kg abatimiento / 144 kg congelacion por ciclo', '140x125x226 cm', '360 kg', 'Angelo Po Grandi Cucine', 'operativo',
 '{"potencia_frigorifica":"12440 W","temperatura_min":"-40°C","cubetas":"20 GN 2/1 o 60x80cm","sonda":"IFR Multipoint","descongelacion":"Electrica","refrigerante":"R404A/R452A","aislamiento":"Poliuretano 80mm","clase_climatica":"5 (+40°C, 40% HR)","programas":"SOFT, HARD, INFINITY, AUTOMATICOS (56), MEMORIZADOS, MULTY, DESCONGELACION, FERMENTACION, SMART ON","HACCP":"Alarmas registradas (30)","iluminacion":"LED multicolor Easy View","USB":true,"material":"AISI 304"}'::jsonb);

-- Abatidor/Congelador BFR201R (mas pequeño) (Refrigeracion)
INSERT INTO "mantenimiento"."equipment" ("category_id", "name", "code", "brand", "model", "serial_number", "location", "voltage", "power", "capacity", "dimensions", "weight", "supplier", "status", "specs") VALUES
((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Refrigeracion'),
 'Abatidor/Congelador Roll-In', 'AB-002', 'Angelo Po', 'BFR201R', NULL, 'Area de Produccion', '400V 3N~ 50Hz', '3.6 kW', '120 kg abatimiento / 72 kg congelacion por ciclo', '105x125x226 cm', '280 kg', 'Angelo Po Grandi Cucine', 'operativo',
 '{"potencia_frigorifica":"5300 W","temperatura_min":"-40°C","cubetas":"20 GN 1/1 o 60x40cm","sonda":"IFR Multipoint","descongelacion":"Electrica","refrigerante":"R404A","aislamiento":"Poliuretano 80mm","clase_climatica":"5 (+40°C, 40% HR)","programas":"SOFT, HARD, INFINITY, AUTOMATICOS, MEMORIZADOS, DESCONGELACION, FERMENTACION CONTROLADA, SMART ON","HACCP":"Alarmas registradas (30)","iluminacion":"LED multicolor Easy View","USB":true,"material":"AISI 304"}'::jsonb);

-- Ultra Congelador (Refrigeracion)
INSERT INTO "mantenimiento"."equipment" ("category_id", "name", "code", "brand", "model", "location", "voltage", "power", "capacity", "supplier", "status", "specs") VALUES
((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Refrigeracion'),
 'Ultra Congelador 4', 'UC-001', 'ISR', 'ISR201R / 39C1400', 'Area de Congelados', '220V Trifasico', '3.5 kW', '20 bandejas', 'Angelo Po / ISR', 'operativo',
 '{"tipo":"Abatidor/Congelador rapido","temperatura_min":"-40°C","ciclos":"Abatimiento, Congelacion, Conservacion, Desescarche, Esterilizacion","sonda":"Al corazon","panel":"Digital multi-idioma"}'::jsonb);

-- Congelador Horizontal Challenger CH 363 (Refrigeracion)
INSERT INTO "mantenimiento"."equipment" ("category_id", "name", "code", "brand", "model", "location", "voltage", "power", "capacity", "dimensions", "weight", "supplier", "status", "specs") VALUES
((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Refrigeracion'),
 'Congelador Horizontal CH 363', 'CH-001', 'Challenger', 'CH 363', 'Almacen Congelados', '115V 60Hz', '115 W', '337 litros / 13.6 pies cubicos', '117x75x89.5 cm', '54.5 kg', 'Challenger', 'operativo',
 '{"tipo":"Chest Freezer","temperatura_trabajo":"-18°C","refrigerante":"R600a","control":"Termostato mecanico dual","descongelacion":"Manual","sistema_enfriamiento":"Directo","clase":"SubTropical (ST)","canastillas":2,"rodachinas":4,"chapa_seguridad":true}'::jsonb);

-- Congelador Vertical Challenger CV 465 (Refrigeracion)
INSERT INTO "mantenimiento"."equipment" ("category_id", "name", "code", "brand", "model", "location", "voltage", "power", "capacity", "dimensions", "weight", "supplier", "status", "specs") VALUES
((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Refrigeracion'),
 'Congelador Vertical CV 465', 'CV-001', 'Challenger', 'CV 465', 'Almacen Congelados', '115V 60Hz', '130 W', '262 litros / 10.59 pies cubicos', '60x71x186 cm', '77 kg', 'Challenger', 'operativo',
 '{"tipo":"Congelador vertical","temperatura_trabajo":"-18°C","refrigerante":"R600a","control":"Electronico multifuncion LED","descongelacion":"Automatica","sistema_enfriamiento":"Multiflujo No Frost","clase":"Tropical (T)","acabados":"Acero inoxidable","bandejas":5,"puerta_reversible":true,"alarma_puerta":true,"bloqueo_ninos":true,"funcion_vacaciones":true}'::jsonb);

-- Contenedor Thermo King (Refrigeracion)
INSERT INTO "mantenimiento"."equipment" ("category_id", "name", "code", "brand", "model", "location", "voltage", "power", "supplier", "status", "specs") VALUES
((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Refrigeracion'),
 'Contenedor Refrigerado Thermo King', 'TK-001', 'Thermo King', 'Magnum', 'Zona de Despacho', '220V Trifasico', '5 kW', 'Thermo King', 'operativo',
 '{"tipo":"Contenedor refrigerado","uso":"Almacenamiento temporal producto terminado","unidad":"Magnum","transferencia":"Automatica"}'::jsonb);

-- Thermo King Vehiculo (Refrigeracion)
INSERT INTO "mantenimiento"."equipment" ("category_id", "name", "code", "brand", "model", "location", "voltage", "supplier", "status", "specs") VALUES
((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Refrigeracion'),
 'Unidad Thermo King Vehiculo', 'TK-002', 'Thermo King', 'Magnum 561', 'Vehiculo de Reparto', '12V DC', 'Thermo King', 'operativo',
 '{"tipo":"Unidad refrigeracion vehicular","modelo":"Magnum 561","uso":"Transporte refrigerado de producto terminado"}'::jsonb);

-- Cortadora de Masa Manual (Produccion)
INSERT INTO "mantenimiento"."equipment" ("category_id", "name", "code", "brand", "model", "location", "voltage", "power", "capacity", "weight", "supplier", "status", "specs") VALUES
((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Produccion'),
 'Cortadora de Masa Manual', 'CM-001', 'Exhibir Equipos', 'Cortadora 36', 'Area de Formado', 'N/A (Manual)', 'N/A', '36 cortes por ciclo', '80 kg', 'Exhibir Equipos', 'operativo',
 '{"tipo":"Manual","operacion":"Manual por presion","cortes_ciclo":36,"taza":"Fundicion de aluminio","pintura":"Color gris","cortes_iguales":true}'::jsonb);

-- Croissomat (Produccion)
INSERT INTO "mantenimiento"."equipment" ("category_id", "name", "code", "brand", "model", "location", "voltage", "power", "supplier", "status", "specs") VALUES
((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Produccion'),
 'Croissomat SCM50', 'CR-001', 'Rondo', 'SCM50', 'Area de Pasteleria', '220V Trifasico', '2.5 kW', 'Rondo AG', 'operativo',
 '{"tipo":"Maquina automatica para croissants","funcion":"Enrollado y formado automatico de croissants","modelo_manual":"SCM50"}'::jsonb);

-- Laminadora Queen 600 (Produccion)
INSERT INTO "mantenimiento"."equipment" ("category_id", "name", "code", "brand", "model", "location", "voltage", "power", "supplier", "status", "specs") VALUES
((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Produccion'),
 'Laminadora Queen 600', 'LM-002', 'Queen', 'Queen 600', 'Area de Laminado', '220V Trifasico', '1.5 kW', 'Queen / Importador', 'operativo',
 '{"tipo":"Laminadora de piso con bandejas plegables","ancho_trabajo":"600mm","uso":"Reducir pasta de laminado","cintas_transportadoras":"Desmontables","rascadores":"Con cajon de residuos"}'::jsonb);

-- Sarten Basculante Angelo Po (Produccion)
INSERT INTO "mantenimiento"."equipment" ("category_id", "name", "code", "brand", "model", "location", "voltage", "power", "capacity", "dimensions", "weight", "supplier", "status", "specs") VALUES
((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Produccion'),
 'Sarten Basculante a Gas', 'SBG-001', 'Angelo Po', '2N1BR2G', 'Area de Coccion', '230V 1N~ 50Hz', '30 kW (gas) / 0.001 kW (electrica)', '125 litros (util 95L)', '120x92x75 cm', '210 kg', 'Angelo Po Grandi Cucine', 'operativo',
 '{"tipo":"Gas volcable manual","alimentacion":"Gas","temperatura":"60-300°C","cuba":"AISI 304 espesor 10mm redondeada","encendido":"Electronico tren de chispas","elevacion":"Manual con volante","quemadores":"Acero inox 6 ramas de llama","termostato":"Doble limitador","potencia_especifica":"315 W/lt","proteccion":"IPX5","norma":"EN 1672-2 Diseno Higienico"}'::jsonb);

-- Flow Pack (Auxiliar)
INSERT INTO "mantenimiento"."equipment" ("category_id", "name", "code", "brand", "model", "location", "voltage", "power", "supplier", "status", "specs") VALUES
((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Auxiliar'),
 'Empacadora Flow Pack', 'FPK-001', 'Flow Pack', 'FP 2000', 'Area de Empaque', '220V Monofasico', '2.5 kW', 'Flow Pack / Importador', 'operativo',
 '{"tipo":"Empacadora horizontal de flujo continuo","regulador_presion":"Interno y externo","sistema_corte":"Automatico","velocidad":"Ajustable","parametros":"Digitales programables"}'::jsonb);

-- Hidrolavadora Karcher (Auxiliar)
INSERT INTO "mantenimiento"."equipment" ("category_id", "name", "code", "brand", "model", "location", "voltage", "power", "capacity", "dimensions", "weight", "supplier", "status", "specs") VALUES
((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Auxiliar'),
 'Hidrolavadora Karcher HD 6/13 C', 'HL-001', 'Karcher', 'HD 6/13 C', 'Cuarto de Aseo', '220V Monofasico 50Hz', '2.9 kW', '590 L/hora', '38x36x93 cm', '25.2 kg', 'Karcher', 'operativo',
 '{"tipo":"Limpiadora alta presion agua fria","presion_trabajo":"130 bar / 13 MPa","presion_max":"190 bar / 19 MPa","temperatura_max_entrada":"60°C","numero_pedido":"1.520-139.0","descarga_presion":"Automatica","uso":"Vertical y horizontal","culata":"Laton alta calidad","sistema":"EASY!Force y EASY!Lock"}'::jsonb);

-- Horno Microondas Challenger HM 8018 (Auxiliar)
INSERT INTO "mantenimiento"."equipment" ("category_id", "name", "code", "brand", "model", "location", "voltage", "power", "capacity", "weight", "supplier", "status", "specs") VALUES
((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Auxiliar'),
 'Horno Microondas Industrial', 'MO-001', 'Challenger', 'HM 8018', 'Area de Comedor / Produccion', '120V 60Hz', '1.35 kW (entrada) / 0.9 kW (salida)', '31 litros', '16 kg', 'Challenger', 'operativo',
 '{"tipo":"Horno microondas con grill","potencia_grill":"1050 W","potencia_salida":"900 W","frecuencia":"2450 MHz","amperios":"11.25 A","niveles_potencia":6,"acabado":"Acero inoxidable","control":"Programador electronico digital","funciones":"Coccion express, Grill, Descongelado rapido, 10 metodos automaticos, Bloqueo panel","referencia":"1.8018.73"}'::jsonb);

-- Licuadora Oster (Auxiliar)
INSERT INTO "mantenimiento"."equipment" ("category_id", "name", "code", "brand", "model", "location", "voltage", "power", "capacity", "supplier", "status", "specs") VALUES
((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Auxiliar'),
 'Licuadora Industrial Oster', 'LI-001', 'Oster', '3X 2.0', 'Area de Produccion', '120V 60Hz', '0.6 kW', '1.25 litros (5 tazas) vidrio + acero inox', 'Oster', 'operativo',
 '{"tipo":"Licuadora con procesador","velocidades":3,"vasos":"Vidrio 1.25L + Acero inox 1.25L","accesorios":"Procesador de alimentos, Mini-Blend Jar, Cuchilla picahielo, Cuchilla malteadas","control":"Giratorio 3 velocidades"}'::jsonb);

-- Selladora Continua Hualian (Auxiliar - replaces the generic Audion)
UPDATE "mantenimiento"."equipment"
SET "name" = 'Selladora Continua Automatica',
    "brand" = 'Hualian',
    "model" = 'FRBM-810III',
    "voltage" = '110V 60Hz',
    "power" = '0.69 kW (motor 50W + sellado 600W + impresion 80W)',
    "capacity" = 'Sellado hasta 10mm ancho',
    "dimensions" = '95x55x82.5 cm',
    "weight" = '55 kg',
    "supplier" = 'Hualian Machinery',
    "specs" = '{"tipo":"Selladora continua de banda con impresion","velocidad":"0-12 m/min","temperatura":"0-300°C","ancho_sellado":"8-10mm","impresion":"Rodillo Solid-Ink 2-3 lineas","mesa":"950x180mm","carga_max_paquete":"1 kg","carga_total":"3 kg","procedencia":"China"}'::jsonb
WHERE "code" = 'SB-001';

-- Trampa de Grasas (Infraestructura - not equipment, but tracked)
INSERT INTO "mantenimiento"."equipment" ("category_id", "name", "code", "brand", "model", "location", "supplier", "status", "specs") VALUES
((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Auxiliar'),
 'Trampa de Grasas', 'TG-001', 'Fabricacion Nacional', 'Personalizada', 'Zona de Desagues', 'Contratista Civil', 'operativo',
 '{"tipo":"Trampa de grasas industrial","uso":"Separacion de grasas antes de vertimiento","mantenimiento":"Limpieza mensual obligatoria","planos":"Disponibles en documentacion"}'::jsonb);

-- Impresora de Etiquetas (Auxiliar)
INSERT INTO "mantenimiento"."equipment" ("category_id", "name", "code", "brand", "model", "location", "voltage", "supplier", "status", "specs") VALUES
((SELECT id FROM "mantenimiento"."equipment_categories" WHERE name = 'Auxiliar'),
 'Impresora de Etiquetas', 'IE-001', 'Generica', 'Cabezal termico', 'Area de Empaque', '110V 60Hz', 'Proveedor Local', 'operativo',
 '{"tipo":"Impresora termica de etiquetas","uso":"Etiquetado de producto terminado","cabezal":"Termico"}'::jsonb);

-- Also fix the existing selladora code (SB-001 was the Audion Sealkid, now it's the Hualian)
-- The Audion doesn't exist per the documents, remove the Empacadora al Vacio which was also generic
-- But let's keep the Multivac since vacuum packing is common

-- Add spare parts for key equipment
INSERT INTO "mantenimiento"."spare_parts" ("equipment_id", "name", "part_number", "supplier", "notes") VALUES
-- Amasadora CI Talsa spare parts
((SELECT id FROM "mantenimiento"."equipment" WHERE code = 'AT-001'), 'Banda Amasadora', '06030168', 'Citalsa', 'Kit repuestos'),
((SELECT id FROM "mantenimiento"."equipment" WHERE code = 'AT-001'), 'Interruptor Universal', '06030169', 'Citalsa', 'Kit repuestos'),
((SELECT id FROM "mantenimiento"."equipment" WHERE code = 'AT-001'), 'Interruptor de Emergencia', '06030170', 'Citalsa', 'Kit repuestos'),
((SELECT id FROM "mantenimiento"."equipment" WHERE code = 'AT-001'), 'Kit Completo Repuestos', '06030173', 'Citalsa', 'Kit completo'),

-- Horno Turbolino spare parts
((SELECT id FROM "mantenimiento"."equipment" WHERE code = 'HR-001'), 'Tarjeta Electronica de Mando', '0777.08', 'Zucchelli', 'Tarjeta electronica'),
((SELECT id FROM "mantenimiento"."equipment" WHERE code = 'HR-001'), 'Relevador 24 VAC', '2121', 'Omron', 'MOD.LY2 MCA OMRON PR051'),
((SELECT id FROM "mantenimiento"."equipment" WHERE code = 'HR-001'), 'Contactor 3RT1016-1AB01', '2104', 'Siemens', '24 Volts'),
((SELECT id FROM "mantenimiento"."equipment" WHERE code = 'HR-001'), 'Elemento Termico PR072', '2109', NULL, NULL),
((SELECT id FROM "mantenimiento"."equipment" WHERE code = 'HR-001'), 'Caratula Horno Turbolino', '0777.10', 'Zucchelli', NULL),
((SELECT id FROM "mantenimiento"."equipment" WHERE code = 'HR-001'), 'Tarjeta Relevadores', '2266', 'Aliant', '0127-0107'),

-- Hidrolavadora spare parts
((SELECT id FROM "mantenimiento"."equipment" WHERE code = 'HL-001'), 'Filtro Plegado Plano PTFE', '1.520-139.0', 'Karcher', 'Filtro de cartucho'),
((SELECT id FROM "mantenimiento"."equipment" WHERE code = 'HL-001'), 'Adaptador EASY!Lock M22AG-TR22AG', '4.111-029.0', 'Karcher', NULL),

-- Compresor FIAC spare parts
((SELECT id FROM "mantenimiento"."equipment" WHERE code = 'CA-001'), 'Filtro de Aire', NULL, 'FIAC', 'Cambio cada 2000 horas'),
((SELECT id FROM "mantenimiento"."equipment" WHERE code = 'CA-001'), 'Aceite Roto-Inject', NULL, 'FIAC', 'Cambio cada 4000 horas'),
((SELECT id FROM "mantenimiento"."equipment" WHERE code = 'CA-001'), 'Filtro Separador', NULL, 'FIAC', 'Cambio cada 4000 horas');

-- Add maintenance schedules for new equipment
INSERT INTO "mantenimiento"."maintenance_schedules" ("equipment_id", "title", "description", "maintenance_type", "frequency", "checklist", "responsible", "estimated_duration_minutes", "next_due_date") VALUES
-- Abatidores
((SELECT id FROM "mantenimiento"."equipment" WHERE code = 'AB-001'),
 'Mantenimiento Preventivo Abatidor Grande', 'Limpieza evaporador, verificacion refrigerante, revision empaques, limpieza condensador',
 'preventivo', 'trimestral',
 '[{"item":"Limpiar evaporador cobre-aluminio","done":false},{"item":"Verificar nivel refrigerante R404A","done":false},{"item":"Revisar empaques de puerta magneticos","done":false},{"item":"Verificar sonda multipoint","done":false},{"item":"Limpiar drenaje de descarga","done":false},{"item":"Verificar iluminacion LED Easy View","done":false},{"item":"Revisar ventiladores internos","done":false},{"item":"Descargar datos HACCP por USB","done":false}]'::jsonb,
 'Tecnico Refrigeracion', 90, '2026-06-01'),

-- Sarten Basculante
((SELECT id FROM "mantenimiento"."equipment" WHERE code = 'SBG-001'),
 'Mantenimiento Preventivo Sarten Basculante', 'Revision quemadores, termostato, mecanismo de volcado, limpieza general',
 'preventivo', 'mensual',
 '[{"item":"Revisar quemadores de 6 ramas","done":false},{"item":"Verificar termostato doble limitador","done":false},{"item":"Lubricar mecanismo de volcado/volante","done":false},{"item":"Verificar encendido electronico","done":false},{"item":"Revisar conexion de gas","done":false},{"item":"Limpiar cuba AISI 304","done":false}]'::jsonb,
 'Personal Mantenimiento', 45, '2026-04-01'),

-- Flow Pack
((SELECT id FROM "mantenimiento"."equipment" WHERE code = 'FPK-001'),
 'Mantenimiento Preventivo Flow Pack', 'Revision sistema de corte, reguladores de presion, ajuste parametros',
 'preventivo', 'mensual',
 '[{"item":"Revisar sistema de corte","done":false},{"item":"Verificar regulador de presion interno","done":false},{"item":"Verificar regulador de presion externo","done":false},{"item":"Revisar cinta transportadora","done":false},{"item":"Verificar parametros de temperatura y velocidad","done":false},{"item":"Limpiar sensores","done":false}]'::jsonb,
 'Tecnico Empaque', 60, '2026-04-01'),

-- Hidrolavadora
((SELECT id FROM "mantenimiento"."equipment" WHERE code = 'HL-001'),
 'Mantenimiento Preventivo Hidrolavadora', 'Revision filtros, mangueras, boquillas, presion de trabajo',
 'preventivo', 'trimestral',
 '[{"item":"Revisar y limpiar filtro PTFE","done":false},{"item":"Verificar presion de trabajo (130 bar)","done":false},{"item":"Revisar manguera de alta presion","done":false},{"item":"Verificar boquillas y adaptadores","done":false},{"item":"Revisar cable electrico","done":false}]'::jsonb,
 'Personal Mantenimiento', 30, '2026-05-01'),

-- Selladora Continua
((SELECT id FROM "mantenimiento"."equipment" WHERE code = 'SB-001'),
 'Mantenimiento Preventivo Selladora Continua', 'Revision banda, temperatura, sistema de impresion',
 'preventivo', 'mensual',
 '[{"item":"Revisar banda transportadora","done":false},{"item":"Verificar temperatura de sellado","done":false},{"item":"Cambiar rodillo Solid-Ink si necesario","done":false},{"item":"Limpiar sistema de sellado","done":false},{"item":"Verificar velocidad de banda","done":false}]'::jsonb,
 'Tecnico Empaque', 30, '2026-04-01');
