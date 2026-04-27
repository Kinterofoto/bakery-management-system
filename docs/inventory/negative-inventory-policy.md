# Política de balances negativos en `inventario`

> **Estado:** vigente desde la migración `20260427000001_allow_negative_inventory_balances.sql`.
> **Carácter:** **temporal** — mientras se estabiliza el proceso operativo (recepción de PT, despachos, transferencias y conteos en CountPro). Cuando todos los flujos estén alineados, se reactivará la validación de balances no-negativos.

---

## 1. Resumen

A partir de esta migración, las funciones del esquema `inventario` **permiten que `inventory_balances.quantity_on_hand` quede en cualquier valor numérico, incluido negativo**, sin lanzar excepción. Antes, dos funciones bloqueaban con `Insufficient inventory` / `Insufficient stock for product…` cualquier movimiento cuyo balance resultante quedara `< 0`.

El cambio concreto es la eliminación de las dos guardas `IF new_balance < 0 THEN RAISE EXCEPTION …` en:

| Función | Archivo original | Cambio |
|---|---|---|
| `inventario.calculate_balance_after(product, location, qty, type)` | `20260117163727_remote_schema.sql` línea 1377 | Se removió el `RAISE EXCEPTION` |
| `inventario.update_inventory_balance(product, location, qty, type, movement)` | `20260117163727_remote_schema.sql` línea 2521 | Se removió el `RAISE EXCEPTION` |

---

## 2. Por qué se hizo este cambio

### 2.1 Síntoma original

En `recepcion-pt`, al recibir producto terminado a `WH3-GENERAL` cuando el balance allí ya era `-1952`, la operación fallaba:

```
Error creating movement: Insufficient inventory.
Current: -1952.000, Required: 1529.6, Movement: IN
```

Lo cual es lógicamente incorrecto: un movimiento `IN` **suma** inventario, nunca puede causar "inventario insuficiente".

### 2.2 Causa raíz del balance negativo en producción

El balance negativo no es un bug — es un **efecto operativo intencionado**:

- `public.dispatch_inventory_config.allow_dispatch_without_inventory = true` permite despachar sin tener el stock registrado todavía.
- `inventario.perform_dispatch_movement` ya usa funciones paralelas (`*_dispatch`) que no validan negativo.
- Pero el resto del sistema (recepciones, transferencias, ajustes) sí lo validaba, así que **una vez la balanza caía a negativo, ya no se podía recuperar**.

### 2.3 Decisión

Mientras el proceso operativo se estabiliza, **se acepta inventario negativo en todos los flujos**. No es ideal, pero es coherente con la realidad del piso: a veces se factura/despacha antes de que producción reciba, y la única forma de recuperar el balance es permitir que recepciones, transferencias y ajustes pasen aunque arranquen en negativo.

---

## 3. Impacto por flujo

### 3.1 Recepción de PT (`recepcion-pt`)

- **Antes:** la recepción fallaba si el destino tenía balance negativo.
- **Después:** la recepción siempre pasa; el balance simplemente avanza hacia menos negativo o positivo.
- **Camino del código:**
  ```
  apps/web/app/recepcion-pt/page.tsx
    └─ use-finished-goods-reception.ts → approveReception
       └─ use-inventory-movements.ts → createMovement
          └─ rpc('perform_inventory_movement') con IN
             └─ inventario.perform_inventory_movement
                ├─ inventario.calculate_balance_after        ← arreglado
                └─ inventario.update_inventory_balance       ← arreglado
  ```

### 3.2 Recepción de materias primas (`compras/recepcion`)

- Mismo camino que PT vía `use-material-reception.ts → perform_inventory_movement`.
- Mismo beneficio: las recepciones nunca se bloquean por estado negativo del almacén.

### 3.3 Ajustes desde CountPro / Inventarios

- `apps/web/app/inventory/adjustments/[id]/page.tsx` invoca `apply_inventory_adjustment` (función SQL en `public`), que internamente llama `inventario.perform_inventory_movement`.
- Lógica:
  - `adjustment_type = 'positive'` → `IN` (sube el balance)
  - `adjustment_type = 'negative'` → `OUT` (baja el balance)
- **Antes** un ajuste negativo cuya magnitud fuera mayor al stock actual fallaba — bloqueando precisamente el caso para el que existen los ajustes.
- **Después** los ajustes siempre se aplican, llevando el balance al valor que indica el conteo. Esto es **correcto**: el conteo físico es la fuente de verdad y el sistema debe converger hacia él.

### 3.4 Transferencias entre ubicaciones

- `inventario.perform_transfer` y `inventario.confirm_pending_transfer` invocan `perform_inventory_movement` para `TRANSFER_OUT` y `TRANSFER_IN`.
- **Antes:** el lado `TRANSFER_IN` podía fallar si el destino estaba negativo (mismo bug que en recepción).
- **Después:** ambos lados pasan; la diferencia entre ubicaciones queda registrada correctamente.

### 3.5 Devoluciones de material (`accept_pending_return`)

- Mismo patrón. La devolución suma de regreso al almacén central; ya no se bloquea por estado del almacén.

### 3.6 Write-offs / bajas (QMS)

- `use-write-offs.ts` usa `OUT` con `reason_type = 'waste'`.
- **Antes:** un write-off sobre stock 0 fallaba.
- **Después:** se permite y deja el balance negativo si corresponde — coherente con la realidad de que el material ya no está, aunque el sistema todavía no lo refleje.

### 3.7 Despachos (`perform_dispatch_movement`)

- **Sin cambios.** Esa función usa sus propios `*_dispatch` que ya permitían negativos cuando `allow_dispatch_without_inventory = true`.
- Si el flag está en `false`, el despacho sigue fallando con "Insufficient inventory" — esa puerta queda intacta.

---

## 4. Funciones intencionalmente NO modificadas

| Función | Razón |
|---|---|
| `inventario.calculate_balance_after_dispatch` | Ya tiene `p_allow_negative` controlado por `dispatch_inventory_config`. |
| `inventario.update_inventory_balance_dispatch` | Ya permitía negativos; sin validación previa. |
| `compras.update_balance_on_movement_*` (triggers) | Operan sobre `compras.material_inventory_balances`, una tabla **distinta** con `CHECK >= 0`. Esos balances usan `GREATEST(0, …)` para clamp. No se está cambiando esa política aquí. |

---

## 5. Reportes y consultas que filtran por balance

Estas consultas/funciones filtran `quantity_on_hand > 0` y, por tanto, **ocultarán las ubicaciones con balance negativo**. Es comportamiento existente; lo dejamos igual porque el objetivo de esos reportes es mostrar dónde *hay* producto:

- `inventario.get_product_balance_by_location(product_id)` → `WHERE b.quantity_on_hand > 0`
- Filtros de "Filter products with positive balance OR with adjustments" en `use-inventory-adjustments.ts` (línea 195)

Si se necesita un reporte que liste también deficits, hay que crear uno aparte que no filtre por `> 0`.

---

## 6. Ledger y consistencia

Cada movimiento sigue insertando un row en `inventario.inventory_movements` con `balance_after` calculado. Esto significa que:

- El **kardex** sigue siendo trazable: para reconstruir el balance histórico se suma `IN+TRANSFER_IN` y se resta `OUT+TRANSFER_OUT` por (producto, ubicación).
- `balance_after` puede ser negativo en el ledger; ya lo era para movimientos de despacho, así que la UI/exports ya manejan ese caso.
- No se modifican `inventory_movements`, solo cómo se calcula `balance_after`.

---

## 7. Cómo revertir

Si se necesita restaurar la validación de no-negativo, basta con re-aplicar el cuerpo original de las funciones (presente en `20260117163727_remote_schema.sql` líneas 1377 y 2521):

```sql
-- Re-añadir en calculate_balance_after, justo antes del RETURN:
IF new_balance < 0 THEN
  RAISE EXCEPTION 'Insufficient inventory. Current: %, Required: %, Movement: %',
    current_balance, p_quantity, p_movement_type;
END IF;

-- Re-añadir en update_inventory_balance, antes del INSERT:
IF new_balance < 0 THEN
  SELECT name INTO v_product_name FROM public.products WHERE id = p_product_id;
  RAISE EXCEPTION 'Insufficient stock for product "%": Available=%, Requested=%, Deficit=%',
    COALESCE(v_product_name, p_product_id::TEXT),
    current_balance, ABS(quantity_delta), ABS(new_balance);
END IF;
```

> **Recomendación previa a revertir:** primero estabilizar todos los balances mediante un proceso de conteo + ajustes para que ningún producto/ubicación quede negativo. Si se revierte con balances negativos vivos, las recepciones volverán a romperse.

---

## 8. Cómo monitorear que el proceso se estabiliza

Query útil para detectar productos/ubicaciones con balance negativo, ordenados por magnitud:

```sql
SELECT
  p.name,
  p.weight,
  l.code AS location_code,
  l.name AS location_name,
  b.quantity_on_hand,
  b.last_updated_at
FROM inventario.inventory_balances b
JOIN public.products p ON p.id = b.product_id
JOIN inventario.locations l ON l.id = b.location_id
WHERE b.quantity_on_hand < 0
ORDER BY b.quantity_on_hand ASC;
```

Cuando esta query devuelva 0 filas de manera estable, se puede revertir la política y restablecer las validaciones estrictas.

---

## 9. Tests

El archivo `scripts/tests/test_negative_inventory_balances.sql` cubre 8 escenarios dentro de una transacción (todo se revierte con `ROLLBACK`):

| # | Escenario | Resultado esperado |
|---|---|---|
| 1 | `IN` sobre balance negativo | OK; balance avanza pero sigue negativo |
| 2 | `OUT` que cruza a negativo | OK; balance baja a negativo |
| 3 | `TRANSFER_OUT` + `TRANSFER_IN` cruzando negativos | OK; ambos lados se actualizan |
| 4 | `apply_inventory_adjustment` positivo desde balance negativo | OK; ajuste sube el balance |
| 5 | `apply_inventory_adjustment` negativo cruzando a negativo | OK; ajuste baja el balance |
| 6 | `perform_dispatch_movement` con `allow_dispatch_without_inventory=true` | OK (no regresión) |
| 7 | `get_product_balance_by_location` sigue ocultando negativos | OK (comportamiento existente preservado) |
| 8 | Ledger consistente con balance final | OK |

Para correrlo:

```bash
psql "<connection-string>" -v ON_ERROR_STOP=1 -f scripts/tests/test_negative_inventory_balances.sql
```

El script termina con `ROLLBACK`, por lo que es seguro correrlo contra cualquier base.
