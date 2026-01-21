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
