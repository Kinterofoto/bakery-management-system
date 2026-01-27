# Sistema de Produccion en Cascada

Documentacion tecnica del sistema de produccion en cascada para la planificacion semanal de produccion.

## Indice

1. [Overview](#overview)
2. [Arquitectura](#arquitectura)
3. [Modelo de Datos](#modelo-de-datos)
4. [Logica de Turnos y Semanas](#logica-de-turnos-y-semanas)
5. [Algoritmo de Cascada](#algoritmo-de-cascada)
6. [Encolamiento en Centros Secuenciales](#encolamiento-en-centros-secuenciales)
7. [Reorganizacion Dinamica de Colas](#reorganizacion-dinamica-de-colas)
8. [API Endpoints](#api-endpoints)
9. [Ejemplos Practicos](#ejemplos-practicos)
10. [Historial de Cambios](#historial-de-cambios)

---

## Overview

El sistema de cascada permite programar produccion de un producto a traves de todos sus centros de trabajo (operaciones) automaticamente. Cuando se programa produccion en el primer centro, el sistema calcula y crea schedules para todas las operaciones subsiguientes respetando:

- **Rutas de produccion**: Secuencia de operaciones definida en `production_routes`
- **Tiempos de reposo**: Tiempo entre operaciones definido en BOM
- **Tipo de procesamiento**: Paralelo (hornos con carros) o secuencial (una unidad a la vez)
- **Limites de semana**: Solo considera schedules dentro de la semana seleccionada (Sabado 22:00 a Sabado 22:00)

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  WeeklyPlanGrid.tsx → handleDirectCreate() → POST /cascade/create│
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND (FastAPI)                        │
│  cascade.py → generate_cascade_schedules()                       │
│                                                                  │
│  1. Obtiene ruta de produccion (production_routes)               │
│  2. Calcula cantidad total y divide en batches (lote_minimo)     │
│  3. Para cada centro de trabajo en la ruta:                      │
│     - Calcula tiempos de inicio/fin por batch                    │
│     - Verifica schedules existentes (solo semana actual)         │
│     - Encola si es secuencial, paraleliza si tiene capacidad     │
│  4. Inserta schedules en production_schedules                    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DATABASE (Supabase)                      │
│  Schema: produccion                                              │
│  Tables: production_schedules, production_routes, work_centers   │
│  Triggers: check_schedule_conflict (valida capacidad)            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Modelo de Datos

### production_schedules

```sql
CREATE TABLE produccion.production_schedules (
  id UUID PRIMARY KEY,
  resource_id UUID REFERENCES work_centers(id),  -- Centro de trabajo
  product_id UUID REFERENCES products(id),
  quantity INTEGER,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,

  -- Campos de cascada
  production_order_number INTEGER,  -- Agrupa todos los schedules de una cascada
  cascade_level INTEGER,            -- Nivel en la ruta (1=Armado, 2=Fermentacion, etc)
  cascade_source_id UUID,           -- Schedule del que depende (batch anterior)
  batch_number INTEGER,             -- Numero de lote (1, 2, 3...)
  total_batches INTEGER,            -- Total de lotes en la orden
  batch_size NUMERIC,               -- Unidades por lote

  status TEXT DEFAULT 'scheduled'
);
```

### production_routes

```sql
CREATE TABLE produccion.production_routes (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  work_center_id UUID REFERENCES work_centers(id),
  sequence_order INTEGER,  -- Orden en la ruta (1, 2, 3...)
  is_active BOOLEAN DEFAULT true
);
```

### work_centers

```sql
CREATE TABLE produccion.work_centers (
  id UUID PRIMARY KEY,
  name TEXT,
  operation_id UUID,
  tipo_capacidad TEXT,              -- 'carros' o 'unidades'
  capacidad_maxima_carros INTEGER,  -- Si > 1, permite procesamiento paralelo
  is_active BOOLEAN DEFAULT true
);
```

---

## Logica de Turnos y Semanas

### Definicion de Turnos

| Turno | Horario | Descripcion |
|-------|---------|-------------|
| T1 | 22:00 - 06:00 | Turno nocturno (inicia dia anterior) |
| T2 | 06:00 - 14:00 | Turno matutino |
| T3 | 14:00 - 22:00 | Turno vespertino |

### Limites de Semana de Produccion

La semana de produccion NO coincide con la semana calendario:

```
Semana de Produccion:
  INICIO: Sabado 22:00 (T1 del Domingo)
  FIN:    Sabado 22:00 (siguiente)

Ejemplo: Semana del 21-28 de Diciembre
  - Inicia: Sabado 21 Dic a las 22:00
  - Termina: Sabado 28 Dic a las 22:00
```

### Asignacion de Turnos en Frontend

El frontend calcula el turno y dia basandose en la hora de inicio:

```typescript
// use-shift-schedules.ts - Lineas 124-141

// Determinar turno basado en hora de inicio real
let shiftNumber: 1 | 2 | 3
if (startHour >= 22 || startHour < 6) {
  shiftNumber = 1  // T1: 22:00 - 06:00
} else if (startHour >= 6 && startHour < 14) {
  shiftNumber = 2  // T2: 06:00 - 14:00
} else {
  shiftNumber = 3  // T3: 14:00 - 22:00
}

// Para T1, el schedule "pertenece" al DIA SIGUIENTE
// porque T1 empieza a las 22:00 del dia anterior
let dayIndex = startDate.getDay()
if (startHour >= 22) {
  dayIndex = (dayIndex + 1) % 7  // Mover al dia siguiente
}
```

**Importante**: Un schedule con `start_date: 2025-12-21 22:00` se muestra en la columna del **22 de Diciembre** (no del 21).

---

## Algoritmo de Cascada

### Flujo Principal

```python
async def generate_cascade_schedules(...):
    # 1. Obtener ruta de produccion ordenada
    production_route = await get_product_route(product_id)
    # Ejemplo: [ARMADO, FERMENTACION, DECORADO]

    # 2. Calcular cantidad total
    units_per_hour = productivity.units_per_hour
    total_units = units_per_hour * staff_count * duration_hours

    # 3. Dividir en batches (lote_minimo)
    batch_sizes = distribute_units_into_batches(total_units, lote_minimo)
    # Ejemplo: 900 unidades / 300 lote_min = [300, 300, 300]

    # 4. Para cada centro de trabajo en la ruta
    for route_step in production_route:
        # 4a. Verificar si es paralelo o secuencial
        is_parallel = tipo_capacidad == "carros" and capacidad > 1

        # 4b. Para centros secuenciales, verificar cola existente
        if not is_parallel:
            existing_end = await get_existing_queue_end(
                work_center_id,
                earliest_possible_start,
                week_end_datetime  # Solo dentro de la semana
            )
            if existing_end:
                sequential_queue_end = existing_end

        # 4c. Crear schedule para cada batch
        for batch_idx, batch_size in enumerate(batch_sizes):
            # Calcular tiempo de inicio
            if es_primera_operacion:
                batch_start = start_datetime + offset
            else:
                batch_start = prev_batch_end + rest_time

            # Si es secuencial y hay cola, encolar despues
            if not is_parallel and sequential_queue_end > batch_start:
                batch_start = sequential_queue_end

            # Calcular fin
            batch_end = batch_start + duration

            # Actualizar cola para siguiente batch
            if not is_parallel:
                sequential_queue_end = batch_end

            # Insertar schedule
            insert_schedule(...)
```

### Calculo de Duracion por Batch

```python
def calculate_batch_duration_minutes(productivity, batch_size):
    if productivity.usa_tiempo_fijo:
        # Operaciones con tiempo fijo (ej: horneado)
        return productivity.tiempo_minimo_fijo
    else:
        # Operaciones basadas en unidades/hora
        hours = batch_size / productivity.units_per_hour
        return hours * 60
```

---

## Encolamiento en Centros Secuenciales

### Problema

Cuando dos productos comparten un centro de trabajo secuencial y se programan al mismo tiempo, sus batches deben hacer cola (FIFO).

### Solucion Implementada

```python
# cascade.py - Lineas 277-307

# Para centros secuenciales, verificar schedules existentes
sequential_queue_end: Optional[datetime] = None
if not is_parallel:
    # Calcular hora mas temprana posible de inicio
    if not previous_batch_schedules:
        earliest_possible_start = start_datetime
    else:
        prev_end = previous_batch_schedules[0]["end_date"]
        earliest_possible_start = prev_end + rest_time

    # Buscar schedules existentes (SOLO dentro de la semana)
    existing_end = await get_existing_queue_end(
        supabase,
        wc_id,
        earliest_possible_start,
        week_end_datetime  # Limite de semana
    )
    if existing_end:
        sequential_queue_end = existing_end
```

### Filtro por Semana

Solo se consideran schedules que **empiecen dentro de la semana seleccionada**:

```python
async def get_existing_queue_end(
    supabase,
    work_center_id: str,
    after_datetime: datetime,
    week_end_datetime: Optional[datetime] = None
):
    query = supabase.schema("produccion").table("production_schedules").select(
        "end_date"
    ).eq(
        "resource_id", work_center_id
    ).gte(
        "end_date", after_datetime.isoformat()
    )

    # Solo considerar schedules que EMPIECEN dentro de la semana
    if week_end_datetime:
        query = query.lt("start_date", week_end_datetime.isoformat())

    result = query.order("end_date", desc=True).limit(1).execute()
```

### Calculo de Limites de Semana

```python
# Semana: Sabado 22:00 a Sabado 22:00
start_dt = request.start_datetime
if start_dt.tzinfo is not None:
    start_dt = start_dt.replace(tzinfo=None)

# weekday(): Monday=0, Saturday=5, Sunday=6
days_since_saturday = (start_dt.weekday() - 5) % 7
week_start = start_dt - timedelta(days=days_since_saturday)
week_start = week_start.replace(hour=22, minute=0, second=0, microsecond=0)

# Si estamos antes del sabado 22:00, retroceder una semana
if start_dt < week_start:
    week_start = week_start - timedelta(days=7)

week_end = week_start + timedelta(days=7)
```

---

## Reorganizacion Dinamica de Colas

### Problema

Cuando nuevos batches llegan a un centro de trabajo secuencial que ya tiene schedules existentes, la cola completa debe reorganizarse basándose en el tiempo de llegada (arrival_time) de cada batch.

**Arrival time** = `end_date` del schedule anterior + `rest_time` (tiempo de reposo del BOM)

Los batches de diferentes productos pueden intercalarse según su orden de llegada.

### Sistema de 4 Fases para Evitar Overlaps

El constraint de PostgreSQL (`check_schedule_conflict`) impide que dos schedules se solapen en el mismo recurso. Esto causa problemas al reorganizar schedules existentes. La solución es un proceso de 4 fases:

```python
# Phase 0: Clean parking area
# Elimina schedules huérfanos de intentos previos fallidos
supabase.schema("produccion").table("production_schedules").delete().eq(
    "resource_id", wc_id
).gte(
    "start_date", week_end_datetime.isoformat()
).execute()

# Phase 1: Park existing schedules
# Mueve schedules existentes fuera de la semana (week_end + 1 day)
parking_start = week_end_datetime + timedelta(days=1)
for schedule in existing_to_update:
    parking_end = parking_start + timedelta(minutes=schedule["duration_minutes"])
    # Update schedule to parking position
    parking_start = parking_end  # Next schedule starts where this one ended

# Phase 2: Insert new schedules
# Inserta nuevos schedules en sus posiciones correctas
for new_schedule in new_schedules:
    insert_schedule(new_schedule)

# Phase 3: Move to final positions
# Mueve schedules desde parking a sus posiciones finales
for schedule in existing_to_update:
    update_schedule(schedule, final_position)
```

### Recalculación de Cola

Cuando llegan nuevos batches, todos los schedules (existentes + nuevos) se reorganizan:

```python
async def get_existing_schedules_with_arrival(
    work_center_id, week_start, week_end
) -> List[dict]:
    """Obtiene schedules existentes con sus arrival_times calculados."""
    # Para cada schedule existente:
    # 1. Buscar su cascade_source
    # 2. Obtener end_date del source
    # 3. Buscar rest_time en BOM usando operation_id
    # 4. arrival_time = source.end_date + rest_time

def recalculate_queue_times(all_schedules: List[dict]) -> List[dict]:
    """Recalcula tiempos de todos los schedules basado en arrival order."""
    # 1. Ordenar por arrival_time
    sorted_schedules = sorted(all_schedules, key=lambda x: x["arrival_time"])

    # 2. Asignar tiempos secuencialmente
    queue_end = None
    for schedule in sorted_schedules:
        start_time = max(schedule["arrival_time"], queue_end or datetime.min)
        end_time = start_time + timedelta(minutes=schedule["duration_minutes"])
        schedule["new_start_date"] = start_time
        schedule["new_end_date"] = end_time
        queue_end = end_time

    return sorted_schedules
```

### Ejemplo de Reorganización

**Situación inicial:**
- Producto A: 2 batches ya programados en DECORADO
  - A-B1: 16:30 - 17:50
  - A-B2: 17:50 - 19:10

**Llega Producto B:** 2 batches nuevos
- B-B1 arrival: 17:00 (llega mientras A-B1 está procesando)
- B-B2 arrival: 18:20

**Cola reorganizada:**
```
A-B1: 16:30 - 17:50  (arrival: 16:30, primero)
B-B1: 17:50 - 19:10  (arrival: 17:00, segundo - espera a que termine A-B1)
A-B2: 19:10 - 20:30  (arrival: 17:50, tercero - intercalado)
B-B2: 20:30 - 21:50  (arrival: 18:20, cuarto)
```

Los batches se intercalan según su orden de llegada, no por producto.

---

## API Endpoints

### POST /api/production/cascade/create

Crea una produccion en cascada.

**Request:**
```json
{
  "work_center_id": "uuid",      // Ignorado - usa production_routes
  "product_id": "uuid",
  "start_datetime": "2025-12-22T08:00:00",
  "duration_hours": 2.5,
  "staff_count": 1,
  "week_plan_id": "uuid"         // Opcional
}
```

**Response:**
```json
{
  "production_order_number": 42,
  "product_id": "uuid",
  "product_name": "Croissant Europa",
  "total_units": 750,
  "lote_minimo": 300,
  "num_batches": 3,
  "schedules_created": 9,
  "work_centers": [...],
  "cascade_start": "2025-12-22T08:00:00",
  "cascade_end": "2025-12-22T19:20:00"
}
```

### POST /api/production/cascade/preview

Preview sin crear en base de datos. Mismos parametros y respuesta que `/create`.

### GET /api/production/cascade/order/{order_number}

Obtiene todos los schedules de una orden de produccion.

### DELETE /api/production/cascade/order/{order_number}

Elimina todos los schedules de una orden de produccion.

---

## Ejemplos Practicos

### Ejemplo 1: Cascada Simple

**Producto:** Croissant Europa
**Ruta:** ARMADO → FERMENTACION → DECORADO
**Lote minimo:** 300
**Inicio:** 08:00, Duracion: 2.5h, Staff: 1

```
Calculo:
- Total unidades: 300 u/h × 1 staff × 2.5h = 750 unidades
- Batches: ceil(750/300) = 3 batches de 250 unidades cada uno

Resultado:
ARMADO (secuencial):
  Batch 1: 08:00 - 08:50
  Batch 2: 08:50 - 09:40
  Batch 3: 09:40 - 10:30

FERMENTACION (paralelo, 8 carros):
  Batch 1: 10:30 - 16:30 (6h reposo)
  Batch 2: 09:40 - 15:40
  Batch 3: 10:30 - 16:30
  (Pueden solaparse porque hay capacidad)

DECORADO (secuencial):
  Batch 1: 16:30 - 17:50
  Batch 2: 17:50 - 19:10
  Batch 3: 19:10 - 20:30
```

### Ejemplo 2: Dos Productos con Centro Compartido

**Producto A:** Croissant Europa (3 batches)
**Producto B:** Croissant Multicereal (2 batches)
**Centro compartido:** DECORADO (secuencial)

```
Si ambos se programan para las 08:00:

DECORADO - Cola FIFO:
  Europa B1:      16:30 - 17:50
  Europa B2:      17:50 - 19:10
  Europa B3:      19:10 - 20:30
  Multicereal B1: 20:30 - 22:00  ← Espera su turno
  Multicereal B2: 22:00 - 23:30
```

---

## Historial de Cambios

### 2026-01-20

#### Feature: Reorganización dinámica de colas en centros secuenciales
- **Problema**: Cuando nuevos batches llegan a un centro de trabajo secuencial con schedules existentes, no se reorganizaba la cola completa
- **Solución**: Sistema de recalculación de cola basado en arrival_time (end_date del schedule anterior + rest_time)
- **Implementación**:
  - `get_existing_schedules_with_arrival()`: Obtiene schedules existentes con sus arrival_times calculados
  - `recalculate_queue_times()`: Reorganiza todos los schedules (existentes + nuevos) por orden de llegada
  - Los batches de diferentes productos pueden intercalarse según su arrival_time
- **Archivo**: `apps/api/app/api/routes/production/cascade.py`

#### Fix: Sistema de 4 fases para evitar violaciones de overlap constraint
- **Problema**: Al reorganizar schedules existentes, el constraint de PostgreSQL rechazaba updates por overlap
- **Solución**: Proceso de 4 fases:
  - **Fase 0**: Limpia área de parking (elimina schedules huérfanos de intentos fallidos)
  - **Fase 1**: Parkea schedules existentes fuera de la semana (week_end + 1 day)
  - **Fase 2**: Inserta nuevos schedules en sus posiciones correctas
  - **Fase 3**: Mueve schedules existentes a sus posiciones finales
- **Archivo**: `apps/api/app/api/routes/production/cascade.py`

#### Fix: Cálculo correcto de rest_time para schedules existentes
- **Problema**: Schedules existentes no incluían rest_time en su arrival_time
- **Solución**: Buscar rest_time en BOM usando operation_id del work center source
- **Archivo**: `apps/api/app/api/routes/production/cascade.py`

#### UI: Loading overlay durante generación de cascada
- **Problema**: Usuario no tenía feedback durante la generación de cascada
- **Solución**: Overlay con spinner y mensajes ("Generando cascada...", "Actualizando vista...")
- **Archivo**: `apps/web/components/plan-master/weekly-grid/WeeklyPlanGrid.tsx`

#### Fix: Evitar creación de schedule fallback en errores de overlap
- **Problema**: Cuando cascada fallaba por overlap, se creaba schedule fallback incorrecto
- **Solución**: Solo crear fallback para errores de "no production route", no para overlaps
- **Archivo**: `apps/web/components/plan-master/weekly-grid/WeeklyPlanGrid.tsx`

### 2026-01-19

#### Fix: T1 schedules se muestran en dia correcto
- **Problema**: Schedules de T1 (22:00-06:00) se mostraban en el dia del `start_date` en lugar del dia al que pertenecen
- **Solucion**: Calcular `shiftNumber` y `dayIndex` basandose en la hora real de inicio
- **Archivo**: `apps/web/hooks/use-shift-schedules.ts`

#### Fix: Cascada encola batches despues de schedules existentes
- **Problema**: Cascada no verificaba schedules existentes, causando rechazos del trigger de BD
- **Solucion**: Usar `get_existing_queue_end()` para inicializar la cola en centros secuenciales
- **Archivo**: `apps/api/app/api/routes/production/cascade.py`

#### Fix: Solo considerar schedules dentro de la semana seleccionada
- **Problema**: Schedules de otras semanas afectaban el calculo de colas
- **Solucion**: Agregar filtro `week_end_datetime` a `get_existing_queue_end()`
- **Archivo**: `apps/api/app/api/routes/production/cascade.py`

#### Fix: Limites de semana correctos (Sabado 22:00)
- **Problema**: Se usaba Domingo 6am como inicio de semana
- **Solucion**: Cambiar a Sabado 22:00 (cuando inicia T1 del Domingo)
- **Archivo**: `apps/api/app/api/routes/production/cascade.py`

### 2026-01-18

- Removido filtro de "solo Armado" en PlanMaster
- Sistema de cascada completamente funcional

### 2026-01-17

- Implementacion inicial de cascada
- Endpoints: create, preview, order, delete
- Frontend: CascadePreviewModal, integracion en WeeklyPlanGrid
- Pruebas de conflictos en centros compartidos

---

## 🧪 Cascada Inversa para PP (En Pruebas)

> **Estado**: Funcionalidad experimental implementada pero aún no probada en producción.
> **Versión**: 2026-01-27

### Overview

La cascada inversa (backward cascade) programa automáticamente la producción de Productos en Proceso (PP) cuando un Producto Terminado (PT) los requiere como ingredientes. El sistema calcula hacia atrás en el tiempo para que los PP estén listos justo cuando el PT los necesita.

### ¿Cómo Funciona?

Cuando creas una cascada de un PT:

1. **Detección Automática**: Sistema revisa el BOM del PT y detecta ingredientes con categoría='PP'
2. **Cálculo Backward**: Calcula cuándo debe iniciar la producción del PP para que termine justo antes del PT
3. **Sincronización Batch-by-Batch**: El último batch del PP termina exactamente cuando el último batch del PT lo necesita
4. **Recursión**: Soporta PP anidados (PT → PP → PP → MP)

### Fórmula de Sincronización

```
PP_start = PT_last_batch_start - PP_total_time - final_rest_time
```

**Donde:**
- `PT_last_batch_start`: Cuando inicia el último batch del PT (distribuido sobre duration_hours)
- `PP_total_time`: Tiempo total para todos los batches del PP a través de todas sus operaciones
- `final_rest_time`: Tiempo de reposo del BOM antes de que PT pueda usar el PP

### Ejemplo de Sincronización

**Escenario**: PT Croissant necesita PP Masa Laminada

```
Configuración:
- PT: 900 unidades, lote 300 → 3 batches @ 1h cada uno
- PP: 900 unidades, lote 300 → 3 batches @ 2h cada uno
- Reposo PP→PT: 1h
- PT inicia: 10:00

Cálculo:
- PT último batch inicia: 10:00 + 2h = 12:00
- PP debe terminar + 1h reposo = 12:00
- PP debe terminar: 11:00
- PP tiempo total: 6h (3 batches × 2h)
- PP inicia: 11:00 - 6h = 05:00 ✓

Timeline:
05:00-07:00: PP batch 1 → listo 08:00 (espera 2h)
07:00-09:00: PP batch 2 → listo 10:00 (espera 0h)
09:00-11:00: PP batch 3 → listo 12:00 (just-in-time) ✓
10:00-11:00: PT batch 1
11:00-12:00: PT batch 2
12:00-13:00: PT batch 3 (usa PP batch 3)
```

### Nuevos Campos en Base de Datos

#### production_routes
```sql
tiempo_reposo_horas NUMERIC(8,2) DEFAULT 0
-- Tiempo de reposo DESPUÉS de cada operación (ej: fermentación)
-- Usado para cálculos internos del PP
```

#### production_schedules
```sql
produced_for_order_number INTEGER NULL
-- Si es un PP, referencia al production_order_number del PT

cascade_type TEXT DEFAULT 'forward'
-- 'forward' = Cascada PT normal
-- 'backward' = Cascada PP (dependencia)
```

### Fuentes de Tiempo de Reposo

El sistema usa **DOS** fuentes diferentes para tiempo de reposo:

**1. Operaciones internas del PP** (NUEVO - lee de `production_routes`)
```sql
-- Ejemplo: Después de AMASADO → 2h reposo → LAMINADO
SELECT tiempo_reposo_horas
FROM produccion.production_routes
WHERE product_id = 'masa-laminada' AND work_center_id = 'amasado'
```

**2. Transición PP → PT** (lee de `bill_of_materials`)
```sql
-- Ejemplo: Masa Laminada termina → 1h reposo → Croissant la usa
SELECT tiempo_reposo_horas
FROM produccion.bill_of_materials
WHERE product_id = 'croissant' AND material_id = 'masa-laminada'
```

**Importante**: La cascada FORWARD (existente) NO fue modificada y sigue usando tiempos de reposo del BOM.

### API Response Extendido

```json
{
  "production_order_number": 123,
  "product_id": "uuid-croissant",
  "product_name": "Croissant",
  "total_units": 900,
  "num_batches": 3,
  "schedules_created": 9,

  // NUEVO: Información de PP dependencies
  "pp_dependencies": [
    {
      "production_order_number": 124,
      "product_id": "uuid-masa-laminada",
      "product_name": "Masa Laminada",
      "total_units": 900,
      "num_batches": 3,
      "schedules_created": 9,
      "cascade_start": "2024-01-27T05:00:00",
      "cascade_end": "2024-01-27T11:00:00"
    }
  ]
}
```

### Nuevas Funciones Backend

Todas en `apps/api/app/api/routes/production/cascade.py`:

- `get_pp_ingredients()`: Detecta ingredientes PP en BOM
- `calculate_pp_quantity()`: Calcula cantidad de PP necesaria
- `get_rest_time_from_route()`: Lee tiempo de reposo de production_routes (NUEVO)
- `calculate_pp_start_time()`: Algoritmo de sincronización batch-by-batch
- `generate_backward_cascade_recursive()`: Genera cascadas PP recursivamente
- `check_circular_dependency()`: Valida dependencias circulares

### Soporte Recursivo

```
PT: Croissant Relleno
  ↓ requiere
PP: Croissant Horneado (order #124)
  ↓ requiere
PP: Masa Laminada (order #125)
  ↓ requiere
MP: Harina
```

Sistema crea automáticamente las cascadas backward en orden inverso.

### Limitaciones Conocidas (En Pruebas)

1. **Duración Simplificada**: PP usa duración fija de 2h en llamadas recursivas
   - Debería calcularse basado en productividad real

2. **Sin Validación de Conflictos**: Si PP no puede terminar antes de que PT inicie, sistema lo permite
   - Se ve en schedules pero no hay ajuste automático

3. **Staff Fijo**: PP se crea con staff_count=1
   - Debería permitir configuración de staffing óptimo

4. **Sin UI Específica**: Frontend no tiene visualización especial para PP cascades
   - Se ven como schedules normales
   - Falta diferenciación por color

### Casos de Prueba Pendientes

- [ ] PT simple con 1 PP
- [ ] PT con múltiples PPs en paralelo
- [ ] PP anidado (3 niveles: PT → PP → PP)
- [ ] Conflictos en centros compartidos con PP
- [ ] Eliminación de PT con PP dependientes
- [ ] Validación de tiempos de reposo correctos
- [ ] Performance con recursión profunda

### Próximos Pasos

1. **Testing en Ambiente de Desarrollo**
   - Crear productos de prueba con PP dependencies
   - Verificar tiempos de sincronización
   - Validar sistema de colas con PP

2. **Refinamientos**
   - Cálculo dinámico de duración de PP
   - Detección de conflictos y warnings
   - Configuración de staff para PP

3. **Frontend**
   - Visualización diferenciada de PP cascades (color naranja/amarillo)
   - Preview modal mostrando PT y PP juntos
   - Tooltips indicando "Producción de PP para [Nombre PT]"

4. **Validaciones**
   - Warning si PP no cabe antes de PT
   - Sugerencia de ajuste de horarios
   - Confirmación antes de crear cascadas grandes

### Documentación Completa

Para detalles técnicos completos, ver: `apps/api/docs/BACKWARD-CASCADE-PP.md`

### Notas Importantes

⚠️ **Cascada Forward NO Modificada**
- Todo el código existente de cascada forward permanece intacto
- Función `get_rest_time_hours()` no fue tocada
- Backward cascade es completamente aditivo

⚠️ **Requiere Migración de BD**
```bash
# Migraciones ya creadas, pendientes de aplicar:
supabase/migrations/20260127000001_add_rest_time_to_routes.sql
supabase/migrations/20260127000002_backward_cascade_pp.sql
```

⚠️ **Estado Experimental**
- Implementación completa pero no probada en producción
- Puede requerir ajustes basados en casos reales
- Usar con precaución en datos de producción

---

## 🧪 Guía de Testing del Backward Cascade

### Producto de Prueba Identificado

**Producto**: Croissant Multicereal mantequilla
- **ID**: `00007635-0000-4000-8000-000076350000`
- **Categoría**: PT
- **PP Ingrediente**: EMPASTE (quantity_needed: 1.0, rest: 0h)
- **Ruta PT**: CROISSOMAT → FERMENTACION → DECORADO
- **Lote mínimo**: 400 unidades

### Pre-requisitos para Testing

Antes de poder probar el backward cascade, verificar:

#### 1. Productividad Definida (CRÍTICO)

El producto DEBE tener productividad configurada para cada work center:

```sql
-- Verificar productividad
SELECT wc.name, pp.units_per_hour, pp.usa_tiempo_fijo, pp.tiempo_minimo_fijo
FROM produccion.production_productivity pp
JOIN produccion.work_centers wc ON pp.work_center_id = wc.id
WHERE pp.product_id = '00007635-0000-4000-8000-000076350000';
```

**Si NO HAY productividad**, crear registros:

```sql
-- Ejemplo: Crear productividad para CROISSOMAT
INSERT INTO produccion.production_productivity
(product_id, work_center_id, units_per_hour, usa_tiempo_fijo)
VALUES
('00007635-0000-4000-8000-000076350000', 'b7ba9233-d43e-4bac-a979-acb8a74bf964', 300, false);

-- Repetir para FERMENTACION y DECORADO
```

#### 2. Productividad del PP (EMPASTE)

El PP EMPASTE también necesita productividad en sus work centers:

```sql
-- Verificar ruta de EMPASTE
SELECT pr.sequence_order, wc.name
FROM produccion.production_routes pr
JOIN produccion.work_centers wc ON pr.work_center_id = wc.id
WHERE pr.product_id = (SELECT id FROM products WHERE name = 'EMPASTE')
ORDER BY pr.sequence_order;

-- Verificar productividad de EMPASTE
SELECT wc.name, pp.units_per_hour
FROM produccion.production_productivity pp
JOIN produccion.work_centers wc ON pp.work_center_id = wc.id
WHERE pp.product_id = (SELECT id FROM products WHERE name = 'EMPASTE');
```

#### 3. Limpieza de Schedules de Prueba

Antes de cada test, limpiar schedules existentes:

```sql
-- Limpiar enero 2026
DELETE FROM produccion.production_schedules
WHERE start_date >= '2026-01-01T00:00:00'
AND start_date < '2026-02-01T00:00:00';
```

O usar script Python:

```python
import os
from supabase import create_client

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

result = supabase.schema("produccion").table("production_schedules").delete().gte(
    "start_date", "2026-01-01T00:00:00"
).lt(
    "start_date", "2026-02-01T00:00:00"
).execute()

print(f"🗑️  Cleaned {len(result.data or [])} schedules")
```

### Paso a Paso: Ejecutar Test

#### 1. Iniciar Backend

```bash
cd apps/api
source venv/bin/activate
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --log-level info
```

#### 2. Verificar Producto y PP

Script para verificar configuración:

```python
# check_product.py
import os
from supabase import create_client

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))
product_id = "00007635-0000-4000-8000-000076350000"

# Get product
product = supabase.table("products").select("name, category, lote_minimo").eq("id", product_id).single().execute()
print(f"📦 Product: {product.data['name']}")

# Get BOM for PP ingredients
bom = supabase.schema("produccion").table("bill_of_materials").select(
    "material_id, quantity_needed, tiempo_reposo_horas"
).eq("product_id", product_id).eq("is_active", True).execute()

pp_count = 0
for item in bom.data:
    material = supabase.table("products").select("name, category").eq("id", item["material_id"]).single().execute()
    if material.data.get("category") == "PP":
        pp_count += 1
        print(f"🔶 PP Found: {material.data['name']} (qty: {item['quantity_needed']}, rest: {item.get('tiempo_reposo_horas', 0)}h)")

print(f"\n✅ {pp_count} PP ingredient(s) - Backward cascade {'WILL' if pp_count > 0 else 'will NOT'} trigger")
```

#### 3. Crear Cascada de Prueba

```python
# test_cascade.py
import requests
import json

payload = {
    "work_center_id": "dummy",
    "product_id": "00007635-0000-4000-8000-000076350000",
    "start_datetime": "2026-01-05T08:00:00",
    "duration_hours": 3.0,
    "staff_count": 2
}

response = requests.post("http://localhost:8000/api/production/cascade/create", json=payload)

if response.status_code == 200:
    result = response.json()
    print(f"✅ PT Cascade Created: Order #{result['production_order_number']}")
    print(f"   Total units: {result['total_units']}")
    print(f"   Schedules: {result['schedules_created']}")

    pp_deps = result.get('pp_dependencies', [])
    if pp_deps:
        print(f"\n🔶 PP CASCADES CREATED: {len(pp_deps)}")
        for pp in pp_deps:
            print(f"   - {pp['product_name']}: Order #{pp['production_order_number']}")
            print(f"     Units: {pp['total_units']}, Schedules: {pp['schedules_created']}")
            print(f"     Start: {pp['cascade_start']}")
            print(f"     End: {pp['cascade_end']}")
    else:
        print(f"\n⚠️  NO PP CASCADES - Check implementation!")
else:
    print(f"❌ Error {response.status_code}: {response.text}")
```

#### 4. Verificar Resultados en BD

```sql
-- Ver cascada PT
SELECT
    ps.production_order_number,
    ps.cascade_type,
    ps.cascade_level,
    ps.batch_number,
    wc.name as work_center,
    ps.start_date,
    ps.end_date,
    ps.quantity
FROM produccion.production_schedules ps
JOIN produccion.work_centers wc ON ps.resource_id = wc.id
WHERE ps.production_order_number = [PT_ORDER_NUMBER]
ORDER BY ps.cascade_level, ps.batch_number;

-- Ver cascada PP (backward)
SELECT
    ps.production_order_number,
    ps.produced_for_order_number,
    ps.cascade_type,
    p.name as product_name,
    wc.name as work_center,
    ps.start_date,
    ps.end_date
FROM produccion.production_schedules ps
JOIN products p ON ps.product_id = p.id
JOIN produccion.work_centers wc ON ps.resource_id = wc.id
WHERE ps.produced_for_order_number = [PT_ORDER_NUMBER]
ORDER BY ps.start_date;
```

### Troubleshooting

#### Error: "Esta máquina ya tiene una programación en ese rango de fechas"

**Causa**: Schedules existentes o productividad no definida

**Soluciones**:
1. Limpiar schedules existentes (ver arrarriba)
2. Verificar que el producto tenga productividad definida
3. Usar fecha/hora diferente
4. Revisar logs del backend: `tail -f /tmp/uvicorn.log`

#### Error: "No production route defined"

**Causa**: Producto no tiene ruta de producción

**Solución**: Configurar ruta en `produccion.production_routes`

#### PP Cascade no se crea (pp_dependencies vacío)

**Posibles causas**:
1. BOM no tiene materiales con category='PP'
2. Error en función `get_pp_ingredients()`
3. Error en cálculo de timing (revisar logs)
4. PP no tiene ruta de producción definida

**Debug**:
```bash
# Ver logs del backend
tail -f /tmp/uvicorn.log | grep -i "pp\|backward\|Found.*PP"
```

#### Timing Incorrecto del PP

Si el PP inicia después del PT (en lugar de antes):

1. Verificar `tiempo_reposo_horas` en:
   - `production_routes` (para operaciones internas del PP)
   - `bill_of_materials` (para transición PP→PT)

2. Verificar que `calculate_pp_start_time()` esté usando la fórmula correcta:
   ```
   PP_start = PT_last_batch_start - PP_total_time - final_rest_time
   ```

### Logs Útiles

Buscar en logs del backend:

```bash
# PP detection
grep "Found.*PP ingredient" /tmp/uvicorn.log

# Backward cascade generation
grep "Depth.*Generating backward cascade" /tmp/uvicorn.log

# Timing calculations
grep "PP sync calculation" /tmp/uvicorn.log

# Errors
grep -i "error\|failed\|exception" /tmp/uvicorn.log
```

### Estado Actual del Testing

**Pendiente de completar**:
- [ ] Configurar productividad para producto 00007635-0000-4000-8000-000076350000
- [ ] Configurar productividad para PP EMPASTE
- [ ] Ejecutar test completo y verificar PP cascade
- [ ] Validar tiempos de sincronización
- [ ] Probar con múltiples PPs
- [ ] Probar con PP anidados (si existen productos con esa configuración)

**Para continuar testing**:
1. Crear productividades faltantes en BD
2. Limpiar enero 2026
3. Ejecutar script de test
4. Verificar resultados en BD
5. Documentar hallazgos
