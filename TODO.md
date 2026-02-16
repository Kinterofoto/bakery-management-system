# TODO: Cascada Inversa para Productos en Proceso (PP)

## ⚠️ RESTRICCIÓN CRÍTICA

**NO MODIFICAR LA CASCADA FORWARD ACTUAL**
- La cascada forward existente funciona correctamente y NO debe ser modificada
- Toda la funcionalidad de cascada inversa debe ser NUEVA
- Crear funciones separadas que NO afecten el comportamiento actual
- La cascada forward seguirá usando `bill_of_materials.tiempo_reposo_horas` (como está ahora)
- La cascada inversa usará `production_routes.tiempo_reposo_horas` (nuevo campo)

## Resumen

Implementar cascada inversa automática que, cuando un Producto Terminado (PT) requiere Productos en Proceso (PP) como ingredientes, programe automáticamente la producción de esos PP hacia atrás en el tiempo, asegurando que estén listos justo cuando inicia la producción del PT.

## Contexto del Sistema Actual

### Cascada Forward Existente
- **Archivo**: `apps/api/app/api/routes/production/cascade.py`
- **Dirección**: Primera operación → Última operación
- **Entrada**: Usuario programa en primer centro de trabajo
- **Salida**: Sistema crea schedules para todas las operaciones subsiguientes
- **Características**:
  - División en batches según `lote_minimo`
  - Procesamiento paralelo (múltiples carros) y secuencial (FIFO)
  - Sistema de colas dinámico con reorganización por arrival_time
  - 4 fases para evitar overlaps en constraints de BD
  - Usa `tiempo_reposo_horas` del BOM

### Estructura de Datos
- **Productos**: Categorías PT (terminado), PP (proceso), MP (materia prima)
- **BOM**: `produccion.bill_of_materials` vincula productos con ingredientes
  - Campos: `product_id`, `material_id`, `operation_id`, `quantity_needed`, `tiempo_reposo_horas`
- **Rutas**: `produccion.production_routes` define secuencia de operaciones por producto
- **Schedules**: `produccion.production_schedules` almacena la programación

## Requisitos de la Cascada Inversa

1. **Activación Automática**: Al crear producción de PT, detectar PP en BOM y programarlos automáticamente
2. **Múltiples PP en Paralelo**: Cada PP se calcula independientemente según su productividad
3. **Recursivo**: Soportar PP → PP → MP (dependencias anidadas)
4. **Sistema de Colas**: Usar mismo mecanismo de conflictos que cascada forward
5. **Cálculo Backward**: Trabajar desde fecha de inicio del PT hacia atrás
6. **Sincronización Batch-by-Batch**: El último batch del PP (+ reposo) debe estar listo exactamente cuando el último batch del PT lo necesita

## Diseño de la Solución

### 1. Detección de PP en BOM

**Función**: `get_pp_ingredients(supabase, product_id: str) -> List[dict]`

```python
async def get_pp_ingredients(supabase, product_id: str) -> List[dict]:
    """Get PP ingredients from BOM for a product.

    Returns list of PP materials with their quantities and operations.
    """
    # Query BOM for materials that are category='PP'
    result = supabase.schema("produccion").table("bill_of_materials").select(
        "material_id, quantity_needed, operation_id, tiempo_reposo_horas, "
        "material:public.products!material_id(id, name, category, lote_minimo)"
    ).eq("product_id", product_id).eq("is_active", True).execute()

    # Filter for PP category
    pp_materials = [
        item for item in result.data
        if item.get("material", {}).get("category") == "PP"
    ]

    return pp_materials
```

**Ubicación**: `apps/api/app/api/routes/production/cascade.py`

### 2. Nueva Función para Tiempo de Reposo desde Rutas

**Función**: `get_rest_time_from_route(supabase, product_id: str, work_center_id: str) -> float`

```python
async def get_rest_time_from_route(supabase, product_id: str, work_center_id: str) -> float:
    """Get rest time from production_routes for this work center.

    This is a NEW function for backward cascade. Forward cascade continues
    using get_rest_time_hours() which reads from BOM.
    """
    result = supabase.schema("produccion").table("production_routes").select(
        "tiempo_reposo_horas"
    ).eq("product_id", product_id).eq("work_center_id", work_center_id).execute()

    if result.data and len(result.data) > 0:
        return float(result.data[0].get("tiempo_reposo_horas") or 0)
    return 0
```

**Ubicación**: `apps/api/app/api/routes/production/cascade.py`

### 3. Cálculo de Cantidad de PP Requerida

**Función**: `calculate_pp_quantity(pt_batch_size: float, bom_quantity: float) -> float`

```python
def calculate_pp_quantity(pt_batch_size: float, bom_quantity: float) -> float:
    """Calculate how much PP is needed for a PT batch.

    Args:
        pt_batch_size: Number of PT units in batch
        bom_quantity: Quantity from BOM (normalized if recipe_by_grams)

    Returns:
        Required PP units
    """
    # BOM quantity is normalized (percentage) if product.is_recipe_by_grams
    # Otherwise it's absolute quantity per PT unit
    return pt_batch_size * bom_quantity
```

### 4. Algoritmo de Cascada Inversa con Sincronización Batch-by-Batch ⭐ CRÍTICO

**Concepto Clave**: La sincronización es continua. No espera a que TODO el PP termine. Cada batch del PP alimenta cada batch del PT de forma just-in-time.

**Restricción**: El ÚLTIMO batch del PP (+ reposo) debe estar listo exactamente cuando el ÚLTIMO batch del PT lo necesita.

**Función**: `calculate_pp_start_time(pt_cascade_info: dict, pp_material: dict, pp_route: List[dict]) -> datetime`

**Algoritmo de Sincronización**:

```python
async def calculate_pp_start_time(
    supabase,
    pt_product_id: str,
    pt_start_datetime: datetime,
    pt_duration_hours: float,
    pt_staff_count: int,
    pt_lote_minimo: float,
    pp_material: dict,
    pp_route: List[dict],
    required_pp_quantity: float,
) -> datetime:
    """Calculate when PP production should start for just-in-time delivery.

    Logic:
    1. PT batches are distributed over pt_duration_hours
    2. PP batches are produced continuously
    3. Last PP batch (+rest) must arrive exactly when last PT batch needs it
    4. This accounts for different production rates (PP vs PT consumption)
    """
    # 1. Calculate PT timeline
    pt_total_units = calculate_total_units(pt_product_id, pt_duration_hours, pt_staff_count)
    pt_batches = distribute_units_into_batches(pt_total_units, pt_lote_minimo)
    pt_num_batches = len(pt_batches)

    # Time when LAST PT batch starts (distributed over duration_hours)
    pt_last_batch_offset = (pt_duration_hours / pt_num_batches) * (pt_num_batches - 1)
    pt_last_batch_start = pt_start_datetime + timedelta(hours=pt_last_batch_offset)

    # 2. Calculate PP timeline
    pp_product = await get_product(supabase, pp_material["material"]["id"])
    pp_lote_minimo = float(pp_product.get("lote_minimo") or 100)
    pp_batches = distribute_units_into_batches(required_pp_quantity, pp_lote_minimo)
    pp_num_batches = len(pp_batches)

    # Calculate total time for PP from first batch start to last batch end
    pp_total_time = timedelta(0)
    for operation in pp_route:
        # Time for all batches in this operation
        for batch_size in pp_batches:
            productivity = await get_productivity(supabase, pp_product["id"], operation["work_center_id"])
            batch_duration = calculate_batch_duration_minutes(productivity, batch_size)
            pp_total_time += timedelta(minutes=batch_duration)

        # Add rest time after this operation (NEW: from production_routes)
        # Use new function to read from routes instead of BOM
        rest_time_hours = await get_rest_time_from_route(
            supabase, pp_product["id"], operation["work_center_id"]
        )
        pp_total_time += timedelta(hours=rest_time_hours)

    # 3. Get final rest time before PT can use PP
    # This is the tiempo_reposo from PT's BOM for the operation that consumes this PP
    final_rest_time_hours = float(pp_material.get("tiempo_reposo_horas") or 0)

    # 4. Calculate PP start time
    # FORMULA: PP_last_batch_END + rest_time = PT_last_batch_START
    # Therefore: PP_last_batch_END = PT_last_batch_START - rest_time
    # And: PP_start = PP_last_batch_END - pp_total_time
    # Simplified: PP_start = PT_last_batch_START - rest_time - pp_total_time
    pp_start_datetime = pt_last_batch_start - timedelta(hours=final_rest_time_hours) - pp_total_time

    return pp_start_datetime
```

**Ejemplos de Sincronización**:

**Ejemplo 1: PP y PT al mismo ritmo (sin reposo)**
```
PP: 3 batches × 1h cada uno = 3h total
PT: 3 batches × 1h cada uno = 3h total
PT inicia: 08:00
Reposo PP→PT: 0h

Cálculo:
- Último batch PT INICIA: 08:00 + 2h = 10:00
- PP último batch debe TERMINAR + 0h reposo = 10:00
- PP último batch debe TERMINAR: 10:00
- PP total time: 3h
- PP inicia: 10:00 - 3h = 07:00 ✓

Timeline:
07:00-08:00: PP batch 1 termina 08:00 + 0h reposo → PT batch 1 inicia 08:00 ✓
08:00-09:00: PP batch 2 termina 09:00 + 0h reposo → PT batch 2 inicia 09:00 ✓
09:00-10:00: PP batch 3 termina 10:00 + 0h reposo → PT batch 3 inicia 10:00 ✓
```

**Ejemplo 2: PT consume más rápido que PP produce (con reposo)**
```
PP: 3 batches × 2h cada uno = 6h total
PT: 3 batches × 30min cada uno = 1.5h total
PT inicia: 10:00
Reposo PP→PT: 1h

Cálculo:
- Último batch PT INICIA: 10:00 + 1h = 11:00
- PP último batch debe TERMINAR + 1h reposo = 11:00
- PP último batch debe TERMINAR: 10:00
- PP total time: 6h
- PP inicia: 10:00 - 6h = 04:00 ✓

Timeline:
04:00-06:00: PP batch 1 termina 06:00 + 1h reposo → listo 07:00 (espera 3h hasta PT)
06:00-08:00: PP batch 2 termina 08:00 + 1h reposo → listo 09:00 (espera 1.5h hasta PT)
08:00-10:00: PP batch 3 termina 10:00 + 1h reposo → listo 11:00 ✓
10:00-10:30: PT batch 1 (usa PP batch 1 que estuvo listo desde 07:00)
10:30-11:00: PT batch 2 (usa PP batch 2 que estuvo listo desde 09:00)
11:00-11:30: PT batch 3 (usa PP batch 3 recién listo a las 11:00) ✓
```

### 5. Recursión para PP Anidados

**Función**: `generate_backward_cascade_recursive(supabase, pp_material_id: str, parent_info: dict, depth: int = 0) -> List[dict]`

```python
async def generate_backward_cascade_recursive(
    supabase,
    pp_material_id: str,
    required_quantity: float,
    parent_start_datetime: datetime,  # When parent (PT or PP) starts
    parent_duration_hours: float,     # How long parent produces
    parent_staff_count: int,
    parent_lote_minimo: float,
    parent_total_units: float,
    bom_rest_time_hours: float,       # Rest time from parent's BOM
    create_in_db: bool = True,
    depth: int = 0,
    max_depth: int = 10,
    week_start_datetime: Optional[datetime] = None,
    week_end_datetime: Optional[datetime] = None,
    produced_for_order_number: Optional[int] = None,
) -> List[dict]:
    """Recursively generate backward cascades for PP dependencies.

    Uses batch-by-batch synchronization: last PP batch must be ready
    exactly when parent's last batch needs it.

    Args:
        pp_material_id: The PP product to produce
        required_quantity: Total PP units needed
        parent_start_datetime: When parent production starts
        parent_duration_hours: How long parent produces (for batch timing)
        parent_staff_count: Staff on parent (affects batch distribution)
        parent_lote_minimo: Parent's batch size
        parent_total_units: Parent's total production
        bom_rest_time_hours: Rest time between PP finish and parent use
        produced_for_order_number: PT order number (for tracking)

    Returns:
        List of all created cascade results (for PP and nested PPs)
    """
    if depth > max_depth:
        raise HTTPException(400, f"Max recursion depth exceeded (possible circular dependency)")

    # 1. Get PP route and product info
    pp_route = await get_product_route(supabase, pp_material_id)
    pp_product = await get_product(supabase, pp_material_id)
    pp_lote_minimo = float(pp_product.get("lote_minimo") or 100)

    # 2. Calculate PP start time using synchronization algorithm
    pp_start_datetime = await calculate_pp_start_time(
        supabase=supabase,
        pt_product_id=pp_material_id,  # "PT" from PP's perspective
        pt_start_datetime=parent_start_datetime,
        pt_duration_hours=parent_duration_hours,
        pt_staff_count=parent_staff_count,
        pt_lote_minimo=parent_lote_minimo,
        pp_material={"material": {"id": pp_material_id}, "tiempo_reposo_horas": bom_rest_time_hours},
        pp_route=pp_route,
        required_pp_quantity=required_quantity,
    )

    # 3. Check if this PP has nested PP ingredients
    nested_pp_ingredients = await get_pp_ingredients(supabase, pp_material_id)

    # 4. If nested PPs exist, recurse first
    nested_results = []
    if nested_pp_ingredients:
        # For recursion: this PP becomes the "parent"
        # Calculate PP's production parameters
        first_wc_productivity = await get_productivity(
            supabase, pp_material_id, pp_route[0]["work_center_id"]
        )
        pp_duration_hours = 2.0  # Simplified (could calculate from total_quantity and productivity)
        pp_staff_count = 1

        for nested_pp in nested_pp_ingredients:
            nested_quantity = calculate_pp_quantity(required_quantity, nested_pp["quantity_needed"])
            nested_rest_time = float(nested_pp.get("tiempo_reposo_horas") or 0)

            nested_cascade = await generate_backward_cascade_recursive(
                supabase=supabase,
                pp_material_id=nested_pp["material"]["id"],
                required_quantity=nested_quantity,
                parent_start_datetime=pp_start_datetime,  # This PP is now parent
                parent_duration_hours=pp_duration_hours,
                parent_staff_count=pp_staff_count,
                parent_lote_minimo=pp_lote_minimo,
                parent_total_units=required_quantity,
                bom_rest_time_hours=nested_rest_time,
                create_in_db=create_in_db,
                depth=depth + 1,
                max_depth=max_depth,
                week_start_datetime=week_start_datetime,
                week_end_datetime=week_end_datetime,
                produced_for_order_number=produced_for_order_number,
            )
            nested_results.extend(nested_cascade)

    # 5. Calculate PP duration (simplified - could refine)
    pp_duration_hours = 2.0
    pp_staff_count = 1

    # 6. Generate forward cascade for this PP
    pp_cascade_result = await generate_cascade_schedules(
        supabase=supabase,
        product_id=pp_material_id,
        product_name=pp_product["name"],
        start_datetime=pp_start_datetime,
        duration_hours=pp_duration_hours,
        staff_count=pp_staff_count,
        lote_minimo=pp_lote_minimo,
        production_route=pp_route,
        create_in_db=create_in_db,
        week_start_datetime=week_start_datetime,
        week_end_datetime=week_end_datetime,
        produced_for_order_number=produced_for_order_number,  # Link to PT
    )

    # 7. Return all results (nested + current)
    return nested_results + [pp_cascade_result]
```

### 6. Integración en Create Cascade

**Modificar**: `/api/production/cascade/create` endpoint

```python
@router.post("/create", response_model=CascadeScheduleResponse)
async def create_cascade_production(
    request: CreateCascadeRequest,
    authorization: Optional[str] = Header(None),
):
    """Create cascaded production with automatic PP dependency resolution."""

    # ... existing code to create PT cascade ...

    # NEW: After PT cascade is created, check for PP dependencies
    pp_ingredients = await get_pp_ingredients(supabase, request.product_id)

    pp_cascades = []
    if pp_ingredients:
        logger.info(f"Found {len(pp_ingredients)} PP ingredients, generating backward cascades")

        for pp_material in pp_ingredients:
            # Calculate required PP quantity (total for all PT batches)
            required_pp_quantity = calculate_pp_quantity(result["total_units"], pp_material["quantity_needed"])

            # Get rest time from BOM
            bom_rest_time_hours = float(pp_material.get("tiempo_reposo_horas") or 0)

            # Generate recursive backward cascade for this PP
            # Uses batch-by-batch synchronization with PT
            try:
                pp_cascade_results = await generate_backward_cascade_recursive(
                    supabase=supabase,
                    pp_material_id=pp_material["material"]["id"],
                    required_quantity=required_pp_quantity,
                    parent_start_datetime=request.start_datetime,
                    parent_duration_hours=request.duration_hours,
                    parent_staff_count=request.staff_count,
                    parent_lote_minimo=lote_minimo,
                    parent_total_units=result["total_units"],
                    bom_rest_time_hours=bom_rest_time_hours,
                    create_in_db=True,
                    week_start_datetime=week_start,
                    week_end_datetime=week_end,
                    produced_for_order_number=result["production_order_number"],
                )
                pp_cascades.extend(pp_cascade_results)
            except Exception as e:
                logger.warning(f"Failed to create PP cascade for {pp_material['material']['name']}: {e}")
                # Continue with other PPs even if one fails

    # Include PP cascade info in response
    result["pp_dependencies"] = pp_cascades

    return CascadeScheduleResponse(**result)
```

**NOTA IMPORTANTE**: La función `generate_cascade_schedules()` debe modificarse para aceptar el parámetro opcional `produced_for_order_number`:

```python
async def generate_cascade_schedules(
    supabase,
    product_id: str,
    product_name: str,
    start_datetime: datetime,
    duration_hours: float,
    staff_count: int,
    lote_minimo: float,
    production_route: List[dict],
    create_in_db: bool = True,
    week_plan_id: Optional[str] = None,
    week_start_datetime: Optional[datetime] = None,
    week_end_datetime: Optional[datetime] = None,
    produced_for_order_number: Optional[int] = None,  # NEW PARAMETER
) -> Dict[str, Any]:
    # ... existing code ...

    # When inserting schedules, include produced_for_order_number if provided
    schedule_data = {
        "production_order_number": production_order_number,
        "resource_id": wc_id,
        # ... other fields ...
        "produced_for_order_number": produced_for_order_number,  # NEW
        "cascade_type": "backward" if produced_for_order_number else "forward",  # NEW
    }
```

## Cambios en Base de Datos

### Migración 1: Agregar tiempo de reposo a production_routes

```sql
-- Migration: add rest time to production_routes
ALTER TABLE produccion.production_routes
ADD COLUMN tiempo_reposo_horas NUMERIC(8,2) NULL DEFAULT 0;

COMMENT ON COLUMN produccion.production_routes.tiempo_reposo_horas IS
'Rest time in hours AFTER this operation completes (e.g., fermentation time)';
```

**Razón**: El tiempo de reposo es propiedad de la operación/ruta, no del material. Una operación puede tener múltiples materiales en BOM, y el reposo aplica después de la operación independientemente del material.

### Migración 2: Agregar campos para rastrear dependencias PP → PT

```sql
-- Migration: add pp dependency tracking
ALTER TABLE produccion.production_schedules
ADD COLUMN produced_for_order_number INTEGER NULL,
ADD COLUMN cascade_type TEXT DEFAULT 'forward' CHECK (cascade_type IN ('forward', 'backward'));

COMMENT ON COLUMN produccion.production_schedules.produced_for_order_number IS
'If this is a PP production created for a PT order, references the PT production_order_number';

COMMENT ON COLUMN produccion.production_schedules.cascade_type IS
'Type of cascade: forward (normal PT production) or backward (PP dependency)';

CREATE INDEX idx_production_schedules_produced_for
ON produccion.production_schedules(produced_for_order_number)
WHERE produced_for_order_number IS NOT NULL;
```

### Uso del Tiempo de Reposo

1. **Reposo entre operaciones del PP/PT**: Se lee de `production_routes.tiempo_reposo_horas`
   - Ejemplo: ARMADO → 6h reposo → FERMENTACION

2. **Reposo entre PP terminado y PT**: Se mantiene en `bill_of_materials.tiempo_reposo_horas`
   - Solo cuando el material es categoría PP
   - Ejemplo: Masa Laminada (PP) termina → 1h reposo → Croissant (PT) lo usa
   - Razón: Este reposo es específico de la relación ingrediente-producto

### Migración de Datos Existentes (Opcional)

Si ya hay datos de `tiempo_reposo_horas` en `bill_of_materials`:
```sql
-- Migrate rest times from BOM to production_routes where applicable
-- This is OPTIONAL and depends on current data state
UPDATE produccion.production_routes pr
SET tiempo_reposo_horas = bom.tiempo_reposo_horas
FROM produccion.bill_of_materials bom
INNER JOIN produccion.work_centers wc ON bom.operation_id = wc.operation_id
WHERE pr.work_center_id = wc.id
  AND pr.product_id = bom.product_id
  AND bom.tiempo_reposo_horas IS NOT NULL
  AND pr.tiempo_reposo_horas IS NULL;
```

## Archivos a Modificar

### Backend (FastAPI)

1. **`apps/api/app/api/routes/production/cascade.py`**:
   - ⚠️ **NO MODIFICAR** `get_rest_time_hours()` - dejar como está (usa BOM)
   - ⚠️ **NO MODIFICAR** `generate_cascade_schedules()` excepto agregar parámetro opcional `produced_for_order_number`
   - **AGREGAR** `get_rest_time_from_route()` - NUEVA función para leer de `production_routes.tiempo_reposo_horas`
   - **AGREGAR** `get_pp_ingredients()` - detectar ingredientes PP en BOM
   - **AGREGAR** `calculate_pp_quantity()` - calcular cantidad necesaria
   - **AGREGAR** `calculate_pp_start_time()` - algoritmo de sincronización batch-by-batch ⭐
   - **AGREGAR** `generate_backward_cascade_recursive()` - cascada inversa recursiva
   - **MODIFICAR** `create_cascade_production()` para detectar y crear PP cascades automáticamente (al final, después de PT)
   - **AGREGAR** `check_circular_dependency()` - validación

2. **`apps/api/models/production.py`** (si existe):
   - Agregar modelos para PP cascade responses
   - Extender `CascadeScheduleResponse` con campo `pp_dependencies`

### Frontend (Next.js)

3. **`apps/web/components/plan-master/weekly-grid/WeeklyPlanGrid.tsx`**:
   - Opcional: agregar indicador visual de que se crearán PP cascades
   - Refresh después de crear

4. **`apps/web/components/plan-master/weekly-grid/CascadePreviewModal.tsx`**:
   - Mostrar PP cascades en preview
   - Diferenciar visualmente PT vs PP
   - Mostrar warnings si PP no caben en tiempo

5. **`apps/web/hooks/use-cascade-production.ts`**:
   - Actualizar tipos para incluir PP dependencies en response

### Database

6. **Nueva migración**: `supabase/migrations/YYYYMMDD_add_rest_time_to_routes.sql`
   - Agregar `tiempo_reposo_horas` a `production_routes`
   - Migración opcional de datos existentes de BOM

7. **Nueva migración**: `supabase/migrations/YYYYMMDD_backward_cascade_pp.sql`
   - Agregar campos `produced_for_order_number` y `cascade_type` a `production_schedules`
   - Crear índice

### Documentation

8. **`apps/api/docs/CASCADE-PRODUCTION.md`**:
   - Agregar sección "Backward Cascade for PP Dependencies"
   - Documentar algoritmo recursivo
   - Ejemplos prácticos

## Estrategia de Implementación

### Fase 1: Backend Core - Cascada Inversa ⚠️ SIN AFECTAR CASCADA FORWARD ACTUAL
1. Implementar `get_pp_ingredients()`
2. Implementar `calculate_pp_quantity()`
3. Implementar `get_rest_time_from_route()` - NUEVA función separada
4. Implementar `calculate_pp_start_time()` (algoritmo de sincronización batch-by-batch) ⭐ **CRÍTICO**
5. Implementar `generate_backward_cascade_recursive()` (sin recursión primero, solo 1 nivel)
6. Modificar `generate_cascade_schedules()` para aceptar `produced_for_order_number` (parámetro opcional)
7. Integrar en `create_cascade_production()` (al final, después de PT)
8. Migraciones de BD:
   - `tiempo_reposo_horas` en `production_routes`
   - `produced_for_order_number` y `cascade_type` en `production_schedules`

### Fase 2: Recursión y Validaciones
1. Agregar soporte recursivo completo
2. Implementar `check_circular_dependency()`
3. Manejo de errores robusto

### Fase 3: Frontend
1. Actualizar preview modal
2. Diferenciar visualmente PP cascades
3. Mostrar warnings

### Fase 4: Testing y Refinamiento
1. Probar con casos simples (PT → 1 PP)
2. Probar con múltiples PP
3. Probar con PP anidados (PT → PP → PP)
4. Validar sistema de colas con conflictos

## Casos de Prueba

### Caso 1: PT Simple con 1 PP
- PT: Croissant (requiere Masa Laminada PP)
- PP: Masa Laminada (requiere Harina MP)
- Resultado esperado: Masa Laminada se programa backward para estar lista cuando Croissant inicia

### Caso 2: PT con Múltiples PP
- PT: Pastel (requiere Bizcocho PP y Crema PP)
- Resultado esperado: Ambos PP se programan en paralelo, cada uno listo cuando Pastel inicia

### Caso 3: PP Anidado
- PT: Croissant Relleno (requiere Croissant Horneado PP)
- Croissant Horneado PP (requiere Masa Laminada PP)
- Masa Laminada PP (requiere Harina MP)
- Resultado esperado: Cascada recursiva de 3 niveles

### Caso 4: Sincronización Batch-by-Batch (Ritmo Igual, Sin Reposo)
**Configuración**:
- PT: 900 unidades, lote 300 → 3 batches
- PP: necesita 900 unidades, lote 300 → 3 batches
- PT productividad: 300 u/h → 1h por batch
- PP productividad: 300 u/h → 1h por batch
- Reposo PP→PT: 0h
- PT inicia: 08:00, duración 3h (distribuido)

**Cálculo esperado**:
- PT batch 1 inicia: 08:00
- PT batch 2 inicia: 09:00
- PT batch 3 inicia: 10:00 (último batch)
- PP último batch debe TERMINAR + 0h = 10:00
- PP último batch debe TERMINAR: 10:00
- PP time total: 3h
- **PP inicia: 10:00 - 0h - 3h = 07:00** ✓

**Timeline**:
```
07:00-08:00: PP batch 1 termina 08:00 + 0h reposo → PT batch 1 inicia 08:00 ✓
08:00-09:00: PP batch 2 termina 09:00 + 0h reposo → PT batch 2 inicia 09:00 ✓
09:00-10:00: PP batch 3 termina 10:00 + 0h reposo → PT batch 3 inicia 10:00 ✓
```

### Caso 5: Sincronización con PT Consumiendo Más Rápido (Con Reposo)
**Configuración**:
- PT: 900 unidades, lote 300 → 3 batches @ 30min cada uno
- PP: necesita 900 unidades, lote 300 → 3 batches @ 2h cada uno
- Reposo PP→PT: 1h
- PT inicia: 10:00, duración 1.5h

**Cálculo esperado**:
- PT batch 1 inicia: 10:00
- PT batch 2 inicia: 10:30
- PT batch 3 inicia: 11:00 (último batch)
- PP último batch debe TERMINAR + 1h = 11:00
- PP último batch debe TERMINAR: 10:00
- PP time total: 6h (3 batches × 2h)
- **PP inicia: 11:00 - 1h - 6h = 04:00** ✓

**Timeline**:
```
04:00-06:00: PP batch 1 termina 06:00 + 1h reposo → listo 07:00 (espera 3h hasta PT)
06:00-08:00: PP batch 2 termina 08:00 + 1h reposo → listo 09:00 (espera 1h hasta PT)
08:00-10:00: PP batch 3 termina 10:00 + 1h reposo → listo 11:00 (justo a tiempo) ✓
10:00-10:30: PT batch 1 (usa PP batch 1)
10:30-11:00: PT batch 2 (usa PP batch 2)
11:00-11:30: PT batch 3 (usa PP batch 3) ✓
```

### Caso 6: Conflicto de Horario
- PT programado para 08:00
- PP requiere 5 horas pero centro está ocupado
- Resultado esperado: PP se encola y puede terminar después de 08:00 (warning visual)

## Verificación End-to-End

1. **Crear producción de PT con PP en BOM**:
   - Ir a Plan Master
   - Seleccionar PT que tiene PP como ingrediente
   - Programar producción para fecha/hora específica
   - Confirmar

2. **Verificar cascadas creadas**:
   - Ver en Weekly Grid schedules del PT (color azul)
   - Ver schedules del PP (color naranja)
   - PP debe terminar antes o justo cuando PT inicia
   - Verificar en BD: consultar `production_schedules` con `produced_for_order_number`

3. **Verificar recursión**:
   - Usar PT que requiere PP que requiere otro PP
   - Confirmar que se crean 3 niveles de cascadas

4. **Verificar sistema de colas**:
   - Programar múltiples PT que requieren mismo PP
   - PP debe encolarse correctamente en centros secuenciales

## Riesgos y Mitigaciones

### Riesgo 1: Complejidad de Cálculo de Tiempo
- **Mitigación**: Simplificar primera versión usando duración fija, refinar después

### Riesgo 2: Conflictos de Horario
- **Mitigación**: Primera versión permite overlaps, warning visual, validación futura

### Riesgo 3: Performance con Múltiples PP Anidados
- **Mitigación**: Límite de recursión (max_depth=10), logging detallado

### Riesgo 4: Cambios en PT Afectan PP Programados
- **Mitigación**: Agregar lógica de cleanup/reprogramación en DELETE cascade

## Métricas de Éxito

- [ ] PT con PP crea automáticamente cascadas backward
- [ ] PP termina antes o al inicio del PT
- [ ] Soporta hasta 3 niveles de recursión (PP → PP → PP)
- [ ] Sistema de colas funciona igual que forward cascade
- [ ] Preview muestra correctamente PT y PP cascades
- [ ] No hay overlaps no deseados en BD
- [ ] Cascada forward NO se ve afectada (sigue funcionando como antes)
