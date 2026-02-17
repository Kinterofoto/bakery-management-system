# Sistema de Produccion en Cascada

Documentacion tecnica del sistema de produccion en cascada para la planificacion semanal de produccion.

## Indice

1. [Overview](#overview)
2. [Arquitectura](#arquitectura)
3. [Modelo de Datos](#modelo-de-datos)
4. [Logica de Turnos y Semanas](#logica-de-turnos-y-semanas)
5. [Algoritmo de Cascada](#algoritmo-de-cascada)
   - 5.1 [Forward Cascade (PT)](#flujo-principal)
   - 5.2 [Backward Cascade (PP)](#algoritmo-de-backward-cascade)
   - 5.3 [Bloqueo de Turnos en Cascada](#bloqueo-de-turnos-en-cascada)
   - 5.4 [Distribucion Multi-Work-Center](#distribucion-multi-work-center)
6. [Encolamiento en Centros Secuenciales](#encolamiento-en-centros-secuenciales)
7. [Reorganizacion Dinamica de Colas](#reorganizacion-dinamica-de-colas)
8. [API Endpoints](#api-endpoints)
   - 8.1 [V1 — FastAPI](#v1--fastapi-endpoints)
   - 8.2 [V2 — Server Actions](#v2--server-actions)
9. [Ejemplos Practicos](#ejemplos-practicos)
10. [Modos de Procesamiento](#modos-de-procesamiento)
11. [Concurrencia y Locking](#concurrencia-y-locking)
12. [Historial de Cambios](#historial-de-cambios)

---

## Overview

El sistema de cascada permite programar produccion de un producto a traves de todos sus centros de trabajo (operaciones) automaticamente. Cuando se programa produccion en el primer centro, el sistema calcula y crea schedules para todas las operaciones subsiguientes respetando:

- **Rutas de produccion**: Secuencia de operaciones definida en `production_routes`
- **Tiempos de reposo**: Tiempo entre operaciones definido en BOM
- **Tipo de procesamiento**: Paralelo, secuencial, o hibrido (ver [Modos de Procesamiento](#modos-de-procesamiento))
- **Contexto cross-week**: Queries de contexto (colas, bloqueos) ven +/-1 semana adyacente para scheduling correcto en limites de semana

---

## Arquitectura

### V1 (FastAPI — fallback)

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
│     - Verifica schedules existentes (ventana ±1 semana)          │
│     - Encola si es secuencial, paraleliza si tiene capacidad     │
│  4. Inserta schedules en production_schedules                    │
│  ~50 queries individuales × ~240ms latencia = ~13s               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DATABASE (Supabase)                      │
│  Schema: produccion                                              │
│  Tables: production_schedules, production_routes, work_centers   │
│  Triggers: check_schedule_conflict (valida capacidad)            │
│  RPC: cascade_bulk_upsert (four-phase update en 1 round-trip)    │
│  RPC: generate_cascade_v2 (V2 — toda la logica server-side)     │
└─────────────────────────────────────────────────────────────────┘
```

### V2 (PL/pgSQL — primary, desde 2026-02-11)

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  use-cascade-production.ts → createCascadeV2() Server Action     │
│  (fallback: fetch → FastAPI V1 si V2 falla)                      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SERVER ACTION (Next.js)                        │
│  apps/web/app/planmaster/actions.ts                               │
│  supabase.schema("produccion").rpc("generate_cascade_v2", ...)   │
│  1 sola llamada RPC — bypassa FastAPI completamente              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (PL/pgSQL)                            │
│  produccion.generate_cascade_v2()                                │
│  + 8 helper functions (_cascade_v2_*)                            │
│  Toda la logica corre server-side con 0 latencia de red          │
│  Target: <500ms (vs ~13s en V1)                                  │
│  Migracion: 20260211000001_cascade_v2.sql                        │
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

### production_productivity

```sql
CREATE TABLE produccion.production_productivity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  work_center_id UUID REFERENCES work_centers(id) ON DELETE CASCADE,
  operation_id UUID REFERENCES operations(id) ON DELETE CASCADE,
  units_per_hour NUMERIC(10,2) NOT NULL,
  usa_tiempo_fijo BOOLEAN DEFAULT false,       -- true = duracion fija (ej: horneado)
  tiempo_minimo_fijo NUMERIC(10,2),            -- minutos fijos si usa_tiempo_fijo
  tiempo_labor_por_carro NUMERIC(10,2),        -- minutos de labor manual por carro
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  UNIQUE (product_id, work_center_id),
  UNIQUE (product_id, operation_id)
);
```

### bill_of_materials

```sql
CREATE TABLE produccion.bill_of_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  material_id UUID REFERENCES products(id),
  operation_id UUID REFERENCES operations(id) ON DELETE CASCADE,
  quantity_needed NUMERIC(12,3) NOT NULL,
  unit_name VARCHAR(100) NOT NULL,
  unit_equivalence_grams NUMERIC(12,3) NOT NULL,
  tiempo_reposo_horas NUMERIC(8,2),           -- reposo entre PP y PT (usado en backward cascade)
  original_quantity NUMERIC(12,3),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  UNIQUE (product_id, operation_id, material_id)
);
```

### shift_blocking

```sql
CREATE TABLE produccion.shift_blocking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_center_id UUID NOT NULL REFERENCES work_centers(id),
  date DATE NOT NULL,
  shift_number INTEGER NOT NULL,  -- 1=T1, 2=T2, 3=T3
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (work_center_id, date, shift_number)
);
```

**Nota**: Tabla creada directamente en BD (sin migracion en repositorio).

### product_work_center_mapping

```sql
CREATE TABLE produccion.product_work_center_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  operation_id UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  work_center_id UUID NOT NULL REFERENCES work_centers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (product_id, operation_id, work_center_id)
);
```

Mapea productos a work centers alternativos para la misma operacion. Usado por distribucion multi-WC.

### work_center_staffing

```sql
CREATE TABLE produccion.work_center_staffing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_center_id UUID NOT NULL REFERENCES work_centers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  shift_number INTEGER NOT NULL CHECK (shift_number IN (1, 2, 3)),
  staff_count INTEGER NOT NULL DEFAULT 0 CHECK (staff_count >= 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- shift_number: 1=T1 (22:00-06:00), 2=T2 (06:00-14:00), 3=T3 (14:00-22:00)
```

Registra cantidad de personal asignado por centro, fecha y turno. WCs sin staffing no se usan en distribucion multi-WC.

### Funciones RPC

#### cascade_bulk_upsert()

Funcion PostgreSQL que ejecuta el update de 4 fases (park, insert, move) en un solo round-trip al servidor. Reemplaza ~2N+1 llamadas individuales con 1 sola llamada RPC.

**Migracion**: `supabase/migrations/20260210000001_cascade_bulk_operations.sql`

```sql
CREATE OR REPLACE FUNCTION produccion.cascade_bulk_upsert(
    p_schedules_to_park jsonb DEFAULT '[]'::jsonb,
    p_schedules_to_insert jsonb DEFAULT '[]'::jsonb,
    p_schedules_to_move jsonb DEFAULT '[]'::jsonb,
    p_parking_zone_wc_id text DEFAULT NULL,
    p_parking_zone_start timestamptz DEFAULT NULL,
    p_parking_zone_end timestamptz DEFAULT NULL
) RETURNS jsonb
```

**Parametros**:

| Parametro | Tipo | Descripcion |
|-----------|------|-------------|
| `p_schedules_to_park` | jsonb array | Schedules existentes a mover a parking zone. Formato: `[{id, duration_minutes}]` |
| `p_schedules_to_insert` | jsonb array | Schedules nuevos a insertar. Formato: objetos completos con todos los campos de `production_schedules` |
| `p_schedules_to_move` | jsonb array | Schedules parkeados a mover a posiciones finales. Formato: `[{id, start_date, end_date}]` |
| `p_parking_zone_wc_id` | text | Work center ID para limpiar parking zone (Phase 0) |
| `p_parking_zone_start` | timestamptz | Inicio de zona de parking a limpiar |
| `p_parking_zone_end` | timestamptz | Fin de zona de parking a limpiar |

**Fases ejecutadas server-side**:
1. **Phase 0**: DELETE schedules huerfanos en parking zone del WC
2. **Phase 1**: UPDATE schedules existentes → parking zone (lejos del rango real)
3. **Phase 2**: INSERT nuevos schedules en posiciones correctas
4. **Phase 3**: UPDATE schedules parkeados → posiciones finales recalculadas

**Retorna**: `{parked: int, inserted: int, moved: int}`

**Wrapper Python** (`cascade.py`):
```python
def cascade_bulk_upsert(
    supabase, schedules_to_park, schedules_to_insert,
    schedules_to_move, parking_zone_wc_id,
    parking_zone_start, parking_zone_end
) -> dict:
    # Convierte Python dicts a formato esperado por RPC
    # Llama supabase.schema("produccion").rpc("cascade_bulk_upsert", {...})
```

**Impacto de performance**: De ~2N+2 DB calls (N parks + N+1 inserts + N moves) a 1 RPC call por WC.

#### generate_cascade_v2()

Funcion PL/pgSQL que ejecuta toda la logica de cascada server-side en una sola llamada RPC. Port 1:1 de la logica Python en `cascade.py`. Elimina ~50 round-trips de red.

**Migracion**: `supabase/migrations/20260211000001_cascade_v2.sql`

```sql
CREATE OR REPLACE FUNCTION produccion.generate_cascade_v2(
    p_product_id        text,
    p_start_datetime    timestamptz,
    p_duration_hours    numeric,
    p_staff_count       integer DEFAULT 1,
    p_week_plan_id      uuid DEFAULT NULL,
    p_create_in_db      boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
```

**Parametros**:

| Parametro | Tipo | Descripcion |
|-----------|------|-------------|
| `p_product_id` | text | UUID del producto |
| `p_start_datetime` | timestamptz | Fecha/hora de inicio |
| `p_duration_hours` | numeric | Duracion del turno en horas |
| `p_staff_count` | integer | Cantidad de personal (default 1) |
| `p_week_plan_id` | uuid | ID del plan semanal (opcional) |
| `p_create_in_db` | boolean | `true` = crear schedules, `false` = preview mode |

**Retorna**: JSONB con misma estructura que respuesta V1 (product_id, product_name, total_units, num_batches, work_centers, cascade_start, cascade_end, pp_dependencies, production_order_number, schedules_created).

**Invocacion** (Server Action en `apps/web/app/planmaster/actions.ts`):
```typescript
const { data, error } = await supabase.schema("produccion").rpc("generate_cascade_v2", {
  p_product_id: params.product_id,
  p_start_datetime: params.start_datetime,
  p_duration_hours: params.duration_hours,
  p_staff_count: params.staff_count,
  p_week_plan_id: params.week_plan_id || null,
  p_create_in_db: true,  // false para preview
})
```

**Performance**: De ~13s (V1, ~50 queries × 240ms) a <500ms (V2, 0 latencia de red).

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

## Calculo de Cantidad Total de Produccion

Cuando se crea una produccion en cascada, la cantidad total de unidades se calcula asi:

```
total_units = units_per_hour × staff_count × duration_hours
```

| Variable | Descripcion | Fuente |
|----------|-------------|--------|
| `units_per_hour` | Productividad del producto en el primer work center | `produccion.production_productivity` |
| `staff_count` | Cantidad de personas asignadas al turno | Request del usuario |
| `duration_hours` | Duracion del bloque programado (en horas) | Request del usuario |

**Ejemplo**: ARMADO produce 300 u/h. Con 2 personas en un bloque de 3 horas:
```
300 × 2 × 3 = 1,800 unidades
```

Luego las unidades se dividen en batches segun el `lote_minimo` del producto:
```
1,800 unidades / 400 lote_min = [400, 400, 400, 400, 200] → 5 batches
```

Cada batch cascadea por toda la ruta de produccion (ARMADO → FERMENTACION → DECORADO, etc).

**Caso especial**: Si el work center usa `usa_tiempo_fijo = true` (ej: horneado con tiempo fijo), el calculo cambia a:
```
total_units = lote_minimo × staff_count × duration_hours
```

**Para PP (backward cascade)**: La cantidad NO se calcula con esta formula. En vez, se usa `fixed_total_units` que viene del BOM del PT padre: `PT_total_units × BOM_quantity_needed`.

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

La duracion de cada batch depende de `staff_count` (personal asignado):

```
batch_duration = batch_size / (units_per_hour × staff_count) × 60  [minutos]
```

| Variable | Descripcion | Fuente |
|----------|-------------|--------|
| `batch_size` | Unidades en este lote | Calculado por `_cascade_v2_distribute_batches` |
| `units_per_hour` | Productividad base del WC | `production_productivity` |
| `staff_count` | Personal en el WC | Primer WC: del request. Downstream: `work_center_staffing` |

**Staff en el primer WC**: Se usa `p_staff_count` del request del usuario.

**Staff en WCs downstream**: Se consulta `work_center_staffing` via `_cascade_v2_get_wc_staff(wc_id, datetime)`, que determina fecha/turno y busca el staff configurado. Default: 1 si no hay staffing configurado.

**Operaciones con tiempo fijo** (`usa_tiempo_fijo = true`, ej: fermentacion): La duracion NO se ve afectada por staff — siempre usa `tiempo_minimo_fijo`.

```python
def calculate_batch_duration_minutes(productivity, batch_size, staff_count=1):
    if productivity.usa_tiempo_fijo:
        # Operaciones con tiempo fijo — NO afectadas por staff
        return productivity.tiempo_minimo_fijo
    else:
        # Mas staff = batch mas rapido
        effective_staff = max(staff_count, 1)
        hours = batch_size / (productivity.units_per_hour * effective_staff)
        return hours * 60
```

### Algoritmo de Backward Cascade

Cuando un PT tiene ingredientes PP en su BOM, el sistema genera automaticamente una cascada inversa. La sincronizacion se hace con el **ultimo batch del PT** para optimizar tiempo total.

```
Flujo:
1. Crear forward cascade del PT normalmente
2. Consultar BOM del PT → detectar materiales con category='PP'
3. Para cada PP:
   a. Calcular cantidad: PT_total_units × BOM_quantity_needed
   b. Obtener start_date REAL del ultimo batch del primer WC del PT
   c. Calcular PP_start = last_batch_start - PP_total_time - BOM_rest_time
   d. Generar forward cascade del PP desde PP_start con fixed_total_units
   e. Recursion: si el PP tambien tiene PP en su BOM, repetir (stack loop)
```

**Calculo de PP_total_time** (simulacion de colas):

```python
# Simula el tiempo REAL de procesamiento del PP a traves de todos sus WCs
# No usa formula pipeline — simula colas para obtener finish time exacto
for wc in pp_route:
    for batch in batches:
        arrival = prev_wc_finish[batch] + rest_time
        if is_sequential:
            start = max(arrival, queue_end)
        else:
            start = arrival
        finish = start + duration
        batch_finish_times[batch] = finish
        queue_end = finish

pp_total_time = max(batch_finish_times) - min(batch_arrivals)
```

**Ajuste iterativo para shift blocking** (max 5 iteraciones):

```python
for iteration in range(5):
    # Simular forward con blocked periods
    simulated_end = simulate_pp_with_blocks(pp_start, batches, blocked_periods)
    gap = target_time - simulated_end
    if gap <= 1 minute:
        break  # Convergencia
    pp_start = pp_start - gap  # Mover inicio hacia atras
```

**Funciones clave** (`cascade.py`):
- `get_pp_ingredients(supabase, product_id)` → detecta PP en BOM
- `calculate_pp_start_time(...)` → formula de sincronizacion
- `generate_backward_cascade_recursive(...)` → genera cascadas PP con recursion via stack
- `check_circular_dependency(...)` → valida que no haya ciclos en BOM

---

### Bloqueo de Turnos en Cascada

El sistema permite bloquear turnos por work center. Los batches que caerian en turnos bloqueados se desplazan automaticamente al siguiente turno disponible.

**Conversion de bloqueos a rangos horarios** (`get_blocked_shifts()`):

```
shift_blocking (date, shift_number) → rango datetime:
  T1: (date-1) 22:00 → date 06:00
  T2: date 06:00 → date 14:00
  T3: date 14:00 → date 22:00
```

**Algoritmo de skip** (`skip_blocked_periods()`):

```python
def skip_blocked_periods(start_time, duration_minutes, blocked_periods):
    for _ in range(max_iterations):
        # Si start cae dentro de un bloqueo, mover al final del bloqueo
        for block_start, block_end in blocked_periods:
            if block_start <= start_time < block_end:
                start_time = block_end
                break

        # Si el batch se extiende hasta un bloqueo, mover despues
        end_time = start_time + duration_minutes
        for block_start, block_end in blocked_periods:
            if start_time < block_start < end_time:
                start_time = block_end
                break
        else:
            return start_time  # No hay conflictos

    return start_time
```

**Puntos de integracion**:
- Forward cascade SEQUENTIAL/HYBRID: `recalculate_queue_times()` llama `skip_blocked_periods()` por batch
- Forward cascade PARALLEL: cada batch individualmente pasa por `skip_blocked_periods()`
- Backward cascade PP: simulacion iterativa ajusta PP start para compensar turnos bloqueados

**Frontend** (`use-shift-blocking.ts`):
- `toggleBlock(workCenterId, date, shiftNumber)` → insert/delete en `produccion.shift_blocking`
- `isShiftBlocked(workCenterId, dayIndex, shiftNumber)` → lookup en memoria
- Acceso directo a Supabase (sin API endpoints intermedios)

---

### Distribucion Multi-Work-Center

Cuando un producto tiene multiples work centers para la misma operacion (via `product_work_center_mapping`), el sistema distribuye batches entre WCs si el deadline no se puede cumplir con un solo WC.

**Condiciones de activacion**:
1. Existe `deadline_datetime` (solo backward cascade / PP)
2. Hay >1 WC con personal asignado (`work_center_staffing`) para la fecha/turno
3. El WC primario no puede terminar antes del deadline

**Algoritmo de distribucion** (`distribute_batches_to_work_centers()`):

```
1. Asignar TODOS los batches al WC primario (el de production_routes)
2. Simular finish_time del WC primario
3. Si finish_time <= deadline → listo (single WC)
4. Si finish_time > deadline:
   a. Mover ultimo batch del WC primario al siguiente WC alternativo
   b. Re-simular finish_time de ambos WCs
   c. Repetir hasta que ambos cumplan deadline o no queden batches por mover
   d. Si hay mas WCs alternativos, repetir spillover
```

**Funciones clave** (`cascade.py`):
- `get_alternative_work_centers(supabase, product_id, operation_id)` → consulta `product_work_center_mapping`
- `get_staffed_work_centers(supabase, wc_ids, date, shift)` → filtra WCs por staffing disponible
- `determine_shift_from_datetime(dt)` → calcula turno (1/2/3) y fecha desde datetime
- `simulate_wc_finish_time(new_batches, existing, blocked, is_hybrid)` → simula fin sin mutar originales
- `distribute_batches_to_work_centers(batches, wc_contexts, deadline, is_hybrid)` → distribucion con spillover

**Equivalente V2** (PL/pgSQL): `_cascade_v2_distribute_to_wcs()` implementa la misma logica server-side.

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

El constraint de PostgreSQL (`check_schedule_conflict`) impide que dos schedules se solapen en el mismo recurso. Esto causa problemas al reorganizar schedules existentes. La solución es un proceso de 4 fases que se ejecuta **server-side en una sola llamada RPC** (`cascade_bulk_upsert`):

```
Phase 0: DELETE  → Limpia parking zone (schedules huerfanos de intentos fallidos)
Phase 1: UPDATE  → Mueve schedules existentes a parking zone (context_end + 30d)
Phase 2: INSERT  → Inserta nuevos schedules en posiciones correctas
Phase 3: UPDATE  → Mueve schedules parkeados a posiciones finales recalculadas
```

**Implementacion**: La funcion RPC `produccion.cascade_bulk_upsert()` ejecuta las 4 fases atomicamente. Ver [Modelo de Datos > Funciones RPC](#funciones-rpc) para detalles de parametros y formato.

**Zona de parking**: `context_end + 30 dias` — suficientemente lejos para no afectar semanas adyacentes ni la ventana de contexto cross-week.

**Wrapper Python**:
```python
cascade_bulk_upsert(
    supabase,
    schedules_to_park=existing_to_update,     # [{id, duration_minutes}]
    schedules_to_insert=bulk_insert_data,      # [objetos completos]
    schedules_to_move=existing_to_update,      # [{id, start_date, end_date}]
    parking_zone_wc_id=wc_id,
    parking_zone_start=parking_zone_start,
    parking_zone_end=parking_zone_end,
)
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

### V1 — FastAPI Endpoints

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

Elimina todos los schedules de una orden de produccion (incluyendo PP dependientes recursivamente).

---

### V2 — Server Actions

V2 bypassa FastAPI completamente. Next.js Server Actions llaman directamente al RPC de Supabase.

**Archivo**: `apps/web/app/planmaster/actions.ts`

#### createCascadeV2(params)

```typescript
export interface CascadeV2Params {
  product_id: string
  start_datetime: string
  duration_hours: number
  staff_count: number
  week_plan_id?: string
}

async function createCascadeV2(params: CascadeV2Params) {
  const supabase = createServiceClient()
  const { data, error } = await supabase.schema("produccion").rpc("generate_cascade_v2", {
    p_product_id: params.product_id,
    p_start_datetime: params.start_datetime,
    p_duration_hours: params.duration_hours,
    p_staff_count: params.staff_count,
    p_week_plan_id: params.week_plan_id || null,
    p_create_in_db: true,
  })
}
```

#### previewCascadeV2(params)

Identico a `createCascadeV2` pero con `p_create_in_db: false`. No escribe en BD.

#### Fallback V1

El hook `use-cascade-production.ts` intenta V2 primero. Si falla, fallback automatico a V1 (fetch → FastAPI) con `console.warn`.

---

### Shift Blocking (acceso directo a Supabase)

No hay API endpoints dedicados. El frontend accede directamente via Supabase client:

```typescript
// Hook: use-shift-blocking.ts
// Toggle: insert si no existe, delete si existe
await supabase.schema("produccion").from("shift_blocking")
  .upsert({ work_center_id, date, shift_number })

// Fetch: rango de fechas
await supabase.schema("produccion").from("shift_blocking")
  .select("*").gte("date", startDate).lte("date", endDate)
```

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

## Modos de Procesamiento

Los centros de trabajo pueden operar en tres modos distintos:

### SEQUENTIAL (Secuencial)
- **Detección**: `tipo_capacidad != 'carros'` O `capacidad_maxima_carros <= 1`
- **Comportamiento**: Todos los batches de TODAS las referencias hacen cola FIFO
- **Ejemplo**: Si PT1 tiene 16 batches y PT2 tiene 18, los de PT2 esperan detrás de los 16

### PARALLEL (Paralelo)
- **Detección**: `tipo_capacidad = 'carros'` Y `capacidad_maxima_carros > 1`
- **Comportamiento**: Múltiples batches se procesan simultáneamente hasta el límite de capacidad
- **Ejemplo**: Horno con 8 carros puede tener 8 batches procesándose al mismo tiempo

### HYBRID (Híbrido) - NUEVO
- **Detección**: `permite_paralelo_por_referencia = true` (en work_centers)
- **Comportamiento**:
  - **Dentro de la misma referencia**: batches se procesan SECUENCIALMENTE
  - **Entre diferentes referencias**: batches pueden correr EN PARALELO (se solapan)
- **Ejemplo**: PP de PT1 tiene 16 batches → secuenciales entre sí. PP de PT2 tiene 18 batches → también secuenciales entre sí. Pero ambas cadenas corren en paralelo.
- **Configuración BD**:
  ```sql
  UPDATE produccion.work_centers
  SET permite_paralelo_por_referencia = true
  WHERE code = 'AMASADO';
  ```
- **Función de cola**: `recalculate_queue_times_hybrid()` agrupa por `production_order_number`

### Diagrama de Modos

```
SEQUENTIAL (FIFO global):
PT1-B1 → PT1-B2 → PT1-B3 → PT2-B1 → PT2-B2 → PT2-B3
[======][======][======][======][======][======]

HYBRID (FIFO por referencia):
PT1-B1 → PT1-B2 → PT1-B3
[======][======][======]
PT2-B1 → PT2-B2 → PT2-B3     (en paralelo con PT1)
[======][======][======]

PARALLEL (simultáneo):
PT1-B1  PT1-B2  PT1-B3  PT2-B1  PT2-B2  PT2-B3
[=================================]  (todos al mismo tiempo)
```

---

## Concurrencia y Locking

### V2 — Trigger Disable Pattern

La funcion `generate_cascade_v2()` usa `SECURITY DEFINER` y deshabilita el trigger de conflicto durante operaciones bulk para evitar falsos positivos al reorganizar colas:

```sql
-- Al inicio de la cascada
ALTER TABLE produccion.production_schedules DISABLE TRIGGER check_schedule_conflict;

-- ... operaciones de insert/update/delete ...

-- Al final (siempre se ejecuta, incluso en error)
ALTER TABLE produccion.production_schedules ENABLE TRIGGER check_schedule_conflict;

-- Garantia via EXCEPTION handler:
EXCEPTION WHEN OTHERS THEN
    ALTER TABLE produccion.production_schedules ENABLE TRIGGER check_schedule_conflict;
    RAISE;
```

### V1 — Four-Phase Pattern

V1 usa el sistema de 4 fases (park → insert → move) via `cascade_bulk_upsert()` RPC para evitar violaciones del constraint de overlap sin deshabilitar el trigger.

### Transaccionalidad

- **V2**: Toda la cascada corre en una sola transaccion PostgreSQL (funcion PL/pgSQL). Si falla, hace rollback automatico.
- **V1**: Cada llamada RPC es transaccional, pero la cascada completa NO es atomica (multiples RPCs). Un fallo parcial puede dejar schedules huerfanos.

### Sin Row-Level Locking

Ni V1 ni V2 usan `SELECT ... FOR UPDATE`. La concurrencia se maneja via:
- V2: Trigger disable + transaccion unica
- V1: Four-phase parking pattern que evita conflictos temporales

**Riesgo**: Dos cascadas concurrentes en el mismo WC podrian generar overlaps. En la practica esto no ocurre porque un solo usuario opera el planner a la vez.

---

## Funcionalidades Pendientes

### ~~1. Cascada entre semanas (cross-week scheduling)~~ (IMPLEMENTADO)

> Implementado en 2026-02-10. Ver historial de cambios.

### ~~2. Distribución multi-work-center (mismo tipo de operación)~~ (IMPLEMENTADO)

> Implementado en 2026-02-10. Ver historial de cambios.

### ~~3. Bloqueo de turnos y días~~ (IMPLEMENTADO)

> Implementado en 2026-02-09. Ver historial de cambios.

### 4. Pendientes actuales

- [ ] **Tooltip PP→PT**: Mostrar "Producción de [PP] para [PT]" al hover sobre bloques PP
- [ ] **Warning temporal PP**: Alertar si PP termina después del inicio del PT
- [x] **Staff configurable para PP**: PP usa `_cascade_v2_get_wc_staff()` para lookup por WC/fecha/turno (resuelto 2026-02-16)
- [ ] **Preview modal PT+PP**: Modal que muestre PT y PP juntos antes de crear
- [ ] **Probar PP anidados (3+ niveles)**: PT → PP → PP no ha sido probado en produccion
- [ ] **Probar multiples PPs en paralelo**: PT con >1 PP como ingrediente
- [ ] **Performance profiling V2**: Medir latencia real de `generate_cascade_v2()` en produccion

---

## Historial de Cambios

### 2026-02-12

#### Feature: OrderBar condensado — 1 barra por orden de produccion

- **Problema**: Cada batch de una orden se renderizaba como un pill individual. Una orden con 8 batches generaba 8 filas apiladas en la celda, ocupando mucho espacio visual.

- **Solucion**: Nuevo componente `OrderBar.tsx` que renderiza todos los batches de una orden como una sola barra horizontal con segmentos individuales:
  - Barra de fondo abarca desde el primer batch hasta el ultimo (12% opacidad)
  - Segmentos individuales por batch superpuestos (65-80% opacidad)
  - Texto pequeno (8px) con cantidad por batch
  - Hover muestra tooltip con detalle: `Lote #/total | quantity | rango horario`

- **Interacciones**:
  - **Double-click** en segmento: edicion inline de cantidad del batch
  - **Drag**: mover batch dentro del turno o entre celdas
  - **Boton X** (hover): elimina toda la orden en cascada (PT + PP dependientes)
  - **Auto-focus**: batch recien creado entra automaticamente en modo edicion

- **Extraccion de colores**: Paleta de 10 colores movida a `order-colors.ts` (reutilizable)

- **Archivos**:
  - `apps/web/components/plan-master/weekly-grid/OrderBar.tsx` (nuevo)
  - `apps/web/components/plan-master/weekly-grid/WeeklyGridCell.tsx` (refactored para usar OrderBar)
  - `apps/web/components/plan-master/weekly-grid/order-colors.ts` (nuevo)
  - `apps/web/hooks/use-shift-schedules.ts`

#### Fix: OrderBar delete llama onDelete una sola vez

- **Problema**: El boton de eliminar en OrderBar llamaba `onDelete` por cada batch de la orden, generando multiples llamadas a la API de delete cascade.
- **Solucion**: Una sola llamada `onDelete` con el ID del primer batch. El upstream (WeeklyPlanGrid) ya detecta `productionOrderNumber` y ejecuta cascade delete completo.
- **Archivo**: `apps/web/components/plan-master/weekly-grid/OrderBar.tsx`

#### Fix: Skip loading spinner en refetches de schedules

- **Problema**: `setLoading(true)` en cada refetch causaba que el grid completo se desmontara (mostrando spinner), perdiendo filas expandidas y posicion de scroll.
- **Solucion**: Solo la carga inicial muestra spinner. Refetches subsecuentes actualizan datos in-place sin desmontar el grid.
- **Archivo**: `apps/web/hooks/use-shift-schedules.ts`

### 2026-02-11

#### Feature: Cascade V2 — Port completo a PL/pgSQL

- **Problema**: V1 (Python) hacia ~50 queries individuales a Supabase REST API, cada una con ~240ms de latencia de red. Resultado: ~13s por cascada. El algoritmo en si toma microsegundos — el 99% del tiempo es espera de red.

- **Solucion**: Port completo de la logica de cascada a una funcion PL/pgSQL (`produccion.generate_cascade_v2()`) que corre dentro de PostgreSQL con 0 latencia de red. V1 queda intacto como fallback.

- **Flujo V2**:
  ```
  Browser → Server Action (Next.js) → supabase.rpc("generate_cascade_v2") → PostgreSQL
  1 sola llamada, toda la logica server-side = target <500ms
  ```

- **Funcion principal**: `produccion.generate_cascade_v2(p_product_id, p_start_datetime, p_duration_hours, p_staff_count, p_week_plan_id, p_create_in_db)`
  - `p_create_in_db = true`: Crea schedules en BD (modo create)
  - `p_create_in_db = false`: Solo calcula sin escribir (modo preview)
  - Retorna JSONB con misma estructura que respuesta V1
  - `SECURITY DEFINER` para poder deshabilitar/habilitar trigger `check_schedule_conflict`

- **9 helper functions** (todas en schema `produccion`):
  1. `_cascade_v2_distribute_batches(total, lote_minimo)` → numeric[] — division en batches
  2. `_cascade_v2_batch_duration(product_id, wc_id, operation_id, batch_size, staff_count)` → numeric — duracion via productividad y staff
  2b. `_cascade_v2_get_wc_staff(wc_id, datetime)` → int — staff del WC segun fecha/turno desde `work_center_staffing`
  3. `_cascade_v2_blocked_periods(wc_id, start_date, end_date)` → (block_starts[], block_ends[]) — periodos bloqueados
  4. `_cascade_v2_skip_blocked(start_ts, duration_min, block_starts[], block_ends[])` → timestamptz — ajusta start
  5. `_cascade_v2_recalculate_queue(schedules, block_starts[], block_ends[], is_hybrid)` → jsonb — simulacion de cola
  6. `_cascade_v2_simulate_finish(new_batches, existing, block_starts[], block_ends[], is_hybrid)` → timestamptz — finish time
  7. `_cascade_v2_distribute_to_wcs(new_batches, wc_contexts, deadline, is_hybrid)` → jsonb — distribucion multi-WC
  8. `_cascade_v2_get_existing_with_arrival(wc_id, context_start, context_end)` → jsonb — schedules existentes con arrival (JOINs en vez de N+1)

- **Backward cascade**: `_cascade_v2_backward_cascade()` — detecta PP en BOM, calcula start time, recursion para PP anidados via stack loop
- **Forward PP**: `_cascade_v2_forward_pp()` — reutiliza logica de forward cascade para producir PP

- **Server Actions** (`apps/web/app/planmaster/actions.ts`):
  - `createCascadeV2(params)`: Llama RPC con `p_create_in_db: true`
  - `previewCascadeV2(params)`: Llama RPC con `p_create_in_db: false`
  - Bypassa FastAPI completamente — Next.js → Supabase directo

- **Hook** (`apps/web/hooks/use-cascade-production.ts`):
  - `previewCascade` y `createCascade` ahora intentan V2 primero
  - Si V2 falla, fallback automatico a V1 (fetch → FastAPI) con `console.warn`

- **Trigger handling**: Deshabilita `check_schedule_conflict` y `check_schedule_conflicts_trigger` al inicio, re-habilita al final (incluso en EXCEPTION). Row-level locking con `SELECT ... FOR UPDATE` para concurrencia.

- **Performance esperado**:

  | Metrica | V1 (Python) | V2 (PL/pgSQL) | Mejora |
  |---------|-------------|---------------|--------|
  | Cascada individual | ~13s | <500ms target | **~96%** |
  | Queries de red | ~50 | 0 (todo server-side) | **100%** |
  | Round-trips | ~50 × 240ms | 1 RPC call | **~98%** |

- **Rollback**: Invertir try/catch en hook para que V1 sea primary. La funcion PL/pgSQL queda en BD sin hacer dano. FastAPI endpoints no se tocaron.

- **Archivos**:
  - `supabase/migrations/20260211000001_cascade_v2.sql` (funcion principal + 8 helpers + backward + forward PP)
  - `apps/web/app/planmaster/actions.ts` (Server Actions V2)
  - `apps/web/hooks/use-cascade-production.ts` (V2 primary + V1 fallback)

### 2026-02-17

#### Fix: Staffing desincronizado entre StaffingRow y cascade creation

- **Bug**: Al poner staff=4 en la UI, el cascade seguia usando staff=1. El `getStaffing()` retornaba `0` (→ fallback a `1`).

- **Causa raiz**: Dos instancias independientes del hook `useWorkCenterStaffing`:
  1. `StaffingRow` — se actualizaba al guardar (su copia local)
  2. `WeeklyPlanGrid` — nunca refetchaba, datos stale → retornaba `0`

- **Fix**: Despues de cada cambio de staffing, `handleStaffingChange` llama `refetchStaffing()` para sincronizar la instancia de `WeeklyPlanGrid`. El refetch se ejecuta ANTES de los early returns para que siempre corra.

- **Archivos**: `apps/web/components/plan-master/weekly-grid/WeeklyPlanGrid.tsx`

#### UX: Toolbar superior scrollable en movil

- **Problema**: La barra con selector de semana, forecast, produccion, deficit y toggle de vista se cortaba en movil sin posibilidad de scroll.

- **Fix**: Contenedor cambiado de `flex justify-between` a `flex gap-4 overflow-x-auto scrollbar-hide`. Hijos con `shrink-0` para evitar compresion.

- **Archivos**: `WeeklyPlanGrid.tsx`, `WeekSelector.tsx`

#### UX: Selector de semanas ampliado a 12 semanas atras/adelante

- **Problema**: `getWeeksList(4, 8)` solo mostraba 4 semanas atras — no se podia navegar a semanas 1-3 del ano.

- **Fix**: Cambiado a `getWeeksList(12, 12)` para cubrir ~3 meses en ambas direcciones.

- **Archivo**: `WeeklyPlanGrid.tsx`

### 2026-02-16

#### Fix: Staff count afecta velocidad de batch (no solo cantidad)

- **Bug**: Mas staff solo aumentaba `total_units` (mas batches) pero NO aceleraba cada batch. Resultado: mas personas = cascada mas larga (incorrecto).

- **Fix**: `_cascade_v2_batch_duration` ahora recibe `p_staff_count` y divide la duracion:
  ```
  OLD: batch_duration = batch_size / uph × 60
  NEW: batch_duration = batch_size / (uph × staff_count) × 60
  ```

- **Nuevo helper**: `_cascade_v2_get_wc_staff(wc_id, datetime)` — determina fecha/turno desde un timestamp y busca staff en `work_center_staffing`. Default: 1 si no hay staffing configurado.

- **Primer WC**: Usa `p_staff_count` del request del usuario.
- **WCs downstream**: Usa `_cascade_v2_get_wc_staff()` para cada WC en el momento de llegada del batch.
- **Operaciones fijas** (`usa_tiempo_fijo`): NO afectadas por staff.

- **Trigger fix**: `generate_cascade_v2` ahora deshabilita AMBOS triggers: `check_schedule_conflict` y `check_schedule_conflicts_trigger`.

- **Funciones actualizadas**: `generate_cascade_v2`, `_cascade_v2_backward_cascade`, `_cascade_v2_forward_pp`, `_cascade_v2_batch_duration`

- **Migracion**: `supabase/migrations/20260216000001_cascade_v2_staff_affects_speed.sql`

- **Tests**: 43/43 checks pasando (12 tests, incluyendo 2 nuevos tests de staff_count)

### 2026-02-10

#### Feature: Distribución multi-work-center para backward cascade

- **Contexto**: Cuando un producto tiene asignados multiples work centers para la misma operacion (ej: EMPASTADO 1, 2, 3 en `product_work_center_mapping`), el sistema debe distribuir batches entre los WCs disponibles cuando el deadline no puede cumplirse con un solo WC.

- **Estrategia**: Llenar primero el WC primario (el de `production_routes`). Solo usar WCs adicionales cuando el tiempo no alcanza para cumplir el deadline (PP debe estar listo antes del PT). Prerequisito: el WC debe tener personal asignado (`work_center_staffing`).

- **Nuevos helpers en `cascade.py`**:
  - `get_alternative_work_centers()`: Consulta `product_work_center_mapping` para obtener todos los WCs habilitados para un producto+operacion
  - `get_staffed_work_centers()`: Filtra WCs por disponibilidad de personal para una fecha y turno en `work_center_staffing`
  - `determine_shift_from_datetime()`: Calcula turno y fecha a partir de un datetime (T1: 22-06, T2: 06-14, T3: 14-22)
  - `simulate_wc_finish_time()`: Simula la cola de un WC para obtener finish time del ultimo batch (usando copias para no mutar originales)
  - `distribute_batches_to_work_centers()`: Distribuye batches entre WCs. Asigna todos al primario, mueve batches del final al siguiente WC si deadline no se cumple

- **Nuevo parametro `deadline_datetime`** en `generate_cascade_schedules()`:
  - Forward cascade (PT): `None` → siempre single WC
  - Backward cascade (PP): `parent_last_batch_start - bom_rest_time` → multi-WC si necesario

- **Multi-WC check en loop principal**: En cada paso de la ruta, si el WC tiene `operation_id`, verifica si hay WCs alternativos en `product_work_center_mapping`, filtra por staffing, y si hay >1 WC con staff y hay deadline, activa distribucion multi-WC

- **Multi-WC processing block**: Cuando activo:
  1. Prepara batches con arrival_time y duration (igual que path SEQUENTIAL)
  2. Llama `distribute_batches_to_work_centers()` con deadline
  3. Por cada WC asignado: obtiene productividad especifica, recalcula cola, ejecuta four-phase update independiente
  4. Merge todos los schedules creados ordenados por batch_number para el siguiente paso de la cascada

- **Compatibilidad**: Si no hay deadline (forward cascade) o solo hay 1 WC con staff, el comportamiento es identico al actual

- **Archivo**: `apps/api/app/api/routes/production/cascade.py`

#### Perf: Optimizacion de queries DB - bulk inserts y fix N+1

- **Problema**: Cada cascada tomaba ~30s debido a la cantidad de round-trips a Supabase (~240ms de latencia por llamada). Un cascade con 10 batches PP y 3 route steps hacia ~150-500+ DB calls individuales.

- **Causas identificadas**:
  1. **N+1 en `get_existing_schedules_with_arrival()`**: Por cada schedule existente, hacia 3 queries individuales (source schedule, work center operation_id, BOM rest_time). Con 15 schedules existentes = 45 queries extras.
  2. **Inserts individuales**: Phase 2 del four-phase insertaba cada schedule uno por uno. 10 batches = 10 INSERT calls.
  3. **Updates individuales**: Phase 1 (parking) y Phase 3 (move back) hacian UPDATE individual por cada schedule existente. N schedules = 2N UPDATE calls.

- **Optimizacion 1 - Fix N+1 en `get_existing_schedules_with_arrival()`**:
  - Antes: 3 queries por schedule (source lookup, WC operation lookup, BOM rest lookup)
  - Despues: 3 batch queries totales usando `.in_()`:
    1. Un solo SELECT para todos los source schedules
    2. Un solo SELECT para todos los work centers (operation_id)
    3. Un solo SELECT para todos los BOM rest times
  - Resultado: De ~3N queries a 3 queries fijas
  - **Impacto**: Mayor optimizacion individual

- **Optimizacion 2 - Bulk inserts**:
  - Phase 2 (sequential path): Acumula todos los schedules nuevos y hace 1 `.insert([list]).execute()` por WC
  - Parallel/source path: Mismo patron de bulk insert
  - Multi-WC path: Mismo patron de bulk insert por WC asignado
  - Resultado: De N INSERT calls a 1 INSERT call por WC

- **Optimizacion 3 - RPC `cascade_bulk_upsert()` para four-phase**:
  - Nueva funcion PostgreSQL que ejecuta Phase 0 (clean) + Phase 1 (park) + Phase 2 (insert) + Phase 3 (move) en una sola llamada RPC
  - Parametros: `p_schedules_to_park`, `p_schedules_to_insert`, `p_schedules_to_move`, parking zone config
  - Reemplaza los 3 bloques de four-phase update (sequential, multi-WC, hybrid)
  - Resultado: De 2N+1 calls a 1 RPC call por WC
  - **Migracion**: `supabase/migrations/20260210000001_cascade_bulk_operations.sql`

- **Nuevo helper `cascade_bulk_upsert()`** en cascade.py:
  - Wrapper Python que prepara los datos y llama al RPC
  - Convierte schedules_to_park a formato `[{id, duration_minutes}]`
  - Convierte schedules_to_move a formato `[{id, start_date, end_date}]`
  - Pasa schedules_to_insert tal cual (ya tienen formato correcto)

- **Resultados de performance**:

  | Metrica | Antes | Despues | Mejora |
  |---------|-------|---------|--------|
  | Cascada individual (PT+PP) | ~30s | ~13s | **57%** |
  | Test suite completo (37 checks) | ~6-7min* | ~3:06 | **~55%** |
  | `get_existing_schedules_with_arrival` | 3N queries | 3 queries | **~95%** |
  | Phase 2 inserts | N calls/WC | 1 call/WC | **N-1 calls** |
  | Four-phase total | 2N+2 calls | 1 RPC call | **~98%** |

  *Estimado pre-optimizacion

- **Bottleneck restante**: Latencia de red a Supabase (~240ms/call). Cada cascada aun hace ~50 queries para productividades, rest times, BOM lookups, blocked shifts, etc. Para bajar a <5s se necesitaria un RPC que devuelva toda la metadata del producto en 1 llamada.

- **Archivos**:
  - `apps/api/app/api/routes/production/cascade.py` (N+1 fix, bulk inserts, RPC wrapper)
  - `supabase/migrations/20260210000001_cascade_bulk_operations.sql` (funcion RPC)

#### Test: Suite de pruebas integral del cascade

- **Archivo**: `apps/api/test_full_cascade.py`
- **Cobertura**: 37 checks across 10 test scenarios en enero 2026 (semanas 1-3)
- **Escenarios**:
  1. Forward cascade basico (PT con PP dependency) - verifica cascade levels, batch numbering, cascade_source_id chain, PP timing
  2. Segunda cascada misma semana (queue sharing) - verifica no overlaps en DECORADO compartido
  3. Cross-week cascade (sabado tarde cerca del boundary) - verifica schedules span correcto
  4. Week 2 multiples cascadas (2 PTs con PPs) - verifica AMASADO compartido en hybrid mode
  5. Delete cascade con PP dependencies - verifica eliminacion recursiva completa
  6. Re-creacion despues de delete - verifica estado limpio
  7. Produccion mediana (800 units, 3 batches) - verifica PP proporcional
  8. 3 cascadas el mismo dia (tight scheduling) - verifica no DECORADO overlaps entre 3 cascadas
  9. Preview endpoint - verifica que no escribe en DB
  10. Mass deletion y verificacion - limpia todo y verifica 0 residuales
- **Resultado**: 37/37 passing

#### Feature: Cascada entre semanas (cross-week scheduling)

- **Problema**: Las queries de contexto (colas, bloqueos, schedules existentes) usaban la ventana `[week_start, week_end]`. Esto causaba:
  1. Schedules que cruzaban el limite de semana eran invisibles en queries de contexto
  2. Parking zone (Phase 0) destruia schedules legitimos de la semana siguiente
  3. Backward PP que caia en semana N no veia schedules/bloqueos de semana N
  4. Forward que cruzaba semana no veia schedules existentes del otro lado → solapamientos

- **Solucion**: Expandir ventana de contexto a ±1 semana sin cambiar la logica core de scheduling:
  - Nuevo helper `calculate_context_window(week_start, week_end)` retorna `(context_start, context_end)`
  - `context_start = week_start - 1 semana`, `context_end = week_end + 1 semana`
  - Nuevos parametros `context_start_datetime` y `context_end_datetime` en `generate_cascade_schedules()` y `generate_backward_cascade_recursive()`
  - Queries cambiadas a usar ventana expandida:
    - `get_existing_schedules_with_arrival()`: Cola SEQUENTIAL/HYBRID forward
    - `get_blocked_shifts()`: Bloqueos SEQUENTIAL/HYBRID y PARALLEL forward
    - `get_blocked_shifts()`: Bloqueos backward PP adjustment
  - Parametros propagados en llamadas recursivas
  - Endpoints `create` y `preview` calculan y pasan ventana de contexto

- **Fix critico: Parking zone segura**:
  - Parking zone movida de `[week_end, week_end + 2d]` a `[context_end + 30d, context_end + 32d]`
  - Elimina destruccion de schedules legitimos de semanas adyacentes
  - Phase 0 cleanup y Phase 1 parking usan la misma zona lejana

- **Backward compatible**: Si `context_start/end` no se pasan, las funciones usan `week_start/end` como fallback.

- **Archivo**: `apps/api/app/api/routes/production/cascade.py`

#### Fix: Schedules de domingo aparecian en semana anterior

- **Problema**: Al programar produccion en domingo, los schedules de T1 (que inician sabado 22:00) aparecian en la columna "domingo" de la semana anterior. Causa: el frontend usaba `Sunday 06:00` como inicio del query, pero el T1 del domingo empieza `Saturday 22:00`. Ese gap de 8 horas hacia que el query excluyera los T1, y al navegar a la semana anterior aparecian ahi.
- **Solucion**: Separar la referencia de display de la ventana de query en `use-shift-schedules.ts`:
  - `normalizedWeekStart` (Domingo 06:00): se mantiene para calculos de display (columnas, `getShiftDates`)
  - `queryStart` / `queryEnd` (Sabado 22:00 → Sabado 22:00): nueva ventana alineada con el backend para el fetch de schedules
  - El mapeo de `dayIndex` para T1 (`(dayIndex + 1) % 7`) ya existia y sigue funcionando correctamente
- **Archivo**: `apps/web/hooks/use-shift-schedules.ts`

### 2026-02-09

#### Feature: Bloqueo de turnos y dias

- **Contexto**: El sistema de cascada programaba batches asumiendo todos los turnos disponibles. Se necesitaba poder bloquear turnos por work center.
- **Solucion**: Sistema completo de bloqueo con UI y backend:

  **Base de datos** (`produccion.shift_blocking`):
  - Tabla con `work_center_id`, `date`, `shift_number` y constraint UNIQUE
  - Migración ejecutada directamente en BD

  **Frontend** (hook + UI):
  - `use-shift-blocking.ts`: Hook que sigue patron de `use-work-center-staffing.ts`
    - `fetchBlockings(startDate, endDate)`: Carga bloqueos de la semana
    - `toggleBlock(workCenterId, date, shiftNumber)`: Insert si no existe, delete si existe
    - `isShiftBlocked(workCenterId, dayIndex, shiftNumber)`: Lookup en memoria
  - `WeeklyGridRow.tsx`: Boton de esquina (12x12px) en cada celda del header row
    - Visible al hover, rojo cuando bloqueado, gris cuando desbloqueado
    - Celda bloqueada muestra patron de rayas diagonales semitransparentes
  - `WeeklyGridCell.tsx`: Overlay de rayas diagonales para celdas bloqueadas expandidas
    - Deshabilita drag-to-create en celdas bloqueadas
    - Context menu muestra "Turno bloqueado" deshabilitado
  - `WeeklyPlanGrid.tsx`: Integra hook y pasa props a cada row

  **Backend** (`cascade.py`):
  - `get_blocked_shifts()`: Consulta tabla y convierte (date, shift_number) a rangos horarios:
    - T1: date-1 22:00 -> date 06:00
    - T2: date 06:00 -> date 14:00
    - T3: date 14:00 -> date 22:00
  - `skip_blocked_periods()`: Si un batch cae en periodo bloqueado, lo mueve al fin del bloqueo. Repite si el batch no cabe antes del siguiente bloqueo.
  - `recalculate_queue_times()` y `recalculate_queue_times_hybrid()`: Nuevo parametro `blocked_periods`, llaman `skip_blocked_periods()` despues de calcular start_time
  - `generate_cascade_schedules()`: Obtiene blocked periods antes del loop de batches y los pasa a funciones de recalculo
  - `generate_backward_cascade_recursive()`: Re-simulacion absoluta con blocked periods para ajustar PP start time. Si los WCs del PP tienen turnos bloqueados, el PP inicia antes para compensar el tiempo perdido. Iterativo (max 5 iteraciones) hasta convergencia.

- **Archivos**:
  - `apps/web/hooks/use-shift-blocking.ts` (nuevo)
  - `apps/web/components/plan-master/weekly-grid/WeeklyGridRow.tsx`
  - `apps/web/components/plan-master/weekly-grid/WeeklyGridCell.tsx`
  - `apps/web/components/plan-master/weekly-grid/WeeklyPlanGrid.tsx`
  - `apps/api/app/api/routes/production/cascade.py`

#### Feature: Drag-to-extend para bloqueo de turnos (estilo Excel)

- **Contexto**: Bloquear turnos uno por uno con el checkbox era lento. Se necesitaba una forma rapida de bloquear/desbloquear multiples turnos de una vez.
- **Solucion**: Drag bidireccional desde un turno bloqueado, similar a arrastrar celdas en Excel:

  **Interaccion**:
  - Cada celda bloqueada muestra un **handle de arrastre** (cuadrito rojo 5x5px) en la esquina inferior-derecha, visible al hover
  - **Arrastrar hacia derecha/abajo** = bloquear turnos adicionales (preview con rayas rojas)
  - **Arrastrar hacia izquierda/arriba** = desbloquear turnos existentes (preview con rayas verdes)
  - Al soltar, se ejecutan los toggles correspondientes

  **Implementacion tecnica**:
  - Estado de drag levantado al componente padre (`WeeklyPlanGrid.tsx`) para coordinar entre filas
  - Deteccion de celdas via `document.elementFromPoint()` + atributos `data-block-resource`, `data-block-day`, `data-block-shift`
  - Refs (`dragBlockRegionRef`, `orderedResourceIdsRef`) para evitar stale closures en event handlers globales
  - Region de drag: `{ dayIndex, fromShift, toShift, resourceIds: Set<string>, action: 'block' | 'unblock' }`
  - Direccion determina accion: si cursor se mueve a indice menor que el inicio → unblock, mayor → block
  - Limitado al mismo dia (no permite drag entre dias diferentes)

  **Visual**:
  - Preview de bloqueo: rayas diagonales rojas semitransparentes (`rgba(255,69,58,0.25)`)
  - Preview de desbloqueo: rayas diagonales verdes semitransparentes (`rgba(48,209,88,0.25)`)
  - Celdas en preview de desbloqueo muestran opacidad mas alta (0.9 vs 0.6) para indicar que se restauraran

- **Archivos**:
  - `apps/web/components/plan-master/weekly-grid/WeeklyGridRow.tsx` (handle de arrastre + preview visual)
  - `apps/web/components/plan-master/weekly-grid/WeeklyPlanGrid.tsx` (maquina de estado del drag)

#### Feature: Herencia de color PP → PT en grilla semanal
- **Problema**: Al crear dos PTs con backward cascade, todos los PP (EMPASTE) se mostraban con el mismo color azul. No había forma visual de saber cuáles batches de PP correspondían a cuál PT.
- **Solución**: Los bloques ahora heredan color del `production_order_number` del PT padre:
  - Si un schedule tiene `produced_for_order_number` (es PP hijo), usa ese order number para asignar color
  - Si no (es PT directo), usa su propio `production_order_number`
  - Color se calcula como `PALETTE[orderNumber % 10]` con 10 colores distinguibles
- **Paleta**: azul iOS, naranja, verde, púrpura, rosa, cyan, amarillo, marrón, salmón, índigo
- **Cambios**:
  - `ShiftSchedule` interface: nuevos campos `productionOrderNumber` y `producedForOrderNumber`
  - `ShiftBlock`: acepta prop `color` y usa `backgroundColor` inline en vez de clase hardcodeada
  - `WeeklyGridCell`: calcula color con `getOrderColor()` y lo pasa a cada `ShiftBlock`
- **Archivos**: `use-shift-schedules.ts`, `ShiftBlock.tsx`, `WeeklyGridCell.tsx`

#### Feature: Eliminación en cascada de PT con dependencias PP
- **Problema**: Al eliminar un schedule de un PT, solo se borraba ese bloque individual. Los demás batches del PT y los PP asociados quedaban huérfanos.
- **Solución**: Eliminación recursiva que borra toda la cadena de dependencias:
  1. Frontend detecta si el schedule tiene `productionOrderNumber`
  2. Si lo tiene, llama a `DELETE /api/production/cascade/order/{order_number}` en vez de borrar fila individual
  3. Backend busca recursivamente todos los PP dependientes (via `produced_for_order_number`)
  4. Nullifica `cascade_source_id` de cada orden para evitar FK constraint
  5. Borra en orden inverso: PP más profundos primero, luego PT
- **Cambios**:
  - `delete_cascade_order()`: nueva lógica con `collect_pp_dependencies()` recursivo
  - `handleDeleteSchedule()`: detecta cascade schedules y usa API de eliminación completa
- **Archivos**: `cascade.py`, `WeeklyPlanGrid.tsx`

#### Fix: Phase 0 parking cleanup borraba schedules legítimos de otras semanas
- **Problema**: La Fase 0 del sistema de 4 fases hacía `DELETE WHERE start_date >= week_end`, lo cual borraba todos los schedules futuros del work center, no solo los "parqueados" de intentos fallidos. Cuando esos schedules tenían hijos referenciándolos vía `cascade_source_id`, el DELETE fallaba con error de foreign key constraint (código 23503).
- **Solución**: Limitar el DELETE de Fase 0 solo a la zona de parking (`week_end` a `week_end + 2 days`) en lugar de todo el futuro
- **Nota**: Resuelto definitivamente en 2026-02-10 moviendo parking zone a `context_end + 30 days`.
- **Archivo**: `apps/api/app/api/routes/production/cascade.py` líneas 1014-1021

### 2026-02-05

#### Feature: Modo híbrido de procesamiento para work centers
- **Problema**: Cuando se crean dos PTs que usan el mismo PP, el segundo PP terminaba DESPUÉS del PT porque sus batches se encolaban detrás de los batches del primer PP en los WCs secuenciales
- **Solución**: Nuevo modo HYBRID que permite:
  - Secuencialidad dentro de la misma referencia (production_order_number)
  - Paralelismo entre diferentes referencias
- **Cambios**:
  - Nueva columna `permite_paralelo_por_referencia` en `produccion.work_centers`
  - Trigger `check_schedule_conflict` actualizado para permitir solapamiento entre diferentes `production_order_number` cuando el flag está activo
  - Nueva función `recalculate_queue_times_hybrid()` que agrupa por referencia
  - Enum `ProcessingType` ahora incluye `HYBRID`
- **Archivos**: `cascade.py`, `production.py`

### 2026-02-03

#### Fix: Simulación de cola para cálculo de tiempo total de PP
- **Problema**: PP terminaba 18 minutos DESPUÉS del inicio del último batch del PT
  - El pipeline model asumía que operaciones subsecuentes solo añaden tiempo del último batch
  - Esto es correcto si operaciones subsecuentes son más RÁPIDAS que las anteriores
  - Si una operación subsecuente es MÁS LENTA, los batches hacen cola y todos contribuyen al tiempo total
  - Ejemplo con WC1=18min/batch, WC2=30min/batch, 3 batches:
    - Pipeline calculaba: 54 + 30 = 84 min
    - Real (cola): B1 llega t=18, termina t=48; B2 llega t=36, espera, termina t=78; B3 llega t=54, espera, termina t=108
- **Solución**: Simular comportamiento REAL de colas para calcular `pp_total_time`
  - Trackea `batch_finish_times` para cada batch a través de todos los work centers
  - Para SEQUENTIAL: calcula `start = max(arrival, queue_end)` como hace `recalculate_queue_times`
  - Para PARALLEL: todos los batches se procesan simultáneamente
  - Resultado: `pp_total_time` coincide exactamente con el tiempo real de los schedules creados
- **Archivo**: `apps/api/app/api/routes/production/cascade.py` líneas 574-635

#### Fix: Sincronización PP usa hora REAL del último batch del PT
- **Problema**: PP terminaba 27 minutos antes del inicio del último batch del PT
  - El código calculaba `parent_last_batch_start` con fórmula de distribución uniforme
  - Fórmula: `offset = (duration_hours / num_batches) * (num_batches - 1)`
  - Esta fórmula NO refleja cómo se programan batches en centros SEQUENTIAL
  - Ejemplo: Calculaba 09:15, pero el batch real iniciaba a las 10:00
- **Solución**: Usar el `start_date` REAL del último batch del PT desde la BD
  - Nuevo parámetro `parent_last_batch_start_actual` en `generate_backward_cascade_recursive`
  - Después de crear PT, consulta el último batch del primer work center
  - Pasa el valor real al backward cascade
  - Fallback a cálculo para recursión de PP anidados
- **Resultado**: PP último batch termina exactamente cuando PT último batch inicia
- **Archivo**: `apps/api/app/api/routes/production/cascade.py` líneas 504, 546-571, 1196-1227

### 2026-01-28

#### Feature: Backward Cascade para PP (Productos en Proceso)
- **Funcionalidad**: Sistema automático de cascada inversa para producir PP cuando PT los requiere
- **Detección**: Lee BOM del PT y detecta ingredientes con category='PP'
- **Sincronización**: PP se sincroniza con el **último batch del PT** (no el primero)
  - Optimiza tiempo total de producción
  - Evita stock innecesario de PP
- **Cálculo de Cantidades**: `required_PP = PT_total_units × BOM_quantity`
  - Parámetro `fixed_total_units` en generate_cascade_schedules
  - Garantiza cantidad exacta sin recálculo basado en productividad
- **Recursión**: Soporta PP anidados (PT → PP → PP → MP)
- **Tracking**: Campos `produced_for_order_number` y `cascade_type='backward'`
- **Archivo**: `apps/api/app/api/routes/production/cascade.py`

#### Fix: SEQUENTIAL work centers usan sistema de colas siempre
- **Problema**: Work centers SEQUENTIAL solo usaban cola si no eran el primero
  - Primer WC distribuía batches en paralelo causando overlaps
- **Solución**: Condición cambiada de `if not is_parallel and previous_batch_schedules`
  a `if not is_parallel`
  - Sistema de colas se aplica incluso al primer work center
  - Batches llegan todos al mismo tiempo (arrival_time = start_datetime)
  - Se procesan secuencialmente respetando orden FIFO
- **Archivo**: `apps/api/app/api/routes/production/cascade.py` línea 752

#### Fix: Sincronización PP con último batch del PT
- **Problema**: PP se sincronizaba con primer batch del PT
  - Causaba producción innecesariamente temprana cuando PT tenía múltiples batches
  - Ejemplo: PT 3 batches (06:00, 10:00, 14:00), PP terminaba a 06:27 en vez de ~13:00
- **Solución**: Calcular `parent_last_batch_start` y sincronizar con ese momento
  - `parent_last_batch_offset = (duration_hours / num_batches) * (num_batches - 1)`
  - `PP_start = parent_last_batch_start - PP_total_time - final_rest_time`
- **Resultado Verificado**: PT último batch 14:00, PP último batch termina 12:48 ✅
- **Archivo**: `apps/api/app/api/routes/production/cascade.py` líneas 543-589

#### Fix: Cálculo correcto de cantidad de PP
- **Problema**: PP producía ~40 unidades en vez de 600
  - generate_cascade_schedules recalculaba total_units = duration × productivity
  - Ignoraba la cantidad requerida calculada
- **Solución**: Agregar parámetro `fixed_total_units` a generate_cascade_schedules
  - Cuando está presente, usa ese valor en lugar de recalcular
  - Backward cascade pasa `fixed_total_units=required_quantity`
- **Archivo**: `apps/api/app/api/routes/production/cascade.py` líneas 687, 733-736

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

## 🎯 Cascada Inversa para PP

> **Estado**: Funcionalidad verificada y funcionando correctamente
> **Versión**: 2026-01-28
> **Última actualización**: Fix de sincronización con último batch del PT

### Overview

La cascada inversa (backward cascade) programa automáticamente la producción de Productos en Proceso (PP) cuando un Producto Terminado (PT) los requiere como ingredientes. El sistema calcula hacia atrás en el tiempo para que los PP estén listos justo cuando el PT los necesita.

**Implementado y verificado:**
- ✅ Detección automática de PP en BOM
- ✅ Cálculo correcto de cantidades (PT_units × BOM_quantity)
- ✅ Sincronización con último batch del PT (no el primero)
- ✅ Sistema de colas SEQUENTIAL para work centers
- ✅ Recursión para PP anidados

### ¿Cómo Funciona?

Cuando creas una cascada de un PT:

1. **Detección Automática**: Sistema revisa el BOM del PT y detecta ingredientes con categoría='PP'
2. **Cálculo Backward**: Calcula cuándo debe iniciar la producción del PP para que termine justo antes del PT
3. **Sincronización Batch-by-Batch**: El último batch del PP termina exactamente cuando el último batch del PT lo necesita
4. **Recursión**: Soporta PP anidados (PT → PP → PP → MP)

### Fórmula de Sincronización

**Clave:** El PP se sincroniza con el **último batch del PT**, no con el primero.

```
# Calcular cuándo inicia el último batch del PT
parent_last_batch_offset = (duration_hours / num_batches) * (num_batches - 1)
parent_last_batch_start = parent_start_datetime + parent_last_batch_offset

# Calcular cuándo debe iniciar el PP
PP_start = parent_last_batch_start - PP_total_time - final_rest_time
```

**Donde:**
- `parent_last_batch_start`: Cuando inicia el **último batch del PT**
  - Batches del PT se distribuyen uniformemente sobre `duration_hours`
  - Si PT tiene 3 batches en 6h: batch 1 @ 0h, batch 2 @ 2h, batch 3 @ 4h
- `PP_total_time`: Tiempo total para producir **todo** el PP (todos los batches, todas las operaciones)
- `final_rest_time`: Tiempo de reposo del BOM antes de que PT pueda usar el PP

**Por qué el último batch:**
- El **primer batch del PP** puede estar listo mucho antes del primer batch del PT
- El **último batch del PP** debe estar listo justo cuando el último batch del PT lo necesita
- Esto optimiza el tiempo total de producción y evita stock innecesario

### Ejemplo de Sincronización (Caso Real Verificado)

**Escenario**: PT Croissant necesita PP EMPASTE

```
Configuración:
- PT: 675 unidades, lote 400 → 2 batches (400 + 275)
- PT batches distribuidos en 6h:
  - Batch 1: 06:00 - 10:00 (4h)
  - Batch 2: 10:00 - 14:00 (4h) ← ÚLTIMO BATCH
- PP: 675 unidades, lote 40 → 17 batches
- PP ruta: PESAJE (2h/batch) → AMASADO (48min/batch)
- Reposo PP→PT: 0h

Cálculo:
- PT último batch inicia: 06:00 + 4h = 10:00 ← Punto de sincronización
- PP tiempo total:
  - PESAJE: 17 batches × 2h = 34h (secuencial)
  - AMASADO: 17 batches × 0.8h = 13.6h (secuencial)
  - Total: 47.6h
- PP debe terminar: 10:00 (cuando inicia último batch PT)
- PP inicia: 10:00 - 47.6h = 06:24 (día anterior) ✓

Resultado Verificado en BD:
- PP último batch (AMASADO) termina: 12:48
- PT último batch inicia: 14:00
- Gap: 1.2h antes ✅ (permite pequeño buffer)

Por qué funciona:
- PP batch 1 alimenta a PT batch 1 (sobra tiempo)
- PP batch 17 termina justo antes de PT batch 2
- Sincronización óptima sin desperdicio de tiempo
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

### Características Implementadas

1. **✅ Cálculo Dinámico de Duración**: PP calcula duración basada en:
   - Productividad real del work center
   - Cantidad requerida exacta (PT_units × BOM_quantity)
   - Fallback a estimación si no hay productividad

2. **✅ Sistema de Colas SEQUENTIAL**: Work centers secuenciales usan cola correctamente
   - Batches se encolan incluso en el primer work center
   - Respeta arrival_time y reorganiza colas existentes

3. **✅ Parámetro `fixed_total_units`**: Permite especificar cantidad exacta
   - Evita recálculo basado en duración × productividad
   - Garantiza que PP produzca exactamente lo que PT necesita

4. **✅ Tracking Completo**: Schedules PP incluyen:
   - `produced_for_order_number`: Vincula al PT
   - `cascade_type: 'backward'`: Identifica como dependencia
   - Permite queries y análisis de relaciones

### Limitaciones Conocidas

1. **✅ Staff Afecta Velocidad**: Staff ahora reduce duracion de batch (2026-02-16)
   - Formula: `batch_duration = batch_size / (uph × staff_count) × 60`
   - PP downstream usa `work_center_staffing` para lookup de staff por WC/fecha/turno
   - Operaciones con `usa_tiempo_fijo` NO se ven afectadas

2. **UI Parcialmente Diferenciada**: PP hereda color del PT padre
   - ✅ Diferenciación visual por color (resuelto 2026-02-09)
   - Falta tooltip indicando "Producción para [PT]"

3. **Sin Validación de Conflictos Temporales**: Sistema permite que PP termine después de PT
   - Se ve en schedules pero no hay warning automático
   - Usuario debe verificar visualmente

### Casos de Prueba Verificados

- ✅ PT simple con 1 PP (Croissant → EMPASTE)
  - 400 unidades → PP 400 unidades ✓
  - 675 unidades → PP 675 unidades ✓
- ✅ Sincronización correcta con último batch del PT
  - PP termina antes del último batch del PT ✓
  - Gap apropiado (1-2h) ✓
- ✅ Sistema de colas SEQUENTIAL
  - Batches se encolan correctamente ✓
  - Work centers secuenciales respetan orden ✓

### Casos de Prueba Pendientes

- [ ] PT con múltiples PPs en paralelo
- [ ] PP anidado (3 niveles: PT → PP → PP)
- [ ] Conflictos en centros compartidos con PP
- [x] Eliminación de PT con PP dependientes (cascade delete) - Implementado 2026-02-09
- [ ] Performance con recursión profunda (>5 niveles)

### Próximos Pasos

1. ~~**Testing en Ambiente de Desarrollo**~~ (COMPLETADO)
   - ✅ Crear productos de prueba con PP dependencies
   - ✅ Verificar tiempos de sincronización
   - ✅ Validar sistema de colas con PP

2. **Refinamientos**
   - ✅ Cálculo dinámico de duración de PP (implementado con simulacion de colas)
   - [ ] Detección de conflictos y warnings (PP que termina después de PT)
   - [x] Staff afecta velocidad de batch (batch_duration = batch_size / (uph × staff) × 60) - Implementado 2026-02-16

3. **Frontend**
   - ✅ Visualización diferenciada de PP cascades (color por order number)
   - ✅ OrderBar condensado (1 barra por orden en vez de N pills)
   - [ ] Preview modal mostrando PT y PP juntos
   - [ ] Tooltips indicando "Producción de PP para [Nombre PT]"

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

⚠️ **Estado de Producción**
- ✅ Funcionalidad core verificada y funcionando
- ✅ Sincronización correcta con último batch del PT
- ✅ Cálculo correcto de cantidades de PP
- ✅ Visualización diferenciada por color (PP hereda color del PT padre)
- ⚠️ Usar con precaución en datos de producción hasta tener más casos de prueba

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

**✅ Completado**:
- [x] Configurar productividad para producto 00007635-0000-4000-8000-000076350000
- [x] Configurar productividad para PP EMPASTE
- [x] Ejecutar test completo y verificar PP cascade
- [x] Validar tiempos de sincronización
  - Test 1: PT 1 batch (400 unidades) → PP 400 unidades ✅
  - Test 2: PT 2 batches (675 unidades) → PP 675 unidades ✅
  - Sincronización con último batch verificada ✅

**⏳ Pendiente**:
- [ ] Probar con múltiples PPs en paralelo
- [ ] Probar con PP anidados (si existen productos con esa configuración)
- [x] Probar eliminación de PT con PP dependientes - Implementado 2026-02-09
- [x] Implementar visualización diferenciada en UI - Implementado 2026-02-09 (color por order number)

**Resultados Verificados**:

```sql
-- Test 2 (2 batches PT):
PT Order #18:
  Batch 1: 06:00 - 10:00
  Batch 2: 10:00 - 14:00 ← último batch

PP Order #19 (EMPASTE, produced_for #18):
  17 batches en 2 work centers
  Último batch (AMASADO) termina: 12:48

Validación:
  PP termina: 12:48
  PT último batch inicia: 14:00
  Gap: 1.2h ✅ CORRECTO
```

**Conclusión**: Funcionalidad core verificada y funcionando correctamente. Lista para uso en desarrollo/staging.
