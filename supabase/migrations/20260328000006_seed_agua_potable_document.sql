-- Seed the Agua Potable program document with markdown content
UPDATE qms.sanitation_programs
SET program_document = '# Programa de Agua Potable
**Pastry Colombia SAS** | Versión 04 | Febrero 2026

---

## 1. Objetivo

Garantizar, controlar y asegurar que el agua utilizada en las actividades de limpieza y desinfección, procesamiento de alimentos y servicio general de Pastry Colombia SAS sea **potable**, con el fin de prevenir cualquier tipo de contaminación, asegurando la inocuidad de los productos procesados.

### 1.1 Objetivos Específicos

- Controlar la calidad del agua potable utilizada en la empresa, por medio de procedimientos a través de monitoreo o medición de los componentes del agua: **cloro residual, pH, color y olor**.
- Concientizar al personal que interviene en los diferentes procesos para el buen uso razonable del agua potable.

---

## 2. Alcance

El presente programa de agua potable aplicará a **todas las actividades y procesos** de la planta de producción de Pastry Colombia SAS en las cuales intervenga el agua potable para consumo humano.

```mermaid
graph LR
    A[Acueducto de Bogotá] --> B[Red de tuberías PVC]
    B --> C[Tanques de almacenamiento<br/>3 x 1000L]
    C --> D[Red interna de distribución]
    D --> E[Producción]
    D --> F[Limpieza y Desinfección]
    D --> G[Consumo humano]
    D --> H[Área administrativa]
    style A fill:#3b82f6,color:#fff
    style C fill:#0ea5e9,color:#fff
```

---

## 3. Definiciones

| Término | Definición |
|---------|-----------|
| **Agua Potable** | Agua que puede ser consumida sin restricción para beber o preparar alimentos, reuniendo los requisitos físicos, químicos y microbiológicos |
| **Bactericida** | Sustancia que tiene la capacidad de matar bacterias, microorganismos unicelulares u otros organismos |
| **Cloro Residual** | Cantidad de cloro que permanece en el agua después del tratamiento |
| **pH** | Medida de la acidez o basicidad de una solución (rango de 0 a 14) |
| **UPC** | Unidades utilizadas para expresar la medición de color de agua |

---

## 4. Responsables

```mermaid
graph TD
    A[Responsables del Programa] --> B[Personal Operativo]
    A --> C[Departamento de Calidad]
    B --> B1[Buen uso del agua]
    B --> B2[Evitar prácticas<br/>de contaminación]
    C --> C1[Control de parámetros<br/>Res. 2115 de 2007]
    C --> C2[Análisis diario de<br/>cloro residual y pH]
    style A fill:#3b82f6,color:#fff
    style B fill:#10b981,color:#fff
    style C fill:#8b5cf6,color:#fff
```

---

## 5. Desarrollo del Documento

El agua utilizada en la producción de Pastry Colombia SAS debe:
- Ser **suficiente** para cubrir cada una de las actividades.
- Provenir de una **fuente segura y confiable**.
- Cumplir con la **presión adecuada**.

Se realizan según el cronograma de muestreo (cod CR-06) los análisis fisicoquímicos y microbiológicos del agua.

A diario se registran controles de los criterios fisicoquímicos en el formato de control de cloro y pH (cod FO-23).

### 5.1 Fuentes de Suministro

Pastry Colombia SAS utiliza agua de calidad potable proveniente de la **Empresa de Acueducto y Alcantarillado de Bogotá**, conducida por tuberías de PVC.

### 5.2 Plan de Contingencia

En caso de suspensión del servicio de agua potable, se dispone de las siguientes empresas de suministro por carrotanque (mínimo 1000L):

| Empresa | Contacto |
|---------|----------|
| Agua Potable Bogotá | 3193530476 |
| Acuaexpress | 3204209107 |

**Requisitos del carrotanque:**
1. Concepto sanitario del vehículo emitido por la Secretaría Distrital de Salud.
2. Control de características fisicoquímicas y microbiológicas del agua.
3. Planillas de lavado y desinfección del carrotanque.
4. Vehículo en óptimas condiciones higiénicas.

```mermaid
flowchart TD
    A[Suspensión del suministro] --> B{¿Hay agua en tanques?}
    B -->|Sí| C[Usar reserva<br/>3000L disponibles]
    B -->|No| D[Solicitar carrotanque]
    D --> E[Verificar documentación<br/>del proveedor]
    E --> F[Recibir agua y<br/>verificar parámetros]
    F --> G[Almacenar en tanques]
    C --> H[Continuar operación]
    G --> H
    style A fill:#ef4444,color:#fff
    style H fill:#10b981,color:#fff
```

### 5.3 Almacenamiento y Usos del Agua

- **3 tanques** de polietileno con capacidad de **1000 litros** cada uno.
- Ubicados sobre el techo de la planta (~7 m de altura).
- Capacidad de reserva para cubrir **un día de producción**.

**Usos del agua potable:**
- Limpieza y desinfección de manos del personal
- Limpieza de equipos, superficies, utensilios y materias primas
- Limpieza de instalaciones
- Consumo del personal (dispensador en área social)
- Elaboración de productos

**Mantenimiento del tanque:**
- Frecuencia: **semestral**
- Actividades: limpieza, desinfección, mantenimiento de tubería
- El proveedor externo debe entregar fichas técnicas, hojas de seguridad e informe de actividad

### 5.4 Puntos de Muestreo

| # | Punto de Muestreo | Ubicación |
|---|-------------------|-----------|
| 1 | Chiller | Área de refrigeración |
| 2 | Filtro pan | Área de producción de pan |
| 3 | Filtro hojaldre | Área de producción de hojaldre |
| 4 | Cocina producción | Área de cocina en producción |
| 5 | Lavado canastillas | Área de lavado en producción |
| 6 | Filtro sanitario | Área de filtro sanitario |
| 7 | Cocina admin | Área de cocina administrativo |
| 8 | Baños | Producción y administración |

La frecuencia establecida es una **verificación diaria** en alguno de los puntos de muestreo.

### 5.4.1 Análisis Diarios

Se realiza un muestreo simple puntual en los diferentes puntos para análisis de **cloro libre residual** y **pH**, evaluados diariamente según la operación.

### 5.4.2 Procedimiento para Análisis de Cloro Libre Residual

```mermaid
flowchart TD
    A[Purgar celda y<br/>agregar agua] --> B[Adicionar 5 gotas de<br/>reactivo 1 y 2]
    B --> C[Completar celda<br/>hasta 5 ml]
    C --> D[Colocar tapa<br/>y agitar]
    D --> E[Comparar con carta<br/>de colores]
    E --> F[Leer valor de cloro<br/>en mg/L Cl₂]
    F --> G[Registrar en<br/>formato FO-23]
    style A fill:#3b82f6,color:#fff
    style G fill:#10b981,color:#fff
```

### 5.4.3 Procedimiento para Análisis de pH

```mermaid
flowchart TD
    A[Purgar celda y<br/>agregar agua] --> B[Completar celda<br/>hasta 5 ml]
    B --> C[Agregar 2 gotas de<br/>reactivo 3 y agitar]
    C --> D[Comparar con carta<br/>de colores]
    D --> E[Leer valor de pH]
    E --> F[Registrar en<br/>formato FO-23]
    style A fill:#8b5cf6,color:#fff
    style F fill:#10b981,color:#fff
```

### 5.5 Parámetros de Aceptabilidad

| Parámetro | Valor Ideal |
|-----------|------------|
| **Cloro Residual** | 0.3 – 2.0 mg/L |
| **pH** | 6.5 – 9.0 |

### 5.6 Acciones Correctivas

```mermaid
flowchart TD
    A[Resultado del análisis] --> B{¿Cloro < 0.3 ppm?}
    B -->|Sí| C[Adición de cloro]
    B -->|No| D{¿Cloro > 2.0 ppm?}
    D -->|Sí| E[Reducción de cloro]
    D -->|No| F{¿pH fuera de rango?}
    F -->|Sí| G[Informar al Acueducto<br/>+ solicitar carrotanque]
    F -->|No| H[✅ Parámetros OK]

    C --> C1[Llenar tanques 1000L]
    C1 --> C2[Cerrar paso de agua]
    C2 --> C3[Mezclar 7ml hipoclorito<br/>al 15% en 10L]
    C3 --> C4[Devolver al tanque<br/>y homogenizar]
    C4 --> C5[Esperar 15 min]
    C5 --> C6[Verificar 0.3-2.0 ppm]
    C6 --> C7[Abrir paso y purgar 5 min]

    E --> E1[Mezclar con agua<br/>que cumpla estándar]
    E --> E2[Destapar tanques<br/>para evaporación]
    E --> E3[Abrir llave y<br/>purgar agua]

    style A fill:#3b82f6,color:#fff
    style H fill:#10b981,color:#fff
    style C fill:#f59e0b,color:#fff
    style E fill:#f59e0b,color:#fff
    style G fill:#ef4444,color:#fff
```

> ⚠️ **Importante:** No es recomendable consumir agua potable que contenga más de 2 ppm de cloro.

### 5.7 Análisis Fisicoquímico y Microbiológico

Se realiza un muestreo según cronograma con análisis básico de parámetros establecidos en la **Resolución 2115 de 2007**, realizados por un **laboratorio externo**.

| Parámetro | Límite Normativo |
|-----------|-----------------|
| **Parámetros Fisicoquímicos** | |
| Color aparente | < 15 UPC |
| Turbiedad | 2 NTU |
| Cloro libre residual | 0.3 a 2.0 mg/L |
| pH | 6.5 a 9.0 |
| Cloruros | < 250 mg/L |
| Alcalinidad total | < 200 mg/L |
| Dureza total | < 300 mg/L |
| Hierro total | < 0.3 mg/L |
| **Parámetros Microbiológicos** | |
| Coliformes totales | 0 UFC/100 ml |
| E. coli | 0 UFC/100 ml |
| Mesófilos aerobios | 100 UFC/100 ml |

---

## 6. Normatividad de Referencia

- **Resolución 2115 de 2007** – Características y control de calidad del agua para consumo humano.
- **Resolución 2190 de 1991** – Normas sanitarias.

---

## 7. Documentos Asociados

- Formato control de cloro y pH — cod **FO-23** (Digital)
- Cronograma de muestreo — cod **CR-06**

---

## 8. Control de Cambios

| Fecha | Versión | Cambio | Responsable |
|-------|---------|--------|-------------|
| 2018-06-01 | V01 | Documento nuevo | Depto. Calidad |
| 2019-04-04 | V02 | Cambios en puntos de muestreo, cronograma, procedimientos de medición | Depto. Calidad |
| 2021-05-04 | V03 | Códigos de formatos, procedimiento adición de cloro, medidas para exceso de cloro | Director Calidad |
| 2026-02-16 | V04 | Acciones para pH fuera de parámetros | Depto. Calidad |'
WHERE code = 'agua_potable';
