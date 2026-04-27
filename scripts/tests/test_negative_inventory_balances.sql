-- =============================================================================
-- Test suite for migration 20260427000001_allow_negative_inventory_balances
-- =============================================================================
-- Cómo correr (seguro: todo se revierte al final con ROLLBACK):
--
--   psql "<connection-string>" -v ON_ERROR_STOP=1 -f scripts/tests/test_negative_inventory_balances.sql
--
-- Estructura:
--   1) Aplica el cuerpo de las nuevas funciones dentro de la transacción.
--   2) Inserta fixtures temporales (producto, almacén, ubicación, balance).
--   3) Ejecuta 8 escenarios con SAVEPOINTs para aislar fallos.
--   4) ROLLBACK al final → ningún cambio queda persistido.
--
-- El script usa RAISE NOTICE para reportar cada paso y RAISE EXCEPTION
-- (vía ASSERT) cuando un test falla. ON_ERROR_STOP=1 hace que psql termine
-- con código distinto de cero al primer fallo.
-- =============================================================================

\set VERBOSITY terse

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Aplicar las nuevas funciones (mismo cuerpo que la migración)
-- ---------------------------------------------------------------------------

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
  RETURN new_balance;
END;
$$;

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
  SELECT quantity_on_hand INTO current_balance
    FROM inventario.inventory_balances
   WHERE product_id = p_product_id AND location_id = p_location_id;
  current_balance := COALESCE(current_balance, 0);
  new_balance     := current_balance + quantity_delta;
  INSERT INTO inventario.inventory_balances (
    product_id, location_id, quantity_on_hand, last_movement_id, last_updated_at
  ) VALUES (
    p_product_id, p_location_id, new_balance, p_movement_id, NOW()
  )
  ON CONFLICT (product_id, location_id) DO UPDATE SET
    quantity_on_hand = EXCLUDED.quantity_on_hand,
    last_movement_id = p_movement_id,
    last_updated_at  = NOW();
END;
$$;

-- ---------------------------------------------------------------------------
-- 2) Fixtures
-- ---------------------------------------------------------------------------

DO $setup$
DECLARE
  v_product_id  uuid := '00000000-0000-0000-0000-0000000aBcDe'::uuid;
  v_warehouse   uuid;
  v_loc_a       uuid;
  v_loc_b       uuid;
  v_user_id     uuid;
BEGIN
  -- Usuario para recorded_by
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No hay usuarios en auth.users; el test necesita al menos uno';
  END IF;

  -- Producto temporal (PT, unidad = und)
  INSERT INTO public.products (id, name, unit, category, weight, is_active)
    VALUES (v_product_id, '__TEST_NEG_INV__', 'und', 'PT', '0g', true)
    ON CONFLICT (id) DO NOTHING;

  -- Almacén raíz (level 0)
  INSERT INTO inventario.locations (code, name, location_type, level, is_active)
    VALUES ('__TEST_WH__', 'Test Warehouse', 'warehouse', 0, true)
    RETURNING id INTO v_warehouse;

  -- Bins hijos (level 1) bajo el almacén
  INSERT INTO inventario.locations (code, name, location_type, parent_id, level, is_active)
    VALUES ('__TEST_BIN_A__', 'Test Bin A', 'bin', v_warehouse, 1, true)
    RETURNING id INTO v_loc_a;
  INSERT INTO inventario.locations (code, name, location_type, parent_id, level, is_active)
    VALUES ('__TEST_BIN_B__', 'Test Bin B', 'bin', v_warehouse, 1, true)
    RETURNING id INTO v_loc_b;

  -- Balance inicial NEGATIVO en bin A (simula el bug actual)
  INSERT INTO inventario.inventory_balances (product_id, location_id, quantity_on_hand)
    VALUES (v_product_id, v_loc_a, -1952);

  -- Bin B arranca en 0 (no insertamos fila)

  -- Guardar IDs para los tests
  PERFORM set_config('test.product_id', v_product_id::text,    false);
  PERFORM set_config('test.loc_a',      v_loc_a::text,         false);
  PERFORM set_config('test.loc_b',      v_loc_b::text,         false);
  PERFORM set_config('test.user_id',    v_user_id::text,       false);

  RAISE NOTICE '[setup] product=%, loc_a=% (bal=-1952), loc_b=% (bal=0), user=%',
    v_product_id, v_loc_a, v_loc_b, v_user_id;
END
$setup$;

-- ---------------------------------------------------------------------------
-- 3) Tests
-- ---------------------------------------------------------------------------

-- TEST 1 ---------------------------------------------------------------
-- IN sobre balance negativo debe pasar; balance debe avanzar a -1952+1529.6 = -422.4
SAVEPOINT s1;
DO $t1$
DECLARE
  v_product uuid := current_setting('test.product_id')::uuid;
  v_loc_a   uuid := current_setting('test.loc_a')::uuid;
  v_user    uuid := current_setting('test.user_id')::uuid;
  v_result  json;
  v_balance numeric;
BEGIN
  v_result := inventario.perform_inventory_movement(
    p_product_id      := v_product,
    p_quantity        := 1529.6,
    p_movement_type   := 'IN',
    p_reason_type     := 'production',
    p_location_id_to  := v_loc_a,
    p_recorded_by     := v_user
  );
  ASSERT (v_result->>'success')::boolean = true,
    format('TEST 1 falló: %s', v_result);

  SELECT quantity_on_hand INTO v_balance
    FROM inventario.inventory_balances
   WHERE product_id = v_product AND location_id = v_loc_a;
  ASSERT abs(v_balance - (-422.4)) < 0.001,
    format('TEST 1: balance esperado=-422.4, obtenido=%s', v_balance);

  RAISE NOTICE '[TEST 1] OK — IN sobre balance negativo: -1952 → -422.4';
END
$t1$;

-- TEST 2 ---------------------------------------------------------------
-- OUT sobre balance ya positivo (loc_b empieza en 0) que lo deja negativo
-- antes hubiera fallado con "Insufficient stock"
SAVEPOINT s2;
DO $t2$
DECLARE
  v_product uuid := current_setting('test.product_id')::uuid;
  v_loc_b   uuid := current_setting('test.loc_b')::uuid;
  v_user    uuid := current_setting('test.user_id')::uuid;
  v_result  json;
  v_balance numeric;
BEGIN
  v_result := inventario.perform_inventory_movement(
    p_product_id        := v_product,
    p_quantity          := 100,
    p_movement_type     := 'OUT',
    p_reason_type       := 'consumption',
    p_location_id_from  := v_loc_b,
    p_recorded_by       := v_user
  );
  ASSERT (v_result->>'success')::boolean = true,
    format('TEST 2 falló: %s', v_result);

  SELECT quantity_on_hand INTO v_balance
    FROM inventario.inventory_balances
   WHERE product_id = v_product AND location_id = v_loc_b;
  ASSERT v_balance = -100,
    format('TEST 2: balance esperado=-100, obtenido=%s', v_balance);

  RAISE NOTICE '[TEST 2] OK — OUT que cruza a negativo: 0 → -100';
END
$t2$;

-- TEST 3 ---------------------------------------------------------------
-- TRANSFER_IN a destino con balance negativo
SAVEPOINT s3;
DO $t3$
DECLARE
  v_product uuid := current_setting('test.product_id')::uuid;
  v_loc_a   uuid := current_setting('test.loc_a')::uuid;
  v_loc_b   uuid := current_setting('test.loc_b')::uuid;
  v_user    uuid := current_setting('test.user_id')::uuid;
  v_result  json;
  v_balance numeric;
BEGIN
  -- Estado: loc_a=-422.4, loc_b=-100 (después de TEST 2)
  -- Hago TRANSFER_OUT 50 de loc_b (queda -150) y TRANSFER_IN 50 a loc_a (queda -372.4)
  v_result := inventario.perform_inventory_movement(
    p_product_id        := v_product,
    p_quantity          := 50,
    p_movement_type     := 'TRANSFER_OUT',
    p_reason_type       := 'transfer',
    p_location_id_from  := v_loc_b,
    p_location_id_to    := v_loc_a,
    p_recorded_by       := v_user
  );
  ASSERT (v_result->>'success')::boolean = true, format('TEST 3 OUT falló: %s', v_result);

  v_result := inventario.perform_inventory_movement(
    p_product_id        := v_product,
    p_quantity          := 50,
    p_movement_type     := 'TRANSFER_IN',
    p_reason_type       := 'transfer',
    p_location_id_from  := v_loc_b,
    p_location_id_to    := v_loc_a,
    p_recorded_by       := v_user
  );
  ASSERT (v_result->>'success')::boolean = true, format('TEST 3 IN falló: %s', v_result);

  SELECT quantity_on_hand INTO v_balance
    FROM inventario.inventory_balances
   WHERE product_id = v_product AND location_id = v_loc_a;
  ASSERT abs(v_balance - (-372.4)) < 0.001,
    format('TEST 3: balance esperado=-372.4 en loc_a, obtenido=%s', v_balance);

  SELECT quantity_on_hand INTO v_balance
    FROM inventario.inventory_balances
   WHERE product_id = v_product AND location_id = v_loc_b;
  ASSERT v_balance = -150,
    format('TEST 3: balance esperado=-150 en loc_b, obtenido=%s', v_balance);

  RAISE NOTICE '[TEST 3] OK — TRANSFER cruzando negativos en ambos extremos';
END
$t3$;

-- TEST 4 ---------------------------------------------------------------
-- Ajuste de inventario (apply_inventory_adjustment) sobre balance negativo
SAVEPOINT s4;
DO $t4$
DECLARE
  v_product       uuid := current_setting('test.product_id')::uuid;
  v_loc_a         uuid := current_setting('test.loc_a')::uuid;
  v_user          uuid := current_setting('test.user_id')::uuid;
  v_inventory_id  uuid;
  v_adjustment_id uuid;
  v_result_id     uuid;
  v_balance       numeric;
BEGIN
  -- Crear inventario y ajuste pendiente (positivo, +500)
  INSERT INTO public.inventories (location_id, status, created_by)
    VALUES (v_loc_a, 'in_progress', v_user)
    RETURNING id INTO v_inventory_id;

  INSERT INTO public.inventory_adjustments
    (inventory_id, product_id, counted_quantity, actual_quantity, difference,
     adjustment_type, adjustment_quantity, custom_reason, status, created_by)
    VALUES (v_inventory_id, v_product, 500, 0, 500,
            'positive', 500, 'TEST', 'pending', v_user)
    RETURNING id INTO v_adjustment_id;

  -- Aplicar ajuste positivo (= IN) sobre balance negativo
  v_result_id := public.apply_inventory_adjustment(v_adjustment_id, v_user);
  ASSERT v_result_id IS NOT NULL, 'TEST 4: apply_inventory_adjustment retornó NULL';

  SELECT quantity_on_hand INTO v_balance
    FROM inventario.inventory_balances
   WHERE product_id = v_product AND location_id = v_loc_a;
  -- Después de TEST 3 quedó -372.4; +500 = 127.6
  ASSERT abs(v_balance - 127.6) < 0.001,
    format('TEST 4: balance esperado=127.6, obtenido=%s', v_balance);

  RAISE NOTICE '[TEST 4] OK — ajuste positivo desde balance negativo: -372.4 → 127.6';
END
$t4$;

-- TEST 5 ---------------------------------------------------------------
-- Ajuste NEGATIVO (= OUT) que cruzaría a negativo
SAVEPOINT s5;
DO $t5$
DECLARE
  v_product       uuid := current_setting('test.product_id')::uuid;
  v_loc_a         uuid := current_setting('test.loc_a')::uuid;
  v_user          uuid := current_setting('test.user_id')::uuid;
  v_inventory_id  uuid;
  v_adjustment_id uuid;
  v_balance       numeric;
BEGIN
  INSERT INTO public.inventories (location_id, status, created_by)
    VALUES (v_loc_a, 'in_progress', v_user)
    RETURNING id INTO v_inventory_id;

  INSERT INTO public.inventory_adjustments
    (inventory_id, product_id, counted_quantity, actual_quantity, difference,
     adjustment_type, adjustment_quantity, custom_reason, status, created_by)
    VALUES (v_inventory_id, v_product, 0, 200, -200,
            'negative', 200, 'TEST', 'pending', v_user)
    RETURNING id INTO v_adjustment_id;

  PERFORM public.apply_inventory_adjustment(v_adjustment_id, v_user);

  SELECT quantity_on_hand INTO v_balance
    FROM inventario.inventory_balances
   WHERE product_id = v_product AND location_id = v_loc_a;
  -- 127.6 - 200 = -72.4
  ASSERT abs(v_balance - (-72.4)) < 0.001,
    format('TEST 5: balance esperado=-72.4, obtenido=%s', v_balance);

  RAISE NOTICE '[TEST 5] OK — ajuste negativo cruzando a negativo: 127.6 → -72.4';
END
$t5$;

-- TEST 6 ---------------------------------------------------------------
-- Despacho con allow_dispatch_without_inventory NO debe regresionar
SAVEPOINT s6;
DO $t6$
DECLARE
  v_product uuid := current_setting('test.product_id')::uuid;
  v_loc_b   uuid := current_setting('test.loc_b')::uuid;
  v_user    uuid := current_setting('test.user_id')::uuid;
  v_result  json;
  v_allow   boolean;
BEGIN
  -- Asegurar que el flag esté en true
  SELECT allow_dispatch_without_inventory INTO v_allow
    FROM public.dispatch_inventory_config
   WHERE id = '00000000-0000-0000-0000-000000000000'::uuid;

  IF v_allow IS NULL THEN
    INSERT INTO public.dispatch_inventory_config (id, allow_dispatch_without_inventory)
      VALUES ('00000000-0000-0000-0000-000000000000'::uuid, true);
    v_allow := true;
  END IF;

  -- Despacho a loc_b (que ya está en -150) por 100 más → -250
  v_result := inventario.perform_dispatch_movement(
    p_product_id       := v_product,
    p_quantity         := 100,
    p_location_id_from := v_loc_b,
    p_order_id         := gen_random_uuid(),
    p_order_number     := 'TEST-DSP',
    p_notes            := 'TEST',
    p_recorded_by      := v_user
  );
  ASSERT (v_result->>'success')::boolean = true,
    format('TEST 6 falló: %s', v_result);

  RAISE NOTICE '[TEST 6] OK — perform_dispatch_movement sigue funcionando';
END
$t6$;

-- TEST 7 ---------------------------------------------------------------
-- get_product_balance_by_location: filtra > 0; las negativas NO aparecen
-- (esto NO es regresión: era el comportamiento previo, lo confirmamos)
SAVEPOINT s7;
DO $t7$
DECLARE
  v_product uuid := current_setting('test.product_id')::uuid;
  v_count   integer;
BEGIN
  SELECT count(*) INTO v_count
    FROM inventario.get_product_balance_by_location(v_product);
  -- En este punto loc_a y loc_b están negativos, así que el reporte debe
  -- devolver 0 filas (filtra > 0). Esto es comportamiento existente.
  ASSERT v_count = 0,
    format('TEST 7: el reporte de balance por ubicación debe excluir negativos. count=%s', v_count);

  RAISE NOTICE '[TEST 7] OK — get_product_balance_by_location sigue filtrando > 0';
END
$t7$;

-- TEST 8 ---------------------------------------------------------------
-- Sanidad de movimientos: ledger debe sumar = balance final
-- (sum(IN+TRANSFER_IN) - sum(OUT+TRANSFER_OUT)) por (producto, ubicación)
SAVEPOINT s8;
DO $t8$
DECLARE
  v_product uuid := current_setting('test.product_id')::uuid;
  v_loc_a   uuid := current_setting('test.loc_a')::uuid;
  v_loc_b   uuid := current_setting('test.loc_b')::uuid;
  v_balance_a numeric;
  v_balance_b numeric;
  v_ledger_a numeric;
  v_ledger_b numeric;
BEGIN
  -- Balance A (incluye los -1952 iniciales que insertamos directo)
  SELECT quantity_on_hand INTO v_balance_a
    FROM inventario.inventory_balances
   WHERE product_id = v_product AND location_id = v_loc_a;

  -- Suma del ledger en A: solo cuenta los movimientos generados por los tests
  -- (el -1952 fue inyectado directo, no es un movement)
  SELECT COALESCE(SUM(
    CASE WHEN movement_type IN ('IN','TRANSFER_IN')  THEN quantity
         WHEN movement_type IN ('OUT','TRANSFER_OUT') THEN -quantity
    END), 0)
    INTO v_ledger_a
    FROM inventario.inventory_movements
   WHERE product_id = v_product
     AND (location_id_to = v_loc_a OR location_id_from = v_loc_a)
     AND ((movement_type IN ('IN','TRANSFER_IN')  AND location_id_to   = v_loc_a)
       OR (movement_type IN ('OUT','TRANSFER_OUT') AND location_id_from = v_loc_a));

  -- Balance esperado A = -1952 (semilla) + ledger_a
  ASSERT abs(v_balance_a - (-1952 + v_ledger_a)) < 0.001,
    format('TEST 8 (loc_a): balance=%s, esperado=-1952+%s=%s',
           v_balance_a, v_ledger_a, -1952 + v_ledger_a);

  -- Balance B
  SELECT quantity_on_hand INTO v_balance_b
    FROM inventario.inventory_balances
   WHERE product_id = v_product AND location_id = v_loc_b;

  SELECT COALESCE(SUM(
    CASE WHEN movement_type IN ('IN','TRANSFER_IN')  THEN quantity
         WHEN movement_type IN ('OUT','TRANSFER_OUT') THEN -quantity
    END), 0)
    INTO v_ledger_b
    FROM inventario.inventory_movements
   WHERE product_id = v_product
     AND ((movement_type IN ('IN','TRANSFER_IN')  AND location_id_to   = v_loc_b)
       OR (movement_type IN ('OUT','TRANSFER_OUT') AND location_id_from = v_loc_b));

  ASSERT abs(v_balance_b - v_ledger_b) < 0.001,
    format('TEST 8 (loc_b): balance=%s, ledger=%s', v_balance_b, v_ledger_b);

  RAISE NOTICE '[TEST 8] OK — ledger consistente con balance (loc_a=%, loc_b=%)',
    v_balance_a, v_balance_b;
END
$t8$;

-- ---------------------------------------------------------------------------
-- 4) ROLLBACK: nada queda en la base
-- ---------------------------------------------------------------------------
ROLLBACK;
\echo '====================================================================='
\echo 'Si llegaste aquí sin errores: TODOS LOS TESTS PASARON.'
\echo 'Todos los cambios se revirtieron (ROLLBACK). Aplica la migración real'
\echo 'con: pnpm db:sync'
\echo '====================================================================='
