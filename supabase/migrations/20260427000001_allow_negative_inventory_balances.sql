-- =============================================================================
-- Allow negative inventory balances across the inventario schema
-- =============================================================================
-- Context:
--   Recepción de PT, ajustes de CountPro, transferencias entrantes y demás
--   movimientos quedaban bloqueados con "Insufficient inventory" cuando el
--   balance del CT/almacén ya estaba en negativo (causado por despachos con
--   allow_dispatch_without_inventory = true).
--
--   Mientras se estabiliza el proceso operativo, la política es permitir
--   balances negativos en cualquier flujo (no solo despacho). Esto unifica el
--   comportamiento con `calculate_balance_after_dispatch` y
--   `update_inventory_balance_dispatch` que ya lo permiten.
--
-- Cambios:
--   1) inventario.calculate_balance_after: ya no lanza excepción si el
--      balance resultante es negativo.
--   2) inventario.update_inventory_balance: ya no lanza excepción si el
--      balance resultante es negativo.
--
-- Funciones intencionalmente NO modificadas (siguen igual):
--   - inventario.calculate_balance_after_dispatch (ya tenía p_allow_negative)
--   - inventario.update_inventory_balance_dispatch (ya permitía negativos)
--
-- Tablas: NO se modifica inventario.inventory_balances (la columna
--   quantity_on_hand ya admite valores negativos según su comentario).
-- =============================================================================

CREATE OR REPLACE FUNCTION inventario.calculate_balance_after(
  p_product_id    uuid,
  p_location_id   uuid,
  p_quantity      numeric,
  p_movement_type varchar
) RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  current_balance DECIMAL;
  new_balance     DECIMAL;
BEGIN
  current_balance := inventario.get_current_balance(p_product_id, p_location_id);

  new_balance := CASE p_movement_type
    WHEN 'IN'           THEN current_balance + p_quantity
    WHEN 'TRANSFER_IN'  THEN current_balance + p_quantity
    WHEN 'OUT'          THEN current_balance - p_quantity
    WHEN 'TRANSFER_OUT' THEN current_balance - p_quantity
    ELSE current_balance
  END;

  -- Política temporal: se permiten balances negativos en cualquier movimiento
  -- mientras se estabiliza el proceso operativo. Antes lanzaba EXCEPCIÓN cuando
  -- new_balance < 0 (ver migración 20260117163727_remote_schema.sql).
  RETURN new_balance;
END;
$$;

COMMENT ON FUNCTION inventario.calculate_balance_after(uuid, uuid, numeric, varchar) IS
  'Calcula el balance resultante de un movimiento. Permite balances negativos para todos los tipos. La validación previa de no-negativo se removió en 20260427000001 mientras se estabiliza el proceso operativo.';


CREATE OR REPLACE FUNCTION inventario.update_inventory_balance(
  p_product_id    uuid,
  p_location_id   uuid,
  p_quantity      numeric,
  p_movement_type varchar,
  p_movement_id   uuid
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  quantity_delta  DECIMAL;
  current_balance DECIMAL;
  new_balance     DECIMAL;
BEGIN
  quantity_delta := CASE p_movement_type
    WHEN 'IN'           THEN p_quantity
    WHEN 'TRANSFER_IN'  THEN p_quantity
    WHEN 'OUT'          THEN -p_quantity
    WHEN 'TRANSFER_OUT' THEN -p_quantity
    ELSE 0
  END;

  SELECT quantity_on_hand
    INTO current_balance
    FROM inventario.inventory_balances
   WHERE product_id = p_product_id
     AND location_id = p_location_id;

  current_balance := COALESCE(current_balance, 0);
  new_balance     := current_balance + quantity_delta;

  RAISE NOTICE 'UPDATE_BALANCE: type=%, current=%, delta=%, new=%',
    p_movement_type, current_balance, quantity_delta, new_balance;

  -- Política temporal: se permiten balances negativos. Antes lanzaba EXCEPCIÓN
  -- "Insufficient stock for product..." cuando new_balance < 0.

  INSERT INTO inventario.inventory_balances (
    product_id,
    location_id,
    quantity_on_hand,
    last_movement_id,
    last_updated_at
  ) VALUES (
    p_product_id,
    p_location_id,
    new_balance,
    p_movement_id,
    NOW()
  )
  ON CONFLICT (product_id, location_id)
  DO UPDATE SET
    quantity_on_hand = EXCLUDED.quantity_on_hand,
    last_movement_id = p_movement_id,
    last_updated_at  = NOW();
END;
$$;

COMMENT ON FUNCTION inventario.update_inventory_balance(uuid, uuid, numeric, varchar, uuid) IS
  'Actualiza el balance de inventario sin validar no-negativo. Política temporal definida en 20260427000001 mientras se estabiliza el proceso operativo.';
