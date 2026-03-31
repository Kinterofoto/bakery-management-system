-- Seed program document for Microbiología from "Programa Plan de muestreo V4.docx"
UPDATE "qms"."sanitation_programs"
SET "program_document" = '# Programa Plan de Muestreo Microbiológico

## 1. Objetivos

Garantizar la calidad e inocuidad de los productos que procesa y comercializa la empresa Pastry Chef Pastelería y Cocina Gourmet S.A.S, con el fin de asegurar el cumplimiento de los requisitos establecidos en el plan de muestreo, evitando riesgos asociados a la salud del consumidor final.

## 2. Alcance

El programa de muestreo aplicará a todas las etapas que intervienen en el proceso productivo, desde la recepción de materias primas hasta el despacho del producto terminado, así como el personal manipulador de alimentos, ambientes, superficies, insumos, etc.

## 3. Responsables

Departamento de Calidad: verificar el cumplimiento del cronograma propuesto y realizar seguimiento a las muestras con resultados No Aceptable, y garantizar las buenas prácticas de manufactura durante el proceso de producción.

## 4. Desarrollo del Documento

Pastry Chef Pastelería y Cocina Gourmet S.A.S determinó realizar el plan de muestreo teniendo en cuenta los riesgos para la salud pública asociados con peligros de intoxicación (físicos, químicos y biológicos). Se cuenta con el almacenamiento de las contra muestras, las cuales deberán tomarse al mismo tiempo y en la misma forma que la muestra original para asegurar condiciones idénticas.

El periodo de cumplimiento de este programa será de 1 año para su posterior almacenamiento en medio físico dispuesto por la empresa como archivo inactivo.

### 4.1 Procedimiento de contramuestras producto terminado

- Se debe tomar contra muestra a diario de cada lote de producto terminado de alto riesgo.
- Las contramuestras deben pesar entre 150 a 200 gramos.
- Toda muestra debe ser rotulada con: Nombre, fecha de producción, lote, fecha de vencimiento, peso.
- Las contra-muestras se almacenan durante el tiempo de vida útil, en las condiciones de almacenamiento determinadas.
- Toda contra muestra se registra en el formato MC-PR-MUE-F-2.
- La destrucción se realiza al completar la vida útil del producto con agua jabonosa y solución desinfectante de hipoclorito.

### 4.2 Evaluación interna de Calidad

El analista o inspector(a) de Calidad, supervisor o coordinador de producción realizan evaluaciones periódicas al producto por medio de evaluación sensorial y física (tamaño, color, sabor, textura, entre otros). Estos análisis son una forma preventiva para detectar factores que pueden constituir deficiencias del proceso productivo.

## 5. Toma de Muestras para Laboratorio

Se cuenta con proveedor externo acreditado: **INSTRUMENTAL SERVICE LABORATORIO S.A.S.** (NIT. 900.264.209-1).

### 5.1 Plan de muestreo y procedimiento

El muestreo se realiza en las instalaciones por parte del laboratorio con acompañamiento del encargado de calidad. La toma de muestras se realiza según la frecuencia establecida en el cronograma de muestreo (MC-PR-PM-INS-10).

Las muestras son tomadas por el prestador del servicio de acuerdo a su protocolo. El laboratorio tiene la responsabilidad de asegurar custodia y transporte garantizando manejo, condiciones adecuadas y la no alteración de la misma.

### 5.2 Análisis de resultados

INSTRUMENTAL SERVICE LABORATORIO S.A.S cuenta con técnicas validadas y metodologías aprobadas por el INVIMA.

- **Resultado ACEPTABLE**: el documento se archiva como soporte.
- **Resultado NO ACEPTABLE**: se realiza seguimiento con planes de acción para nuevo muestreo hasta obtener ACEPTABILIDAD.

## 6. Indicadores

### 6.1 Indicador de cumplimiento
`(Muestras realizadas al mes / Muestras programadas al mes) × 100`

### 6.2 Indicador de Aceptabilidad en Inocuidad
`(Muestras no aceptables al mes / Muestras realizadas) × 100`

### 6.3 Indicador de Aceptabilidad en Calidad
`(Muestras no conformes al mes / Muestras realizadas al mes) × 100`

## 7. Normatividad de Referencia

- Resolución 2674/2013
- Resolución 2115 de 2007
- Resolución 719 de 2015
- Resolución 683 de 2012
- Resolución 5109 de 2005
- Ley 09 de 1979 y demás decretos reglamentarios

## 8. Documentos Asociados

- Cronograma de muestreo (CR-06 V2.0)
- Formato contramuestras (MC-PR-MUE-F-2)
- Reporte de resultados emitido por el laboratorio externo
- Control de resultados de laboratorio (Indicadores)
- Instructivo Parámetros de análisis de aceptación de fisicoquímicos y microbiológicos
- Instructivo Acciones correctivas programa de muestreo'
WHERE "code" = 'microbiologia';
