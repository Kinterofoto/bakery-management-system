# Guia de Usuario — Plan Master (Cascada de Produccion)

Documento para el usuario final del sistema. Explica como funciona el planificador de produccion, el orden correcto de configuracion y uso, y los puntos de decision clave.

---

## Flujo General

```mermaid
flowchart TD
    START([Quiero programar produccion]) --> CONFIG{¿Ya tengo todo configurado?}

    CONFIG -->|No se| CHECK[Ver seccion: Que necesito antes de empezar]
    CONFIG -->|Si| OPEN[Abrir Plan Master]

    OPEN --> SELECT_WEEK[Seleccionar semana]
    SELECT_WEEK --> SELECT_PRODUCT[Elegir producto a producir]
    SELECT_PRODUCT --> SELECT_CELL[Click en celda: WC + dia + turno]
    SELECT_CELL --> SET_PARAMS[Definir duracion y personas]
    SET_PARAMS --> CALC{El sistema calcula automaticamente}

    CALC --> UNITS[Total unidades = UPH x personas x horas]
    UNITS --> BATCHES[Divide en lotes segun lote minimo]
    BATCHES --> CASCADE[Crea cascada por todos los centros de trabajo]
    CASCADE --> HAS_PP{¿El producto tiene materia prima PP?}

    HAS_PP -->|Si| BACKWARD[Crea cascada inversa para PP]
    HAS_PP -->|No| DONE[Produccion programada]
    BACKWARD --> DONE
```

---

## Que necesito antes de empezar

Antes de poder programar produccion, estos datos deben estar configurados **en este orden**:

```mermaid
flowchart TD
    subgraph PASO1["1. Centros de Trabajo"]
        WC[Crear centros de trabajo<br/>ARMADO, FERMENTACION, DECORADO...]
        WC --> WC_TYPE[Definir tipo de capacidad<br/>- Secuencial: 1 lote a la vez<br/>- Paralelo: varios lotes simultaneos<br/>- Hibrido: paralelo entre productos]
    end

    subgraph PASO2["2. Productos y Rutas"]
        PROD[Crear producto con lote minimo]
        PROD --> ROUTE[Definir ruta de produccion<br/>Orden de centros de trabajo<br/>Ej: ARMADO → FERMENTACION → DECORADO]
        ROUTE --> PRODUCTIVITY[Configurar productividad<br/>Unidades por hora por cada<br/>producto + centro de trabajo]
    end

    subgraph PASO3["3. Personal"]
        STAFF[Asignar personas por turno<br/>en cada centro de trabajo<br/>para cada dia de la semana]
    end

    subgraph PASO4["4. BOM - Solo si aplica"]
        BOM[Configurar ingredientes PP<br/>en la lista de materiales<br/>con cantidad necesaria<br/>y tiempo de reposo]
    end

    PASO1 --> PASO2
    PASO2 --> PASO3
    PASO3 --> PASO4

    PASO4 --> READY([Listo para programar])

    style PASO1 fill:#1a1a2e,stroke:#0A84FF,color:#fff
    style PASO2 fill:#1a1a2e,stroke:#30D158,color:#fff
    style PASO3 fill:#1a1a2e,stroke:#FF9500,color:#fff
    style PASO4 fill:#1a1a2e,stroke:#FF453A,color:#fff
```

### Detalle de cada prerequisito

| # | Configuracion | Donde | Obligatorio | Que pasa si falta |
|---|--------------|-------|-------------|-------------------|
| 1 | Centros de trabajo | Produccion → Config | Si | No aparecen filas en el grid |
| 2 | Ruta de produccion | Produccion → Rutas | Si | Cascada no se puede crear |
| 3 | Productividad (UPH) | Produccion → Productividad | Si | Error al crear cascada |
| 4 | Lote minimo | Productos → Editar | Si | No sabe como dividir lotes |
| 5 | Personal por turno | Plan Master → Fila "Personas" | Recomendado | Asume 1 persona (mas lento) |
| 6 | BOM con PP | Produccion → BOM | Solo si hay PP | No crea cascada inversa |
| 7 | Bloqueo de turnos | Plan Master → Click en turno | Opcional | Todos los turnos disponibles |

---

## Sistema de Turnos

La semana de produccion NO es igual a la semana calendario.

```mermaid
flowchart LR
    subgraph DIA["Un dia de produccion"]
        T1["T1: Nocturno<br/>22:00 - 06:00<br/>8 horas"]
        T2["T2: Manana<br/>06:00 - 14:00<br/>8 horas"]
        T3["T3: Tarde<br/>14:00 - 22:00<br/>8 horas"]
        T1 --> T2 --> T3
    end

    style T1 fill:#1C1C1E,stroke:#636366,color:#8E8E93
    style T2 fill:#1C1C1E,stroke:#0A84FF,color:#0A84FF
    style T3 fill:#1C1C1E,stroke:#FF9500,color:#FF9500
```

> **Importante**: El turno T1 (22:00) del sabado pertenece al **domingo** en el grid.
> La semana de produccion empieza el **sabado a las 22:00** y termina el siguiente sabado a las 22:00.

---

## Como se calcula la produccion

```mermaid
flowchart TD
    INPUT["Usuario define:<br/>- Producto<br/>- Centro de trabajo<br/>- Duracion: 2.5 horas<br/>- Personas: 4"]

    INPUT --> LOOKUP["Sistema busca productividad<br/>UPH = 300 unidades/hora"]

    LOOKUP --> FIXED{¿Operacion de tiempo fijo?<br/>Ej: Fermentacion}

    FIXED -->|Si| FIXED_CALC["Duracion = tiempo fijo<br/>(no importa cuantas personas)"]
    FIXED -->|No| CALC["Total = UPH x Personas x Horas<br/>300 x 4 x 2.5 = 3,000 unidades"]

    CALC --> BATCH["Dividir en lotes<br/>Lote minimo = 300<br/>3,000 / 300 = 10 lotes"]
    FIXED_CALC --> BATCH

    BATCH --> DURATION["Duracion por lote:<br/>300 / (300 x 4) x 60 = 15 min<br/>Mas personas = lotes mas rapidos"]

    DURATION --> SCHEDULE["Programar lotes en secuencia<br/>a traves de todos los centros"]
```

### Efecto del personal

```mermaid
flowchart LR
    subgraph S1["1 persona"]
        A1["Total: 750 u<br/>Duracion lote: 60 min<br/>3 lotes"]
    end

    subgraph S4["4 personas"]
        A4["Total: 3,000 u<br/>Duracion lote: 15 min<br/>10 lotes"]
    end

    S1 -.->|"4x mas produccion<br/>4x mas rapido por lote"| S4

    style S1 fill:#1C1C1E,stroke:#636366,color:#fff
    style S4 fill:#1C1C1E,stroke:#30D158,color:#fff
```

> **Excepcion**: Operaciones con **tiempo fijo** (como fermentacion u horneado) NO se aceleran con mas personas. El tiempo es siempre el mismo sin importar el personal.

---

## Tipos de Centro de Trabajo

```mermaid
flowchart TD
    WC_TYPE{¿Como procesa este<br/>centro de trabajo?}

    WC_TYPE -->|Secuencial| SEQ["SECUENCIAL (FIFO)<br/>Un lote a la vez<br/>Los demas hacen cola<br/><br/>Ejemplo: DECORADO<br/>Solo se puede decorar 1 lote"]

    WC_TYPE -->|Paralelo| PAR["PARALELO<br/>Varios lotes a la vez<br/>Hasta capacidad maxima<br/><br/>Ejemplo: FERMENTACION<br/>8 carros fermentando simultaneamente"]

    WC_TYPE -->|Hibrido| HYB["HIBRIDO<br/>Secuencial dentro del mismo producto<br/>Paralelo entre productos diferentes<br/><br/>Ejemplo: EMPASTADO<br/>Croissants en fila, pero<br/>Daneses en paralelo con Croissants"]

    style SEQ fill:#FF453A20,stroke:#FF453A,color:#fff
    style PAR fill:#30D15820,stroke:#30D158,color:#fff
    style HYB fill:#FF950020,stroke:#FF9500,color:#fff
```

---

## Cascada Forward vs Backward

```mermaid
flowchart TD
    subgraph FORWARD["CASCADA FORWARD (PT - Producto Terminado)"]
        direction LR
        F1["WC 1<br/>ARMADO<br/>↓ lotes 1,2,3"] --> F2["WC 2<br/>FERMENTACION<br/>↓ lotes 1,2,3"]
        F2 --> F3["WC 3<br/>DECORADO<br/>↓ lotes 1,2,3"]
    end

    subgraph BACKWARD["CASCADA BACKWARD (PP - Producto en Proceso)"]
        direction RL
        B3["Listo para<br/>usar en PT"] --> B2["WC 2<br/>procesando PP"]
        B2 --> B1["WC 1<br/>inicio PP"]
    end

    USER([Usuario programa PT]) --> FORWARD
    FORWARD --> CHECK{¿BOM tiene<br/>ingrediente PP?}
    CHECK -->|Si| BACKWARD
    CHECK -->|No| FIN([Listo])
    BACKWARD --> FIN

    style FORWARD fill:#0A84FF15,stroke:#0A84FF
    style BACKWARD fill:#FF453A15,stroke:#FF453A
```

### Sincronizacion PT ↔ PP

```mermaid
sequenceDiagram
    participant PP as PP (Materia Prima)
    participant PT as PT (Producto Final)

    Note over PP: Calcula hacia atras<br/>desde el ultimo lote del PT

    PP->>PP: Lote 1 PP
    PP->>PP: Lote 2 PP
    PP->>PP: Lote 3 PP (ultimo)

    Note over PP,PT: Tiempo de reposo

    PT->>PT: Lote 1 PT
    PT->>PT: Lote 2 PT
    PT->>PT: Lote 3 PT (ultimo)

    Note over PP,PT: PP termina ANTES<br/>de que PT lo necesite
```

> **Regla de oro**: El ultimo lote del PP debe terminar antes del ultimo lote del PT, con el tiempo de reposo de por medio.

---

## Bloqueo de Turnos

```mermaid
flowchart TD
    BLOCK_Q{¿Quiero bloquear<br/>un turno?}

    BLOCK_Q -->|Si| HOW["En Plan Master:<br/>1. Hover sobre turno<br/>2. Click para bloquear<br/>3. Arrastrar para bloquear varios"]

    HOW --> EFFECT["Efecto: Los lotes que caigan<br/>en turno bloqueado saltan<br/>automaticamente al siguiente<br/>turno disponible"]

    BLOCK_Q -->|No| ALL_OPEN["Todos los turnos disponibles<br/>para produccion"]

    EFFECT --> VISUAL["Visual: Rayas diagonales<br/>rojas en la celda bloqueada"]

    style EFFECT fill:#FF453A20,stroke:#FF453A,color:#fff
```

> **Importante**: Bloquear turnos ANTES de crear la cascada. El sistema respeta los bloqueos al momento de crear.

---

## Arbol de Decision: Crear Produccion

Cuando el usuario hace click en una celda para programar:

```mermaid
flowchart TD
    CLICK["Click en celda<br/>WC + Dia + Turno"] --> HAS_ROUTE{¿Producto tiene<br/>ruta de produccion?}

    HAS_ROUTE -->|No| SIMPLE["Crea schedule simple<br/>(sin cascada)"]
    HAS_ROUTE -->|Si| HAS_PROD{¿Tiene productividad<br/>configurada?}

    HAS_PROD -->|No| SIMPLE
    HAS_PROD -->|Si| GET_STAFF["Lee personal asignado<br/>de la tabla de staffing"]

    GET_STAFF --> STAFF_CHECK{¿Hay personal<br/>configurado?}

    STAFF_CHECK -->|No hay registro| DEFAULT["Usa 1 persona<br/>por defecto"]
    STAFF_CHECK -->|Si| USE_STAFF["Usa el numero<br/>configurado"]

    DEFAULT --> CASCADE
    USE_STAFF --> CASCADE

    CASCADE["Crear Cascada V2<br/>(~500ms)"] --> V2_OK{¿Exito?}

    V2_OK -->|Si| CHECK_PP{¿BOM tiene PP?}
    V2_OK -->|No| V1["Fallback a V1<br/>(~13s, via FastAPI)"]
    V1 --> CHECK_PP

    CHECK_PP -->|Si| PP_CASCADE["Cascada inversa<br/>automatica para PP"]
    CHECK_PP -->|No| SHOW["Mostrar en grid"]
    PP_CASCADE --> PP_DEADLINE{¿PP alcanza<br/>con 1 WC?}

    PP_DEADLINE -->|Si| SHOW
    PP_DEADLINE -->|No| MULTI_WC["Distribuir lotes<br/>entre multiples WC"]
    MULTI_WC --> SHOW
```

---

## Distribucion Multi-Centro de Trabajo

Solo aplica para PP cuando no alcanza el tiempo:

```mermaid
flowchart TD
    DEADLINE["PP tiene deadline:<br/>debe estar listo antes del PT"]

    DEADLINE --> TRY_ONE["Intentar con WC primario<br/>(el de la ruta)"]

    TRY_ONE --> FITS{¿Alcanza el tiempo<br/>con 1 solo WC?}

    FITS -->|Si| DONE_ONE["Todos los lotes<br/>en 1 centro"]

    FITS -->|No| CHECK_ALT{¿Hay WCs alternativos<br/>con personal asignado?}

    CHECK_ALT -->|No| FORCE["Forzar en 1 WC<br/>aunque no alcance"]

    CHECK_ALT -->|Si| DISTRIBUTE["Mover ultimos lotes<br/>a WCs alternativos"]

    DISTRIBUTE --> FITS2{¿Ahora alcanza?}
    FITS2 -->|Si| DONE_MULTI["Lotes distribuidos<br/>entre 2+ centros"]
    FITS2 -->|No| MORE["Seguir distribuyendo<br/>hasta que alcance"]

    style DONE_ONE fill:#30D15820,stroke:#30D158,color:#fff
    style DONE_MULTI fill:#FF950020,stroke:#FF9500,color:#fff
    style FORCE fill:#FF453A20,stroke:#FF453A,color:#fff
```

---

## Problemas Comunes y Soluciones

```mermaid
flowchart TD
    PROBLEM{¿Que problema tengo?}

    PROBLEM --> P1["Puse 4 personas pero<br/>programa igual que con 1"]
    PROBLEM --> P2["La cascada no se crea"]
    PROBLEM --> P3["No veo el PP<br/>en el grid"]
    PROBLEM --> P4["Los lotes se movieron<br/>de lugar solos"]
    PROBLEM --> P5["No puedo ver semanas<br/>anteriores"]

    P1 --> S1["Verificar que el personal<br/>se guardo correctamente.<br/>Cambiar → esperar → crear cascada.<br/>Staff afecta velocidad Y cantidad."]

    P2 --> S2["Verificar:<br/>1. ¿Producto tiene ruta?<br/>2. ¿Tiene productividad?<br/>3. ¿Centro de trabajo activo?"]

    P3 --> S3["Verificar:<br/>1. ¿BOM tiene ingredientes PP?<br/>2. ¿PP tiene ruta y productividad?<br/>3. ¿Semana correcta?"]

    P4 --> S4["Es normal. Los centros<br/>secuenciales reorganizan<br/>TODA la cola cuando llegan<br/>nuevos lotes (FIFO)."]

    P5 --> S5["El selector muestra 12 semanas<br/>atras. Usar flechas o dropdown<br/>para navegar."]

    style S1 fill:#30D15820,stroke:#30D158,color:#fff
    style S2 fill:#FF950020,stroke:#FF9500,color:#fff
    style S3 fill:#0A84FF20,stroke:#0A84FF,color:#fff
    style S4 fill:#8E8E9320,stroke:#8E8E93,color:#fff
    style S5 fill:#8E8E9320,stroke:#8E8E93,color:#fff
```

---

## Resumen Visual del Proceso Completo

```mermaid
flowchart TD
    subgraph CONFIG["CONFIGURACION (una sola vez)"]
        C1["1. Centros de trabajo"] --> C2["2. Rutas de produccion"]
        C2 --> C3["3. Productividad por producto"]
        C3 --> C4["4. BOM con PP si aplica"]
    end

    subgraph SEMANAL["CADA SEMANA"]
        S1["5. Asignar personal por turno"] --> S2["6. Bloquear turnos no disponibles"]
    end

    subgraph DIARIO["PROGRAMAR PRODUCCION"]
        D1["7. Seleccionar producto + celda"] --> D2["8. Sistema crea cascada automatica"]
        D2 --> D3["9. Verificar visualmente"]
        D3 --> D4{¿Correcto?}
        D4 -->|Si| D5["Produccion programada"]
        D4 -->|No| D6["Eliminar y reprogramar"]
        D6 --> D1
    end

    CONFIG --> SEMANAL
    SEMANAL --> DIARIO

    style CONFIG fill:#0A84FF10,stroke:#0A84FF
    style SEMANAL fill:#FF950010,stroke:#FF9500
    style DIARIO fill:#30D15810,stroke:#30D158
```

---

## Glosario

| Termino | Significado |
|---------|-------------|
| **PT** | Producto Terminado — el producto final que se vende |
| **PP** | Producto en Proceso — materia prima que se produce internamente |
| **WC** | Work Center / Centro de Trabajo — maquina o estacion |
| **UPH** | Units Per Hour — unidades que produce un WC por hora |
| **Lote minimo** | Tamano minimo de un lote de produccion |
| **Cascada** | Programacion automatica a traves de todos los WC |
| **Forward** | Cascada hacia adelante (PT: WC1 → WC2 → WC3) |
| **Backward** | Cascada hacia atras (PP: se calcula desde el PT) |
| **T1 / T2 / T3** | Turnos: Nocturno (22-06), Manana (06-14), Tarde (14-22) |
| **FIFO** | First In, First Out — los lotes se procesan en orden de llegada |
| **Bloqueo** | Turno marcado como no disponible para produccion |
| **Staffing** | Cantidad de personas asignadas a un WC por turno |
| **BOM** | Bill of Materials — lista de ingredientes/materias primas |
| **Tiempo de reposo** | Pausa obligatoria entre operaciones (ej: fermentacion) |
| **Tiempo fijo** | Operacion cuya duracion NO depende del personal |
