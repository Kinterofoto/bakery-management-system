# Backward Cascade for PP Dependencies

## Overview

The backward cascade feature automatically programs Productos en Proceso (PP) production when a Producto Terminado (PT) requires them as ingredients. The system calculates when PP production should start to ensure PP batches are ready just-in-time when the PT production needs them.

## How It Works

### 1. Automatic Detection

When you create a PT cascade production:
1. System checks the Bill of Materials (BOM) for the PT
2. Identifies any materials with category='PP'
3. Automatically creates backward cascades for each PP

### 2. Batch-by-Batch Synchronization

The system uses intelligent timing to synchronize PP and PT production:

**Key Principle**: The LAST batch of PP (including rest time) must finish exactly when the LAST batch of PT needs it.

**Formula**:
```
PP_start = PT_last_batch_start - PP_total_time - final_rest_time
```

Where:
- `PT_last_batch_start`: When the last PT batch begins (distributed over duration)
- `PP_total_time`: Total time for all PP batches through all operations
- `final_rest_time`: Rest time from BOM before PT can use the PP

### 3. Example Timeline

**Scenario**: PT needs PP, both have same production rate, no rest time
```
PP: 3 batches × 1h each = 3h total
PT: 3 batches × 1h each = 3h total
PT starts: 08:00

Calculation:
- PT last batch starts: 08:00 + 2h = 10:00
- PP must finish: 10:00 (no rest)
- PP starts: 10:00 - 3h = 07:00

Timeline:
07:00-08:00: PP batch 1 → ready for PT batch 1 at 08:00 ✓
08:00-09:00: PP batch 2 → ready for PT batch 2 at 09:00 ✓
09:00-10:00: PP batch 3 → ready for PT batch 3 at 10:00 ✓
```

**Scenario**: PT consumes faster than PP produces, with 1h rest
```
PP: 3 batches × 2h each = 6h total
PT: 3 batches × 30min each = 1.5h total
PT starts: 10:00, Rest: 1h

Calculation:
- PT last batch starts: 10:00 + 1h = 11:00
- PP must finish + 1h rest = 11:00
- PP must finish: 10:00
- PP starts: 10:00 - 6h = 04:00

Timeline:
04:00-06:00: PP batch 1 → ready at 07:00 (waits 3h)
06:00-08:00: PP batch 2 → ready at 09:00 (waits 1h)
08:00-10:00: PP batch 3 → ready at 11:00 (just-in-time) ✓
```

### 4. Rest Time Sources

The system uses TWO sources for rest time, depending on context:

**A. Internal PP Operations** (NEW - reads from `production_routes`)
- Rest time AFTER each operation in the PP's route
- Example: After AMASADO → 2h rest before LAMINADO
- Used by: `get_rest_time_from_route()`

**B. PP to PT Transition** (reads from `bill_of_materials`)
- Rest time AFTER PP finishes before PT can use it
- Example: Masa Laminada (PP) finishes → 1h rest → Croissant (PT) uses it
- Used in: `calculate_pp_start_time()` for final rest calculation

**Why Two Sources?**
- Internal operation rest is property of the production route
- PP→PT rest is property of the ingredient-product relationship
- This allows flexibility: same PP can have different rest times for different PT products

### 5. Recursive Support

The system supports nested PP dependencies:

```
PT: Croissant Relleno
  ↓ requires
PP: Croissant Horneado
  ↓ requires
PP: Masa Laminada
  ↓ requires
MP: Harina
```

Each level is calculated recursively, ensuring all dependencies are ready.

## Database Schema

### New Fields in `production_routes`

```sql
tiempo_reposo_horas NUMERIC(8,2) DEFAULT 0
```
Rest time in hours after this operation completes.

### New Fields in `production_schedules`

```sql
produced_for_order_number INTEGER NULL
cascade_type TEXT DEFAULT 'forward' CHECK (cascade_type IN ('forward', 'backward'))
```

- `produced_for_order_number`: Links PP schedules to the PT order that needs them
- `cascade_type`: Identifies if this is a PT cascade ('forward') or PP cascade ('backward')

## API Response

The `CascadeScheduleResponse` includes:

```json
{
  "production_order_number": 123,
  "product_id": "uuid-pt",
  "product_name": "Croissant",
  "total_units": 900,
  "pp_dependencies": [
    {
      "production_order_number": 124,
      "product_id": "uuid-pp",
      "product_name": "Masa Laminada",
      "total_units": 900,
      "cascade_start": "2024-01-27T04:00:00",
      "cascade_end": "2024-01-27T10:00:00"
    }
  ]
}
```

## Implementation Details

### Key Functions

**`get_pp_ingredients(supabase, product_id)`**
- Queries BOM for materials with category='PP'
- Returns list of PP materials with quantities

**`calculate_pp_quantity(pt_batch_size, bom_quantity)`**
- Calculates total PP units needed based on PT production

**`get_rest_time_from_route(supabase, product_id, work_center_id)`**
- NEW function to read rest time from production_routes
- Separate from existing `get_rest_time_hours()` which reads from BOM

**`calculate_pp_start_time(...)`**
- Implements batch-by-batch synchronization algorithm
- Calculates when PP production must start

**`generate_backward_cascade_recursive(...)`**
- Recursively handles nested PP dependencies
- Creates forward cascades for each PP at calculated start time
- Links PP schedules to PT via `produced_for_order_number`

**`check_circular_dependency(supabase, product_id)`**
- Validates no circular dependencies exist
- Prevents infinite recursion

### Integration Point

In `create_cascade_production()` endpoint:

```python
# 1. Create PT cascade (existing logic)
result = await generate_cascade_schedules(...)

# 2. NEW: Detect and create PP cascades
pp_ingredients = await get_pp_ingredients(supabase, product_id)
if pp_ingredients:
    for pp_material in pp_ingredients:
        pp_cascades = await generate_backward_cascade_recursive(...)

# 3. Include PP info in response
result["pp_dependencies"] = pp_cascades
```

## Migration Guide

### For Existing Data

If you have existing rest times in `bill_of_materials`:

1. Run migration to add `tiempo_reposo_horas` to `production_routes`
2. The migration includes optional data migration SQL
3. Decide which rest times belong to routes vs. BOM relationships

### For New Products

When configuring a new product with PP dependencies:

1. Set `production_routes.tiempo_reposo_horas` for operation-level rest (e.g., fermentation)
2. Set `bill_of_materials.tiempo_reposo_horas` only for PP→PT rest (if different from operation rest)

## Testing Scenarios

### Test Case 1: Simple PT with 1 PP
- PT: Croissant (requires Masa Laminada PP)
- Expected: Masa Laminada scheduled backward to be ready when Croissant starts

### Test Case 2: PT with Multiple PPs
- PT: Pastel (requires Bizcocho PP and Crema PP)
- Expected: Both PP scheduled in parallel, each ready when Pastel starts

### Test Case 3: Nested PP Dependencies
- PT: Croissant Relleno → PP: Croissant Horneado → PP: Masa Laminada
- Expected: 3-level cascade created automatically

### Test Case 4: Queue Conflicts
- Multiple PT orders requiring same PP
- Expected: PP schedules use queue system, may finish after PT starts (shows warning)

## Limitations & Future Enhancements

### Current Limitations

1. **Simplified Duration**: PP duration currently hardcoded to 2h in recursive calls
   - Should calculate from productivity and quantity

2. **No Conflict Resolution**: If PP can't finish before PT starts, system allows it
   - Shows in schedules but no automatic adjustment

3. **Single Staff**: PP currently created with staff_count=1
   - Should consider optimal staffing

### Planned Enhancements

1. **Smart Duration Calculation**: Calculate PP duration based on actual productivity
2. **Conflict Detection**: Warn user if PP won't finish in time
3. **Auto-Adjustment**: Automatically adjust PT start if PP conflicts
4. **Visual Indicators**: Different colors in UI for PP vs PT cascades
5. **Deletion Cleanup**: When PT is deleted, optionally delete linked PP cascades

## Important Notes

⚠️ **Forward Cascade Unchanged**
- All existing forward cascade logic remains untouched
- `get_rest_time_hours()` continues working as before
- Backward cascade is completely additive

⚠️ **Data Integrity**
- Circular dependencies prevented by validation
- Max recursion depth: 10 levels

⚠️ **Performance**
- Recursive calls may take longer for deeply nested PPs
- Each PP creates its own production order number

## Support

For issues or questions:
- Check logs for detailed cascade calculations
- Look for `[Depth N]` prefixes in PP cascade logs
- Verify `produced_for_order_number` in database for PP→PT links
