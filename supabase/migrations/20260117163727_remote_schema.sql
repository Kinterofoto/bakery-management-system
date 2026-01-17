

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "compras";


ALTER SCHEMA "compras" OWNER TO "postgres";


COMMENT ON SCHEMA "compras" IS 'Schema for purchase management module including suppliers, purchase orders, and material explosion';



CREATE SCHEMA IF NOT EXISTS "inventario";


ALTER SCHEMA "inventario" OWNER TO "postgres";


COMMENT ON SCHEMA "inventario" IS 'Professional WMS-level inventory management system with hierarchical locations, unified movements, and automatic balance tracking';



CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






CREATE SCHEMA IF NOT EXISTS "produccion";


ALTER SCHEMA "produccion" OWNER TO "postgres";


COMMENT ON SCHEMA "produccion" IS 'Schema dedicado al módulo de producción de la panadería';



COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE SCHEMA IF NOT EXISTS "visitas";


ALTER SCHEMA "visitas" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "workflows";


ALTER SCHEMA "workflows" OWNER TO "postgres";


COMMENT ON SCHEMA "workflows" IS 'Schema para tablas relacionadas con workflows automatizados (Trigger.dev)';



CREATE EXTENSION IF NOT EXISTS "hypopg" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "index_advisor" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";






CREATE TYPE "public"."billing_type_enum" AS ENUM (
    'facturable',
    'remision'
);


ALTER TYPE "public"."billing_type_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "compras"."assign_return_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.return_number IS NULL THEN
    NEW.return_number := compras.generate_return_number();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "compras"."assign_return_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "compras"."assign_transfer_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.transfer_number IS NULL THEN
    NEW.transfer_number := compras.generate_transfer_number();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "compras"."assign_transfer_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "compras"."calculate_movement_balance"("p_material_id" "uuid", "p_warehouse_type" "text", "p_movement_date" timestamp with time zone DEFAULT "now"()) RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_current_balance DECIMAL := 0;
BEGIN
  -- Get current balance from material_inventory_balances
  -- This table is updated BEFORE this function is called by triggers

  IF p_warehouse_type = 'production' THEN
    SELECT COALESCE(production_stock, 0)
    INTO v_current_balance
    FROM compras.material_inventory_balances
    WHERE material_id = p_material_id;
  ELSE
    -- Default to warehouse for NULL or 'warehouse' values
    SELECT COALESCE(warehouse_stock, 0)
    INTO v_current_balance
    FROM compras.material_inventory_balances
    WHERE material_id = p_material_id;
  END IF;

  -- Return the current balance (which already reflects this movement)
  RETURN v_current_balance;
END;
$$;


ALTER FUNCTION "compras"."calculate_movement_balance"("p_material_id" "uuid", "p_warehouse_type" "text", "p_movement_date" timestamp with time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "compras"."calculate_movement_balance"("p_material_id" "uuid", "p_warehouse_type" "text", "p_movement_date" timestamp with time zone) IS 'Calculates the balance after a movement by reading the current stock from material_inventory_balances.
Must be called AFTER the balance table has been updated by update_material_inventory_balance trigger.';



CREATE OR REPLACE FUNCTION "compras"."create_inventory_movement_from_reception"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_balance_after DECIMAL;
BEGIN
  -- Calculate balance after this movement
  v_balance_after := compras.calculate_movement_balance(
    NEW.material_id,
    COALESCE(NEW.warehouse_type, 'warehouse'),
    NEW.reception_date
  );

  INSERT INTO compras.inventory_movements (
    material_id,
    movement_type,
    quantity_change,
    unit_of_measure,
    warehouse_type,
    location,
    reference_id,
    reference_type,
    notes,
    recorded_by,
    balance_after,
    movement_date
  ) VALUES (
    NEW.material_id,
    'reception',
    NEW.quantity_received,
    NEW.unit_of_measure,
    COALESCE(NEW.warehouse_type, 'warehouse'),
    NEW.storage_location,
    NEW.id,
    'reception',
    'Recepción de material - Orden: ' || COALESCE(NEW.purchase_order_number, 'N/A'),
    NEW.operator_id,
    v_balance_after,
    NEW.reception_date
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "compras"."create_inventory_movement_from_reception"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "compras"."create_inventory_movement_from_reception_item"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_reception RECORD;
  v_balance_after DECIMAL;
BEGIN
  SELECT * INTO v_reception
  FROM compras.material_receptions
  WHERE id = NEW.reception_id;

  IF v_reception.id IS NULL THEN
    RAISE EXCEPTION 'Reception not found for id: %', NEW.reception_id;
  END IF;

  -- Calculate balance after this movement
  v_balance_after := compras.calculate_movement_balance(
    NEW.material_id,
    COALESCE(v_reception.warehouse_type, 'warehouse'),
    v_reception.reception_date
  );

  INSERT INTO compras.inventory_movements (
    material_id,
    movement_type,
    quantity_change,
    unit_of_measure,
    warehouse_type,
    location,
    reference_id,
    reference_type,
    notes,
    recorded_by,
    balance_after,
    movement_date
  ) VALUES (
    NEW.material_id,
    'reception',
    NEW.quantity_received,
    (SELECT unit FROM public.products WHERE id = NEW.material_id),  -- ← FIX: Get from products, not from NEW
    COALESCE(v_reception.warehouse_type, 'warehouse'),
    v_reception.storage_location,
    NEW.id,
    'reception_item',
    'Recepción de material (item) - Orden: ' || COALESCE(v_reception.purchase_order_number, 'N/A'),
    v_reception.operator_id,
    v_balance_after,
    v_reception.reception_date
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "compras"."create_inventory_movement_from_reception_item"() OWNER TO "postgres";


COMMENT ON FUNCTION "compras"."create_inventory_movement_from_reception_item"() IS 'Creates inventory movement when a reception item is inserted. Gets unit_of_measure from products table since reception_items does not have that column.';



CREATE OR REPLACE FUNCTION "compras"."create_inventory_movement_from_return"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_balance_after DECIMAL;
BEGIN
  IF NEW.status = 'received' AND OLD.status != 'received' THEN
    -- Calculate balance after this return
    v_balance_after := compras.calculate_movement_balance(
      NEW.material_id,
      COALESCE(NEW.return_to_location, 'warehouse'),
      NEW.received_date
    );

    INSERT INTO compras.inventory_movements (
      material_id,
      movement_type,
      quantity_change,
      unit_of_measure,
      warehouse_type,
      location,
      reference_id,
      reference_type,
      notes,
      recorded_by,
      balance_after,
      movement_date
    ) VALUES (
      NEW.material_id,
      'return',
      NEW.quantity_returned,
      NEW.unit_of_measure,
      COALESCE(NEW.return_to_location, 'warehouse'),
      NEW.return_to_location,
      NEW.id,
      'material_return',
      'Devolución de material - Razón: ' || COALESCE(NEW.reason, 'No especificada'),
      NEW.accepted_by,
      v_balance_after,
      NEW.received_date
    );
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "compras"."create_inventory_movement_from_return"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "compras"."create_inventory_movement_from_transfer"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_transfer RECORD;
  v_balance_after_from DECIMAL;
  v_balance_after_to DECIMAL;
BEGIN
  SELECT * INTO v_transfer
  FROM compras.material_transfers
  WHERE id = NEW.transfer_id;

  IF v_transfer.id IS NULL THEN
    RAISE EXCEPTION 'Transfer not found for id: %', NEW.transfer_id;
  END IF;

  -- Calculate balance for origin location (negative movement)
  v_balance_after_from := compras.calculate_movement_balance(
    NEW.material_id,
    v_transfer.from_location,
    v_transfer.transfer_date
  );

  -- Create movement for origin (deduction)
  INSERT INTO compras.inventory_movements (
    material_id,
    movement_type,
    quantity_change,
    unit_of_measure,
    warehouse_type,
    location,
    reference_id,
    reference_type,
    notes,
    recorded_by,
    balance_after,
    movement_date
  ) VALUES (
    NEW.material_id,
    'transfer',
    -NEW.quantity_transferred,
    NEW.unit_of_measure,
    v_transfer.from_location,
    v_transfer.from_location,
    NEW.id,
    'transfer_item_out',
    'Transferencia salida - ' || COALESCE(v_transfer.notes, 'Sin notas'),
    v_transfer.requested_by,
    v_balance_after_from,
    v_transfer.transfer_date
  );

  -- Calculate balance for destination location (positive movement)
  v_balance_after_to := compras.calculate_movement_balance(
    NEW.material_id,
    v_transfer.to_location,
    v_transfer.transfer_date
  );

  -- Create movement for destination (addition)
  INSERT INTO compras.inventory_movements (
    material_id,
    movement_type,
    quantity_change,
    unit_of_measure,
    warehouse_type,
    location,
    reference_id,
    reference_type,
    notes,
    recorded_by,
    balance_after,
    movement_date
  ) VALUES (
    NEW.material_id,
    'transfer',
    NEW.quantity_transferred,
    NEW.unit_of_measure,
    v_transfer.to_location,
    v_transfer.to_location,
    NEW.id,
    'transfer_item_in',
    'Transferencia entrada - ' || COALESCE(v_transfer.notes, 'Sin notas'),
    v_transfer.requested_by,
    v_balance_after_to,
    v_transfer.transfer_date
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "compras"."create_inventory_movement_from_transfer"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "compras"."create_movement_on_reception_item"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_unit VARCHAR;
  v_operator_id UUID;
BEGIN
  -- Get the unit from products
  SELECT p.unit INTO v_unit
  FROM public.products p
  WHERE p.id = NEW.material_id;

  -- Get the operator_id from material_receptions
  SELECT mr.operator_id INTO v_operator_id
  FROM compras.material_receptions mr
  WHERE mr.id = NEW.reception_id;

  -- Insert inventory movement
  INSERT INTO compras.inventory_movements (
    material_id,
    movement_type,
    quantity_change,
    unit_of_measure,
    reference_id,
    reference_type,
    notes,
    recorded_by,
    movement_date
  ) VALUES (
    NEW.material_id,
    'reception',
    NEW.quantity_received,
    COALESCE(v_unit, ''),
    NEW.reception_id,
    'reception_item',
    'Recepción de lote: ' || COALESCE(NEW.batch_number, 'SN'),
    v_operator_id,
    CURRENT_TIMESTAMP
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "compras"."create_movement_on_reception_item"() OWNER TO "postgres";


COMMENT ON FUNCTION "compras"."create_movement_on_reception_item"() IS 'Creates an inventory movement entry when a reception item is inserted';



CREATE OR REPLACE FUNCTION "compras"."create_movement_on_return_receipt"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Only create movement when return is accepted
  IF NEW.status = 'received' AND OLD.status = 'pending_receipt' THEN
    INSERT INTO compras.inventory_movements (
      material_id,
      movement_type,
      quantity_change,
      unit_of_measure,
      reference_id,
      reference_type,
      notes,
      recorded_by,
      movement_date
    )
    SELECT
      ri.material_id,
      'return',
      ri.quantity_returned,
      ri.unit_of_measure,
      NEW.id,
      'material_return',
      'Devolución desde ' || wc.name || ' - Motivo: ' || COALESCE(NEW.reason, 'N/A'),
      NEW.accepted_by,
      CURRENT_TIMESTAMP
    FROM compras.return_items ri
    JOIN compras.material_returns mr ON mr.id = NEW.id
    JOIN produccion.work_centers wc ON wc.id = mr.work_center_id
    WHERE ri.return_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "compras"."create_movement_on_return_receipt"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "compras"."create_movement_on_transfer"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Create inventory movement for each transfer item
  INSERT INTO compras.inventory_movements (
    material_id,
    movement_type,
    quantity_change,
    unit_of_measure,
    reference_id,
    reference_type,
    location,
    notes,
    recorded_by,
    movement_date
  )
  SELECT
    ti.material_id,
    'transfer',
    -ti.quantity_requested,
    ti.unit_of_measure,
    NEW.id,
    'material_transfer',
    'Centro: ' || wc.code,
    'Traslado a ' || wc.name || ' - Lote: ' || COALESCE(ti.batch_number, 'N/A'),
    NEW.requested_by,
    CURRENT_TIMESTAMP
  FROM compras.transfer_items ti
  JOIN produccion.work_centers wc ON wc.id = NEW.work_center_id
  WHERE ti.transfer_id = NEW.id;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "compras"."create_movement_on_transfer"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "compras"."create_movement_on_transfer_item"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_work_center RECORD;
  v_transfer RECORD;
BEGIN
  -- Get work center and transfer info
  SELECT wc.code, wc.name, mt.requested_by
  INTO v_work_center
  FROM compras.material_transfers mt
  JOIN produccion.work_centers wc ON wc.id = mt.work_center_id
  WHERE mt.id = NEW.transfer_id;

  -- Create inventory movement for this item
  INSERT INTO compras.inventory_movements (
    material_id,
    movement_type,
    quantity_change,
    unit_of_measure,
    reference_id,
    reference_type,
    location,
    notes,
    recorded_by,
    movement_date
  )
  VALUES (
    NEW.material_id,
    'transfer',
    -NEW.quantity_requested,
    NEW.unit_of_measure,
    NEW.transfer_id,
    'material_transfer',
    'Centro: ' || v_work_center.code,
    'Traslado a ' || v_work_center.name || ' - Lote: ' || COALESCE(NEW.batch_number, 'N/A'),
    v_work_center.requested_by,
    CURRENT_TIMESTAMP
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "compras"."create_movement_on_transfer_item"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "compras"."delete_movement_on_reception_item_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Delete the corresponding inventory movement
  DELETE FROM compras.inventory_movements
  WHERE reference_id = OLD.reception_id
    AND reference_type = 'reception_item'
    AND material_id = OLD.material_id;

  RETURN OLD;
END;
$$;


ALTER FUNCTION "compras"."delete_movement_on_reception_item_delete"() OWNER TO "postgres";


COMMENT ON FUNCTION "compras"."delete_movement_on_reception_item_delete"() IS 'Deletes the corresponding inventory movement when a reception item is deleted';



CREATE OR REPLACE FUNCTION "compras"."generate_reception_number"() RETURNS character varying
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  year_part VARCHAR;
  counter INTEGER;
  new_number VARCHAR;
  lock_key BIGINT;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YY');

  -- Create a lock key based on current year (use advisory lock to prevent race conditions)
  lock_key := ('x' || md5('reception_number_' || year_part))::bit(64)::bigint;

  -- Acquire advisory lock (will wait if another transaction has it)
  PERFORM pg_advisory_xact_lock(lock_key);

  -- Get the next counter for this year
  counter := COALESCE(
    (SELECT CAST(SUBSTRING(reception_number, 4) AS INTEGER)
     FROM compras.material_receptions
     WHERE reception_number LIKE 'RC' || year_part || '%'
     ORDER BY CAST(SUBSTRING(reception_number, 4) AS INTEGER) DESC
     LIMIT 1),
    0
  ) + 1;

  new_number := 'RC' || year_part || LPAD(counter::TEXT, 5, '0');

  RETURN new_number;
END;
$$;


ALTER FUNCTION "compras"."generate_reception_number"() OWNER TO "postgres";


COMMENT ON FUNCTION "compras"."generate_reception_number"() IS 'Generates sequential reception numbers with format RC{YY}{NNNNN}. Uses advisory lock to prevent race conditions.';



CREATE OR REPLACE FUNCTION "compras"."generate_return_number"() RETURNS character varying
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_year VARCHAR(2);
  v_sequence INTEGER;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YY');
  v_sequence := nextval('compras.return_number_seq');
  RETURN 'DV' || v_year || '00' || LPAD(v_sequence::TEXT, 6, '0');
END;
$$;


ALTER FUNCTION "compras"."generate_return_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "compras"."generate_supplier_token"() RETURNS character varying
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  new_token VARCHAR;
  token_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a random token (using UUID and encoding to remove dashes)
    new_token := encode(gen_random_bytes(32), 'base64');
    -- Remove special characters that might cause URL issues
    new_token := REPLACE(REPLACE(REPLACE(new_token, '+', ''), '/', ''), '=', '');
    new_token := SUBSTRING(new_token, 1, 40);

    -- Check if token already exists
    SELECT EXISTS(SELECT 1 FROM compras.suppliers WHERE access_token = new_token) INTO token_exists;

    -- If token doesn't exist, exit loop
    IF NOT token_exists THEN
      EXIT;
    END IF;
  END LOOP;

  RETURN new_token;
END;
$$;


ALTER FUNCTION "compras"."generate_supplier_token"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "compras"."generate_transfer_number"() RETURNS character varying
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_year VARCHAR(2);
  v_sequence INTEGER;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YY');
  v_sequence := nextval('compras.transfer_number_seq');
  RETURN 'TF' || v_year || '00' || LPAD(v_sequence::TEXT, 6, '0');
END;
$$;


ALTER FUNCTION "compras"."generate_transfer_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "compras"."set_reception_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.reception_number IS NULL THEN
    NEW.reception_number := compras.generate_reception_number();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "compras"."set_reception_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "compras"."set_supplier_token"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.access_token IS NULL THEN
    NEW.access_token := compras.generate_supplier_token();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "compras"."set_supplier_token"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "compras"."update_balance_on_movement_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_warehouse_change DECIMAL(12, 3) := 0;
  v_production_change DECIMAL(12, 3) := 0;
  v_last_movement RECORD;
BEGIN
  -- Calculate reverse of the deleted movement
  CASE OLD.movement_type
    WHEN 'reception' THEN
      v_warehouse_change := -OLD.quantity_change;
    WHEN 'consumption' THEN
      IF OLD.warehouse_type = 'warehouse' OR OLD.warehouse_type IS NULL THEN
        v_warehouse_change := ABS(OLD.quantity_change);
      ELSE
        v_production_change := ABS(OLD.quantity_change);
      END IF;
    WHEN 'transfer' THEN
      v_warehouse_change := ABS(OLD.quantity_change);
      v_production_change := -ABS(OLD.quantity_change);
    WHEN 'return' THEN
      v_warehouse_change := -ABS(OLD.quantity_change);
      v_production_change := ABS(OLD.quantity_change);
    WHEN 'waste' THEN
      IF OLD.warehouse_type = 'warehouse' OR OLD.warehouse_type IS NULL THEN
        v_warehouse_change := ABS(OLD.quantity_change);
      ELSE
        v_production_change := ABS(OLD.quantity_change);
      END IF;
    WHEN 'adjustment' THEN
      IF OLD.warehouse_type = 'warehouse' OR OLD.warehouse_type IS NULL THEN
        v_warehouse_change := -OLD.quantity_change;
      ELSE
        v_production_change := -OLD.quantity_change;
      END IF;
  END CASE;

  -- Find the most recent movement for this material (for audit trail)
  SELECT id, movement_date INTO v_last_movement
  FROM compras.inventory_movements
  WHERE material_id = OLD.material_id
    AND id != OLD.id
  ORDER BY movement_date DESC, created_at DESC
  LIMIT 1;

  -- Update balance (reverse the deleted movement)
  UPDATE compras.material_inventory_balances
  SET
    warehouse_stock = GREATEST(0, warehouse_stock + v_warehouse_change),
    production_stock = GREATEST(0, production_stock + v_production_change),
    last_movement_id = v_last_movement.id,
    last_movement_date = v_last_movement.movement_date,
    last_updated_at = NOW()
  WHERE material_id = OLD.material_id;

  RETURN OLD;
END;
$$;


ALTER FUNCTION "compras"."update_balance_on_movement_delete"() OWNER TO "postgres";


COMMENT ON FUNCTION "compras"."update_balance_on_movement_delete"() IS 'Automatically updates material_inventory_balances when a movement is deleted. Reverses the impact of the deleted movement.';



CREATE OR REPLACE FUNCTION "compras"."update_balance_on_movement_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_warehouse_change DECIMAL(12, 3) := 0;
  v_production_change DECIMAL(12, 3) := 0;
  v_unit_of_measure VARCHAR(50);
BEGIN
  -- Get unit of measure from product
  SELECT p.unit_of_measure INTO v_unit_of_measure
  FROM public.products p
  WHERE p.id = NEW.material_id;

  -- Determine stock changes based on movement type and warehouse_type
  CASE NEW.movement_type
    -- RECEPTION: Always adds to warehouse
    WHEN 'reception' THEN
      v_warehouse_change := NEW.quantity_change;

    -- CONSUMPTION: Removes from warehouse or production based on warehouse_type
    WHEN 'consumption' THEN
      IF NEW.warehouse_type = 'warehouse' OR NEW.warehouse_type IS NULL THEN
        v_warehouse_change := -ABS(NEW.quantity_change);
      ELSE
        v_production_change := -ABS(NEW.quantity_change);
      END IF;

    -- TRANSFER: Removes from warehouse, adds to production
    WHEN 'transfer' THEN
      v_warehouse_change := -ABS(NEW.quantity_change);
      v_production_change := ABS(NEW.quantity_change);

    -- RETURN: Removes from production, adds to warehouse
    WHEN 'return' THEN
      v_warehouse_change := ABS(NEW.quantity_change);
      v_production_change := -ABS(NEW.quantity_change);

    -- WASTE: Removes from warehouse or production based on warehouse_type
    WHEN 'waste' THEN
      IF NEW.warehouse_type = 'warehouse' OR NEW.warehouse_type IS NULL THEN
        v_warehouse_change := -ABS(NEW.quantity_change);
      ELSE
        v_production_change := -ABS(NEW.quantity_change);
      END IF;

    -- ADJUSTMENT: Can affect warehouse or production based on warehouse_type
    WHEN 'adjustment' THEN
      IF NEW.warehouse_type = 'warehouse' OR NEW.warehouse_type IS NULL THEN
        v_warehouse_change := NEW.quantity_change;
      ELSE
        v_production_change := NEW.quantity_change;
      END IF;

    ELSE
      -- Unknown movement type, log warning but don't fail
      RAISE WARNING 'Unknown movement type: %', NEW.movement_type;
  END CASE;

  -- Insert or update balance record
  INSERT INTO compras.material_inventory_balances (
    material_id,
    warehouse_stock,
    production_stock,
    unit_of_measure,
    last_movement_id,
    last_movement_date,
    last_updated_at
  )
  VALUES (
    NEW.material_id,
    GREATEST(0, v_warehouse_change),
    GREATEST(0, v_production_change),
    COALESCE(v_unit_of_measure, NEW.unit_of_measure, 'kg'),
    NEW.id,
    NEW.movement_date,
    NOW()
  )
  ON CONFLICT (material_id)
  DO UPDATE SET
    warehouse_stock = GREATEST(0, material_inventory_balances.warehouse_stock + v_warehouse_change),
    production_stock = GREATEST(0, material_inventory_balances.production_stock + v_production_change),
    last_movement_id = NEW.id,
    last_movement_date = NEW.movement_date,
    last_updated_at = NOW();

  RETURN NEW;
END;
$$;


ALTER FUNCTION "compras"."update_balance_on_movement_insert"() OWNER TO "postgres";


COMMENT ON FUNCTION "compras"."update_balance_on_movement_insert"() IS 'Automatically updates material_inventory_balances when a new movement is inserted. Determines warehouse vs production impact based on movement_type and warehouse_type.';



CREATE OR REPLACE FUNCTION "compras"."update_balance_on_movement_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_old_warehouse_change DECIMAL(12, 3) := 0;
  v_old_production_change DECIMAL(12, 3) := 0;
  v_new_warehouse_change DECIMAL(12, 3) := 0;
  v_new_production_change DECIMAL(12, 3) := 0;
BEGIN
  -- Only recalculate if quantity, type, or warehouse_type changed
  IF OLD.quantity_change = NEW.quantity_change
     AND OLD.movement_type = NEW.movement_type
     AND (OLD.warehouse_type IS NOT DISTINCT FROM NEW.warehouse_type) THEN
    RETURN NEW;
  END IF;

  -- Calculate OLD movement impact (reverse it)
  CASE OLD.movement_type
    WHEN 'reception' THEN
      v_old_warehouse_change := -OLD.quantity_change;
    WHEN 'consumption' THEN
      IF OLD.warehouse_type = 'warehouse' OR OLD.warehouse_type IS NULL THEN
        v_old_warehouse_change := ABS(OLD.quantity_change);
      ELSE
        v_old_production_change := ABS(OLD.quantity_change);
      END IF;
    WHEN 'transfer' THEN
      v_old_warehouse_change := ABS(OLD.quantity_change);
      v_old_production_change := -ABS(OLD.quantity_change);
    WHEN 'return' THEN
      v_old_warehouse_change := -ABS(OLD.quantity_change);
      v_old_production_change := ABS(OLD.quantity_change);
    WHEN 'waste' THEN
      IF OLD.warehouse_type = 'warehouse' OR OLD.warehouse_type IS NULL THEN
        v_old_warehouse_change := ABS(OLD.quantity_change);
      ELSE
        v_old_production_change := ABS(OLD.quantity_change);
      END IF;
    WHEN 'adjustment' THEN
      IF OLD.warehouse_type = 'warehouse' OR OLD.warehouse_type IS NULL THEN
        v_old_warehouse_change := -OLD.quantity_change;
      ELSE
        v_old_production_change := -OLD.quantity_change;
      END IF;
  END CASE;

  -- Calculate NEW movement impact (apply it)
  CASE NEW.movement_type
    WHEN 'reception' THEN
      v_new_warehouse_change := NEW.quantity_change;
    WHEN 'consumption' THEN
      IF NEW.warehouse_type = 'warehouse' OR NEW.warehouse_type IS NULL THEN
        v_new_warehouse_change := -ABS(NEW.quantity_change);
      ELSE
        v_new_production_change := -ABS(NEW.quantity_change);
      END IF;
    WHEN 'transfer' THEN
      v_new_warehouse_change := -ABS(NEW.quantity_change);
      v_new_production_change := ABS(NEW.quantity_change);
    WHEN 'return' THEN
      v_new_warehouse_change := ABS(NEW.quantity_change);
      v_new_production_change := -ABS(NEW.quantity_change);
    WHEN 'waste' THEN
      IF NEW.warehouse_type = 'warehouse' OR NEW.warehouse_type IS NULL THEN
        v_new_warehouse_change := -ABS(NEW.quantity_change);
      ELSE
        v_new_production_change := -ABS(NEW.quantity_change);
      END IF;
    WHEN 'adjustment' THEN
      IF NEW.warehouse_type = 'warehouse' OR NEW.warehouse_type IS NULL THEN
        v_new_warehouse_change := NEW.quantity_change;
      ELSE
        v_new_production_change := NEW.quantity_change;
      END IF;
  END CASE;

  -- Update balance (reverse old, apply new)
  UPDATE compras.material_inventory_balances
  SET
    warehouse_stock = GREATEST(0, warehouse_stock + v_old_warehouse_change + v_new_warehouse_change),
    production_stock = GREATEST(0, production_stock + v_old_production_change + v_new_production_change),
    last_movement_id = NEW.id,
    last_movement_date = NEW.movement_date,
    last_updated_at = NOW()
  WHERE material_id = NEW.material_id;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "compras"."update_balance_on_movement_update"() OWNER TO "postgres";


COMMENT ON FUNCTION "compras"."update_balance_on_movement_update"() IS 'Automatically updates material_inventory_balances when a movement is modified. Reverses old impact and applies new impact.';



CREATE OR REPLACE FUNCTION "compras"."update_explosion_on_reception"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- When a purchase order item is received, update the explosion tracking
  UPDATE compras.explosion_purchase_tracking
  SET
    quantity_received = quantity_received + NEW.quantity_received,
    updated_at = CURRENT_TIMESTAMP
  WHERE purchase_order_item_id = NEW.purchase_order_item_id;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "compras"."update_explosion_on_reception"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "compras"."update_explosion_tracking_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Update status based on ordered and received quantities
  IF NEW.quantity_received >= NEW.quantity_needed THEN
    NEW.status := 'received';
  ELSIF NEW.quantity_received > 0 THEN
    NEW.status := 'partially_received';
  ELSIF NEW.quantity_ordered > 0 THEN
    NEW.status := 'ordered';
  ELSE
    NEW.status := 'not_ordered';
  END IF;

  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "compras"."update_explosion_tracking_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "compras"."update_material_receptions_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "compras"."update_material_receptions_timestamp"() OWNER TO "postgres";


COMMENT ON FUNCTION "compras"."update_material_receptions_timestamp"() IS 'Automatically updates the updated_at timestamp when material_receptions is modified';



CREATE OR REPLACE FUNCTION "compras"."update_movement_on_reception_item_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_existing_movement_id UUID;
  v_quantity_difference DECIMAL;
BEGIN
  -- Only process if quantity_received changed
  IF NEW.quantity_received <> OLD.quantity_received THEN
    -- Find the existing movement for this reception item
    SELECT id INTO v_existing_movement_id
    FROM compras.inventory_movements
    WHERE reference_id = NEW.reception_id
      AND reference_type = 'reception_item'
      AND material_id = NEW.material_id
    ORDER BY movement_date DESC
    LIMIT 1;

    IF v_existing_movement_id IS NOT NULL THEN
      -- Calculate the difference
      v_quantity_difference := NEW.quantity_received - OLD.quantity_received;

      -- Update the existing movement with the new quantity
      UPDATE compras.inventory_movements
      SET quantity_change = NEW.quantity_received,
          notes = 'Recepción actualizada: Lote ' || COALESCE(NEW.batch_number, 'SN') || ' Cantidad: ' || NEW.quantity_received
      WHERE id = v_existing_movement_id;
    ELSE
      -- If no movement found, create a new one
      INSERT INTO compras.inventory_movements (
        material_id,
        movement_type,
        quantity_change,
        unit_of_measure,
        reference_id,
        reference_type,
        notes,
        recorded_by,
        movement_date
      ) VALUES (
        NEW.material_id,
        'reception',
        NEW.quantity_received,
        (SELECT p.unit FROM public.products p WHERE p.id = NEW.material_id),
        NEW.reception_id,
        'reception_item',
        'Recepción actualizada: Lote ' || COALESCE(NEW.batch_number, 'SN'),
        (SELECT operator_id FROM compras.material_receptions WHERE id = NEW.reception_id),
        CURRENT_TIMESTAMP
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "compras"."update_movement_on_reception_item_update"() OWNER TO "postgres";


COMMENT ON FUNCTION "compras"."update_movement_on_reception_item_update"() IS 'Updates the corresponding inventory movement when a reception item is updated';



CREATE OR REPLACE FUNCTION "compras"."update_reception_items_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "compras"."update_reception_items_timestamp"() OWNER TO "postgres";


COMMENT ON FUNCTION "compras"."update_reception_items_timestamp"() IS 'Automatically updates the updated_at timestamp when reception_items is modified';



CREATE OR REPLACE FUNCTION "compras"."update_work_center_inventory_on_receipt"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Update or insert into work_center_inventory
  INSERT INTO produccion.work_center_inventory (
    work_center_id,
    material_id,
    quantity_available,
    batch_number,
    expiry_date,
    unit_of_measure,
    transferred_at
  )
  SELECT
    mr.work_center_id,
    ti.material_id,
    COALESCE(NEW.quantity_received, ti.quantity_requested),
    ti.batch_number,
    ti.expiry_date,
    ti.unit_of_measure,
    CURRENT_TIMESTAMP
  FROM compras.transfer_items ti
  JOIN compras.material_transfers mr ON mr.id = NEW.transfer_id
  WHERE ti.transfer_id = NEW.transfer_id
  ON CONFLICT (work_center_id, material_id, batch_number, expiry_date)
  DO UPDATE SET
    quantity_available = work_center_inventory.quantity_available + EXCLUDED.quantity_available,
    updated_at = CURRENT_TIMESTAMP;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "compras"."update_work_center_inventory_on_receipt"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "compras"."update_work_center_inventory_on_return"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Decrement inventory when return is created
  UPDATE produccion.work_center_inventory
  SET quantity_available = quantity_available - ri.quantity_returned,
      updated_at = CURRENT_TIMESTAMP
  FROM compras.return_items ri
  WHERE ri.return_id = NEW.id
    AND work_center_inventory.work_center_id = NEW.work_center_id
    AND work_center_inventory.material_id = ri.material_id
    AND work_center_inventory.batch_number = ri.batch_number
    AND work_center_inventory.expiry_date = ri.expiry_date;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "compras"."update_work_center_inventory_on_return"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "inventario"."accept_pending_return"("p_movement_in_id" "uuid", "p_accepted_by" "uuid" DEFAULT NULL::"uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_movement_out_id UUID;
  v_product_id UUID;
  v_quantity DECIMAL;
  v_location_id_from UUID;
  v_location_id_to UUID;
  v_accepted_by UUID;
  v_movement_in RECORD;
  v_balance_after_from DECIMAL;
  v_balance_after_to DECIMAL;
BEGIN
  -- Get accepted_by
  v_accepted_by := COALESCE(p_accepted_by, auth.uid());
  IF v_accepted_by IS NULL THEN
    RAISE EXCEPTION 'accepted_by is required';
  END IF;

  -- Get the TRANSFER_IN movement (return to warehouse)
  SELECT * INTO v_movement_in
  FROM inventario.inventory_movements
  WHERE id = p_movement_in_id
    AND movement_type = 'TRANSFER_IN'
    AND reason_type = 'return'
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending return movement not found: %', p_movement_in_id;
  END IF;

  -- Get linked TRANSFER_OUT movement
  v_movement_out_id := v_movement_in.linked_movement_id;
  IF v_movement_out_id IS NULL THEN
    RAISE EXCEPTION 'Linked TRANSFER_OUT movement not found';
  END IF;

  -- Extract movement details
  v_product_id := v_movement_in.product_id;
  v_quantity := v_movement_in.quantity;
  v_location_id_from := v_movement_in.location_id_from;
  v_location_id_to := v_movement_in.location_id_to;

  -- Update balance at FROM location (work center - subtract)
  PERFORM inventario.update_inventory_balance(
    v_product_id,
    v_location_id_from,
    v_quantity,
    'TRANSFER_OUT',
    v_movement_out_id
  );

  -- Get new balance at FROM location
  SELECT quantity_on_hand INTO v_balance_after_from
  FROM inventario.inventory_balances
  WHERE product_id = v_product_id AND location_id = v_location_id_from;

  -- Update balance at TO location (warehouse - add)
  PERFORM inventario.update_inventory_balance(
    v_product_id,
    v_location_id_to,
    v_quantity,
    'TRANSFER_IN',
    p_movement_in_id
  );

  -- Get new balance at TO location
  SELECT quantity_on_hand INTO v_balance_after_to
  FROM inventario.inventory_balances
  WHERE product_id = v_product_id AND location_id = v_location_id_to;

  -- Update TRANSFER_OUT movement status
  UPDATE inventario.inventory_movements
  SET status = 'completed',
      balance_after = v_balance_after_from,
      received_at = NOW(),
      received_by = v_accepted_by
  WHERE id = v_movement_out_id;

  -- Update TRANSFER_IN movement status
  UPDATE inventario.inventory_movements
  SET status = 'completed',
      balance_after = v_balance_after_to,
      received_at = NOW(),
      received_by = v_accepted_by
  WHERE id = p_movement_in_id;

  RETURN json_build_object(
    'success', true,
    'movement_in_id', p_movement_in_id,
    'movement_out_id', v_movement_out_id,
    'status', 'completed',
    'balance_after_from', v_balance_after_from,
    'balance_after_to', v_balance_after_to
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error accepting return: %', SQLERRM;
END;
$$;


ALTER FUNCTION "inventario"."accept_pending_return"("p_movement_in_id" "uuid", "p_accepted_by" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "inventario"."accept_pending_return"("p_movement_in_id" "uuid", "p_accepted_by" "uuid") IS 'Accepts a pending return and updates balances at work center and warehouse.';



CREATE OR REPLACE FUNCTION "inventario"."calculate_balance_after"("p_product_id" "uuid", "p_location_id" "uuid", "p_quantity" numeric, "p_movement_type" character varying) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  current_balance DECIMAL;
  new_balance DECIMAL;
BEGIN
  -- Get current balance
  current_balance := inventario.get_current_balance(p_product_id, p_location_id);

  -- Calculate new balance based on movement type
  new_balance := CASE p_movement_type
    WHEN 'IN' THEN current_balance + p_quantity
    WHEN 'TRANSFER_IN' THEN current_balance + p_quantity
    WHEN 'OUT' THEN current_balance - p_quantity
    WHEN 'TRANSFER_OUT' THEN current_balance - p_quantity
    ELSE current_balance
  END;

  -- Validate non-negative balance
  IF new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient inventory. Current: %, Required: %, Movement: %',
      current_balance, p_quantity, p_movement_type;
  END IF;

  RETURN new_balance;
END;
$$;


ALTER FUNCTION "inventario"."calculate_balance_after"("p_product_id" "uuid", "p_location_id" "uuid", "p_quantity" numeric, "p_movement_type" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "inventario"."calculate_balance_after_dispatch"("p_product_id" "uuid", "p_location_id" "uuid", "p_quantity" numeric, "p_movement_type" character varying, "p_allow_negative" boolean DEFAULT false) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  current_balance DECIMAL;
  new_balance DECIMAL;
BEGIN
  -- Get current balance
  current_balance := inventario.get_current_balance(p_product_id, p_location_id);

  -- Calculate new balance based on movement type
  new_balance := CASE p_movement_type
    WHEN 'IN' THEN current_balance + p_quantity
    WHEN 'TRANSFER_IN' THEN current_balance + p_quantity
    WHEN 'OUT' THEN current_balance - p_quantity
    WHEN 'TRANSFER_OUT' THEN current_balance - p_quantity
    ELSE current_balance
  END;

  -- Validate non-negative balance (unless explicitly allowed)
  IF new_balance < 0 AND NOT p_allow_negative THEN
    RAISE EXCEPTION 'Insufficient inventory. Current: %, Required: %, Movement: %',
      current_balance, p_quantity, p_movement_type;
  END IF;

  RETURN new_balance;
END;
$$;


ALTER FUNCTION "inventario"."calculate_balance_after_dispatch"("p_product_id" "uuid", "p_location_id" "uuid", "p_quantity" numeric, "p_movement_type" character varying, "p_allow_negative" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "inventario"."confirm_pending_transfer"("p_movement_in_id" "uuid", "p_confirmed_by" "uuid" DEFAULT NULL::"uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_movement_out_id UUID;
  v_product_id UUID;
  v_quantity DECIMAL;
  v_location_id_from UUID;
  v_location_id_to UUID;
  v_confirmed_by UUID;
  v_movement_in RECORD;
  v_balance_after_from DECIMAL;
  v_balance_after_to DECIMAL;
BEGIN
  -- Get confirmed_by
  v_confirmed_by := COALESCE(p_confirmed_by, auth.uid());
  IF v_confirmed_by IS NULL THEN
    RAISE EXCEPTION 'confirmed_by is required';
  END IF;

  -- Get the TRANSFER_IN movement
  SELECT * INTO v_movement_in
  FROM inventario.inventory_movements
  WHERE id = p_movement_in_id
    AND movement_type = 'TRANSFER_IN'
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending TRANSFER_IN movement not found: %', p_movement_in_id;
  END IF;

  -- Get linked TRANSFER_OUT movement
  v_movement_out_id := v_movement_in.linked_movement_id;
  IF v_movement_out_id IS NULL THEN
    RAISE EXCEPTION 'Linked TRANSFER_OUT movement not found';
  END IF;

  -- Extract movement details
  v_product_id := v_movement_in.product_id;
  v_quantity := v_movement_in.quantity;
  v_location_id_from := v_movement_in.location_id_from;
  v_location_id_to := v_movement_in.location_id_to;

  -- Update balance at FROM location (subtract)
  PERFORM inventario.update_inventory_balance(
    v_product_id,
    v_location_id_from,
    v_quantity,
    'TRANSFER_OUT',
    v_movement_out_id
  );

  -- Get new balance at FROM location
  SELECT quantity_on_hand INTO v_balance_after_from
  FROM inventario.inventory_balances
  WHERE product_id = v_product_id AND location_id = v_location_id_from;

  -- Update balance at TO location (add)
  PERFORM inventario.update_inventory_balance(
    v_product_id,
    v_location_id_to,
    v_quantity,
    'TRANSFER_IN',
    p_movement_in_id
  );

  -- Get new balance at TO location
  SELECT quantity_on_hand INTO v_balance_after_to
  FROM inventario.inventory_balances
  WHERE product_id = v_product_id AND location_id = v_location_id_to;

  -- Update TRANSFER_OUT movement status
  UPDATE inventario.inventory_movements
  SET status = 'completed',
      balance_after = v_balance_after_from,
      received_at = NOW(),
      received_by = v_confirmed_by
  WHERE id = v_movement_out_id;

  -- Update TRANSFER_IN movement status
  UPDATE inventario.inventory_movements
  SET status = 'completed',
      balance_after = v_balance_after_to,
      received_at = NOW(),
      received_by = v_confirmed_by
  WHERE id = p_movement_in_id;

  RETURN json_build_object(
    'success', true,
    'movement_in_id', p_movement_in_id,
    'movement_out_id', v_movement_out_id,
    'status', 'completed',
    'balance_after_from', v_balance_after_from,
    'balance_after_to', v_balance_after_to
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error confirming transfer: %', SQLERRM;
END;
$$;


ALTER FUNCTION "inventario"."confirm_pending_transfer"("p_movement_in_id" "uuid", "p_confirmed_by" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "inventario"."confirm_pending_transfer"("p_movement_in_id" "uuid", "p_confirmed_by" "uuid") IS 'Confirms a pending transfer and updates balances at both locations.';



CREATE OR REPLACE FUNCTION "inventario"."create_pending_return"("p_product_id" "uuid", "p_quantity" numeric, "p_location_id_from" "uuid", "p_location_id_to" "uuid", "p_reference_id" "uuid" DEFAULT NULL::"uuid", "p_reference_type" character varying DEFAULT 'material_return'::character varying, "p_notes" "text" DEFAULT NULL::"text", "p_recorded_by" "uuid" DEFAULT NULL::"uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_movement_out_id UUID;
  v_movement_in_id UUID;
  v_movement_number_out VARCHAR;
  v_movement_number_in VARCHAR;
  v_unit_of_measure VARCHAR;
  v_current_balance DECIMAL;
  v_actual_recorded_by UUID;
BEGIN
  -- Validate locations
  IF p_location_id_from IS NULL OR p_location_id_to IS NULL THEN
    RAISE EXCEPTION 'Both location_id_from and location_id_to are required';
  END IF;

  IF p_location_id_from = p_location_id_to THEN
    RAISE EXCEPTION 'Cannot return to the same location';
  END IF;

  -- Get product unit of measure
  SELECT unit INTO v_unit_of_measure
  FROM public.products
  WHERE id = p_product_id;

  IF v_unit_of_measure IS NULL THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;

  -- Validate sufficient stock at source location (work center)
  SELECT COALESCE(quantity_on_hand, 0) INTO v_current_balance
  FROM inventario.inventory_balances
  WHERE product_id = p_product_id AND location_id = p_location_id_from;

  IF v_current_balance < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock to return: Available=%, Requested=%', v_current_balance, p_quantity;
  END IF;

  -- Get recorded_by
  v_actual_recorded_by := COALESCE(p_recorded_by, auth.uid());
  IF v_actual_recorded_by IS NULL THEN
    RAISE EXCEPTION 'recorded_by is required';
  END IF;

  -- Generate movement numbers
  v_movement_number_out := inventario.generate_movement_number();
  v_movement_number_in := inventario.generate_movement_number();

  -- Create TRANSFER_OUT movement (pending return from work center)
  INSERT INTO inventario.inventory_movements (
    id,
    movement_number,
    product_id,
    quantity,
    unit_of_measure,
    movement_type,
    reason_type,
    location_id_from,
    location_id_to,
    balance_after,
    reference_id,
    reference_type,
    notes,
    recorded_by,
    movement_date,
    status
  ) VALUES (
    gen_random_uuid(),
    v_movement_number_out,
    p_product_id,
    p_quantity,
    v_unit_of_measure,
    'TRANSFER_OUT',
    'return',
    p_location_id_from,
    p_location_id_to,
    NULL, -- Balance will be calculated on acceptance
    p_reference_id,
    p_reference_type,
    'Return OUT (pending approval): ' || COALESCE(p_notes, ''),
    v_actual_recorded_by,
    NOW(),
    'pending'
  ) RETURNING id INTO v_movement_out_id;

  -- Create TRANSFER_IN movement (pending return to warehouse)
  INSERT INTO inventario.inventory_movements (
    id,
    movement_number,
    product_id,
    quantity,
    unit_of_measure,
    movement_type,
    reason_type,
    location_id_from,
    location_id_to,
    balance_after,
    reference_id,
    reference_type,
    notes,
    recorded_by,
    movement_date,
    status,
    linked_movement_id
  ) VALUES (
    gen_random_uuid(),
    v_movement_number_in,
    p_product_id,
    p_quantity,
    v_unit_of_measure,
    'TRANSFER_IN',
    'return',
    p_location_id_from,
    p_location_id_to,
    NULL, -- Balance will be calculated on acceptance
    p_reference_id,
    p_reference_type,
    'Return IN (pending approval): ' || COALESCE(p_notes, ''),
    v_actual_recorded_by,
    NOW(),
    'pending',
    v_movement_out_id
  ) RETURNING id INTO v_movement_in_id;

  -- Link movements together
  UPDATE inventario.inventory_movements
  SET linked_movement_id = v_movement_in_id
  WHERE id = v_movement_out_id;

  RETURN json_build_object(
    'success', true,
    'movement_out_id', v_movement_out_id,
    'movement_in_id', v_movement_in_id,
    'movement_out_number', v_movement_number_out,
    'movement_in_number', v_movement_number_in,
    'status', 'pending'
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating pending return: %', SQLERRM;
END;
$$;


ALTER FUNCTION "inventario"."create_pending_return"("p_product_id" "uuid", "p_quantity" numeric, "p_location_id_from" "uuid", "p_location_id_to" "uuid", "p_reference_id" "uuid", "p_reference_type" character varying, "p_notes" "text", "p_recorded_by" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "inventario"."create_pending_return"("p_product_id" "uuid", "p_quantity" numeric, "p_location_id_from" "uuid", "p_location_id_to" "uuid", "p_reference_id" "uuid", "p_reference_type" character varying, "p_notes" "text", "p_recorded_by" "uuid") IS 'Creates a return in pending status. Balance is NOT updated until warehouse accepts.';



CREATE OR REPLACE FUNCTION "inventario"."create_pending_transfer"("p_product_id" "uuid", "p_quantity" numeric, "p_location_id_from" "uuid", "p_location_id_to" "uuid", "p_reference_id" "uuid" DEFAULT NULL::"uuid", "p_reference_type" character varying DEFAULT NULL::character varying, "p_notes" "text" DEFAULT NULL::"text", "p_recorded_by" "uuid" DEFAULT NULL::"uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_movement_out_id UUID;
  v_movement_in_id UUID;
  v_movement_number_out VARCHAR;
  v_movement_number_in VARCHAR;
  v_unit_of_measure VARCHAR;
  v_current_balance DECIMAL;
  v_actual_recorded_by UUID;
BEGIN
  -- Validate locations
  IF p_location_id_from IS NULL OR p_location_id_to IS NULL THEN
    RAISE EXCEPTION 'Both location_id_from and location_id_to are required';
  END IF;

  IF p_location_id_from = p_location_id_to THEN
    RAISE EXCEPTION 'Cannot transfer to the same location';
  END IF;

  -- Get product unit of measure
  SELECT unit INTO v_unit_of_measure
  FROM public.products
  WHERE id = p_product_id;

  IF v_unit_of_measure IS NULL THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;

  -- Validate sufficient stock at source location
  SELECT COALESCE(quantity_on_hand, 0) INTO v_current_balance
  FROM inventario.inventory_balances
  WHERE product_id = p_product_id AND location_id = p_location_id_from;

  IF v_current_balance < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock: Available=%, Requested=%', v_current_balance, p_quantity;
  END IF;

  -- Get recorded_by
  v_actual_recorded_by := COALESCE(p_recorded_by, auth.uid());
  IF v_actual_recorded_by IS NULL THEN
    RAISE EXCEPTION 'recorded_by is required';
  END IF;

  -- Generate movement numbers
  v_movement_number_out := inventario.generate_movement_number();
  v_movement_number_in := inventario.generate_movement_number();

  -- Create TRANSFER_OUT movement (pending) with NULL balance
  INSERT INTO inventario.inventory_movements (
    id,
    movement_number,
    product_id,
    quantity,
    unit_of_measure,
    movement_type,
    reason_type,
    location_id_from,
    location_id_to,
    balance_after,
    reference_id,
    reference_type,
    notes,
    recorded_by,
    movement_date,
    status
  ) VALUES (
    gen_random_uuid(),
    v_movement_number_out,
    p_product_id,
    p_quantity,
    v_unit_of_measure,
    'TRANSFER_OUT',
    'transfer',
    p_location_id_from,
    p_location_id_to,
    NULL, -- Balance will be calculated on confirmation
    p_reference_id,
    p_reference_type,
    'Transfer OUT (pending): ' || COALESCE(p_notes, ''),
    v_actual_recorded_by,
    NOW(),
    'pending'
  ) RETURNING id INTO v_movement_out_id;

  -- Create TRANSFER_IN movement (pending) with NULL balance
  INSERT INTO inventario.inventory_movements (
    id,
    movement_number,
    product_id,
    quantity,
    unit_of_measure,
    movement_type,
    reason_type,
    location_id_from,
    location_id_to,
    balance_after,
    reference_id,
    reference_type,
    notes,
    recorded_by,
    movement_date,
    status,
    linked_movement_id
  ) VALUES (
    gen_random_uuid(),
    v_movement_number_in,
    p_product_id,
    p_quantity,
    v_unit_of_measure,
    'TRANSFER_IN',
    'transfer',
    p_location_id_from,
    p_location_id_to,
    NULL, -- Balance will be calculated on confirmation
    p_reference_id,
    p_reference_type,
    'Transfer IN (pending): ' || COALESCE(p_notes, ''),
    v_actual_recorded_by,
    NOW(),
    'pending',
    v_movement_out_id
  ) RETURNING id INTO v_movement_in_id;

  -- Link movements together
  UPDATE inventario.inventory_movements
  SET linked_movement_id = v_movement_in_id
  WHERE id = v_movement_out_id;

  RETURN json_build_object(
    'success', true,
    'movement_out_id', v_movement_out_id,
    'movement_in_id', v_movement_in_id,
    'movement_out_number', v_movement_number_out,
    'movement_in_number', v_movement_number_in,
    'status', 'pending'
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating pending transfer: %', SQLERRM;
END;
$$;


ALTER FUNCTION "inventario"."create_pending_transfer"("p_product_id" "uuid", "p_quantity" numeric, "p_location_id_from" "uuid", "p_location_id_to" "uuid", "p_reference_id" "uuid", "p_reference_type" character varying, "p_notes" "text", "p_recorded_by" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "inventario"."create_pending_transfer"("p_product_id" "uuid", "p_quantity" numeric, "p_location_id_from" "uuid", "p_location_id_to" "uuid", "p_reference_id" "uuid", "p_reference_type" character varying, "p_notes" "text", "p_recorded_by" "uuid") IS 'Creates a transfer in pending status. Balance is NULL until confirmation.';



CREATE OR REPLACE FUNCTION "inventario"."generate_movement_number"() RETURNS character varying
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  next_number INTEGER;
  year_part VARCHAR;
BEGIN
  next_number := nextval('inventario.movement_number_seq');
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');

  RETURN 'MOV-' || year_part || '-' || LPAD(next_number::TEXT, 5, '0');
END;
$$;


ALTER FUNCTION "inventario"."generate_movement_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "inventario"."get_current_balance"("p_product_id" "uuid", "p_location_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  current_balance DECIMAL;
BEGIN
  SELECT COALESCE(quantity_on_hand, 0) INTO current_balance
  FROM inventario.inventory_balances
  WHERE product_id = p_product_id
    AND location_id = p_location_id;

  RETURN COALESCE(current_balance, 0);
END;
$$;


ALTER FUNCTION "inventario"."get_current_balance"("p_product_id" "uuid", "p_location_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "inventario"."get_default_location"("p_reason_type" character varying) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  default_location_code VARCHAR;
  location_id UUID;
BEGIN
  -- Map reason to default location
  default_location_code := CASE p_reason_type
    WHEN 'purchase' THEN 'WH1-RECEIVING'
    WHEN 'production' THEN 'Z2-PROD-GENERAL'
    WHEN 'return' THEN 'WH1-GENERAL'
    WHEN 'adjustment' THEN 'WH1-GENERAL'
    WHEN 'initial' THEN 'WH1-GENERAL'
    ELSE 'WH1-GENERAL'
  END;

  -- Get location ID
  SELECT id INTO location_id
  FROM inventario.locations
  WHERE code = default_location_code
  LIMIT 1;

  IF location_id IS NULL THEN
    RAISE EXCEPTION 'Default location % not found', default_location_code;
  END IF;

  RETURN location_id;
END;
$$;


ALTER FUNCTION "inventario"."get_default_location"("p_reason_type" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "inventario"."get_pending_returns"() RETURNS TABLE("movement_id" "uuid", "movement_number" character varying, "product_id" "uuid", "product_name" character varying, "quantity" numeric, "unit_of_measure" character varying, "location_from_id" "uuid", "location_from_name" character varying, "requested_by" "uuid", "requested_at" timestamp with time zone, "notes" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.movement_number,
    m.product_id,
    p.name,
    m.quantity,
    m.unit_of_measure,
    m.location_id_from,
    l.name,
    m.recorded_by,
    m.movement_date,
    m.notes
  FROM inventario.inventory_movements m
  JOIN public.products p ON m.product_id = p.id
  LEFT JOIN inventario.locations l ON m.location_id_from = l.id
  WHERE m.movement_type = 'TRANSFER_IN'
    AND m.reason_type = 'return'
    AND m.status = 'pending'
  ORDER BY m.movement_date DESC;
END;
$$;


ALTER FUNCTION "inventario"."get_pending_returns"() OWNER TO "postgres";


COMMENT ON FUNCTION "inventario"."get_pending_returns"() IS 'Gets all pending returns awaiting warehouse approval.';



CREATE OR REPLACE FUNCTION "inventario"."get_pending_transfers_for_location"("p_location_id" "uuid") RETURNS TABLE("movement_id" "uuid", "movement_number" character varying, "product_id" "uuid", "product_name" character varying, "quantity" numeric, "unit_of_measure" character varying, "location_from_id" "uuid", "location_from_name" character varying, "requested_by" "uuid", "requested_at" timestamp with time zone, "notes" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.movement_number,
    m.product_id,
    p.name,
    m.quantity,
    m.unit_of_measure,
    m.location_id_from,
    l.name,
    m.recorded_by,
    m.movement_date,
    m.notes
  FROM inventario.inventory_movements m
  JOIN public.products p ON m.product_id = p.id
  LEFT JOIN inventario.locations l ON m.location_id_from = l.id
  WHERE m.location_id_to = p_location_id
    AND m.movement_type = 'TRANSFER_IN'
    AND m.status = 'pending'
  ORDER BY m.movement_date DESC;
END;
$$;


ALTER FUNCTION "inventario"."get_pending_transfers_for_location"("p_location_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "inventario"."get_pending_transfers_for_location"("p_location_id" "uuid") IS 'Gets all pending incoming transfers for a location (work center).';



CREATE OR REPLACE FUNCTION "inventario"."get_product_balance_by_location"("p_product_id" "uuid") RETURNS TABLE("location_id" "uuid", "location_code" character varying, "location_name" character varying, "quantity_on_hand" numeric, "last_updated_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.location_id,
    l.code,
    l.name,
    b.quantity_on_hand,
    b.last_updated_at
  FROM inventario.inventory_balances b
  JOIN inventario.locations l ON b.location_id = l.id
  WHERE b.product_id = p_product_id
    AND b.quantity_on_hand > 0
  ORDER BY b.quantity_on_hand DESC;
END;
$$;


ALTER FUNCTION "inventario"."get_product_balance_by_location"("p_product_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "inventario"."get_product_balance_by_location"("p_product_id" "uuid") IS 'Returns inventory balance breakdown by location';



CREATE OR REPLACE FUNCTION "inventario"."get_product_balance_total"("p_product_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  total_balance DECIMAL;
BEGIN
  SELECT COALESCE(SUM(quantity_on_hand), 0) INTO total_balance
  FROM inventario.inventory_balances
  WHERE product_id = p_product_id;

  RETURN total_balance;
END;
$$;


ALTER FUNCTION "inventario"."get_product_balance_total"("p_product_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "inventario"."get_product_balance_total"("p_product_id" "uuid") IS 'Returns total inventory balance across all locations';



CREATE OR REPLACE FUNCTION "inventario"."perform_batch_dispatch_movements"("p_order_id" "uuid", "p_order_number" character varying, "p_items" "jsonb", "p_location_id_from" "uuid", "p_notes" "text" DEFAULT NULL::"text", "p_recorded_by" "uuid" DEFAULT NULL::"uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_item JSONB;
  v_result JSON;
  v_results JSONB := '[]'::JSONB;
  v_success_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_errors JSONB := '[]'::JSONB;
BEGIN
  RAISE NOTICE 'Starting batch dispatch for order: %, items count: %', p_order_number, jsonb_array_length(p_items);

  -- Iterate over each item in the order
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    BEGIN
      RAISE NOTICE 'Processing item: %', v_item;

      -- Perform dispatch movement for this item
      v_result := inventario.perform_dispatch_movement(
        (v_item->>'product_id')::UUID,
        (v_item->>'quantity')::DECIMAL,
        p_location_id_from,
        p_order_id,
        p_order_number,
        p_notes,
        p_recorded_by
      );

      -- Check if movement was successful
      IF (v_result->>'success')::BOOLEAN THEN
        v_success_count := v_success_count + 1;
        RAISE NOTICE 'Item processed successfully: %', v_item->>'product_id';
      ELSE
        v_error_count := v_error_count + 1;
        v_errors := v_errors || jsonb_build_object(
          'product_id', v_item->>'product_id',
          'error', v_result->>'error'
        );
        RAISE NOTICE 'Item failed: %, error: %', v_item->>'product_id', v_result->>'error';
      END IF;

      -- Add result to results array
      v_results := v_results || jsonb_build_object(
        'product_id', v_item->>'product_id',
        'result', v_result
      );

    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Exception processing item: %, error: %', v_item, SQLERRM;
        v_errors := v_errors || jsonb_build_object(
          'product_id', v_item->>'product_id',
          'error', SQLERRM
        );
        v_error_count := v_error_count + 1;
    END;
  END LOOP;

  RAISE NOTICE 'Batch dispatch completed: success=%, errors=%', v_success_count, v_error_count;

  -- Return summary
  RETURN json_build_object(
    'success', v_error_count = 0,
    'total_items', jsonb_array_length(p_items),
    'success_count', v_success_count,
    'error_count', v_error_count,
    'results', v_results,
    'errors', v_errors
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ERROR in batch dispatch: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'total_items', jsonb_array_length(p_items),
      'success_count', v_success_count,
      'error_count', v_error_count
    );
END;
$$;


ALTER FUNCTION "inventario"."perform_batch_dispatch_movements"("p_order_id" "uuid", "p_order_number" character varying, "p_items" "jsonb", "p_location_id_from" "uuid", "p_notes" "text", "p_recorded_by" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "inventario"."perform_batch_dispatch_movements"("p_order_id" "uuid", "p_order_number" character varying, "p_items" "jsonb", "p_location_id_from" "uuid", "p_notes" "text", "p_recorded_by" "uuid") IS 'Creates multiple inventory movements for a batch of order items with detailed error reporting';



CREATE OR REPLACE FUNCTION "inventario"."perform_dispatch_movement"("p_product_id" "uuid", "p_quantity" numeric, "p_location_id_from" "uuid", "p_order_id" "uuid", "p_order_number" character varying, "p_notes" "text" DEFAULT NULL::"text", "p_recorded_by" "uuid" DEFAULT NULL::"uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_movement_id UUID;
  v_balance_after DECIMAL;
  v_movement_number VARCHAR;
  v_unit_of_measure VARCHAR;
  v_actual_recorded_by UUID;
  v_allow_negative BOOLEAN;
  v_current_balance DECIMAL;
BEGIN
  RAISE NOTICE 'Starting dispatch movement for product: %, quantity: %', p_product_id, p_quantity;

  -- 1. Get dispatch configuration
  SELECT allow_dispatch_without_inventory INTO v_allow_negative
  FROM public.dispatch_inventory_config
  WHERE id = '00000000-0000-0000-0000-000000000000'::UUID;

  v_allow_negative := COALESCE(v_allow_negative, false);
  RAISE NOTICE 'Allow negative balance: %', v_allow_negative;

  -- 2. Validate location
  IF p_location_id_from IS NULL THEN
    RAISE EXCEPTION 'location_id_from is required for dispatch movements';
  END IF;

  -- 3. Get product unit of measure
  SELECT unit INTO v_unit_of_measure
  FROM public.products
  WHERE id = p_product_id;

  IF v_unit_of_measure IS NULL THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;

  RAISE NOTICE 'Product unit: %', v_unit_of_measure;

  -- 4. Get current balance
  v_current_balance := inventario.get_current_balance(p_product_id, p_location_id_from);
  RAISE NOTICE 'Current balance: %', v_current_balance;

  -- 5. Calculate balance after movement (allows negative if configured)
  v_balance_after := inventario.calculate_balance_after_dispatch(
    p_product_id,
    p_location_id_from,
    p_quantity,
    'OUT',
    v_allow_negative
  );
  RAISE NOTICE 'Balance after: %', v_balance_after;

  -- 6. Generate movement number
  v_movement_number := inventario.generate_movement_number();
  RAISE NOTICE 'Movement number: %', v_movement_number;

  -- 7. Get recorded_by
  v_actual_recorded_by := COALESCE(p_recorded_by, auth.uid());
  IF v_actual_recorded_by IS NULL THEN
    RAISE EXCEPTION 'recorded_by is required (no authenticated user found)';
  END IF;
  RAISE NOTICE 'Recorded by: %', v_actual_recorded_by;

  -- 8. Insert movement
  INSERT INTO inventario.inventory_movements (
    id,
    movement_number,
    product_id,
    quantity,
    unit_of_measure,
    movement_type,
    reason_type,
    location_id_from,
    location_id_to,
    balance_after,
    reference_id,
    reference_type,
    notes,
    recorded_by,
    movement_date
  ) VALUES (
    gen_random_uuid(),
    v_movement_number,
    p_product_id,
    p_quantity,
    v_unit_of_measure,
    'OUT',
    'sale',
    p_location_id_from,
    NULL,
    v_balance_after,
    p_order_id,
    'dispatch',
    'Dispatch - Order: ' || p_order_number || COALESCE(' - ' || p_notes, ''),
    v_actual_recorded_by,
    NOW()
  ) RETURNING id INTO v_movement_id;

  RAISE NOTICE 'Movement inserted with ID: %', v_movement_id;

  -- 9. Update balance (allows negative)
  PERFORM inventario.update_inventory_balance_dispatch(
    p_product_id,
    p_location_id_from,
    p_quantity,
    'OUT',
    v_movement_id
  );

  RAISE NOTICE 'Balance updated successfully';

  -- 10. Return result
  RETURN json_build_object(
    'success', true,
    'movement_id', v_movement_id,
    'movement_number', v_movement_number,
    'balance_before', v_current_balance,
    'balance_after', v_balance_after,
    'allowed_negative', v_allow_negative
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ERROR in perform_dispatch_movement: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE
    );
END;
$$;


ALTER FUNCTION "inventario"."perform_dispatch_movement"("p_product_id" "uuid", "p_quantity" numeric, "p_location_id_from" "uuid", "p_order_id" "uuid", "p_order_number" character varying, "p_notes" "text", "p_recorded_by" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "inventario"."perform_dispatch_movement"("p_product_id" "uuid", "p_quantity" numeric, "p_location_id_from" "uuid", "p_order_id" "uuid", "p_order_number" character varying, "p_notes" "text", "p_recorded_by" "uuid") IS 'Creates inventory OUT movement for dispatched order item with enhanced error handling and logging';



CREATE OR REPLACE FUNCTION "inventario"."perform_inventory_movement"("p_product_id" "uuid", "p_quantity" numeric, "p_movement_type" character varying, "p_reason_type" character varying, "p_location_id_from" "uuid" DEFAULT NULL::"uuid", "p_location_id_to" "uuid" DEFAULT NULL::"uuid", "p_reference_id" "uuid" DEFAULT NULL::"uuid", "p_reference_type" character varying DEFAULT NULL::character varying, "p_notes" "text" DEFAULT NULL::"text", "p_recorded_by" "uuid" DEFAULT NULL::"uuid", "p_batch_number" character varying DEFAULT NULL::character varying, "p_expiry_date" "date" DEFAULT NULL::"date") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_movement_id UUID;
  v_balance_after DECIMAL;
  v_movement_number VARCHAR;
  v_unit_of_measure VARCHAR;
  v_affected_location UUID;
  v_balance_update_location UUID;
  v_actual_recorded_by UUID;
BEGIN
  -- 1. Validate movement type
  IF p_movement_type NOT IN ('IN', 'OUT', 'TRANSFER_IN', 'TRANSFER_OUT') THEN
    RAISE EXCEPTION 'Invalid movement_type: %', p_movement_type;
  END IF;

  -- 2. Validate reason type
  IF p_reason_type NOT IN ('purchase', 'production', 'sale', 'consumption', 'adjustment', 'return', 'waste', 'transfer', 'initial') THEN
    RAISE EXCEPTION 'Invalid reason_type: %', p_reason_type;
  END IF;

  -- 3. Assign default location FIRST (before validation)
  IF p_location_id_to IS NULL AND p_movement_type IN ('IN', 'TRANSFER_IN') THEN
    p_location_id_to := inventario.get_default_location(p_reason_type);
  END IF;

  -- 4. Now validate locations (after defaults have been assigned)
  IF p_movement_type = 'IN' AND p_location_id_to IS NULL THEN
    RAISE EXCEPTION 'Movement type IN requires location_id_to and no default location found';
  END IF;

  IF p_movement_type = 'OUT' AND p_location_id_from IS NULL THEN
    RAISE EXCEPTION 'Movement type OUT requires location_id_from';
  END IF;

  IF p_movement_type IN ('TRANSFER_IN', 'TRANSFER_OUT') AND (p_location_id_from IS NULL OR p_location_id_to IS NULL) THEN
    RAISE EXCEPTION 'Transfer movements require both location_id_from and location_id_to';
  END IF;

  -- 5. Get product unit of measure
  SELECT unit INTO v_unit_of_measure
  FROM public.products
  WHERE id = p_product_id;

  IF v_unit_of_measure IS NULL THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;

  -- 6. Determine affected location for BALANCE CHECKING (validation)
  v_affected_location := CASE p_movement_type
    WHEN 'OUT' THEN p_location_id_from
    WHEN 'TRANSFER_OUT' THEN p_location_id_from
    WHEN 'IN' THEN p_location_id_to
    WHEN 'TRANSFER_IN' THEN p_location_id_to
    ELSE COALESCE(p_location_id_to, p_location_id_from)
  END;

  -- 7. Calculate balance after movement (for validation and recording)
  v_balance_after := inventario.calculate_balance_after(
    p_product_id,
    v_affected_location,
    p_quantity,
    p_movement_type
  );

  -- 8. Generate movement number
  v_movement_number := inventario.generate_movement_number();

  -- 9. Get recorded_by (use provided or auth.uid())
  v_actual_recorded_by := COALESCE(p_recorded_by, auth.uid());

  IF v_actual_recorded_by IS NULL THEN
    RAISE EXCEPTION 'recorded_by is required (no authenticated user found)';
  END IF;

  -- 10. Insert movement with batch and expiry info
  INSERT INTO inventario.inventory_movements (
    id,
    movement_number,
    product_id,
    quantity,
    unit_of_measure,
    movement_type,
    reason_type,
    location_id_from,
    location_id_to,
    balance_after,
    reference_id,
    reference_type,
    notes,
    recorded_by,
    movement_date,
    batch_number,
    expiry_date
  ) VALUES (
    gen_random_uuid(),
    v_movement_number,
    p_product_id,
    p_quantity,
    v_unit_of_measure,
    p_movement_type,
    p_reason_type,
    p_location_id_from,
    p_location_id_to,
    v_balance_after,
    p_reference_id,
    p_reference_type,
    p_notes,
    v_actual_recorded_by,
    NOW(),
    p_batch_number,
    p_expiry_date
  ) RETURNING id INTO v_movement_id;

  -- 11. Determine which location to update for BALANCE UPDATE
  v_balance_update_location := CASE p_movement_type
    WHEN 'OUT' THEN p_location_id_from
    WHEN 'TRANSFER_OUT' THEN p_location_id_from
    WHEN 'IN' THEN p_location_id_to
    WHEN 'TRANSFER_IN' THEN p_location_id_to
    ELSE v_affected_location
  END;

  -- 12. Update balance at the correct location (skip if status is pending)
  PERFORM inventario.update_inventory_balance(
    p_product_id,
    v_balance_update_location,
    p_quantity,
    p_movement_type,
    v_movement_id
  );

  -- 13. Return result
  RETURN json_build_object(
    'success', true,
    'movement_id', v_movement_id,
    'movement_number', v_movement_number,
    'balance_after', v_balance_after,
    'affected_location', v_affected_location
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating movement: %', SQLERRM;
END;
$$;


ALTER FUNCTION "inventario"."perform_inventory_movement"("p_product_id" "uuid", "p_quantity" numeric, "p_movement_type" character varying, "p_reason_type" character varying, "p_location_id_from" "uuid", "p_location_id_to" "uuid", "p_reference_id" "uuid", "p_reference_type" character varying, "p_notes" "text", "p_recorded_by" "uuid", "p_batch_number" character varying, "p_expiry_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "inventario"."perform_inventory_movement"("p_product_id" "uuid", "p_quantity" numeric, "p_movement_type" character varying, "p_reason_type" character varying, "p_location_id_from" "uuid", "p_location_id_to" "uuid", "p_reference_id" "uuid", "p_reference_type" character varying, "p_notes" "text", "p_recorded_by" "uuid", "p_batch_number" character varying, "p_expiry_date" "date") IS 'Core function to create inventory movements. Assigns default location before validation.';



CREATE OR REPLACE FUNCTION "inventario"."perform_transfer"("p_product_id" "uuid", "p_quantity" numeric, "p_location_id_from" "uuid", "p_location_id_to" "uuid", "p_reference_id" "uuid" DEFAULT NULL::"uuid", "p_reference_type" character varying DEFAULT NULL::character varying, "p_notes" "text" DEFAULT NULL::"text", "p_recorded_by" "uuid" DEFAULT NULL::"uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_movement_out_id UUID;
  v_movement_in_id UUID;
  v_result_out JSON;
  v_result_in JSON;
BEGIN
  -- Validate locations
  IF p_location_id_from IS NULL OR p_location_id_to IS NULL THEN
    RAISE EXCEPTION 'Both location_id_from and location_id_to are required for transfers';
  END IF;

  IF p_location_id_from = p_location_id_to THEN
    RAISE EXCEPTION 'Cannot transfer to the same location';
  END IF;

  -- 1. Create TRANSFER_OUT movement (updates balance immediately)
  v_result_out := inventario.perform_inventory_movement(
    p_product_id,
    p_quantity,
    'TRANSFER_OUT',
    'transfer',
    p_location_id_from,
    p_location_id_to,
    p_reference_id,
    p_reference_type,
    'Transfer OUT: ' || COALESCE(p_notes, ''),
    p_recorded_by
  );
  v_movement_out_id := (v_result_out->>'movement_id')::UUID;

  -- 2. Create TRANSFER_IN movement (updates balance immediately)
  v_result_in := inventario.perform_inventory_movement(
    p_product_id,
    p_quantity,
    'TRANSFER_IN',
    'transfer',
    p_location_id_from,
    p_location_id_to,
    p_reference_id,
    p_reference_type,
    'Transfer IN: ' || COALESCE(p_notes, ''),
    p_recorded_by
  );
  v_movement_in_id := (v_result_in->>'movement_id')::UUID;

  -- 3. Link movements together
  UPDATE inventario.inventory_movements
  SET linked_movement_id = v_movement_in_id
  WHERE id = v_movement_out_id;

  UPDATE inventario.inventory_movements
  SET linked_movement_id = v_movement_out_id
  WHERE id = v_movement_in_id;

  -- 4. Return result
  RETURN json_build_object(
    'success', true,
    'movement_out_id', v_movement_out_id,
    'movement_in_id', v_movement_in_id,
    'movement_out_number', v_result_out->>'movement_number',
    'movement_in_number', v_result_in->>'movement_number',
    'balance_after_from', v_result_out->>'balance_after',
    'balance_after_to', v_result_in->>'balance_after'
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating transfer: %', SQLERRM;
END;
$$;


ALTER FUNCTION "inventario"."perform_transfer"("p_product_id" "uuid", "p_quantity" numeric, "p_location_id_from" "uuid", "p_location_id_to" "uuid", "p_reference_id" "uuid", "p_reference_type" character varying, "p_notes" "text", "p_recorded_by" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "inventario"."perform_transfer"("p_product_id" "uuid", "p_quantity" numeric, "p_location_id_from" "uuid", "p_location_id_to" "uuid", "p_reference_id" "uuid", "p_reference_type" character varying, "p_notes" "text", "p_recorded_by" "uuid") IS 'Performs an immediate transfer between two locations. Creates TRANSFER_OUT and TRANSFER_IN movements atomically.';



CREATE OR REPLACE FUNCTION "inventario"."update_inventory_balance"("p_product_id" "uuid", "p_location_id" "uuid", "p_quantity" numeric, "p_movement_type" character varying, "p_movement_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  quantity_delta DECIMAL;
  current_balance DECIMAL;
  new_balance DECIMAL;
  v_product_name VARCHAR;
BEGIN
  -- Calculate delta based on movement type
  quantity_delta := CASE p_movement_type
    WHEN 'IN' THEN p_quantity
    WHEN 'TRANSFER_IN' THEN p_quantity
    WHEN 'OUT' THEN -p_quantity
    WHEN 'TRANSFER_OUT' THEN -p_quantity
    ELSE 0
  END;

  -- Get current balance (will be NULL if no balance exists)
  SELECT quantity_on_hand INTO current_balance
  FROM inventario.inventory_balances
  WHERE product_id = p_product_id AND location_id = p_location_id;

  -- If no balance exists, current_balance is NULL, treat as 0
  current_balance := COALESCE(current_balance, 0);

  -- Calculate new balance
  new_balance := current_balance + quantity_delta;

  RAISE NOTICE 'UPDATE_BALANCE: type=%, current=%, delta=%, new=%',
    p_movement_type, current_balance, quantity_delta, new_balance;

  -- Validate: Cannot create negative balance
  IF new_balance < 0 THEN
    -- Get product name for error message
    SELECT name INTO v_product_name
    FROM public.products
    WHERE id = p_product_id;

    RAISE EXCEPTION 'Insufficient stock for product "%": Available=%, Requested=%, Deficit=%',
      COALESCE(v_product_name, p_product_id::TEXT),
      current_balance,
      ABS(quantity_delta),
      ABS(new_balance);
  END IF;

  -- Upsert balance
  INSERT INTO inventario.inventory_balances (
    product_id,
    location_id,
    quantity_on_hand,
    last_movement_id,
    last_updated_at
  ) VALUES (
    p_product_id,
    p_location_id,
    new_balance,  -- ✅ FIX: Use new_balance instead of quantity_delta
    p_movement_id,
    NOW()
  )
  ON CONFLICT (product_id, location_id)
  DO UPDATE SET
    quantity_on_hand = EXCLUDED.quantity_on_hand,  -- ✅ FIX: Use the calculated new_balance
    last_movement_id = p_movement_id,
    last_updated_at = NOW();

  RAISE NOTICE 'UPDATE_BALANCE: Success';
END;
$$;


ALTER FUNCTION "inventario"."update_inventory_balance"("p_product_id" "uuid", "p_location_id" "uuid", "p_quantity" numeric, "p_movement_type" character varying, "p_movement_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "inventario"."update_inventory_balance"("p_product_id" "uuid", "p_location_id" "uuid", "p_quantity" numeric, "p_movement_type" character varying, "p_movement_id" "uuid") IS 'Updates inventory balance with proper validation. Prevents negative balances by checking before insert/update.';



CREATE OR REPLACE FUNCTION "inventario"."update_inventory_balance_dispatch"("p_product_id" "uuid", "p_location_id" "uuid", "p_quantity" numeric, "p_movement_type" character varying, "p_movement_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  quantity_delta DECIMAL;
BEGIN
  -- Calculate delta based on movement type
  quantity_delta := CASE p_movement_type
    WHEN 'IN' THEN p_quantity
    WHEN 'TRANSFER_IN' THEN p_quantity
    WHEN 'OUT' THEN -p_quantity
    WHEN 'TRANSFER_OUT' THEN -p_quantity
    ELSE 0
  END;

  -- Upsert balance (NO constraint on negative values)
  INSERT INTO inventario.inventory_balances (
    product_id,
    location_id,
    quantity_on_hand,
    last_movement_id,
    last_updated_at
  ) VALUES (
    p_product_id,
    p_location_id,
    quantity_delta,
    p_movement_id,
    NOW()
  )
  ON CONFLICT (product_id, location_id)
  DO UPDATE SET
    quantity_on_hand = inventario.inventory_balances.quantity_on_hand + quantity_delta,
    last_movement_id = p_movement_id,
    last_updated_at = NOW();
END;
$$;


ALTER FUNCTION "inventario"."update_inventory_balance_dispatch"("p_product_id" "uuid", "p_location_id" "uuid", "p_quantity" numeric, "p_movement_type" character varying, "p_movement_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "inventario"."update_location_path"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  parent_path TEXT;
BEGIN
  IF NEW.parent_id IS NULL THEN
    -- Warehouse level: path = /code
    NEW.path := '/' || NEW.code;
  ELSE
    -- Get parent path
    SELECT path INTO parent_path
    FROM inventario.locations
    WHERE id = NEW.parent_id;

    -- Build path: parent_path/code
    NEW.path := parent_path || '/' || NEW.code;
  END IF;

  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$;


ALTER FUNCTION "inventario"."update_location_path"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "produccion"."calculate_daily_balance"("p_product_id" "uuid", "p_date" "date", "p_initial_balance" integer) RETURNS TABLE("balance_date" "date", "opening_balance" integer, "planned_production" integer, "forecast_demand" integer, "closing_balance" integer, "is_deficit" boolean)
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  v_production INTEGER;
  v_demand INTEGER;
  v_closing INTEGER;
BEGIN
  -- Get planned production for this date
  SELECT COALESCE(SUM(ps.quantity), 0)::INTEGER
  INTO v_production
  FROM produccion.production_schedules ps
  WHERE ps.product_id = p_product_id::TEXT
    AND ps.start_date::DATE = p_date;

  -- Get forecast demand for this date
  v_demand := produccion.get_daily_forecast(
    p_product_id,
    EXTRACT(DOW FROM p_date)::INTEGER,
    p_date
  );

  -- Calculate closing balance
  v_closing := p_initial_balance + v_production - v_demand;

  RETURN QUERY SELECT
    p_date,
    p_initial_balance,
    v_production,
    v_demand,
    v_closing,
    (v_closing < 0);
END;
$$;


ALTER FUNCTION "produccion"."calculate_daily_balance"("p_product_id" "uuid", "p_date" "date", "p_initial_balance" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "produccion"."calculate_theoretical_consumption"("p_product_id" "uuid", "p_units_produced" integer) RETURNS TABLE("material_id" "uuid", "material_name" character varying, "theoretical_quantity" numeric, "unit_name" character varying)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bom.material_id,
    p.name,  -- Ahora usar products.name en lugar de materials.name
    (bom.quantity_needed * p_units_produced) as theoretical_quantity,
    bom.unit_name
  FROM produccion.bill_of_materials bom
  JOIN public.products p ON p.id = bom.material_id  -- Join con products
  WHERE bom.product_id = p_product_id 
    AND bom.is_active = true
    AND p.category = 'MP';  -- Solo materias primas
END;
$$;


ALTER FUNCTION "produccion"."calculate_theoretical_consumption"("p_product_id" "uuid", "p_units_produced" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "produccion"."calculate_theoretical_production"("p_product_id" "uuid", "p_work_center_id" "uuid", "p_start_time" timestamp without time zone, "p_end_time" timestamp without time zone DEFAULT "now"()) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  units_per_hour DECIMAL(10,2);
  hours_worked DECIMAL(10,2);
  theoretical_units DECIMAL(12,2);
BEGIN
  -- Obtener unidades por hora para el producto y centro de trabajo
  SELECT pp.units_per_hour INTO units_per_hour
  FROM produccion.production_productivity pp
  WHERE pp.product_id = p_product_id 
    AND pp.work_center_id = p_work_center_id 
    AND pp.is_active = true;
  
  IF units_per_hour IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calcular horas trabajadas
  hours_worked := EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 3600.0;
  
  -- Calcular producción teórica
  theoretical_units := units_per_hour * hours_worked;
  
  RETURN COALESCE(theoretical_units, 0);
END;
$$;


ALTER FUNCTION "produccion"."calculate_theoretical_production"("p_product_id" "uuid", "p_work_center_id" "uuid", "p_start_time" timestamp without time zone, "p_end_time" timestamp without time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "produccion"."check_schedule_conflict"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_capacity_type TEXT;
  v_max_capacity INTEGER;
  v_overlapping_count INTEGER;
BEGIN
  -- Get work center capacity info (explicit uuid cast)
  SELECT tipo_capacidad, COALESCE(capacidad_maxima_carros, 1)
  INTO v_capacity_type, v_max_capacity
  FROM produccion.work_centers
  WHERE id::uuid = NEW.resource_id::uuid;

  -- Check if this work center supports parallel operations
  IF v_capacity_type = 'carros' AND v_max_capacity > 1 THEN
    -- Count overlapping schedules (excluding the current one if updating)
    SELECT COUNT(*)
    INTO v_overlapping_count
    FROM produccion.production_schedules
    WHERE resource_id::uuid = NEW.resource_id::uuid
    AND id::uuid != COALESCE(NEW.id::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
    AND start_date < NEW.end_date
    AND end_date > NEW.start_date;

    -- Reject only if capacity is exceeded
    IF v_overlapping_count >= v_max_capacity THEN
      RAISE EXCEPTION 'Esta máquina ya tiene % programaciones simultáneas (capacidad máxima: %)',
        v_overlapping_count, v_max_capacity;
    END IF;
  ELSE
    -- Sequential operation: any overlap is rejected
    IF EXISTS (
      SELECT 1 FROM produccion.production_schedules
      WHERE resource_id::uuid = NEW.resource_id::uuid
      AND id::uuid != COALESCE(NEW.id::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
      AND start_date < NEW.end_date
      AND end_date > NEW.start_date
    ) THEN
      RAISE EXCEPTION 'Esta máquina ya tiene una programación en ese rango de fechas';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "produccion"."check_schedule_conflict"() OWNER TO "postgres";


COMMENT ON FUNCTION "produccion"."check_schedule_conflict"() IS 'Validates schedule conflicts. Allows parallel operations for work centers with tipo_capacidad=carros and capacidad_maxima_carros>1';



CREATE OR REPLACE FUNCTION "produccion"."check_schedule_conflicts"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_capacity INTEGER;
    v_count INTEGER;
BEGIN
    -- Get max capacity for this resource (default 1 for sequential)
    SELECT COALESCE(
        (SELECT capacidad_maxima_carros
         FROM produccion.work_centers
         WHERE id::text = NEW.resource_id),
        1
    ) INTO v_capacity;

    -- Count existing schedules in the same time slot
    SELECT COUNT(*) INTO v_count
    FROM produccion.production_schedules
    WHERE resource_id = NEW.resource_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND start_date < NEW.end_date
    AND end_date > NEW.start_date;

    -- Only raise error if we exceed capacity
    IF v_count >= v_capacity THEN
        RAISE EXCEPTION 'Capacidad máxima (%) alcanzada para esta máquina en ese horario', v_capacity;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "produccion"."check_schedule_conflicts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "produccion"."create_location_for_work_center"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_production_warehouse_id uuid;
  v_location_id uuid;
BEGIN
  -- Get the production warehouse
  SELECT id INTO v_production_warehouse_id
  FROM inventario.locations
  WHERE code = 'WH-PROD' AND location_type = 'warehouse';

  -- If production warehouse doesn't exist, create it
  IF v_production_warehouse_id IS NULL THEN
    INSERT INTO inventario.locations (
      code, name, location_type, parent_id, level, is_virtual, bin_type, is_active, metadata
    ) VALUES (
      'WH-PROD', 'Producción', 'warehouse', NULL, 1, false, NULL, true,
      jsonb_build_object('description', 'Bodega de producción - Centros de trabajo', 'type', 'production')
    ) RETURNING id INTO v_production_warehouse_id;
  END IF;

  -- Create a location for this work center under production warehouse
  INSERT INTO inventario.locations (
    code,
    name,
    location_type,
    parent_id,
    level,
    is_virtual,
    bin_type,
    is_active,
    metadata
  ) VALUES (
    'WC-' || NEW.code,
    NEW.name,
    'bin',
    v_production_warehouse_id,  -- Under production warehouse
    2,                           -- Level 2 (bins are under warehouses)
    false,
    'production',
    NEW.is_active,
    jsonb_build_object(
      'work_center_id', NEW.id,
      'work_center_code', NEW.code,
      'description', NEW.description
    )
  ) RETURNING id INTO v_location_id;

  -- Update the work center with the location_id
  UPDATE produccion.work_centers
  SET location_id = v_location_id
  WHERE id = NEW.id;

  RAISE NOTICE 'Created location WC-% (%) under production warehouse for work center %', 
    NEW.code, v_location_id, NEW.name;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "produccion"."create_location_for_work_center"() OWNER TO "postgres";


COMMENT ON FUNCTION "produccion"."create_location_for_work_center"() IS 'Automatically creates a bin location under the production warehouse when a work center is created';



CREATE OR REPLACE FUNCTION "produccion"."delete_production_order"("order_number" integer) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete all schedules with this order number
    DELETE FROM produccion.production_schedules
    WHERE production_order_number = order_number;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$;


ALTER FUNCTION "produccion"."delete_production_order"("order_number" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "produccion"."delete_production_order"("order_number" integer) IS 'Deletes all production schedules associated with a given production order number. Returns the count of deleted records.';



CREATE OR REPLACE FUNCTION "produccion"."get_daily_forecast"("p_product_id" "uuid", "p_day_of_week" integer, "p_target_date" "date") RETURNS integer
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  v_historical_avg DECIMAL;
  v_current_orders INTEGER;
  v_result INTEGER;
BEGIN
  -- Calculate historical average for this day of week (last 8 weeks)
  SELECT COALESCE(AVG(demand_units), 0)
  INTO v_historical_avg
  FROM produccion.daily_demand_history
  WHERE product_id = p_product_id
    AND day_of_week = p_day_of_week
    AND delivery_date BETWEEN (p_target_date - INTERVAL '8 weeks') AND (p_target_date - INTERVAL '1 day');

  -- Get actual orders for this specific date
  SELECT COALESCE(SUM(
    (COALESCE(oi.quantity_requested, 0) - COALESCE(oi.quantity_delivered, 0))
    * COALESCE(pc.units_per_package, 1)
  ), 0)::INTEGER
  INTO v_current_orders
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  LEFT JOIN public.product_config pc ON pc.product_id = oi.product_id
  WHERE oi.product_id = p_product_id
    AND o.expected_delivery_date::DATE = p_target_date
    AND o.status NOT IN ('cancelled', 'returned', 'delivered', 'partially_delivered');

  -- Return MAX(historical_average, current_orders)
  v_result := GREATEST(CEIL(v_historical_avg)::INTEGER, v_current_orders);

  RETURN v_result;
END;
$$;


ALTER FUNCTION "produccion"."get_daily_forecast"("p_product_id" "uuid", "p_day_of_week" integer, "p_target_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "produccion"."get_demand_breakdown_by_client"("p_product_id" "uuid", "p_target_date" "date") RETURNS TABLE("client_id" "uuid", "client_name" "text", "order_id" "uuid", "order_number" "text", "quantity_units" integer)
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id::UUID as client_id,
    c.name::TEXT as client_name,
    o.id::UUID as order_id,
    o.order_number::TEXT as order_number,
    ((COALESCE(oi.quantity_requested, 0) - COALESCE(oi.quantity_delivered, 0))
      * COALESCE(pc.units_per_package, 1))::INTEGER as quantity_units
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  JOIN public.clients c ON c.id = o.client_id
  LEFT JOIN public.product_config pc ON pc.product_id = oi.product_id
  WHERE oi.product_id = p_product_id
    AND o.expected_delivery_date::DATE = p_target_date
    AND o.status NOT IN ('cancelled', 'returned', 'delivered', 'partially_delivered')
    AND (COALESCE(oi.quantity_requested, 0) - COALESCE(oi.quantity_delivered, 0)) > 0
  ORDER BY c.name;
END;
$$;


ALTER FUNCTION "produccion"."get_demand_breakdown_by_client"("p_product_id" "uuid", "p_target_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "produccion"."get_next_production_order_number"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    next_number INTEGER;
BEGIN
    -- Get next value from sequence
    SELECT nextval('produccion.production_order_number_seq') INTO next_number;
    RETURN next_number;
END;
$$;


ALTER FUNCTION "produccion"."get_next_production_order_number"() OWNER TO "postgres";


COMMENT ON FUNCTION "produccion"."get_next_production_order_number"() IS 'Returns the next available production order number from the sequence.';



CREATE OR REPLACE FUNCTION "produccion"."get_production_order_schedules"("order_number" integer) RETURNS TABLE("id" "uuid", "resource_id" "text", "product_id" "text", "quantity" integer, "start_date" timestamp with time zone, "end_date" timestamp with time zone, "production_order_number" integer, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        ps.id,
        ps.resource_id,
        ps.product_id,
        ps.quantity,
        ps.start_date,
        ps.end_date,
        ps.production_order_number,
        ps.created_at,
        ps.updated_at
    FROM produccion.production_schedules ps
    WHERE ps.production_order_number = order_number
    ORDER BY ps.start_date;
END;
$$;


ALTER FUNCTION "produccion"."get_production_order_schedules"("order_number" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "produccion"."get_production_order_schedules"("order_number" integer) IS 'Returns all production schedules associated with a given production order number, ordered by start_date.';



CREATE OR REPLACE FUNCTION "produccion"."get_weekly_balance_projection"("p_product_id" "uuid", "p_week_start_date" "date") RETURNS TABLE("day_index" integer, "balance_date" "date", "day_name" "text", "opening_balance" integer, "planned_production" integer, "forecast_demand" integer, "closing_balance" integer, "is_deficit" boolean)
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  v_current_balance INTEGER;
  v_day_date DATE;
  v_production INTEGER;
  v_demand INTEGER;
  v_closing INTEGER;
  v_day_names TEXT[] := ARRAY['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
BEGIN
  -- Get initial balance from inventory
  SELECT COALESCE(ib.quantity_on_hand, 0)::INTEGER
  INTO v_current_balance
  FROM inventario.inventory_balances ib
  WHERE ib.product_id = p_product_id
  LIMIT 1;

  IF v_current_balance IS NULL THEN
    v_current_balance := 0;
  END IF;

  -- Loop through each day of the week
  FOR i IN 0..6 LOOP
    v_day_date := p_week_start_date + (i || ' days')::INTERVAL;

    -- Get production for this day
    SELECT COALESCE(SUM(ps.quantity), 0)::INTEGER
    INTO v_production
    FROM produccion.production_schedules ps
    WHERE ps.product_id = p_product_id::TEXT
      AND ps.start_date::DATE = v_day_date;

    -- Get forecast demand
    v_demand := produccion.get_daily_forecast(p_product_id, i, v_day_date);

    -- Calculate closing
    v_closing := v_current_balance + v_production - v_demand;

    day_index := i;
    balance_date := v_day_date;
    day_name := v_day_names[i + 1];
    opening_balance := v_current_balance;
    planned_production := v_production;
    forecast_demand := v_demand;
    closing_balance := v_closing;
    is_deficit := v_closing < 0;

    RETURN NEXT;

    -- Update balance for next day
    v_current_balance := v_closing;
  END LOOP;
END;
$$;


ALTER FUNCTION "produccion"."get_weekly_balance_projection"("p_product_id" "uuid", "p_week_start_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "produccion"."get_weekly_forecast"("p_week_start_date" "date") RETURNS TABLE("product_id" "uuid", "product_name" "text", "day_0_forecast" integer, "day_1_forecast" integer, "day_2_forecast" integer, "day_3_forecast" integer, "day_4_forecast" integer, "day_5_forecast" integer, "day_6_forecast" integer, "weekly_total" integer)
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id::UUID as product_id,
    p.name::TEXT as product_name,
    produccion.get_daily_forecast(p.id, 0, p_week_start_date)::INTEGER as day_0_forecast,
    produccion.get_daily_forecast(p.id, 1, p_week_start_date + INTERVAL '1 day')::INTEGER as day_1_forecast,
    produccion.get_daily_forecast(p.id, 2, p_week_start_date + INTERVAL '2 days')::INTEGER as day_2_forecast,
    produccion.get_daily_forecast(p.id, 3, p_week_start_date + INTERVAL '3 days')::INTEGER as day_3_forecast,
    produccion.get_daily_forecast(p.id, 4, p_week_start_date + INTERVAL '4 days')::INTEGER as day_4_forecast,
    produccion.get_daily_forecast(p.id, 5, p_week_start_date + INTERVAL '5 days')::INTEGER as day_5_forecast,
    produccion.get_daily_forecast(p.id, 6, p_week_start_date + INTERVAL '6 days')::INTEGER as day_6_forecast,
    (
      produccion.get_daily_forecast(p.id, 0, p_week_start_date) +
      produccion.get_daily_forecast(p.id, 1, p_week_start_date + INTERVAL '1 day') +
      produccion.get_daily_forecast(p.id, 2, p_week_start_date + INTERVAL '2 days') +
      produccion.get_daily_forecast(p.id, 3, p_week_start_date + INTERVAL '3 days') +
      produccion.get_daily_forecast(p.id, 4, p_week_start_date + INTERVAL '4 days') +
      produccion.get_daily_forecast(p.id, 5, p_week_start_date + INTERVAL '5 days') +
      produccion.get_daily_forecast(p.id, 6, p_week_start_date + INTERVAL '6 days')
    )::INTEGER as weekly_total
  FROM public.products p
  WHERE p.category = 'PT'
    AND p.is_active = true
  ORDER BY p.name;
END;
$$;


ALTER FUNCTION "produccion"."get_weekly_forecast"("p_week_start_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "produccion"."refresh_daily_demand_history"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW produccion.daily_demand_history;
END;
$$;


ALTER FUNCTION "produccion"."refresh_daily_demand_history"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "produccion"."update_production_schedules_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "produccion"."update_production_schedules_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "produccion"."update_shift_production_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Actualizar totales en shift_productions
  UPDATE produccion.shift_productions 
  SET 
    total_good_units = (
      SELECT COALESCE(SUM(good_units), 0) 
      FROM produccion.production_records 
      WHERE shift_production_id = NEW.shift_production_id
    ),
    total_bad_units = (
      SELECT COALESCE(SUM(bad_units), 0) 
      FROM produccion.production_records 
      WHERE shift_production_id = NEW.shift_production_id
    ),
    updated_at = NOW()
  WHERE id = NEW.shift_production_id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "produccion"."update_shift_production_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "produccion"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "produccion"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "produccion"."update_weekly_plans_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "produccion"."update_weekly_plans_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "produccion"."update_work_center_staffing_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "produccion"."update_work_center_staffing_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."adjust_delivery_date_by_frequency"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    branch_frequencies INTEGER[];
    adjusted_date DATE;
    requested_date DATE;
BEGIN
    -- Store the original requested date
    requested_date := NEW.expected_delivery_date;
    NEW.requested_delivery_date := requested_date;

    -- Skip adjustment if no branch_id
    IF NEW.branch_id IS NULL THEN
        RAISE NOTICE 'No branch_id provided, keeping original date: %', requested_date;
        RETURN NEW;
    END IF;

    -- Get active frequency days for the branch
    SELECT ARRAY_AGG(day_of_week ORDER BY day_of_week) INTO branch_frequencies
    FROM client_frequencies cf
    WHERE cf.branch_id = NEW.branch_id
    AND cf.is_active = true;

    -- If branch has active frequencies, adjust the delivery date
    IF branch_frequencies IS NOT NULL AND array_length(branch_frequencies, 1) > 0 THEN
        adjusted_date := calculate_next_frequency_date(requested_date, branch_frequencies);
        NEW.expected_delivery_date := adjusted_date;

        RAISE NOTICE 'Order % adjusted delivery date from % to % based on branch % frequencies %',
                    NEW.order_number, requested_date, adjusted_date, NEW.branch_id, branch_frequencies;
    ELSE
        -- No frequencies configured, keep original date
        NEW.expected_delivery_date := requested_date;

        RAISE NOTICE 'No active frequencies for branch %, keeping original date: %', NEW.branch_id, requested_date;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."adjust_delivery_date_by_frequency"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_inventory_adjustment"("p_adjustment_id" "uuid", "p_user_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_adjustment RECORD;
  v_movement_id UUID;
  v_location_id UUID;
  v_movement_type TEXT;
  v_quantity DECIMAL(12, 3);
  v_result JSON;
BEGIN
  -- Get adjustment details with inventory location_id
  SELECT
    ia.*,
    i.location_id
  INTO v_adjustment
  FROM public.inventory_adjustments ia
  JOIN public.inventories i ON i.id = ia.inventory_id
  WHERE ia.id = p_adjustment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Adjustment not found';
  END IF;

  IF v_adjustment.status != 'pending' THEN
    RAISE EXCEPTION 'Adjustment already processed';
  END IF;

  -- Use the inventory's location_id directly
  v_location_id := v_adjustment.location_id;

  IF v_location_id IS NULL THEN
    RAISE EXCEPTION 'Inventory does not have a location_id assigned';
  END IF;

  -- Determine movement type and quantity based on adjustment type
  v_quantity := ABS(v_adjustment.adjustment_quantity);

  IF v_adjustment.adjustment_type = 'negative' THEN
    v_movement_type := 'OUT';
  ELSE
    v_movement_type := 'IN';
  END IF;

  -- Call inventario.perform_inventory_movement
  -- This returns JSON directly with the movement details
  v_result := inventario.perform_inventory_movement(
    p_product_id := v_adjustment.product_id,
    p_quantity := v_quantity,
    p_movement_type := v_movement_type,
    p_reason_type := 'adjustment',
    p_location_id_from := CASE WHEN v_movement_type = 'OUT' THEN v_location_id ELSE NULL END,
    p_location_id_to := CASE WHEN v_movement_type = 'IN' THEN v_location_id ELSE NULL END,
    p_reference_id := v_adjustment.inventory_id,
    p_reference_type := 'inventory_adjustment',
    p_notes := CONCAT(
      'Ajuste de inventario - ',
      CASE WHEN v_adjustment.custom_reason IS NOT NULL
           THEN v_adjustment.custom_reason
           ELSE (SELECT reason FROM public.adjustment_reasons WHERE id = v_adjustment.reason_id)
      END
    ),
    p_recorded_by := p_user_id
  );

  -- Extract movement_id from JSON result
  v_movement_id := (v_result->>'movement_id')::UUID;

  -- Update adjustment record
  UPDATE public.inventory_adjustments
  SET
    status = 'approved',
    approved_by = p_user_id,
    approved_at = CURRENT_TIMESTAMP,
    movement_id = v_movement_id,
    warehouse_quantity = v_quantity,
    production_quantity = 0,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_adjustment_id;

  RETURN v_movement_id;
END;
$$;


ALTER FUNCTION "public"."apply_inventory_adjustment"("p_adjustment_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."apply_inventory_adjustment"("p_adjustment_id" "uuid", "p_user_id" "uuid") IS 'Applies an inventory adjustment directly to the inventory''s location_id.
No distribution needed - each inventory is now associated with a specific location.
Uses inventario.perform_inventory_movement to ensure consistency with the WMS system.';



CREATE OR REPLACE FUNCTION "public"."assign_route_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Solo asignar número si no viene especificado
  IF NEW.route_number IS NULL THEN
    NEW.route_number := nextval('route_number_seq');
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."assign_route_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_order_item_deliveries_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    current_user_id UUID;
    current_ip INET;
    current_user_agent TEXT;
    related_order_id UUID;
    related_order_item_id UUID;
BEGIN
    -- Get current user from Supabase JWT (auth.uid())
    BEGIN
        current_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        current_user_id := NULL;
    END;

    -- Try to get IP address from session (optional metadata)
    BEGIN
        current_ip := current_setting('app.client_ip', true)::INET;
    EXCEPTION WHEN OTHERS THEN
        current_ip := NULL;
    END;

    -- Try to get user agent from session (optional metadata)
    BEGIN
        current_user_agent := current_setting('app.user_agent', true);
    EXCEPTION WHEN OTHERS THEN
        current_user_agent := NULL;
    END;

    -- Get related order_item_id and order_id
    IF TG_OP = 'DELETE' THEN
        related_order_item_id := OLD.order_item_id;
        -- Get order_id from order_items
        SELECT order_id INTO related_order_id FROM order_items WHERE id = OLD.order_item_id;
    ELSE
        related_order_item_id := NEW.order_item_id;
        -- Get order_id from order_items
        SELECT order_id INTO related_order_id FROM order_items WHERE id = NEW.order_item_id;
    END IF;

    -- Fallback: If auth.uid() is NULL, try to get from related order
    IF current_user_id IS NULL AND related_order_id IS NOT NULL THEN
        SELECT created_by INTO current_user_id FROM orders WHERE id = related_order_id;
    END IF;

    -- Handle INSERT operation
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO order_item_deliveries_audit (
            delivery_id,
            order_item_id,
            order_id,
            action,
            new_data,
            changed_by,
            ip_address,
            user_agent
        )
        VALUES (
            NEW.id,
            related_order_item_id,
            related_order_id,
            'INSERT',
            row_to_json(NEW)::JSONB,
            current_user_id,
            current_ip,
            current_user_agent
        );
        RETURN NEW;

    -- Handle UPDATE operation
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Only log if something actually changed
        IF row_to_json(OLD)::JSONB != row_to_json(NEW)::JSONB THEN
            INSERT INTO order_item_deliveries_audit (
                delivery_id,
                order_item_id,
                order_id,
                action,
                old_data,
                new_data,
                changed_by,
                ip_address,
                user_agent
            )
            VALUES (
                NEW.id,
                related_order_item_id,
                related_order_id,
                'UPDATE',
                row_to_json(OLD)::JSONB,
                row_to_json(NEW)::JSONB,
                current_user_id,
                current_ip,
                current_user_agent
            );
        END IF;
        RETURN NEW;

    -- Handle DELETE operation
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO order_item_deliveries_audit (
            delivery_id,
            order_item_id,
            order_id,
            action,
            old_data,
            changed_by,
            ip_address,
            user_agent
        )
        VALUES (
            OLD.id,
            related_order_item_id,
            related_order_id,
            'DELETE',
            row_to_json(OLD)::JSONB,
            current_user_id,
            current_ip,
            current_user_agent
        );
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."audit_order_item_deliveries_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_order_items_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    current_user_id UUID;
    current_ip INET;
    current_user_agent TEXT;
    related_order_id UUID;
BEGIN
    -- Get current user from Supabase JWT (auth.uid())
    BEGIN
        current_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        current_user_id := NULL;
    END;

    -- Try to get IP address from session (optional metadata)
    BEGIN
        current_ip := current_setting('app.client_ip', true)::INET;
    EXCEPTION WHEN OTHERS THEN
        current_ip := NULL;
    END;

    -- Try to get user agent from session (optional metadata)
    BEGIN
        current_user_agent := current_setting('app.user_agent', true);
    EXCEPTION WHEN OTHERS THEN
        current_user_agent := NULL;
    END;

    -- Get related order_id
    IF TG_OP = 'DELETE' THEN
        related_order_id := OLD.order_id;
    ELSE
        related_order_id := NEW.order_id;
    END IF;

    -- Fallback: If auth.uid() is NULL, try to get from related order
    IF current_user_id IS NULL AND related_order_id IS NOT NULL THEN
        SELECT created_by INTO current_user_id FROM orders WHERE id = related_order_id;
    END IF;

    -- Handle INSERT operation
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO order_items_audit (
            order_item_id,
            order_id,
            action,
            new_data,
            changed_by,
            ip_address,
            user_agent
        )
        VALUES (
            NEW.id,
            related_order_id,
            'INSERT',
            row_to_json(NEW)::JSONB,
            current_user_id,
            current_ip,
            current_user_agent
        );
        RETURN NEW;

    -- Handle UPDATE operation
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Only log if something actually changed
        IF row_to_json(OLD)::JSONB != row_to_json(NEW)::JSONB THEN
            INSERT INTO order_items_audit (
                order_item_id,
                order_id,
                action,
                old_data,
                new_data,
                changed_by,
                ip_address,
                user_agent
            )
            VALUES (
                NEW.id,
                related_order_id,
                'UPDATE',
                row_to_json(OLD)::JSONB,
                row_to_json(NEW)::JSONB,
                current_user_id,
                current_ip,
                current_user_agent
            );
        END IF;
        RETURN NEW;

    -- Handle DELETE operation
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO order_items_audit (
            order_item_id,
            order_id,
            action,
            old_data,
            changed_by,
            ip_address,
            user_agent
        )
        VALUES (
            OLD.id,
            related_order_id,
            'DELETE',
            row_to_json(OLD)::JSONB,
            current_user_id,
            current_ip,
            current_user_agent
        );
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."audit_order_items_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_orders_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    current_user_id UUID;
    current_ip INET;
    current_user_agent TEXT;
BEGIN
    -- Get current user from Supabase JWT (auth.uid())
    -- This is automatically available in every authenticated request
    BEGIN
        current_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        current_user_id := NULL;
    END;

    -- Try to get IP address from session (optional metadata)
    BEGIN
        current_ip := current_setting('app.client_ip', true)::INET;
    EXCEPTION WHEN OTHERS THEN
        current_ip := NULL;
    END;

    -- Try to get user agent from session (optional metadata)
    BEGIN
        current_user_agent := current_setting('app.user_agent', true);
    EXCEPTION WHEN OTHERS THEN
        current_user_agent := NULL;
    END;

    -- Fallback: If auth.uid() is NULL (shouldn't happen), try to get from record
    IF current_user_id IS NULL THEN
        IF TG_OP = 'DELETE' THEN
            current_user_id := OLD.created_by;
        ELSE
            current_user_id := NEW.created_by;
        END IF;
    END IF;

    -- Handle INSERT operation
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO orders_audit (
            order_id,
            action,
            new_data,
            changed_by,
            ip_address,
            user_agent
        )
        VALUES (
            NEW.id,
            'INSERT',
            row_to_json(NEW)::JSONB,
            current_user_id,
            current_ip,
            current_user_agent
        );
        RETURN NEW;

    -- Handle UPDATE operation
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Only log if something actually changed
        IF row_to_json(OLD)::JSONB != row_to_json(NEW)::JSONB THEN
            INSERT INTO orders_audit (
                order_id,
                action,
                old_data,
                new_data,
                changed_by,
                ip_address,
                user_agent
            )
            VALUES (
                NEW.id,
                'UPDATE',
                row_to_json(OLD)::JSONB,
                row_to_json(NEW)::JSONB,
                current_user_id,
                current_ip,
                current_user_agent
            );
        END IF;
        RETURN NEW;

    -- Handle DELETE operation
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO orders_audit (
            order_id,
            action,
            old_data,
            changed_by,
            ip_address,
            user_agent
        )
        VALUES (
            OLD.id,
            'DELETE',
            row_to_json(OLD)::JSONB,
            current_user_id,
            current_ip,
            current_user_agent
        );
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."audit_orders_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_consumption_efficiency"("p_actual_index" numeric, "p_standard_index" numeric) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF p_standard_index > 0 THEN
        RETURN (p_standard_index / p_actual_index) * 100;
    ELSE
        RETURN 100;
    END IF;
END;
$$;


ALTER FUNCTION "public"."calculate_consumption_efficiency"("p_actual_index" numeric, "p_standard_index" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_consumption_index"("p_material_consumed" numeric, "p_units_produced" integer) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF p_units_produced > 0 THEN
        RETURN p_material_consumed / p_units_produced;
    ELSE
        RETURN 0;
    END IF;
END;
$$;


ALTER FUNCTION "public"."calculate_consumption_index"("p_material_consumed" numeric, "p_units_produced" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_expected_consumption"("p_product_id" "uuid", "p_work_center_code" character varying, "p_total_units" integer) RETURNS TABLE("material_name" character varying, "material_unit" character varying, "expected_quantity" numeric, "tolerance_min" numeric, "tolerance_max" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pm.material_name,
        pm.material_unit,
        (pm.theoretical_consumption_per_unit * p_total_units) as expected_quantity,
        (pm.theoretical_consumption_per_unit * p_total_units * (1 - pm.tolerance_percentage / 100)) as tolerance_min,
        (pm.theoretical_consumption_per_unit * p_total_units * (1 + pm.tolerance_percentage / 100)) as tolerance_max
    FROM product_materials pm
    WHERE pm.product_id = p_product_id 
      AND pm.work_center_code = p_work_center_code
      AND pm.is_active = true
    ORDER BY pm.material_name;
END;
$$;


ALTER FUNCTION "public"."calculate_expected_consumption"("p_product_id" "uuid", "p_work_center_code" character varying, "p_total_units" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_inventory_variance"("count1_total" numeric, "count2_total" numeric) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF count1_total = 0 AND count2_total = 0 THEN
        RETURN 0;
    END IF;
    
    IF count1_total = 0 THEN
        RETURN 100;
    END IF;
    
    RETURN ABS(((count2_total - count1_total) / count1_total) * 100);
END;
$$;


ALTER FUNCTION "public"."calculate_inventory_variance"("count1_total" numeric, "count2_total" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_next_frequency_date"("base_date" "date", "frequency_days" integer[]) RETURNS "date"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    current_day INTEGER;
    days_to_add INTEGER;
    target_day INTEGER;
    min_days INTEGER := 999;
    result_date DATE;
BEGIN
    -- Get day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
    current_day := EXTRACT(DOW FROM base_date)::INTEGER;

    -- If no frequency days provided, return original date
    IF frequency_days IS NULL OR array_length(frequency_days, 1) = 0 THEN
        RETURN base_date;
    END IF;

    -- Find the next valid frequency day
    FOREACH target_day IN ARRAY frequency_days LOOP
        -- Calculate days to add to reach the target day
        IF target_day >= current_day THEN
            days_to_add := target_day - current_day;
        ELSE
            -- Next week
            days_to_add := 7 - current_day + target_day;
        END IF;

        -- Keep the minimum days to add (closest frequency day)
        IF days_to_add < min_days THEN
            min_days := days_to_add;
        END IF;
    END LOOP;

    -- If same day and it's a frequency day, keep the same date
    IF min_days = 0 THEN
        RETURN base_date;
    END IF;

    result_date := base_date + min_days;

    -- Log the adjustment for debugging
    RAISE NOTICE 'Date adjusted from % to % based on frequency days %', base_date, result_date, frequency_days;

    RETURN result_date;
END;
$$;


ALTER FUNCTION "public"."calculate_next_frequency_date"("base_date" "date", "frequency_days" integer[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_order_total"("order_uuid" "uuid") RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_total DECIMAL;
BEGIN
  -- Calculate total by summing (quantity_requested * unit_price) for all order items
  SELECT COALESCE(SUM(
    COALESCE(oi.quantity_requested, 0) * COALESCE(oi.unit_price, 0)
  ), 0)
  INTO v_total
  FROM public.order_items oi
  WHERE oi.order_id = order_uuid;

  -- Update the order's total_value column
  UPDATE public.orders
  SET total_value = v_total
  WHERE id = order_uuid;

  RETURN v_total;
END;
$$;


ALTER FUNCTION "public"."calculate_order_total"("order_uuid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_order_total"("order_uuid" "uuid") IS 'Calculates and updates the total value of an order based on its items unit prices and quantities';



CREATE OR REPLACE FUNCTION "public"."calculate_production_total"("p_quantity_cars" integer, "p_quantity_cans_per_car" integer, "p_quantity_cans" integer, "p_quantity_units" integer, "p_product_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    units_per_can INTEGER := 1;
    total_units INTEGER := 0;
BEGIN
    -- Obtener unidades por lata del producto
    SELECT pc.units_per_can INTO units_per_can
    FROM product_configurations pc
    WHERE pc.product_id = p_product_id AND pc.is_active = true
    LIMIT 1;
    
    -- Si no hay configuración, asumir 1 unidad por lata
    IF units_per_can IS NULL THEN
        units_per_can := 1;
    END IF;
    
    -- Calcular total
    total_units := COALESCE(p_quantity_cars, 0) * COALESCE(p_quantity_cans_per_car, 0) * units_per_can +
                   COALESCE(p_quantity_cans, 0) * units_per_can +
                   COALESCE(p_quantity_units, 0);
    
    RETURN total_units;
END;
$$;


ALTER FUNCTION "public"."calculate_production_total"("p_quantity_cars" integer, "p_quantity_cans_per_car" integer, "p_quantity_cans" integer, "p_quantity_units" integer, "p_product_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_theoretical_consumption"("p_product_id" "uuid", "p_material_name" character varying, "p_work_center_code" character varying, "p_total_units" integer) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    consumption_per_unit DECIMAL(10,4) := 0;
    theoretical_total DECIMAL(10,4) := 0;
BEGIN
    -- Obtener consumo teórico por unidad
    SELECT pm.theoretical_consumption_per_unit INTO consumption_per_unit
    FROM product_materials pm
    JOIN work_centers wc ON wc.code = pm.work_center_code
    WHERE pm.product_id = p_product_id 
      AND pm.material_name = p_material_name
      AND pm.work_center_code = p_work_center_code
      AND pm.is_active = true
    LIMIT 1;
    
    -- Calcular total teórico
    IF consumption_per_unit IS NOT NULL THEN
        theoretical_total := consumption_per_unit * p_total_units;
    END IF;
    
    RETURN theoretical_total;
END;
$$;


ALTER FUNCTION "public"."calculate_theoretical_consumption"("p_product_id" "uuid", "p_material_name" character varying, "p_work_center_code" character varying, "p_total_units" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_time_efficiency"("p_shift_id" "uuid") RETURNS TABLE("actual_hours" numeric, "units_produced" integer, "target_units_per_hour" integer, "expected_units" integer, "efficiency_percentage" numeric)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    shift_record production_shifts%ROWTYPE;
    total_units INTEGER := 0;
    hours_worked DECIMAL := 0;
    expected_total INTEGER := 0;
BEGIN
    -- Obtener datos del turno
    SELECT * INTO shift_record FROM production_shifts WHERE id = p_shift_id;
    
    IF shift_record.id IS NULL THEN
        RETURN;
    END IF;
    
    -- Calcular horas trabajadas
    IF shift_record.actual_end_time IS NOT NULL THEN
        hours_worked := EXTRACT(EPOCH FROM (shift_record.actual_end_time - shift_record.actual_start_time)) / 3600;
    ELSE
        hours_worked := EXTRACT(EPOCH FROM (NOW() - shift_record.actual_start_time)) / 3600;
    END IF;
    
    -- Obtener total de unidades producidas en el turno
    SELECT COALESCE(SUM(pr.units_produced), 0) INTO total_units
    FROM production_records pr
    WHERE pr.shift_id = p_shift_id;
    
    -- Calcular unidades esperadas
    expected_total := ROUND(hours_worked * COALESCE(shift_record.target_units_per_hour, 0));
    
    RETURN QUERY SELECT 
        hours_worked,
        total_units,
        COALESCE(shift_record.target_units_per_hour, 0),
        expected_total,
        CASE 
            WHEN expected_total > 0 THEN (total_units::DECIMAL / expected_total) * 100
            ELSE 0
        END;
END;
$$;


ALTER FUNCTION "public"."calculate_time_efficiency"("p_shift_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_create_new_shift"("center_code" "text", "target_date" "date" DEFAULT CURRENT_DATE, "target_shift_number" integer DEFAULT 1) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    center_id UUID;
    existing_count INTEGER := 0;
    active_count INTEGER := 0;
BEGIN
    -- Obtener ID del centro
    SELECT id INTO center_id 
    FROM work_centers 
    WHERE code = center_code AND is_active = true;
    
    IF center_id IS NULL THEN
        RETURN false; -- Centro no existe
    END IF;
    
    -- Contar turnos existentes para esa fecha/número
    SELECT COUNT(*) INTO existing_count
    FROM production_shifts 
    WHERE work_center_id = center_id 
      AND shift_date = target_date 
      AND shift_number = target_shift_number;
    
    -- Contar turnos activos para ese centro en esa fecha
    SELECT COUNT(*) INTO active_count
    FROM production_shifts 
    WHERE work_center_id = center_id 
      AND shift_date = target_date 
      AND status = 'active' 
      AND is_active = true;
    
    -- Permitir crear solo si no hay turnos activos
    RETURN (active_count = 0);
END;
$$;


ALTER FUNCTION "public"."can_create_new_shift"("center_code" "text", "target_date" "date", "target_shift_number" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_migration_progress"() RETURNS TABLE("email" "text", "name" "text", "role" "text", "status" "text", "auth_linked" boolean)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        umi.email::TEXT,
        umi.name::TEXT,
        umi.role::TEXT,
        umi.migration_status::TEXT,
        (umi.auth_user_created_id IS NOT NULL)::BOOLEAN
    FROM user_migration_instructions umi
    ORDER BY umi.email;
END;
$$;


ALTER FUNCTION "public"."check_migration_progress"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_schedule_overlap"("p_day_of_week" integer, "p_start_time" time without time zone, "p_end_time" time without time zone, "p_client_id" "uuid" DEFAULT NULL::"uuid", "p_branch_id" "uuid" DEFAULT NULL::"uuid", "p_exclude_id" "uuid" DEFAULT NULL::"uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  overlap_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO overlap_count
  FROM receiving_schedules
  WHERE 
    ((p_client_id IS NOT NULL AND client_id = p_client_id) OR
     (p_branch_id IS NOT NULL AND branch_id = p_branch_id))
    AND day_of_week = p_day_of_week
    AND (p_exclude_id IS NULL OR id != p_exclude_id)
    AND (
      (start_time <= p_start_time AND end_time > p_start_time) OR
      (start_time < p_end_time AND end_time >= p_end_time) OR
      (start_time >= p_start_time AND end_time <= p_end_time)
    );
    
  RETURN overlap_count > 0;
END;
$$;


ALTER FUNCTION "public"."check_schedule_overlap"("p_day_of_week" integer, "p_start_time" time without time zone, "p_end_time" time without time zone, "p_client_id" "uuid", "p_branch_id" "uuid", "p_exclude_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_access_logs"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Eliminar logs más antiguos de 90 días
    DELETE FROM public.access_logs 
    WHERE attempted_at < NOW() - INTERVAL '90 days';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_access_logs"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_old_access_logs"() IS 'Función para limpiar logs de acceso antiguos (>90 días)';



CREATE OR REPLACE FUNCTION "public"."create_client_config"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Insertar en client_config usando el id del nuevo cliente
  INSERT INTO client_config (client_id, orders_by_units)
  VALUES (NEW.id, false); -- false es el valor por defecto, cámbialo si quieres
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_client_config"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_new_shift"("center_code" "text", "user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
  DECLARE
      center_id UUID;
      new_shift_id UUID;
  BEGIN
      SELECT id INTO center_id
      FROM work_centers
      WHERE code = center_code AND is_active = true;

      IF center_id IS NULL THEN
          RAISE EXCEPTION 'Centro de trabajo % no encontrado',
  center_code;
      END IF;

      INSERT INTO production_shifts (
          work_center_id,
          shift_date,
          shift_number,
          start_time,
          actual_start_time,
          is_active,
          operator_user_id,
          status
      ) VALUES (
          center_id,
          CURRENT_DATE,
          1,
          NOW(),
          NOW(),
          true,
          user_id,
          'active'
      )
      RETURNING id INTO new_shift_id;

      RETURN new_shift_id;
  END;
  $$;


ALTER FUNCTION "public"."create_new_shift"("center_code" "text", "user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_purchase_order_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  next_number INTEGER;
  year_suffix VARCHAR(4);
BEGIN
  -- Get current year suffix (last 2 digits)
  year_suffix := TO_CHAR(CURRENT_DATE, 'YY');

  -- Get the next number for this year
  -- Format is OC + YY (2 chars) + NNNN (4 chars), so sequence starts at position 5
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_number
  FROM compras.purchase_orders
  WHERE order_number LIKE 'OC' || year_suffix || '%'
    AND LENGTH(order_number) = 8;  -- Ensure we only match proper format OC24XXXX

  -- Generate order number: OC + YY + sequential number (padded to 4 digits)
  NEW.order_number := 'OC' || year_suffix || LPAD(next_number::TEXT, 4, '0');

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_purchase_order_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_active_frequencies_for_day"("target_day" integer) RETURNS TABLE("branch_id" "uuid", "client_id" "uuid", "branch_name" character varying, "client_name" character varying, "frequency_id" "uuid", "notes" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id as branch_id,
    b.client_id,
    b.name as branch_name,
    c.name as client_name,
    cf.id as frequency_id,
    cf.notes
  FROM client_frequencies cf
  JOIN branches b ON cf.branch_id = b.id
  JOIN clients c ON b.client_id = c.id
  WHERE cf.day_of_week = target_day 
    AND cf.is_active = true
  ORDER BY c.name, b.name;
END;
$$;


ALTER FUNCTION "public"."get_active_frequencies_for_day"("target_day" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_active_shift_for_center"("center_code" "text") RETURNS TABLE("shift_id" "uuid", "work_center_id" "uuid", "work_center_code" "text", "shift_date" "date", "shift_number" integer, "start_time" timestamp with time zone, "actual_start_time" timestamp with time zone, "is_active" boolean, "status" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
  BEGIN
      RETURN QUERY
      SELECT
          ps.id,
          ps.work_center_id,
          wc.code,
          ps.shift_date,
          ps.shift_number,
          ps.start_time,
          ps.actual_start_time,
          ps.is_active,
          ps.status,
          ps.created_at
      FROM production_shifts ps
      JOIN work_centers wc ON wc.id = ps.work_center_id
      WHERE wc.code = center_code
        AND ps.shift_date = CURRENT_DATE
        AND ps.status = 'active'
        AND ps.is_active = true
      ORDER BY ps.created_at DESC
      LIMIT 1;
  END;
  $$;


ALTER FUNCTION "public"."get_active_shift_for_center"("center_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_dispatch_config"() RETURNS TABLE("allow_dispatch_without_inventory" boolean, "default_dispatch_location_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.allow_dispatch_without_inventory,
    c.default_dispatch_location_id
  FROM public.dispatch_inventory_config c
  WHERE c.id = '00000000-0000-0000-0000-000000000000'::UUID
  LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_dispatch_config"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_dispatch_config"() IS 'Returns current dispatch inventory configuration';



CREATE OR REPLACE FUNCTION "public"."get_effective_receiving_schedule"("p_date" "date", "p_client_id" "uuid" DEFAULT NULL::"uuid", "p_branch_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("schedule_type" "text", "start_time" time without time zone, "end_time" time without time zone, "status" "text", "note" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  day_of_week_num INTEGER;
BEGIN
  -- Get day of week (0=Sunday, 6=Saturday)
  day_of_week_num := EXTRACT(DOW FROM p_date);
  
  -- Priority 1: Check for exceptions on this specific date
  RETURN QUERY
  SELECT 
    'exception' as schedule_type,
    e.start_time,
    e.end_time,
    CASE 
      WHEN e.type = 'blocked' THEN 'unavailable'
      ELSE 'available'
    END as status,
    e.note
  FROM receiving_exceptions e
  WHERE 
    ((p_client_id IS NOT NULL AND e.client_id = p_client_id) OR
     (p_branch_id IS NOT NULL AND e.branch_id = p_branch_id))
    AND e.exception_date = p_date
  ORDER BY e.created_at DESC
  LIMIT 1;
  
  -- If exception found, return early
  IF FOUND THEN
    RETURN;
  END IF;
  
  -- Priority 2: Check regular weekly schedules
  RETURN QUERY
  SELECT 
    'regular' as schedule_type,
    s.start_time,
    s.end_time,
    s.status,
    s.metadata->>'note' as note
  FROM receiving_schedules s
  WHERE 
    ((p_client_id IS NOT NULL AND s.client_id = p_client_id) OR
     (p_branch_id IS NOT NULL AND s.branch_id = p_branch_id))
    AND s.day_of_week = day_of_week_num
  ORDER BY s.start_time;
  
  -- If no schedules found, return default unavailable
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      'default' as schedule_type,
      NULL::TIME as start_time,
      NULL::TIME as end_time,
      'unavailable' as status,
      'No schedule configured' as note;
  END IF;
  
  RETURN;
END;
$$;


ALTER FUNCTION "public"."get_effective_receiving_schedule"("p_date" "date", "p_client_id" "uuid", "p_branch_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_export_statistics"("start_date" "date" DEFAULT NULL::"date", "end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("total_exports" bigint, "total_orders" bigint, "total_amount" numeric, "avg_orders_per_export" numeric, "latest_invoice_number" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_exports,
        COALESCE(SUM(eh.total_orders), 0)::BIGINT as total_orders,
        COALESCE(SUM(eh.total_amount), 0) as total_amount,
        CASE 
            WHEN COUNT(*) > 0 THEN COALESCE(SUM(eh.total_orders), 0)::DECIMAL / COUNT(*)::DECIMAL
            ELSE 0::DECIMAL
        END as avg_orders_per_export,
        COALESCE(MAX(eh.invoice_number_end), 0)::INTEGER as latest_invoice_number
    FROM export_history eh
    WHERE (start_date IS NULL OR eh.export_date::DATE >= start_date)
      AND (end_date IS NULL OR eh.export_date::DATE <= end_date);
END;
$$;


ALTER FUNCTION "public"."get_export_statistics"("start_date" "date", "end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_finished_goods_inventory"() RETURNS TABLE("product_id" "uuid", "product_name" "text", "produced_quantity" bigint, "dispatched_quantity" bigint, "available_quantity" bigint)
    LANGUAGE "sql" STABLE
    AS $$
with produced as (
  select
    sp.product_id,
    coalesce(sum(pr.good_units), 0)::bigint as total
  from produccion.production_records pr
  join produccion.shift_productions sp on pr.shift_production_id = sp.id
  group by sp.product_id
),
dispatched as (
  select
    oi.product_id,
    coalesce(sum(oid.quantity_delivered), 0)::bigint as total
  from public.order_item_deliveries oid
  join public.order_items oi on oid.order_item_id = oi.id
  where oid.delivery_status = 'delivered'
  group by oi.product_id
)
select
  p.id,
  p.name,
  coalesce(prod.total, 0),
  coalesce(disp.total, 0),
  (coalesce(prod.total, 0) - coalesce(disp.total, 0))
from public.products p
left join produced prod on prod.product_id = p.id
left join dispatched disp on disp.product_id = p.id
where p.category = 'PT'
order by p.name;
$$;


ALTER FUNCTION "public"."get_finished_goods_inventory"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_inventory_summary"("inventory_uuid" "uuid") RETURNS TABLE("inventory_id" "uuid", "inventory_name" character varying, "total_products" bigint, "total_items_count1" bigint, "total_grams_count1" numeric, "total_items_count2" bigint, "total_grams_count2" numeric, "variance_percentage" numeric, "status" character varying)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id as inventory_id,
        i.name as inventory_name,
        COUNT(DISTINCT COALESCE(ici1.product_id, ici2.product_id)) as total_products,
        COALESCE(SUM(ici1.quantity_units), 0) as total_items_count1,
        COALESCE(SUM(ici1.total_grams), 0) as total_grams_count1,
        COALESCE(SUM(ici2.quantity_units), 0) as total_items_count2,
        COALESCE(SUM(ici2.total_grams), 0) as total_grams_count2,
        CASE 
            WHEN COALESCE(SUM(ici1.total_grams), 0) = 0 AND COALESCE(SUM(ici2.total_grams), 0) = 0 THEN 0
            WHEN COALESCE(SUM(ici1.total_grams), 0) = 0 THEN 100
            ELSE ABS(((COALESCE(SUM(ici2.total_grams), 0) - COALESCE(SUM(ici1.total_grams), 0)) / COALESCE(SUM(ici1.total_grams), 1)) * 100)
        END as variance_percentage,
        i.status
    FROM inventories i
    LEFT JOIN inventory_counts ic1 ON i.id = ic1.inventory_id AND ic1.count_number = 1
    LEFT JOIN inventory_counts ic2 ON i.id = ic2.inventory_id AND ic2.count_number = 2
    LEFT JOIN inventory_count_items ici1 ON ic1.id = ici1.inventory_count_id
    LEFT JOIN inventory_count_items ici2 ON ic2.id = ici2.inventory_count_id
    WHERE i.id = inventory_uuid
    GROUP BY i.id, i.name, i.status;
END;
$$;


ALTER FUNCTION "public"."get_inventory_summary"("inventory_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_next_remision_number"() RETURNS character varying
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    current_number INTEGER;
    next_number INTEGER;
    remision_number VARCHAR(50);
BEGIN
    -- Get current remision number
    SELECT COALESCE(config_value::INTEGER, 1) INTO current_number
    FROM system_config
    WHERE config_key = 'remision_number_current';

    next_number := current_number + 1;

    -- Update the current number
    UPDATE system_config
    SET config_value = next_number::TEXT,
        updated_at = NOW()
    WHERE config_key = 'remision_number_current';

    -- Format remision number (e.g., REM-000001)
    remision_number := 'REM-' || LPAD(next_number::TEXT, 6, '0');

    RETURN remision_number;
END;
$$;


ALTER FUNCTION "public"."get_next_remision_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_non_invoiced_remision_orders"("start_date" "date" DEFAULT NULL::"date", "end_date" "date" DEFAULT NULL::"date", "client_id_filter" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("order_id" "uuid", "order_number" character varying, "client_name" character varying, "remision_number" character varying, "remision_date" "date", "total_value" numeric, "route_name" character varying, "expected_delivery_date" "date", "delivered_quantity_items" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    WITH order_delivery_counts AS (
        -- Pre-calculate delivery counts per order using proper JOINs
        SELECT
            oi.order_id,
            COUNT(oid.id) as delivery_count
        FROM order_items oi
        LEFT JOIN order_item_deliveries oid ON oid.order_item_id = oi.id
        GROUP BY oi.order_id
    )
    SELECT
        o.id as order_id,
        o.order_number,
        c.name as client_name,
        r.remision_number,
        r.created_at::DATE as remision_date,
        o.total_value,
        rt.route_name,
        o.expected_delivery_date,
        COALESCE(odc.delivery_count, 0) as delivered_quantity_items
    FROM orders o
    JOIN clients c ON o.client_id = c.id
    LEFT JOIN routes rt ON o.assigned_route_id = rt.id
    JOIN remisions r ON o.id = r.order_id
    LEFT JOIN order_delivery_counts odc ON odc.order_id = o.id
    WHERE (o.is_invoiced = FALSE OR o.is_invoiced IS NULL)                -- Not invoiced yet
      AND (o.is_invoiced_from_remision = FALSE)                          -- Not invoiced from remision yet
      AND (start_date IS NULL OR r.created_at::DATE >= start_date)
      AND (end_date IS NULL OR r.created_at::DATE <= end_date)
      AND (client_id_filter IS NULL OR o.client_id = client_id_filter)
    ORDER BY r.created_at DESC, o.order_number;
END;
$$;


ALTER FUNCTION "public"."get_non_invoiced_remision_orders"("start_date" "date", "end_date" "date", "client_id_filter" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."orders_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "action" character varying(20) NOT NULL,
    "old_data" "jsonb",
    "new_data" "jsonb",
    "changed_by" "uuid",
    "changed_at" timestamp with time zone DEFAULT "now"(),
    "ip_address" "inet",
    "user_agent" "text",
    CONSTRAINT "check_data_present" CHECK ((((("action")::"text" = 'INSERT'::"text") AND ("new_data" IS NOT NULL)) OR ((("action")::"text" = 'UPDATE'::"text") AND ("old_data" IS NOT NULL) AND ("new_data" IS NOT NULL)) OR ((("action")::"text" = 'DELETE'::"text") AND ("old_data" IS NOT NULL)))),
    CONSTRAINT "orders_audit_action_check" CHECK ((("action")::"text" = ANY ((ARRAY['INSERT'::character varying, 'UPDATE'::character varying, 'DELETE'::character varying])::"text"[])))
);


ALTER TABLE "public"."orders_audit" OWNER TO "postgres";


COMMENT ON TABLE "public"."orders_audit" IS 'Registro completo de auditoría para todas las operaciones en orders. Captura automáticamente INSERT, UPDATE y DELETE con snapshots completos en JSONB.';



COMMENT ON COLUMN "public"."orders_audit"."order_id" IS 'ID de la orden afectada';



COMMENT ON COLUMN "public"."orders_audit"."action" IS 'Tipo de operación: INSERT, UPDATE o DELETE';



COMMENT ON COLUMN "public"."orders_audit"."old_data" IS 'Snapshot completo del registro antes del cambio (JSONB)';



COMMENT ON COLUMN "public"."orders_audit"."new_data" IS 'Snapshot completo del registro después del cambio (JSONB)';



COMMENT ON COLUMN "public"."orders_audit"."changed_by" IS 'Usuario que realizó el cambio';



COMMENT ON COLUMN "public"."orders_audit"."changed_at" IS 'Timestamp del cambio';



COMMENT ON COLUMN "public"."orders_audit"."ip_address" IS 'Dirección IP del cliente (si está disponible)';



COMMENT ON COLUMN "public"."orders_audit"."user_agent" IS 'User agent del navegador (si está disponible)';



CREATE OR REPLACE FUNCTION "public"."get_order_change_summary"("audit_log" "public"."orders_audit") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    summary TEXT := '';
    old_status TEXT;
    new_status TEXT;
    old_route TEXT;
    new_route TEXT;
BEGIN
    -- Summarize status changes
    IF audit_log.action = 'UPDATE' THEN
        old_status := audit_log.old_data->>'status';
        new_status := audit_log.new_data->>'status';

        IF old_status IS DISTINCT FROM new_status THEN
            summary := summary || 'Estado: ' || old_status || ' → ' || new_status || E'\n';
        END IF;

        -- Summarize route assignment
        old_route := audit_log.old_data->>'assigned_route_id';
        new_route := audit_log.new_data->>'assigned_route_id';

        IF old_route IS DISTINCT FROM new_route THEN
            IF new_route IS NULL THEN
                summary := summary || 'Ruta desasignada' || E'\n';
            ELSIF old_route IS NULL THEN
                summary := summary || 'Asignado a ruta' || E'\n';
            ELSE
                summary := summary || 'Ruta cambiada' || E'\n';
            END IF;
        END IF;
    ELSIF audit_log.action = 'INSERT' THEN
        summary := 'Orden creada';
    ELSIF audit_log.action = 'DELETE' THEN
        summary := 'Orden eliminada';
    END IF;

    RETURN TRIM(summary);
END;
$$;


ALTER FUNCTION "public"."get_order_change_summary"("audit_log" "public"."orders_audit") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_orders_for_direct_billing"("route_ids" "uuid"[]) RETURNS TABLE("order_id" "uuid", "order_number" character varying, "client_name" character varying, "total_value" numeric, "route_name" character varying, "expected_delivery_date" "date")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.id as order_id,
        o.order_number,
        c.name as client_name,
        o.total_value,
        r.route_name,
        o.expected_delivery_date
    FROM orders o
    JOIN clients c ON o.client_id = c.id
    JOIN routes r ON o.assigned_route_id = r.id
    WHERE o.assigned_route_id = ANY(route_ids)
      AND o.status = 'ready_dispatch'
      AND (o.is_invoiced = FALSE OR o.is_invoiced IS NULL)
      AND (o.is_invoiced_from_remision = FALSE OR o.is_invoiced_from_remision IS NULL)
      -- Should go direct to billing if client is 'facturable' type AND order doesn't have remision override
      AND (c.billing_type = 'facturable' AND (o.requires_remision = FALSE OR o.requires_remision IS NULL))
      AND EXISTS (
          SELECT 1 FROM order_items oi
          WHERE oi.order_id = o.id
            AND oi.quantity_available > 0
      )
    ORDER BY r.route_name, o.order_number;
END;
$$;


ALTER FUNCTION "public"."get_orders_for_direct_billing"("route_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_orders_for_remision"("route_ids" "uuid"[]) RETURNS TABLE("order_id" "uuid", "order_number" character varying, "client_name" character varying, "client_billing_type" "public"."billing_type_enum", "total_value" numeric, "route_name" character varying, "expected_delivery_date" "date", "requires_remision_override" boolean)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.id as order_id,
        o.order_number,
        c.name as client_name,
        c.billing_type as client_billing_type,
        o.total_value,
        r.route_name,
        o.expected_delivery_date,
        o.requires_remision as requires_remision_override
    FROM orders o
    JOIN clients c ON o.client_id = c.id
    JOIN routes r ON o.assigned_route_id = r.id
    WHERE o.assigned_route_id = ANY(route_ids)
      AND o.status = 'ready_dispatch'
      AND (o.is_invoiced = FALSE OR o.is_invoiced IS NULL)
      -- Should go to remision if client is 'remision' type OR order has requires_remision override
      AND (c.billing_type = 'remision' OR o.requires_remision = TRUE)
      -- Only exclude if order already has remision AND it's been processed
      AND NOT EXISTS (
          SELECT 1 FROM remisions rem
          WHERE rem.order_id = o.id
          AND o.is_invoiced_from_remision IS NOT NULL
      )
      AND EXISTS (
          SELECT 1 FROM order_items oi
          WHERE oi.order_id = o.id
            AND oi.quantity_available > 0
      )
    ORDER BY r.route_name, o.order_number;
END;
$$;


ALTER FUNCTION "public"."get_orders_for_remision"("route_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_pending_orders_for_routes"("route_ids" "uuid"[]) RETURNS TABLE("order_id" "uuid", "order_number" character varying, "client_name" character varying, "total_value" numeric, "route_name" character varying, "expected_delivery_date" "date")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id as order_id,
        o.order_number,
        c.name as client_name,
        o.total_value,
        r.route_name,
        o.expected_delivery_date
    FROM orders o
    JOIN clients c ON o.client_id = c.id
    JOIN routes r ON o.assigned_route_id = r.id
    WHERE o.assigned_route_id = ANY(route_ids)
      AND o.status = 'ready_dispatch'
      AND (o.is_invoiced = FALSE OR o.is_invoiced IS NULL)
      AND EXISTS (
          SELECT 1 FROM order_items oi 
          WHERE oi.order_id = o.id 
            AND oi.quantity_available > 0
      )
    ORDER BY r.route_name, o.order_number;
END;
$$;


ALTER FUNCTION "public"."get_pending_orders_for_routes"("route_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_product_demand_ema"("p_product_id" "uuid", "p_weeks" integer DEFAULT 8, "p_alpha" numeric DEFAULT 0.3) RETURNS numeric
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  v_ema numeric := 0;
  v_week_demand numeric;
  v_current_week integer;
  v_week_offset integer;
  v_demand_record RECORD;
BEGIN
  -- Get weekly demand data for the last N weeks
  FOR v_current_week IN 0..(p_weeks - 1) LOOP
    -- Get demand for this week (quantity_requested - quantity_delivered)
    SELECT COALESCE(SUM(oi.quantity_requested - COALESCE(oi.quantity_delivered, 0)), 0)
    INTO v_week_demand
    FROM public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
    WHERE oi.product_id = p_product_id
      AND o.status NOT IN ('cancelled', 'returned')
      AND DATE_TRUNC('week', o.created_at) = DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 week' * v_current_week);

    -- Calculate EMA: EMA_new = α * current_demand + (1-α) * EMA_previous
    IF v_current_week = 0 THEN
      -- First iteration (most recent week): initialize with current week demand
      v_ema := v_week_demand;
    ELSE
      -- Subsequent iterations: apply EMA formula
      v_ema := (p_alpha * v_week_demand) + ((1 - p_alpha) * v_ema);
    END IF;
  END LOOP;

  RETURN COALESCE(v_ema, 0)::numeric;
END;
$$;


ALTER FUNCTION "public"."get_product_demand_ema"("p_product_id" "uuid", "p_weeks" integer, "p_alpha" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_product_demanded_quantity"("p_product_id" "uuid") RETURNS bigint
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  RETURN public.get_product_pending_orders(p_product_id);
END;
$$;


ALTER FUNCTION "public"."get_product_demanded_quantity"("p_product_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_product_dispatch_history"("p_product_id" "uuid") RETURNS TABLE("delivery_id" "uuid", "delivery_date" timestamp without time zone, "order_id" "uuid", "order_number" "text", "client_name" "text", "quantity_delivered" bigint, "quantity_rejected" bigint, "delivery_status" "text", "rejection_reason" "text")
    LANGUAGE "sql" STABLE
    AS $$
select
  oid.id,
  oid.delivered_at,
  o.id,
  o.order_number,
  c.name,
  oid.quantity_delivered::bigint,
  oid.quantity_rejected::bigint,
  oid.delivery_status,
  oid.rejection_reason
from public.order_item_deliveries oid
join public.order_items oi on oid.order_item_id = oi.id
join public.orders o on oi.order_id = o.id
join public.clients c on o.client_id = c.id
where oi.product_id = p_product_id
order by oid.delivered_at desc;
$$;


ALTER FUNCTION "public"."get_product_dispatch_history"("p_product_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_product_pending_orders"("p_product_id" "uuid") RETURNS bigint
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  total_pending bigint := 0;
BEGIN
  SELECT COALESCE(SUM(oi.quantity_requested - COALESCE(oi.quantity_delivered, 0)), 0)::bigint
  INTO total_pending
  FROM public.order_items oi
  JOIN public.orders o ON oi.order_id = o.id
  WHERE oi.product_id = p_product_id
    AND o.status NOT IN ('delivered', 'returned', 'cancelled')
    AND oi.quantity_requested > COALESCE(oi.quantity_delivered, 0);

  RETURN total_pending;
END;
$$;


ALTER FUNCTION "public"."get_product_pending_orders"("p_product_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_product_production_history"("p_product_id" "uuid") RETURNS TABLE("record_id" "uuid", "shift_date" timestamp without time zone, "good_units" bigint, "bad_units" bigint, "notes" "text", "recorded_by" "text")
    LANGUAGE "plpgsql" STABLE
    AS $$
begin
  return query
  select
    pr.id,
    sp.started_at,
    pr.good_units::bigint,
    pr.bad_units::bigint,
    pr.notes,
    'Operador'::text
  from produccion.production_records pr
  join produccion.shift_productions sp on pr.shift_production_id = sp.id
  where sp.product_id = p_product_id
  order by sp.started_at desc;
end;
$$;


ALTER FUNCTION "public"."get_product_production_history"("p_product_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_remision_statistics"("start_date" "date" DEFAULT NULL::"date", "end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("total_remisions" bigint, "pending_remisions" bigint, "invoiced_remisions" bigint, "total_remision_amount" numeric, "avg_remision_amount" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_remisions,
        COUNT(CASE WHEN (o.is_invoiced_from_remision = FALSE OR o.is_invoiced_from_remision IS NULL) THEN 1 END)::BIGINT as pending_remisions,
        COUNT(CASE WHEN o.is_invoiced_from_remision = TRUE THEN 1 END)::BIGINT as invoiced_remisions,
        COALESCE(SUM(r.total_amount), 0) as total_remision_amount,
        CASE
            WHEN COUNT(*) > 0 THEN COALESCE(AVG(r.total_amount), 0)
            ELSE 0::DECIMAL
        END as avg_remision_amount
    FROM remisions r
    JOIN orders o ON r.order_id = o.id
    WHERE (start_date IS NULL OR r.created_at::DATE >= start_date)
      AND (end_date IS NULL OR r.created_at::DATE <= end_date);
END;
$$;


ALTER FUNCTION "public"."get_remision_statistics"("start_date" "date", "end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_required_materials_for_product"("p_product_id" "uuid", "p_work_center_code" character varying) RETURNS TABLE("material_id" "uuid", "material_name" character varying, "material_unit" character varying, "theoretical_consumption_per_unit" numeric, "tolerance_percentage" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pm.id,
        pm.material_name,
        pm.material_unit,
        pm.theoretical_consumption_per_unit,
        pm.tolerance_percentage
    FROM product_materials pm
    WHERE pm.product_id = p_product_id 
      AND pm.work_center_code = p_work_center_code
      AND pm.is_active = true
    ORDER BY pm.material_name;
END;
$$;


ALTER FUNCTION "public"."get_required_materials_for_product"("p_product_id" "uuid", "p_work_center_code" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_shift_consumption_summary"("p_shift_id" "uuid") RETURNS TABLE("product_name" character varying, "material_name" character varying, "material_unit" character varying, "total_units_produced" integer, "expected_consumption" numeric, "actual_consumption" numeric, "deviation_percentage" numeric, "alert_level" character varying)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.name as product_name,
        mc.material_name,
        mc.material_unit,
        pr.total_units as total_units_produced,
        mc.theoretical_quantity as expected_consumption,
        mc.quantity_consumed as actual_consumption,
        mc.deviation_percentage,
        CASE 
            WHEN ABS(mc.deviation_percentage) <= pm.tolerance_percentage THEN 'OK'
            WHEN ABS(mc.deviation_percentage) <= pm.tolerance_percentage * 1.5 THEN 'WARNING'
            ELSE 'CRITICAL'
        END::VARCHAR(20) as alert_level
    FROM material_consumptions mc
    JOIN production_records pr ON pr.id = mc.production_record_id
    JOIN products p ON p.id = pr.product_id
    LEFT JOIN product_materials pm ON pm.product_id = pr.product_id 
        AND pm.material_name = mc.material_name
    WHERE pr.shift_id = p_shift_id
    ORDER BY p.name, mc.material_name;
END;
$$;


ALTER FUNCTION "public"."get_shift_consumption_summary"("p_shift_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, permissions, status, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), -- Use full_name from metadata or email as fallback
    'commercial', -- Default role, can be changed by admin later
    '{"crm": false, "users": false, "orders": false, "inventory": false}'::jsonb, -- Default permissions
    'active',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_user"() IS 'Syncs new auth.users to public.users';



CREATE OR REPLACE FUNCTION "public"."handle_user_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Instead of deleting, mark as inactive to preserve referential integrity
  UPDATE public.users
  SET 
    status = 'inactive',
    updated_at = NOW()
  WHERE id = OLD.id;
  
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."handle_user_delete"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_user_delete"() IS 'Marks deleted auth.users as inactive in public.users';



CREATE OR REPLACE FUNCTION "public"."handle_user_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Update email and name if they changed
  UPDATE public.users
  SET 
    email = NEW.email,
    name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    updated_at = NOW()
  WHERE id = NEW.id;
  
  -- Update last_login if last_sign_in_at changed
  IF OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at AND NEW.last_sign_in_at IS NOT NULL THEN
    UPDATE public.users
    SET last_login = NEW.last_sign_in_at
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_user_update"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_user_update"() IS 'Syncs auth.users updates to public.users';



CREATE OR REPLACE FUNCTION "public"."has_active_shift"("center_code" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    shift_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO shift_count
    FROM active_shifts_today
    WHERE work_center_code = center_code
      AND status = 'active';
    
    RETURN shift_count > 0;
END;
$$;


ALTER FUNCTION "public"."has_active_shift"("center_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_frequency_for_day"("target_branch_id" "uuid", "target_day" integer) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM client_frequencies 
    WHERE branch_id = target_branch_id 
      AND day_of_week = target_day 
      AND is_active = true
  );
END;
$$;


ALTER FUNCTION "public"."has_frequency_for_day"("target_branch_id" "uuid", "target_day" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."link_auth_user"("p_email" "text", "p_auth_user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    result_msg TEXT;
BEGIN
    -- Update the public.users table with the auth user id
    UPDATE public.users 
    SET auth_user_id = p_auth_user_id 
    WHERE email = p_email;
    
    -- Update migration instructions
    UPDATE user_migration_instructions 
    SET 
        auth_user_created_id = p_auth_user_id,
        migration_status = 'completed'
    WHERE email = p_email;
    
    GET DIAGNOSTICS result_msg = ROW_COUNT;
    
    IF result_msg::INTEGER > 0 THEN
        RETURN 'Successfully linked user ' || p_email || ' with auth ID ' || p_auth_user_id;
    ELSE
        RETURN 'No user found with email ' || p_email;
    END IF;
END;
$$;


ALTER FUNCTION "public"."link_auth_user"("p_email" "text", "p_auth_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_orders_as_invoiced"("order_ids" "uuid"[], "export_history_id" "uuid", "invoice_start" integer) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    order_id UUID;
    invoice_counter INTEGER := invoice_start;
    updated_count INTEGER := 0;
BEGIN
    -- Loop through each order and mark as invoiced
    FOREACH order_id IN ARRAY order_ids
    LOOP
        -- Update order
        UPDATE orders 
        SET 
            is_invoiced = TRUE,
            invoiced_at = NOW(),
            invoice_export_id = mark_orders_as_invoiced.export_history_id,
            updated_at = NOW()
        WHERE id = order_id AND is_invoiced = FALSE;
        
        -- Check if update was successful
        IF FOUND THEN
            -- Create invoice record
            INSERT INTO order_invoices (
                order_id, 
                export_history_id, 
                invoice_number, 
                invoice_date,
                order_amount,
                client_name,
                route_name
            )
            SELECT 
                o.id,
                mark_orders_as_invoiced.export_history_id,
                invoice_counter,
                CURRENT_DATE,
                o.total_value,
                c.name,
                r.route_name
            FROM orders o
            LEFT JOIN clients c ON o.client_id = c.id
            LEFT JOIN routes r ON o.assigned_route_id = r.id
            WHERE o.id = order_id;
            
            invoice_counter := invoice_counter + 1;
            updated_count := updated_count + 1;
        END IF;
    END LOOP;
    
    RETURN updated_count;
END;
$$;


ALTER FUNCTION "public"."mark_orders_as_invoiced"("order_ids" "uuid"[], "export_history_id" "uuid", "invoice_start" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_remision_orders_as_invoiced"("order_ids" "uuid"[], "export_history_id" "uuid", "invoice_start" integer) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    current_order_id UUID;
    invoice_counter INTEGER := invoice_start;
    updated_count INTEGER := 0;
BEGIN
    -- Loop through each order and mark as invoiced from remision
    FOREACH current_order_id IN ARRAY order_ids
    LOOP
        -- Update order (remove status filter since remision orders are delivered/partially_delivered)
        UPDATE orders
        SET
            is_invoiced = TRUE,
            is_invoiced_from_remision = TRUE,
            invoiced_at = NOW(),
            remision_invoiced_at = NOW(),
            invoice_export_id = mark_remision_orders_as_invoiced.export_history_id,
            updated_at = NOW()
        WHERE id = current_order_id
          AND EXISTS (SELECT 1 FROM remisions WHERE order_id = orders.id)  -- Must have remision
          AND (is_invoiced = FALSE OR is_invoiced IS NULL);

        -- Check if update was successful
        IF FOUND THEN
            -- Create invoice record with special note for remision
            INSERT INTO order_invoices (
                order_id,
                export_history_id,
                invoice_number,
                invoice_date,
                order_amount,
                client_name,
                route_name
            )
            SELECT
                o.id,
                mark_remision_orders_as_invoiced.export_history_id,
                invoice_counter,
                CURRENT_DATE,
                o.total_value,
                c.name || ' (Anteriormente Remisionado)',  -- Special label
                r.route_name
            FROM orders o
            LEFT JOIN clients c ON o.client_id = c.id
            LEFT JOIN routes r ON o.assigned_route_id = r.id
            WHERE o.id = current_order_id;

            invoice_counter := invoice_counter + 1;
            updated_count := updated_count + 1;
        END IF;
    END LOOP;

    RETURN updated_count;
END;
$$;


ALTER FUNCTION "public"."mark_remision_orders_as_invoiced"("order_ids" "uuid"[], "export_history_id" "uuid", "invoice_start" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_clientes"("match_count" integer, "query_embedding" "extensions"."vector", "filter" "jsonb" DEFAULT '{}'::"jsonb") RETURNS TABLE("id" "uuid", "content" "text", "metadata" "jsonb", "similarity" double precision)
    LANGUAGE "sql" STABLE
    AS $$
  select
    clientes.id,
    clientes.content,
    clientes.metadata,
    1 - (clientes.embedding <=> query_embedding) as similarity
  from clientes_rag clientes
  where clientes.metadata @> filter
  order by clientes.embedding <=> query_embedding
  limit match_count;
$$;


ALTER FUNCTION "public"."match_clientes"("match_count" integer, "query_embedding" "extensions"."vector", "filter" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_documents"("match_count" integer, "query_embedding" "extensions"."vector", "filter" "jsonb" DEFAULT '{}'::"jsonb") RETURNS TABLE("id" "uuid", "content" "text", "metadata" "jsonb", "similarity" double precision)
    LANGUAGE "sql" STABLE
    AS $$
  select
    docs.id,
    docs.content,
    docs.metadata,  -- ¡Esta línea faltaba!
    1 - (docs.embedding <=> query_embedding) as similarity
  from productos_rag docs
  where docs.metadata @> filter
  order by docs.embedding <=> query_embedding
  limit match_count;
$$;


ALTER FUNCTION "public"."match_documents"("match_count" integer, "query_embedding" "extensions"."vector", "filter" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."properly_close_shift"("shift_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    shift_exists BOOLEAN := false;
BEGIN
    -- Verificar que el turno existe y está activo
    SELECT EXISTS(
        SELECT 1 FROM production_shifts 
        WHERE id = shift_id 
          AND status = 'active' 
          AND is_active = true
    ) INTO shift_exists;
    
    IF NOT shift_exists THEN
        RETURN false;
    END IF;
    
    -- Cerrar el turno correctamente
    UPDATE production_shifts 
    SET 
        status = 'completed',
        is_active = false,
        end_time = COALESCE(end_time, NOW()),
        actual_end_time = NOW(),
        updated_at = NOW()
    WHERE id = shift_id;
    
    RETURN true;
END;
$$;


ALTER FUNCTION "public"."properly_close_shift"("shift_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_audit_context"("setting_name" "text", "new_value" "text", "is_local" boolean DEFAULT true) RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    PERFORM set_config(setting_name, new_value, is_local);
    RETURN new_value;
END;
$$;


ALTER FUNCTION "public"."set_audit_context"("setting_name" "text", "new_value" "text", "is_local" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_audit_context"("setting_name" "text", "new_value" "text", "is_local" boolean) IS 'Allows setting session variables for audit tracking';



CREATE OR REPLACE FUNCTION "public"."test_delivery_date_adjustment"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    test_result TEXT := 'Trigger test completed successfully';
BEGIN
    -- This function can be called to test if the trigger is working
    -- Example: SELECT test_delivery_date_adjustment();

    RAISE NOTICE 'Delivery date adjustment trigger is installed and ready';
    RETURN test_result;
END;
$$;


ALTER FUNCTION "public"."test_delivery_date_adjustment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_calculate_consumption_index"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    shift_total_units INTEGER := 0;
    standard_consumption DECIMAL := 0;
BEGIN
    -- Obtener total de unidades del turno para este material
    SELECT COALESCE(SUM(pr.units_produced), 0) INTO shift_total_units
    FROM production_records pr
    WHERE pr.shift_id = (
        SELECT shift_id FROM production_records WHERE id = NEW.production_record_id
    );
    
    -- Calcular índice de consumo actual
    NEW.consumption_index := calculate_consumption_index(NEW.quantity_consumed, shift_total_units);
    
    -- Obtener estándar de consumo
    SELECT cs.standard_consumption_per_unit INTO standard_consumption
    FROM consumption_standards cs
    JOIN production_records pr ON pr.id = NEW.production_record_id
    JOIN production_shifts ps ON ps.id = pr.shift_id
    JOIN work_centers wc ON wc.id = ps.work_center_id
    WHERE cs.product_id = pr.product_id 
      AND cs.material_name = NEW.material_name
      AND cs.work_center_code = wc.code
      AND cs.is_active = true
    LIMIT 1;
    
    NEW.standard_index := COALESCE(standard_consumption, 0);
    
    -- Calcular eficiencia
    IF NEW.standard_index > 0 THEN
        NEW.efficiency_percentage := calculate_consumption_efficiency(NEW.consumption_index, NEW.standard_index);
    ELSE
        NEW.efficiency_percentage := 100;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_calculate_consumption_index"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_calculate_consumption_metrics"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    production_record production_records%ROWTYPE;
    work_center_code VARCHAR(10);
BEGIN
    -- Obtener datos del registro de producción
    SELECT pr.* INTO production_record
    FROM production_records pr
    WHERE pr.id = NEW.production_record_id;
    
    -- Obtener código del centro de trabajo
    SELECT wc.code INTO work_center_code
    FROM production_records pr
    JOIN production_shifts ps ON ps.id = pr.shift_id
    JOIN work_centers wc ON wc.id = ps.work_center_id
    WHERE pr.id = NEW.production_record_id;
    
    -- Calcular consumo teórico
    NEW.theoretical_quantity := calculate_theoretical_consumption(
        production_record.product_id,
        NEW.material_name,
        work_center_code,
        production_record.total_units
    );
    
    -- Calcular desviación porcentual
    IF NEW.theoretical_quantity > 0 THEN
        NEW.deviation_percentage := ((NEW.quantity_consumed - NEW.theoretical_quantity) / NEW.theoretical_quantity) * 100;
    ELSE
        NEW.deviation_percentage := 0;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_calculate_consumption_metrics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_calculate_production_total"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.total_units := calculate_production_total(
        NEW.quantity_cars,
        NEW.quantity_cans_per_car,
        NEW.quantity_cans,
        NEW.quantity_units,
        NEW.product_id
    );
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_calculate_production_total"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_calculate_simple_total"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Para el nuevo flujo, total_units = units_produced
    NEW.total_units := COALESCE(NEW.units_produced, 0);
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_calculate_simple_total"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_client_frequencies_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_client_frequencies_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_inventory_adjustments_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_inventory_adjustments_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_last_login"("user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.users 
  SET 
    last_login = NOW(),
    updated_at = NOW()
  WHERE id = user_id;
END;
$$;


ALTER FUNCTION "public"."update_last_login"("user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_last_login"("user_id" "uuid") IS 'Updates last login timestamp for user';



CREATE OR REPLACE FUNCTION "public"."update_purchase_order_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  total_items INTEGER;
  fully_received_items INTEGER;
  partially_received_items INTEGER;
BEGIN
  -- Count items in the order
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE quantity_received >= quantity_ordered),
    COUNT(*) FILTER (WHERE quantity_received > 0 AND quantity_received < quantity_ordered)
  INTO total_items, fully_received_items, partially_received_items
  FROM compras.purchase_order_items
  WHERE purchase_order_id = NEW.purchase_order_id;

  -- Update order status
  IF fully_received_items = total_items THEN
    UPDATE compras.purchase_orders
    SET status = 'received',
        actual_delivery_date = COALESCE(actual_delivery_date, CURRENT_DATE)
    WHERE id = NEW.purchase_order_id AND status != 'received';
  ELSIF partially_received_items > 0 OR fully_received_items > 0 THEN
    UPDATE compras.purchase_orders
    SET status = 'partially_received'
    WHERE id = NEW.purchase_order_id AND status = 'ordered';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_purchase_order_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_purchase_order_total"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE compras.purchase_orders
  SET total_amount = (
    SELECT COALESCE(SUM(subtotal), 0)
    FROM compras.purchase_order_items
    WHERE purchase_order_id = NEW.purchase_order_id
  )
  WHERE id = NEW.purchase_order_id;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_purchase_order_total"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_receiving_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_receiving_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_remision_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_remision_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_returns_status_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        NEW.status_updated_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_returns_status_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_video_tutorials_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_video_tutorials_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_material_consumption"("p_product_id" "uuid", "p_work_center_code" character varying, "p_material_name" character varying, "p_total_units" integer, "p_actual_consumption" numeric) RETURNS TABLE("is_within_tolerance" boolean, "expected_quantity" numeric, "actual_quantity" numeric, "deviation_percentage" numeric, "tolerance_percentage" numeric, "alert_level" character varying, "alert_message" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    theoretical_consumption DECIMAL(10,4);
    tolerance DECIMAL(5,2);
    deviation DECIMAL(8,2);
    min_tolerance DECIMAL(10,4);
    max_tolerance DECIMAL(10,4);
BEGIN
    -- Obtener consumo teórico y tolerancia
    SELECT 
        pm.theoretical_consumption_per_unit * p_total_units,
        pm.tolerance_percentage
    INTO theoretical_consumption, tolerance
    FROM product_materials pm
    WHERE pm.product_id = p_product_id 
      AND pm.work_center_code = p_work_center_code
      AND pm.material_name = p_material_name
      AND pm.is_active = true
    LIMIT 1;
    
    -- Si no se encuentra configuración
    IF theoretical_consumption IS NULL THEN
        RETURN QUERY SELECT 
            false as is_within_tolerance,
            0::DECIMAL(10,4) as expected_quantity,
            p_actual_consumption as actual_quantity,
            0::DECIMAL(8,2) as deviation_percentage,
            0::DECIMAL(5,2) as tolerance_percentage,
            'CRITICAL'::VARCHAR(20) as alert_level,
            'Material no configurado para este producto/centro'::TEXT as alert_message;
        RETURN;
    END IF;
    
    -- Calcular desviación
    deviation := CASE 
        WHEN theoretical_consumption > 0 THEN 
            ((p_actual_consumption - theoretical_consumption) / theoretical_consumption) * 100
        ELSE 0
    END;
    
    -- Calcular rangos de tolerancia
    min_tolerance := theoretical_consumption * (1 - tolerance / 100);
    max_tolerance := theoretical_consumption * (1 + tolerance / 100);
    
    -- Determinar nivel de alerta
    RETURN QUERY SELECT
        (p_actual_consumption BETWEEN min_tolerance AND max_tolerance) as is_within_tolerance,
        theoretical_consumption as expected_quantity,
        p_actual_consumption as actual_quantity,
        deviation as deviation_percentage,
        tolerance as tolerance_percentage,
        CASE 
            WHEN p_actual_consumption BETWEEN min_tolerance AND max_tolerance THEN 'OK'
            WHEN ABS(deviation) <= tolerance * 1.5 THEN 'WARNING'
            ELSE 'CRITICAL'
        END::VARCHAR(20) as alert_level,
        CASE 
            WHEN p_actual_consumption BETWEEN min_tolerance AND max_tolerance THEN 
                'Consumo dentro de tolerancia'
            WHEN deviation > 0 THEN 
                'Sobreconsumo: ' || ROUND(deviation, 2)::TEXT || '%'
            ELSE 
                'Subconsumo: ' || ROUND(ABS(deviation), 2)::TEXT || '%'
        END::TEXT as alert_message;
END;
$$;


ALTER FUNCTION "public"."validate_material_consumption"("p_product_id" "uuid", "p_work_center_code" character varying, "p_material_name" character varying, "p_total_units" integer, "p_actual_consumption" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "visitas"."calculate_visit_average_score"("p_visit_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  avg_score DECIMAL(3,2);
BEGIN
  -- Calculate average of all non-null scores from products that have stock
  SELECT
    ROUND(AVG(score)::numeric, 2)
  INTO avg_score
  FROM (
    SELECT
      (
        COALESCE(score_baking, 0) +
        COALESCE(score_display, 0) +
        COALESCE(score_presentation, 0) +
        COALESCE(score_taste, 0) +
        COALESCE(score_staff_training, 0) +
        COALESCE(score_baking_params, 0)
      )::DECIMAL /
      (
        CASE WHEN score_baking IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN score_display IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN score_presentation IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN score_taste IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN score_staff_training IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN score_baking_params IS NOT NULL THEN 1 ELSE 0 END
      ) as score
    FROM visitas.product_evaluations
    WHERE visit_id = p_visit_id
      AND has_stock = true
      AND (
        score_baking IS NOT NULL OR
        score_display IS NOT NULL OR
        score_presentation IS NOT NULL OR
        score_taste IS NOT NULL OR
        score_staff_training IS NOT NULL OR
        score_baking_params IS NOT NULL
      )
  ) scores;

  -- Update the visit with calculated average
  UPDATE visitas.store_visits
  SET average_score = avg_score, updated_at = NOW()
  WHERE id = p_visit_id;

  RETURN COALESCE(avg_score, 0);
END;
$$;


ALTER FUNCTION "visitas"."calculate_visit_average_score"("p_visit_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "visitas"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "visitas"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "visitas"."update_visit_score_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  PERFORM visitas.calculate_visit_average_score(
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.visit_id
      ELSE NEW.visit_id
    END
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "visitas"."update_visit_score_trigger"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "compras"."inventory_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "material_id" "uuid" NOT NULL,
    "movement_type" character varying(30) NOT NULL,
    "quantity_change" numeric(12,3) NOT NULL,
    "unit_of_measure" character varying(50),
    "reference_id" "uuid",
    "reference_type" character varying(50),
    "location" character varying(100),
    "notes" "text",
    "recorded_by" "uuid",
    "movement_date" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "warehouse_type" character varying(20),
    "balance_after" numeric(10,2) DEFAULT 0 NOT NULL,
    CONSTRAINT "inventory_movements_movement_type_check" CHECK ((("movement_type")::"text" = ANY ((ARRAY['reception'::character varying, 'consumption'::character varying, 'adjustment'::character varying, 'return'::character varying, 'waste'::character varying, 'transfer'::character varying])::"text"[]))),
    CONSTRAINT "inventory_movements_warehouse_type_check" CHECK ((("warehouse_type")::"text" = ANY ((ARRAY['warehouse'::character varying, 'production'::character varying])::"text"[])))
);


ALTER TABLE "compras"."inventory_movements" OWNER TO "postgres";


COMMENT ON TABLE "compras"."inventory_movements" IS 'Audit trail of all inventory movements (reception, consumption, adjustment, etc)';



COMMENT ON COLUMN "compras"."inventory_movements"."warehouse_type" IS 'Indicates if movement affects warehouse or production inventory. NULL means warehouse (default for backwards compatibility)';



COMMENT ON COLUMN "compras"."inventory_movements"."balance_after" IS 'Balance of inventory after this movement was applied. Calculated and stored at insert time for historical accuracy.';



CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "unit" character varying(50) DEFAULT 'units'::character varying NOT NULL,
    "price" numeric(10,2),
    "created_at" timestamp without time zone DEFAULT "now"(),
    "weight" character varying(50),
    "category" character varying(10) DEFAULT 'PT'::character varying,
    "nombre_wo" character varying(255),
    "codigo_wo" character varying(100),
    "tax_rate" numeric(5,2) DEFAULT 19.00,
    "subcategory" "text",
    "visible_in_ecommerce" boolean DEFAULT true NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "lote_minimo" numeric(12,3),
    "is_recipe_by_grams" boolean DEFAULT false,
    CONSTRAINT "products_category_check" CHECK ((("category")::"text" = ANY (ARRAY[('PT'::character varying)::"text", ('MP'::character varying)::"text", ('PP'::character varying)::"text"]))),
    CONSTRAINT "products_tax_rate_check" CHECK (("tax_rate" = ANY (ARRAY[0.00, 19.00])))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


COMMENT ON COLUMN "public"."products"."category" IS 'Product category: PT (Producto Terminado/Finished), MP (Materia Prima/Raw Material), PP (Producto en Proceso/Semi-Finished)';



COMMENT ON COLUMN "public"."products"."nombre_wo" IS 'Product name equivalence for World Office';



COMMENT ON COLUMN "public"."products"."codigo_wo" IS 'Product code equivalence for World Office';



COMMENT ON COLUMN "public"."products"."tax_rate" IS 'Tasa de impuesto del producto (0% o 19%)';



COMMENT ON COLUMN "public"."products"."visible_in_ecommerce" IS 'Controls whether this product is visible in the e-commerce portal. Default is true (visible).';



COMMENT ON COLUMN "public"."products"."is_active" IS 'Controls product availability for new transactions. Inactive products are hidden from new orders, e-commerce, and production but remain visible in historical data.';



COMMENT ON COLUMN "public"."products"."lote_minimo" IS 'Lote mínimo de producción para este producto (aplica para PT y PP)';



COMMENT ON COLUMN "public"."products"."is_recipe_by_grams" IS 'When true, all BOM materials for this product will be normalized so their quantities sum to 1 (100%)';



CREATE OR REPLACE VIEW "compras"."all_inventory_movements" AS
 SELECT "im"."id",
    "im"."material_id",
    "p"."name" AS "material_name",
    "p"."category",
    "im"."movement_type",
    "im"."quantity_change",
    "im"."unit_of_measure",
    "im"."reference_id",
    "im"."reference_type",
    "im"."location",
    "im"."notes",
    "im"."movement_date",
    "im"."created_at"
   FROM ("compras"."inventory_movements" "im"
     LEFT JOIN "public"."products" "p" ON (("p"."id" = "im"."material_id")))
  ORDER BY "im"."movement_date" DESC;


ALTER VIEW "compras"."all_inventory_movements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "compras"."material_receptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reception_number" character varying(50) NOT NULL,
    "type" character varying(20) NOT NULL,
    "purchase_order_id" "uuid",
    "material_id" "uuid",
    "quantity_received" numeric(12,3) NOT NULL,
    "unit_of_measure" character varying(50),
    "reception_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "reception_time" time without time zone,
    "batch_number" character varying(100),
    "lot_number" character varying(100),
    "supplier_id" "uuid",
    "operator_id" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "material_receptions_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['specific_material'::character varying, 'purchase_order'::character varying])::"text"[])))
);


ALTER TABLE "compras"."material_receptions" OWNER TO "postgres";


COMMENT ON TABLE "compras"."material_receptions" IS 'Tracks material receptions from suppliers or purchase orders';



CREATE OR REPLACE VIEW "compras"."all_material_inventory_status" AS
 SELECT "p"."id",
    "p"."name",
    "p"."category",
    COALESCE("sum"(
        CASE
            WHEN (("im"."movement_type")::"text" = 'reception'::"text") THEN "im"."quantity_change"
            ELSE (0)::numeric
        END), (0)::numeric) AS "current_stock",
    COALESCE("sum"(
        CASE
            WHEN (("im"."movement_type")::"text" = 'consumption'::"text") THEN "im"."quantity_change"
            ELSE (0)::numeric
        END), (0)::numeric) AS "total_consumed",
    COALESCE("sum"(
        CASE
            WHEN (("im"."movement_type")::"text" = 'waste'::"text") THEN "im"."quantity_change"
            ELSE (0)::numeric
        END), (0)::numeric) AS "total_waste",
    "max"("im"."movement_date") AS "last_movement_date",
    "count"(DISTINCT
        CASE
            WHEN ("mr"."id" IS NOT NULL) THEN "mr"."id"
            ELSE NULL::"uuid"
        END) AS "total_receptions",
    "count"(DISTINCT "im"."id") AS "total_movements"
   FROM (("public"."products" "p"
     LEFT JOIN "compras"."inventory_movements" "im" ON (("p"."id" = "im"."material_id")))
     LEFT JOIN "compras"."material_receptions" "mr" ON (("p"."id" = "mr"."material_id")))
  GROUP BY "p"."id", "p"."name", "p"."category"
  ORDER BY "p"."name";


ALTER VIEW "compras"."all_material_inventory_status" OWNER TO "postgres";


CREATE OR REPLACE VIEW "compras"."diagnostic_movements" AS
 SELECT "im"."id",
    "p"."name" AS "material_name",
    "im"."movement_type",
    "im"."quantity_change",
    "im"."location",
    "im"."movement_date"
   FROM ("compras"."inventory_movements" "im"
     LEFT JOIN "public"."products" "p" ON (("im"."material_id" = "p"."id")))
  ORDER BY "im"."movement_date" DESC
 LIMIT 50;


ALTER VIEW "compras"."diagnostic_movements" OWNER TO "postgres";


COMMENT ON VIEW "compras"."diagnostic_movements" IS 'Recent inventory movements to verify they exist';



CREATE OR REPLACE VIEW "compras"."diagnostic_products" AS
 SELECT "id",
    "name",
    "category",
    "unit",
    "created_at"
   FROM "public"."products"
  WHERE (("category")::"text" = 'MP'::"text")
  ORDER BY "name";


ALTER VIEW "compras"."diagnostic_products" OWNER TO "postgres";


COMMENT ON VIEW "compras"."diagnostic_products" IS 'List all raw material products (MP category)';



CREATE OR REPLACE VIEW "compras"."diagnostic_warehouse_all_products" AS
 SELECT "p"."id",
    "p"."name",
    "p"."category",
    COALESCE("sum"("im"."quantity_change"), (0)::numeric) AS "total_movement",
    "count"("im"."id") AS "movement_count"
   FROM ("public"."products" "p"
     LEFT JOIN "compras"."inventory_movements" "im" ON ((("p"."id" = "im"."material_id") AND (("im"."movement_type")::"text" = ANY ((ARRAY['reception'::character varying, 'transfer'::character varying, 'return'::character varying])::"text"[])))))
  GROUP BY "p"."id", "p"."name", "p"."category"
 HAVING ("count"("im"."id") > 0)
  ORDER BY "p"."name";


ALTER VIEW "compras"."diagnostic_warehouse_all_products" OWNER TO "postgres";


COMMENT ON VIEW "compras"."diagnostic_warehouse_all_products" IS 'Warehouse inventory for ALL products (not just mp)';



CREATE TABLE IF NOT EXISTS "produccion"."work_center_inventory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "work_center_id" "uuid" NOT NULL,
    "material_id" "uuid" NOT NULL,
    "quantity_available" numeric(12,3) DEFAULT 0 NOT NULL,
    "quantity_consumed" numeric(12,3) DEFAULT 0 NOT NULL,
    "batch_number" character varying(100),
    "expiry_date" "date",
    "unit_of_measure" character varying(50) NOT NULL,
    "transferred_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "produccion"."work_center_inventory" OWNER TO "postgres";


COMMENT ON TABLE "produccion"."work_center_inventory" IS 'Local inventory tracking per work center';



CREATE TABLE IF NOT EXISTS "produccion"."work_centers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" character varying(50) NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "operation_id" "uuid",
    "location_id" "uuid",
    "is_last_operation" boolean DEFAULT false NOT NULL,
    "capacidad_maxima_carros" integer,
    "tipo_capacidad" character varying(50)
);


ALTER TABLE "produccion"."work_centers" OWNER TO "postgres";


COMMENT ON TABLE "produccion"."work_centers" IS 'Centros de trabajo donde se realizan las operaciones de producción';



COMMENT ON COLUMN "produccion"."work_centers"."operation_id" IS 'Operación asociada al centro de trabajo';



COMMENT ON COLUMN "produccion"."work_centers"."location_id" IS 'Foreign key to inventory location (bin) representing this work center in the inventory system';



COMMENT ON COLUMN "produccion"."work_centers"."is_last_operation" IS 'Indicates if this work center is the last operation in the production process (empaque, laminado, etc)';



COMMENT ON COLUMN "produccion"."work_centers"."capacidad_maxima_carros" IS 'Capacidad máxima de carros simultáneos (ej: 8 carros en cámara de fermentación)';



COMMENT ON COLUMN "produccion"."work_centers"."tipo_capacidad" IS 'Tipo: ''carros'' (ej: cámara), ''personas'' (ej: decorado), NULL (ilimitado)';



CREATE OR REPLACE VIEW "compras"."diagnostic_work_center_inventory" AS
 SELECT "wci"."id",
    "p"."name" AS "material_name",
    "wc"."code" AS "work_center_code",
    "wci"."quantity_available",
    "wci"."quantity_consumed",
    "wci"."transferred_at"
   FROM (("produccion"."work_center_inventory" "wci"
     LEFT JOIN "public"."products" "p" ON (("wci"."material_id" = "p"."id")))
     LEFT JOIN "produccion"."work_centers" "wc" ON (("wci"."work_center_id" = "wc"."id")))
  ORDER BY "wci"."transferred_at" DESC
 LIMIT 50;


ALTER VIEW "compras"."diagnostic_work_center_inventory" OWNER TO "postgres";


COMMENT ON VIEW "compras"."diagnostic_work_center_inventory" IS 'Work center inventory entries to verify they exist';



CREATE TABLE IF NOT EXISTS "compras"."explosion_purchase_tracking" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "material_id" "uuid" NOT NULL,
    "requirement_date" "date" NOT NULL,
    "quantity_needed" numeric(12,3) NOT NULL,
    "quantity_ordered" numeric(12,3) DEFAULT 0,
    "quantity_received" numeric(12,3) DEFAULT 0,
    "status" character varying(20) DEFAULT 'not_ordered'::character varying NOT NULL,
    "purchase_order_item_id" "uuid",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "explosion_purchase_tracking_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['not_ordered'::character varying, 'ordered'::character varying, 'partially_received'::character varying, 'received'::character varying])::"text"[])))
);


ALTER TABLE "compras"."explosion_purchase_tracking" OWNER TO "postgres";


COMMENT ON TABLE "compras"."explosion_purchase_tracking" IS 'Tracks ordering status of material requirements from explosion analysis - permissions granted to authenticated users';



COMMENT ON COLUMN "compras"."explosion_purchase_tracking"."requirement_date" IS 'Date when material is needed (from explosion calculation)';



COMMENT ON COLUMN "compras"."explosion_purchase_tracking"."quantity_needed" IS 'Total quantity required for this date from explosion';



COMMENT ON COLUMN "compras"."explosion_purchase_tracking"."quantity_ordered" IS 'Quantity ordered via purchase orders';



COMMENT ON COLUMN "compras"."explosion_purchase_tracking"."quantity_received" IS 'Quantity already received in inventory';



COMMENT ON COLUMN "compras"."explosion_purchase_tracking"."status" IS 'Visual status: not_ordered (default), ordered (blue), partially_received, received (green)';



CREATE OR REPLACE VIEW "compras"."inventory_calculation_debug" AS
 SELECT "id",
    "name",
    COALESCE(( SELECT "sum"("inventory_movements"."quantity_change") AS "sum"
           FROM "compras"."inventory_movements"
          WHERE (("inventory_movements"."material_id" = "p"."id") AND (("inventory_movements"."movement_type")::"text" = ANY ((ARRAY['reception'::character varying, 'transfer'::character varying, 'return'::character varying])::"text"[])))), (0)::numeric) AS "warehouse_calculated",
    COALESCE(( SELECT "sum"("work_center_inventory"."quantity_available") AS "sum"
           FROM "produccion"."work_center_inventory"
          WHERE ("work_center_inventory"."material_id" = "p"."id")), (0)::numeric) AS "production_calculated",
    ( SELECT "count"(*) AS "count"
           FROM "compras"."inventory_movements"
          WHERE ("inventory_movements"."material_id" = "p"."id")) AS "total_movements"
   FROM "public"."products" "p"
  WHERE (("category")::"text" = 'mp'::"text")
  ORDER BY "name";


ALTER VIEW "compras"."inventory_calculation_debug" OWNER TO "postgres";


COMMENT ON VIEW "compras"."inventory_calculation_debug" IS 'Final warehouse vs production calculation comparison';



CREATE OR REPLACE VIEW "compras"."inventory_movements_debug" AS
 SELECT "im"."id",
    "p"."name" AS "material_name",
    "im"."movement_type",
    "im"."quantity_change",
    "im"."unit_of_measure",
    "im"."location",
    "im"."reference_type",
    "im"."notes",
    "im"."movement_date",
    "im"."created_at",
    "u"."email" AS "recorded_by_email"
   FROM (("compras"."inventory_movements" "im"
     LEFT JOIN "public"."products" "p" ON (("im"."material_id" = "p"."id")))
     LEFT JOIN "auth"."users" "u" ON (("im"."recorded_by" = "u"."id")))
  ORDER BY "im"."movement_date" DESC
 LIMIT 1000;


ALTER VIEW "compras"."inventory_movements_debug" OWNER TO "postgres";


COMMENT ON VIEW "compras"."inventory_movements_debug" IS 'All inventory movements with material names and details for debugging';



CREATE TABLE IF NOT EXISTS "compras"."material_explosion_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity_requested" numeric(12,3) NOT NULL,
    "calculation_date" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "created_by" "uuid",
    "notes" "text"
);


ALTER TABLE "compras"."material_explosion_history" OWNER TO "postgres";


COMMENT ON TABLE "compras"."material_explosion_history" IS 'History of BOM calculations for production planning';



CREATE TABLE IF NOT EXISTS "compras"."material_explosion_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "explosion_id" "uuid" NOT NULL,
    "material_id" "uuid" NOT NULL,
    "quantity_per_unit" numeric(12,3) NOT NULL,
    "total_quantity_needed" numeric(12,3) NOT NULL,
    "suggested_supplier_id" "uuid",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "compras"."material_explosion_items" OWNER TO "postgres";


COMMENT ON TABLE "compras"."material_explosion_items" IS 'Detailed results of each BOM calculation';



CREATE TABLE IF NOT EXISTS "compras"."material_inventory_balances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "material_id" "uuid" NOT NULL,
    "warehouse_stock" numeric(12,3) DEFAULT 0 NOT NULL,
    "production_stock" numeric(12,3) DEFAULT 0 NOT NULL,
    "total_stock" numeric(12,3) GENERATED ALWAYS AS (("warehouse_stock" + "production_stock")) STORED,
    "unit_of_measure" character varying(50) DEFAULT 'kg'::character varying NOT NULL,
    "last_movement_id" "uuid",
    "last_movement_date" timestamp with time zone,
    "last_updated_at" timestamp with time zone DEFAULT "now"(),
    "minimum_stock" numeric(12,3),
    "maximum_stock" numeric(12,3),
    "reorder_point" numeric(12,3),
    CONSTRAINT "positive_production_stock" CHECK (("production_stock" >= (0)::numeric)),
    CONSTRAINT "positive_warehouse_stock" CHECK (("warehouse_stock" >= (0)::numeric))
);


ALTER TABLE "compras"."material_inventory_balances" OWNER TO "postgres";


COMMENT ON TABLE "compras"."material_inventory_balances" IS 'Physical balance table for real-time inventory tracking. Maintains current stock levels per material and location, updated via triggers on inventory_movements.';



COMMENT ON COLUMN "compras"."material_inventory_balances"."warehouse_stock" IS 'Current stock quantity in warehouse/bodega';



COMMENT ON COLUMN "compras"."material_inventory_balances"."production_stock" IS 'Current stock quantity in production/work centers (sum of all work centers)';



COMMENT ON COLUMN "compras"."material_inventory_balances"."total_stock" IS 'Computed total stock (warehouse + production), stored for performance';



COMMENT ON COLUMN "compras"."material_inventory_balances"."last_movement_id" IS 'Reference to the last movement that updated this balance';



CREATE OR REPLACE VIEW "compras"."material_inventory_status" AS
 SELECT "p"."id",
    "p"."name",
    "p"."category",
    COALESCE("sum"(
        CASE
            WHEN (("im"."movement_type")::"text" = ANY ((ARRAY['reception'::character varying, 'adjustment'::character varying])::"text"[])) THEN "im"."quantity_change"
            ELSE (0)::numeric
        END), (0)::numeric) AS "current_stock",
    COALESCE("sum"(
        CASE
            WHEN (("im"."movement_type")::"text" = 'consumption'::"text") THEN "im"."quantity_change"
            ELSE (0)::numeric
        END), (0)::numeric) AS "total_consumed",
    COALESCE("sum"(
        CASE
            WHEN (("im"."movement_type")::"text" = 'waste'::"text") THEN "im"."quantity_change"
            ELSE (0)::numeric
        END), (0)::numeric) AS "total_waste",
    "max"("im"."movement_date") AS "last_movement_date",
    "count"(DISTINCT
        CASE
            WHEN ("mr"."id" IS NOT NULL) THEN "mr"."id"
            ELSE NULL::"uuid"
        END) AS "total_receptions"
   FROM (("public"."products" "p"
     LEFT JOIN "compras"."inventory_movements" "im" ON ((("p"."id" = "im"."material_id") AND (("im"."location")::"text" = 'Bodega'::"text"))))
     LEFT JOIN "compras"."material_receptions" "mr" ON (("p"."id" = "mr"."material_id")))
  GROUP BY "p"."id", "p"."name", "p"."category";


ALTER VIEW "compras"."material_inventory_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "compras"."material_returns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "return_number" character varying(20) NOT NULL,
    "work_center_id" "uuid" NOT NULL,
    "status" character varying(50) DEFAULT 'pending_receipt'::character varying NOT NULL,
    "requested_by" "uuid" NOT NULL,
    "accepted_by" "uuid",
    "requested_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" timestamp with time zone,
    "reason" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "compras"."material_returns" OWNER TO "postgres";


COMMENT ON TABLE "compras"."material_returns" IS 'Headers for material returns from work centers to central inventory';



CREATE TABLE IF NOT EXISTS "compras"."material_suppliers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "material_id" "uuid" NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "presentation" character varying(255),
    "unit_price" numeric(12,2) NOT NULL,
    "packaging_unit" integer DEFAULT 1,
    "lead_time_days" integer,
    "is_preferred" boolean DEFAULT false,
    "status" character varying(20) DEFAULT 'active'::character varying,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "packaging_weight_grams" integer,
    "supplier_commercial_name" character varying(255),
    CONSTRAINT "material_suppliers_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::"text"[])))
);


ALTER TABLE "compras"."material_suppliers" OWNER TO "postgres";


COMMENT ON TABLE "compras"."material_suppliers" IS 'Many-to-many relationship between materials and suppliers with pricing and packaging info';



COMMENT ON COLUMN "compras"."material_suppliers"."packaging_weight_grams" IS 'Total weight in grams of the packaging presentation. Used to calculate price per gram.';



COMMENT ON COLUMN "compras"."material_suppliers"."supplier_commercial_name" IS 'Commercial name that the supplier uses for this material. Can differ from the official product name.';



CREATE TABLE IF NOT EXISTS "compras"."material_transfers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transfer_number" character varying(20) NOT NULL,
    "work_center_id" "uuid" NOT NULL,
    "status" character varying(50) DEFAULT 'pending_receipt'::character varying NOT NULL,
    "requested_by" "uuid" NOT NULL,
    "received_by" "uuid",
    "requested_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "received_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "compras"."material_transfers" OWNER TO "postgres";


COMMENT ON TABLE "compras"."material_transfers" IS 'Headers for material transfers from central inventory to work centers';



CREATE OR REPLACE VIEW "compras"."mp_material_inventory_status" AS
 SELECT "p"."id",
    "p"."name",
    "p"."category",
    COALESCE("sum"(
        CASE
            WHEN (("im"."movement_type")::"text" = 'reception'::"text") THEN "im"."quantity_change"
            ELSE (0)::numeric
        END), (0)::numeric) AS "current_stock",
    COALESCE("sum"(
        CASE
            WHEN (("im"."movement_type")::"text" = 'consumption'::"text") THEN "im"."quantity_change"
            ELSE (0)::numeric
        END), (0)::numeric) AS "total_consumed",
    COALESCE("sum"(
        CASE
            WHEN (("im"."movement_type")::"text" = 'waste'::"text") THEN "im"."quantity_change"
            ELSE (0)::numeric
        END), (0)::numeric) AS "total_waste",
    "max"("im"."movement_date") AS "last_movement_date",
    "count"(DISTINCT
        CASE
            WHEN ("mr"."id" IS NOT NULL) THEN "mr"."id"
            ELSE NULL::"uuid"
        END) AS "total_receptions"
   FROM (("public"."products" "p"
     LEFT JOIN "compras"."inventory_movements" "im" ON (("p"."id" = "im"."material_id")))
     LEFT JOIN "compras"."material_receptions" "mr" ON (("p"."id" = "mr"."material_id")))
  WHERE ((("p"."category")::"text" = 'mp'::"text") AND (("im"."id" IS NOT NULL) OR ("mr"."id" IS NOT NULL)))
  GROUP BY "p"."id", "p"."name", "p"."category"
  ORDER BY "p"."name";


ALTER VIEW "compras"."mp_material_inventory_status" OWNER TO "postgres";


COMMENT ON VIEW "compras"."mp_material_inventory_status" IS 'Real-time inventory status for raw materials (mp category) only';



CREATE TABLE IF NOT EXISTS "compras"."return_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "return_id" "uuid" NOT NULL,
    "material_id" "uuid" NOT NULL,
    "quantity_returned" numeric(12,3) NOT NULL,
    "batch_number" character varying(100),
    "expiry_date" "date",
    "unit_of_measure" character varying(50) NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "compras"."return_items" OWNER TO "postgres";


COMMENT ON TABLE "compras"."return_items" IS 'Individual items within a return';



CREATE OR REPLACE VIEW "compras"."pending_returns_summary" AS
 SELECT "mr"."id",
    "mr"."return_number",
    "mr"."work_center_id",
    "wc"."code" AS "work_center_code",
    "wc"."name" AS "work_center_name",
    "count"("ri"."id") AS "item_count",
    "sum"("ri"."quantity_returned") AS "total_quantity_returned",
    "mr"."status",
    "mr"."requested_by",
    "mr"."reason",
    "mr"."requested_at",
    "mr"."accepted_at",
    "mr"."notes",
    "string_agg"(DISTINCT ("p"."name")::"text", ', '::"text") AS "materials_list"
   FROM ((("compras"."material_returns" "mr"
     LEFT JOIN "compras"."return_items" "ri" ON (("ri"."return_id" = "mr"."id")))
     LEFT JOIN "public"."products" "p" ON (("p"."id" = "ri"."material_id")))
     LEFT JOIN "produccion"."work_centers" "wc" ON (("wc"."id" = "mr"."work_center_id")))
  GROUP BY "mr"."id", "mr"."return_number", "mr"."work_center_id", "wc"."code", "wc"."name", "mr"."status", "mr"."requested_by", "mr"."reason", "mr"."requested_at", "mr"."accepted_at", "mr"."notes";


ALTER VIEW "compras"."pending_returns_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "compras"."transfer_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transfer_id" "uuid" NOT NULL,
    "material_id" "uuid" NOT NULL,
    "quantity_requested" numeric(12,3) NOT NULL,
    "quantity_received" numeric(12,3),
    "batch_number" character varying(100),
    "expiry_date" "date",
    "unit_of_measure" character varying(50) NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "compras"."transfer_items" OWNER TO "postgres";


COMMENT ON TABLE "compras"."transfer_items" IS 'Individual items within a transfer';



CREATE OR REPLACE VIEW "compras"."pending_transfers_summary" AS
 SELECT "mt"."id",
    "mt"."transfer_number",
    "mt"."work_center_id",
    "wc"."code" AS "work_center_code",
    "wc"."name" AS "work_center_name",
    "count"("ti"."id") AS "item_count",
    "sum"("ti"."quantity_requested") AS "total_quantity_requested",
    "count"(
        CASE
            WHEN ("ti"."quantity_received" IS NOT NULL) THEN 1
            ELSE NULL::integer
        END) AS "items_received",
    "mt"."status",
    "mt"."requested_by",
    "mt"."requested_at",
    "mt"."received_at",
    "mt"."notes",
    "string_agg"(DISTINCT ("p"."name")::"text", ', '::"text") AS "materials_list"
   FROM ((("compras"."material_transfers" "mt"
     LEFT JOIN "compras"."transfer_items" "ti" ON (("ti"."transfer_id" = "mt"."id")))
     LEFT JOIN "public"."products" "p" ON (("p"."id" = "ti"."material_id")))
     LEFT JOIN "produccion"."work_centers" "wc" ON (("wc"."id" = "mt"."work_center_id")))
  GROUP BY "mt"."id", "mt"."transfer_number", "mt"."work_center_id", "wc"."code", "wc"."name", "mt"."status", "mt"."requested_by", "mt"."requested_at", "mt"."received_at", "mt"."notes";


ALTER VIEW "compras"."pending_transfers_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "compras"."production_inventory_debug" AS
 SELECT "p"."id",
    "p"."name",
    "wc"."code" AS "work_center_code",
    "wc"."name" AS "work_center_name",
    "wci"."quantity_available",
    "wci"."quantity_consumed",
    "wci"."transferred_at",
    "wci"."batch_number",
    "wci"."expiry_date"
   FROM (("public"."products" "p"
     LEFT JOIN "produccion"."work_center_inventory" "wci" ON (("p"."id" = "wci"."material_id")))
     LEFT JOIN "produccion"."work_centers" "wc" ON (("wci"."work_center_id" = "wc"."id")))
  WHERE (("p"."category")::"text" = 'mp'::"text")
  ORDER BY "p"."name", "wc"."code";


ALTER VIEW "compras"."production_inventory_debug" OWNER TO "postgres";


COMMENT ON VIEW "compras"."production_inventory_debug" IS 'Production inventory details from work centers';



CREATE OR REPLACE VIEW "compras"."production_inventory_status" AS
 SELECT "p"."id" AS "material_id",
    "p"."name",
    "p"."category",
    COALESCE("sum"(
        CASE
            WHEN ((("im"."movement_type")::"text" = ANY ((ARRAY['transfer'::character varying, 'adjustment'::character varying])::"text"[])) AND (("im"."location")::"text" = 'Producción'::"text")) THEN "im"."quantity_change"
            ELSE (0)::numeric
        END), (0)::numeric) AS "current_stock",
    0 AS "minimum_stock"
   FROM ("public"."products" "p"
     LEFT JOIN "compras"."inventory_movements" "im" ON (("p"."id" = "im"."material_id")))
  WHERE (("p"."category")::"text" = 'mp'::"text")
  GROUP BY "p"."id", "p"."name", "p"."category";


ALTER VIEW "compras"."production_inventory_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "compras"."purchase_order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "purchase_order_id" "uuid" NOT NULL,
    "material_id" "uuid" NOT NULL,
    "material_supplier_id" "uuid",
    "quantity_ordered" numeric(12,3) NOT NULL,
    "quantity_received" numeric(12,3) DEFAULT 0,
    "unit_price" numeric(12,2) NOT NULL,
    "subtotal" numeric(12,2) GENERATED ALWAYS AS (("quantity_ordered" * "unit_price")) STORED,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "compras"."purchase_order_items" OWNER TO "postgres";


COMMENT ON TABLE "compras"."purchase_order_items" IS 'Individual items in a purchase order';



CREATE TABLE IF NOT EXISTS "compras"."purchase_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_number" character varying(50) NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "status" character varying(30) DEFAULT 'pending'::character varying,
    "order_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "expected_delivery_date" "date",
    "actual_delivery_date" "date",
    "total_amount" numeric(12,2) DEFAULT 0,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "purchase_orders_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'ordered'::character varying, 'partially_received'::character varying, 'received'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "compras"."purchase_orders" OWNER TO "postgres";


COMMENT ON TABLE "compras"."purchase_orders" IS 'Purchase orders for materials';



CREATE TABLE IF NOT EXISTS "compras"."reception_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reception_id" "uuid" NOT NULL,
    "purchase_order_item_id" "uuid",
    "material_id" "uuid" NOT NULL,
    "quantity_received" numeric(12,3) NOT NULL,
    "batch_number" character varying(100),
    "lot_number" character varying(100),
    "expiry_date" "date",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "compras"."reception_items" OWNER TO "postgres";


COMMENT ON TABLE "compras"."reception_items" IS 'Individual items within a material reception with detailed tracking';



COMMENT ON COLUMN "compras"."reception_items"."batch_number" IS 'Batch or lot number from supplier';



COMMENT ON COLUMN "compras"."reception_items"."expiry_date" IS 'Expiry/shelf date for the received material';



CREATE OR REPLACE VIEW "compras"."return_item_details" AS
 SELECT "ri"."id",
    "ri"."return_id",
    "mr"."return_number",
    "mr"."work_center_id",
    "wc"."name" AS "work_center_name",
    "ri"."material_id",
    "p"."name" AS "material_name",
    "p"."unit" AS "unit_of_measure",
    "ri"."quantity_returned",
    "ri"."batch_number",
    "ri"."expiry_date",
    "mr"."status",
    "mr"."reason",
    "mr"."requested_at",
    "mr"."accepted_at",
    "ri"."notes"
   FROM ((("compras"."return_items" "ri"
     LEFT JOIN "compras"."material_returns" "mr" ON (("mr"."id" = "ri"."return_id")))
     LEFT JOIN "produccion"."work_centers" "wc" ON (("wc"."id" = "mr"."work_center_id")))
     LEFT JOIN "public"."products" "p" ON (("p"."id" = "ri"."material_id")));


ALTER VIEW "compras"."return_item_details" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "compras"."return_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "compras"."return_number_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "compras"."suppliers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_name" character varying(255) NOT NULL,
    "nit" character varying(50) NOT NULL,
    "address" "text",
    "contact_person_name" character varying(255),
    "contact_phone" character varying(50),
    "contact_email" character varying(255),
    "status" character varying(20) DEFAULT 'active'::character varying,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "delivery_days" "jsonb" DEFAULT '{"friday": false, "monday": false, "sunday": false, "tuesday": false, "saturday": false, "thursday": false, "wednesday": false}'::"jsonb",
    "access_token" character varying(255),
    CONSTRAINT "suppliers_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::"text"[])))
);


ALTER TABLE "compras"."suppliers" OWNER TO "postgres";


COMMENT ON TABLE "compras"."suppliers" IS 'Suppliers for raw materials. Anonymous users can SELECT (for NIT verification) and INSERT (for registration).';



COMMENT ON COLUMN "compras"."suppliers"."delivery_days" IS 'Days of the week when the supplier delivers. JSON object with day names as keys and boolean values';



COMMENT ON COLUMN "compras"."suppliers"."access_token" IS 'Unique access token for supplier portal access. Automatically generated on insert.';



CREATE OR REPLACE VIEW "compras"."transfer_item_details" AS
 SELECT "ti"."id",
    "ti"."transfer_id",
    "mt"."transfer_number",
    "mt"."work_center_id",
    "wc"."name" AS "work_center_name",
    "ti"."material_id",
    "p"."name" AS "material_name",
    "p"."unit" AS "unit_of_measure",
    "ti"."quantity_requested",
    "ti"."quantity_received",
    COALESCE("ti"."quantity_received", "ti"."quantity_requested") AS "quantity_final",
    "ti"."batch_number",
    "ti"."expiry_date",
    "mt"."status",
    "mt"."requested_at",
    "mt"."received_at",
    "ti"."notes"
   FROM ((("compras"."transfer_items" "ti"
     LEFT JOIN "compras"."material_transfers" "mt" ON (("mt"."id" = "ti"."transfer_id")))
     LEFT JOIN "produccion"."work_centers" "wc" ON (("wc"."id" = "mt"."work_center_id")))
     LEFT JOIN "public"."products" "p" ON (("p"."id" = "ti"."material_id")));


ALTER VIEW "compras"."transfer_item_details" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "compras"."transfer_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "compras"."transfer_number_seq" OWNER TO "postgres";


CREATE OR REPLACE VIEW "compras"."warehouse_inventory_debug" AS
 WITH "movement_details" AS (
         SELECT "inventory_movements"."material_id",
            "inventory_movements"."movement_type",
            "inventory_movements"."quantity_change",
            "inventory_movements"."movement_date"
           FROM "compras"."inventory_movements"
          WHERE (("inventory_movements"."movement_type")::"text" = ANY ((ARRAY['reception'::character varying, 'transfer'::character varying, 'return'::character varying])::"text"[]))
        ), "summary_by_type" AS (
         SELECT "p"."id",
            "p"."name",
            'reception'::"text" AS "type",
            "sum"(
                CASE
                    WHEN (("md"."movement_type")::"text" = 'reception'::"text") THEN "md"."quantity_change"
                    ELSE (0)::numeric
                END) AS "qty"
           FROM ("public"."products" "p"
             LEFT JOIN "movement_details" "md" ON (("p"."id" = "md"."material_id")))
          WHERE (("p"."category")::"text" = 'mp'::"text")
          GROUP BY "p"."id", "p"."name"
        UNION ALL
         SELECT "p"."id",
            "p"."name",
            'transfer'::"text" AS "type",
            "sum"(
                CASE
                    WHEN (("md"."movement_type")::"text" = 'transfer'::"text") THEN "md"."quantity_change"
                    ELSE (0)::numeric
                END) AS "qty"
           FROM ("public"."products" "p"
             LEFT JOIN "movement_details" "md" ON (("p"."id" = "md"."material_id")))
          WHERE (("p"."category")::"text" = 'mp'::"text")
          GROUP BY "p"."id", "p"."name"
        UNION ALL
         SELECT "p"."id",
            "p"."name",
            'return'::"text" AS "type",
            "sum"(
                CASE
                    WHEN (("md"."movement_type")::"text" = 'return'::"text") THEN "md"."quantity_change"
                    ELSE (0)::numeric
                END) AS "qty"
           FROM ("public"."products" "p"
             LEFT JOIN "movement_details" "md" ON (("p"."id" = "md"."material_id")))
          WHERE (("p"."category")::"text" = 'mp'::"text")
          GROUP BY "p"."id", "p"."name"
        )
 SELECT "id",
    "name",
    "type",
    COALESCE("qty", (0)::numeric) AS "quantity"
   FROM "summary_by_type"
  WHERE (("qty" IS NOT NULL) OR ("type" = 'reception'::"text"))
  ORDER BY "name",
        CASE "type"
            WHEN 'reception'::"text" THEN 1
            WHEN 'transfer'::"text" THEN 2
            WHEN 'return'::"text" THEN 3
            ELSE NULL::integer
        END;


ALTER VIEW "compras"."warehouse_inventory_debug" OWNER TO "postgres";


COMMENT ON VIEW "compras"."warehouse_inventory_debug" IS 'Warehouse inventory calculation breakdown by movement type';



CREATE OR REPLACE VIEW "compras"."warehouse_inventory_status" AS
 WITH "movement_summary" AS (
         SELECT "inventory_movements"."material_id",
            "sum"("inventory_movements"."quantity_change") AS "net_warehouse_stock",
            "max"("inventory_movements"."movement_date") AS "last_movement_date"
           FROM "compras"."inventory_movements"
          WHERE (("inventory_movements"."movement_type")::"text" = ANY ((ARRAY['reception'::character varying, 'transfer'::character varying, 'return'::character varying])::"text"[]))
          GROUP BY "inventory_movements"."material_id"
        )
 SELECT "p"."id",
    "p"."name",
    "p"."category",
    "p"."unit",
    COALESCE("ms"."net_warehouse_stock", (0)::numeric) AS "current_stock",
    0 AS "total_consumed",
    0 AS "total_waste",
    "ms"."last_movement_date",
    COALESCE("ms"."net_warehouse_stock", (0)::numeric) AS "total_receptions"
   FROM ("public"."products" "p"
     LEFT JOIN "movement_summary" "ms" ON (("p"."id" = "ms"."material_id")))
  WHERE ((("p"."category")::"text" = 'MP'::"text") AND ("ms"."material_id" IS NOT NULL))
  ORDER BY "p"."name";


ALTER VIEW "compras"."warehouse_inventory_status" OWNER TO "postgres";


COMMENT ON VIEW "compras"."warehouse_inventory_status" IS 'Warehouse inventory (bodega) - MP products only';



CREATE TABLE IF NOT EXISTS "inventario"."inventory_balances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "location_id" "uuid" NOT NULL,
    "quantity_on_hand" numeric(12,3) DEFAULT 0 NOT NULL,
    "last_movement_id" "uuid",
    "last_updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "inventario"."inventory_balances" OWNER TO "postgres";


COMMENT ON TABLE "inventario"."inventory_balances" IS 'Inventory balances by product and location with quantity check constraint';



COMMENT ON COLUMN "inventario"."inventory_balances"."quantity_on_hand" IS 'Current available quantity. Can be negative if dispatch_inventory_config.allow_dispatch_without_inventory is enabled.';



CREATE TABLE IF NOT EXISTS "inventario"."inventory_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "movement_number" character varying(50) NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity" numeric(12,3) NOT NULL,
    "unit_of_measure" character varying(50) NOT NULL,
    "movement_type" character varying(20) NOT NULL,
    "reason_type" character varying(50) NOT NULL,
    "location_id_from" "uuid",
    "location_id_to" "uuid",
    "linked_movement_id" "uuid",
    "balance_after" numeric(12,3),
    "reference_id" "uuid",
    "reference_type" character varying(50),
    "notes" "text",
    "recorded_by" "uuid" NOT NULL,
    "movement_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "batch_number" character varying(100),
    "expiry_date" "date",
    "status" character varying(20) DEFAULT 'completed'::character varying,
    "received_at" timestamp with time zone,
    "received_by" "uuid",
    CONSTRAINT "inventory_movements_movement_type_check" CHECK ((("movement_type")::"text" = ANY ((ARRAY['IN'::character varying, 'OUT'::character varying, 'TRANSFER_IN'::character varying, 'TRANSFER_OUT'::character varying])::"text"[]))),
    CONSTRAINT "inventory_movements_quantity_check" CHECK (("quantity" > (0)::numeric)),
    CONSTRAINT "inventory_movements_reason_type_check" CHECK ((("reason_type")::"text" = ANY ((ARRAY['purchase'::character varying, 'production'::character varying, 'sale'::character varying, 'consumption'::character varying, 'adjustment'::character varying, 'return'::character varying, 'waste'::character varying, 'transfer'::character varying, 'initial'::character varying])::"text"[]))),
    CONSTRAINT "inventory_movements_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'cancelled'::character varying])::"text"[]))),
    CONSTRAINT "valid_movement_locations" CHECK ((((("movement_type")::"text" = 'IN'::"text") AND ("location_id_from" IS NULL) AND ("location_id_to" IS NOT NULL)) OR ((("movement_type")::"text" = 'OUT'::"text") AND ("location_id_from" IS NOT NULL) AND ("location_id_to" IS NULL)) OR ((("movement_type")::"text" = ANY ((ARRAY['TRANSFER_IN'::character varying, 'TRANSFER_OUT'::character varying])::"text"[])) AND ("location_id_from" IS NOT NULL) AND ("location_id_to" IS NOT NULL))))
);


ALTER TABLE "inventario"."inventory_movements" OWNER TO "postgres";


COMMENT ON TABLE "inventario"."inventory_movements" IS 'Unified inventory movement tracking - single source of truth for all inventory transactions';



COMMENT ON COLUMN "inventario"."inventory_movements"."movement_type" IS 'Direction of movement: IN (increase), OUT (decrease), TRANSFER_IN/OUT (location change)';



COMMENT ON COLUMN "inventario"."inventory_movements"."reason_type" IS 'Business reason for movement: purchase, production, sale, consumption, adjustment, return, waste, transfer, initial';



COMMENT ON COLUMN "inventario"."inventory_movements"."linked_movement_id" IS 'For transfers: links TRANSFER_OUT with TRANSFER_IN';



COMMENT ON COLUMN "inventario"."inventory_movements"."balance_after" IS 'Balance at the affected location after this movement. Can be negative if dispatch_inventory_config.allow_dispatch_without_inventory is enabled.';



COMMENT ON COLUMN "inventario"."inventory_movements"."batch_number" IS 'Batch/lot number from supplier';



COMMENT ON COLUMN "inventario"."inventory_movements"."expiry_date" IS 'Expiration date for perishable products (used for FEFO and alerts)';



COMMENT ON COLUMN "inventario"."inventory_movements"."status" IS 'Movement status: pending (awaiting confirmation), completed (confirmed), cancelled';



COMMENT ON COLUMN "inventario"."inventory_movements"."received_at" IS 'Timestamp when transfer was received/confirmed at destination';



COMMENT ON COLUMN "inventario"."inventory_movements"."received_by" IS 'User who confirmed receipt of the transfer';



CREATE TABLE IF NOT EXISTS "inventario"."locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" character varying(50) NOT NULL,
    "name" character varying(200) NOT NULL,
    "location_type" character varying(20) NOT NULL,
    "parent_id" "uuid",
    "path" "text",
    "level" integer NOT NULL,
    "is_virtual" boolean DEFAULT false,
    "bin_type" character varying(30),
    "is_active" boolean DEFAULT true,
    "capacity" numeric(12,3),
    "temperature_control" boolean DEFAULT false,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "locations_bin_type_check" CHECK ((("bin_type")::"text" = ANY ((ARRAY['storage'::character varying, 'receiving'::character varying, 'shipping'::character varying, 'production'::character varying, 'general'::character varying, 'quarantine'::character varying, 'staging'::character varying])::"text"[]))),
    CONSTRAINT "locations_level_check" CHECK ((("level" >= 1) AND ("level" <= 4))),
    CONSTRAINT "locations_location_type_check" CHECK ((("location_type")::"text" = ANY ((ARRAY['warehouse'::character varying, 'zone'::character varying, 'aisle'::character varying, 'bin'::character varying])::"text"[]))),
    CONSTRAINT "valid_parent_hierarchy" CHECK (((("level" = 1) AND ("parent_id" IS NULL)) OR (("level" > 1) AND ("parent_id" IS NOT NULL))))
);


ALTER TABLE "inventario"."locations" OWNER TO "postgres";


COMMENT ON TABLE "inventario"."locations" IS 'Storage locations including warehouses, zones, and bins. WH3-DEFECTS is for bad/defective units from production.';



COMMENT ON COLUMN "inventario"."locations"."code" IS 'Unique location code (WH1, Z1-A, BIN-001, WH1-GENERAL)';



COMMENT ON COLUMN "inventario"."locations"."path" IS 'Materialized path for hierarchical queries (/WH1/Z1/A1/BIN-001)';



COMMENT ON COLUMN "inventario"."locations"."is_virtual" IS 'True for special bins like WH1-GENERAL, WH1-RECEIVING (represent general areas)';



COMMENT ON COLUMN "inventario"."locations"."bin_type" IS 'Type of special bin: storage, receiving, shipping, production, general, quarantine, staging';



CREATE SEQUENCE IF NOT EXISTS "inventario"."movement_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "inventario"."movement_number_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "produccion"."bill_of_materials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid",
    "quantity_needed" numeric(12,3) NOT NULL,
    "unit_name" character varying(100) NOT NULL,
    "unit_equivalence_grams" numeric(12,3) NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "material_id" "uuid",
    "operation_id" "uuid",
    "tiempo_reposo_horas" numeric(8,2),
    "original_quantity" numeric(12,3)
);


ALTER TABLE "produccion"."bill_of_materials" OWNER TO "postgres";


COMMENT ON TABLE "produccion"."bill_of_materials" IS 'Lista de materiales requeridos por producto con equivalencias personalizadas';



COMMENT ON COLUMN "produccion"."bill_of_materials"."quantity_needed" IS 'Normalized quantity used in calculations. When is_recipe_by_grams is true, this equals original_quantity / sum(all_original_quantities)';



COMMENT ON COLUMN "produccion"."bill_of_materials"."operation_id" IS 'Operación en la que se consume este material. Un producto puede consumir diferentes materiales en diferentes operaciones.';



COMMENT ON COLUMN "produccion"."bill_of_materials"."tiempo_reposo_horas" IS 'Tiempo de reposo en horas cuando el material es un PP (Producto en Proceso)';



COMMENT ON COLUMN "produccion"."bill_of_materials"."original_quantity" IS 'Original quantity entered by user before normalization (shown in UI)';



CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "product_id" "uuid",
    "quantity_requested" integer NOT NULL,
    "quantity_available" integer DEFAULT 0,
    "quantity_missing" integer DEFAULT 0,
    "quantity_dispatched" integer DEFAULT 0,
    "quantity_delivered" integer DEFAULT 0,
    "quantity_returned" integer DEFAULT 0,
    "availability_status" character varying(50) DEFAULT 'pending'::character varying,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "unit_price" numeric,
    "quantity_completed" integer DEFAULT 0,
    "lote" "text",
    CONSTRAINT "order_items_availability_status_check" CHECK ((("availability_status")::"text" = ANY ((ARRAY['pending'::character varying, 'available'::character varying, 'partial'::character varying, 'unavailable'::character varying])::"text"[])))
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


COMMENT ON COLUMN "public"."order_items"."quantity_completed" IS 'Quantity completed during area 2 review, displayed in dispatch center';



COMMENT ON COLUMN "public"."order_items"."lote" IS 'Lote/batch number for the product item';



CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_number" character varying(100) NOT NULL,
    "client_id" "uuid",
    "expected_delivery_date" "date" NOT NULL,
    "observations" "text",
    "status" character varying(50) DEFAULT 'received'::character varying NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "total_value" numeric,
    "assigned_route_id" "uuid",
    "branch_id" "uuid",
    "pdf_filename" character varying(255),
    "purchase_order_number" character varying(100),
    "is_invoiced" boolean DEFAULT false,
    "invoiced_at" timestamp without time zone,
    "invoice_export_id" "uuid",
    "requires_remision" boolean DEFAULT false,
    "is_invoiced_from_remision" boolean DEFAULT false,
    "remision_invoiced_at" timestamp without time zone,
    "requested_delivery_date" "date",
    "subtotal" numeric(10,2),
    "vat_amount" numeric(10,2),
    "has_pending_missing" boolean DEFAULT false,
    CONSTRAINT "orders_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['received'::character varying, 'review_area1'::character varying, 'review_area2'::character varying, 'ready_dispatch'::character varying, 'dispatched'::character varying, 'in_delivery'::character varying, 'delivered'::character varying, 'partially_delivered'::character varying, 'returned'::character varying, 'remisionado'::character varying, 'pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'cancelled'::character varying, 'on_hold'::character varying])::"text"[])))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


COMMENT ON COLUMN "public"."orders"."expected_delivery_date" IS 'Confirmed delivery date after adjustment based on client frequency (if applicable)';



COMMENT ON COLUMN "public"."orders"."purchase_order_number" IS 'Client purchase order number for World Office export';



COMMENT ON COLUMN "public"."orders"."is_invoiced" IS 'Flag indicating if order has been invoiced/exported to World Office';



COMMENT ON COLUMN "public"."orders"."invoiced_at" IS 'Timestamp when order was invoiced';



COMMENT ON COLUMN "public"."orders"."invoice_export_id" IS 'Reference to the export operation that invoiced this order';



COMMENT ON COLUMN "public"."orders"."requires_remision" IS 'Override por pedido específico para requerir remisión independiente del tipo de cliente';



COMMENT ON COLUMN "public"."orders"."is_invoiced_from_remision" IS 'Flag para indicar que este pedido fue facturado después de haber sido remisionado';



COMMENT ON COLUMN "public"."orders"."remision_invoiced_at" IS 'Timestamp cuando el pedido remisionado fue facturado';



COMMENT ON COLUMN "public"."orders"."requested_delivery_date" IS 'Original delivery date requested before automatic adjustment based on client frequency';



COMMENT ON COLUMN "public"."orders"."subtotal" IS 'Subtotal del pedido antes de IVA';



COMMENT ON COLUMN "public"."orders"."vat_amount" IS 'Monto del IVA (19%)';



COMMENT ON COLUMN "public"."orders"."has_pending_missing" IS 'Indicates if the order has been sent to dispatch with missing items that need to be completed';



CREATE TABLE IF NOT EXISTS "public"."product_config" (
    "id" integer NOT NULL,
    "product_id" "uuid",
    "units_per_package" integer DEFAULT 1,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."product_config" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "produccion"."daily_demand_history" AS
 SELECT "oi"."product_id",
    (EXTRACT(dow FROM "o"."expected_delivery_date"))::integer AS "day_of_week",
    "o"."expected_delivery_date" AS "delivery_date",
    ("sum"(((COALESCE("oi"."quantity_requested", 0) - COALESCE("oi"."quantity_returned", 0)) * COALESCE("pc"."units_per_package", 1))))::integer AS "demand_units"
   FROM (("public"."order_items" "oi"
     JOIN "public"."orders" "o" ON (("o"."id" = "oi"."order_id")))
     LEFT JOIN "public"."product_config" "pc" ON (("pc"."product_id" = "oi"."product_id")))
  WHERE ((("o"."status")::"text" <> ALL ((ARRAY['cancelled'::character varying, 'returned'::character varying])::"text"[])) AND ("o"."expected_delivery_date" IS NOT NULL))
  GROUP BY "oi"."product_id", (EXTRACT(dow FROM "o"."expected_delivery_date")), "o"."expected_delivery_date"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "produccion"."daily_demand_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "produccion"."material_consumptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shift_production_id" "uuid",
    "quantity_consumed" numeric(12,3) NOT NULL,
    "consumption_type" character varying(50) DEFAULT 'consumed'::character varying,
    "recorded_at" timestamp without time zone DEFAULT "now"(),
    "recorded_by" "uuid",
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "material_id" "uuid",
    CONSTRAINT "material_consumptions_consumption_type_check" CHECK ((("consumption_type")::"text" = ANY ((ARRAY['consumed'::character varying, 'wasted'::character varying])::"text"[])))
);


ALTER TABLE "produccion"."material_consumptions" OWNER TO "postgres";


COMMENT ON TABLE "produccion"."material_consumptions" IS 'Registros de consumo real de materiales';



CREATE TABLE IF NOT EXISTS "produccion"."operations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" character varying(50) NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "color" character varying(50),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "display_order" integer DEFAULT 0
);


ALTER TABLE "produccion"."operations" OWNER TO "postgres";


COMMENT ON TABLE "produccion"."operations" IS 'Catálogo de operaciones/procesos de producción';



COMMENT ON COLUMN "produccion"."operations"."display_order" IS 'Orden de visualización en el plan maestro (1, 2, 3, ...)';



CREATE OR REPLACE VIEW "produccion"."pending_returns_by_center" AS
 SELECT "mr"."work_center_id",
    "wc"."code" AS "work_center_code",
    "wc"."name" AS "work_center_name",
    "count"("mr"."id") AS "total_returns",
    "count"(
        CASE
            WHEN (("mr"."status")::"text" = 'pending_receipt'::"text") THEN 1
            ELSE NULL::integer
        END) AS "pending_count",
    "count"(
        CASE
            WHEN (("mr"."status")::"text" = 'received'::"text") THEN 1
            ELSE NULL::integer
        END) AS "received_count",
    "sum"("ri"."quantity_returned") AS "total_quantity_returned"
   FROM (("compras"."material_returns" "mr"
     LEFT JOIN "produccion"."work_centers" "wc" ON (("wc"."id" = "mr"."work_center_id")))
     LEFT JOIN "compras"."return_items" "ri" ON (("ri"."return_id" = "mr"."id")))
  GROUP BY "mr"."work_center_id", "wc"."code", "wc"."name";


ALTER VIEW "produccion"."pending_returns_by_center" OWNER TO "postgres";


CREATE OR REPLACE VIEW "produccion"."pending_transfers_by_center" AS
 SELECT "mt"."id",
    "mt"."transfer_number",
    "mt"."work_center_id",
    "wc"."code" AS "work_center_code",
    "wc"."name" AS "work_center_name",
    "count"(
        CASE
            WHEN (("mt"."status")::"text" = 'pending_receipt'::"text") THEN 1
            ELSE NULL::integer
        END) AS "pending_count",
    "count"(
        CASE
            WHEN (("mt"."status")::"text" = 'partially_received'::"text") THEN 1
            ELSE NULL::integer
        END) AS "partially_received_count",
    "count"(
        CASE
            WHEN (("mt"."status")::"text" = 'received'::"text") THEN 1
            ELSE NULL::integer
        END) AS "received_count",
    "max"("mt"."requested_at") AS "last_transfer_date"
   FROM ("compras"."material_transfers" "mt"
     LEFT JOIN "produccion"."work_centers" "wc" ON (("wc"."id" = "mt"."work_center_id")))
  GROUP BY "mt"."id", "mt"."transfer_number", "mt"."work_center_id", "wc"."code", "wc"."name";


ALTER VIEW "produccion"."pending_transfers_by_center" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "produccion"."product_work_center_mapping" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "operation_id" "uuid" NOT NULL,
    "work_center_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "produccion"."product_work_center_mapping" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "produccion"."production_order_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "produccion"."production_order_number_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "produccion"."production_productivity" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid",
    "work_center_id" "uuid",
    "units_per_hour" numeric(10,2) NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "operation_id" "uuid",
    "tiempo_minimo_fijo" numeric(10,2),
    "usa_tiempo_fijo" boolean DEFAULT false,
    "tiempo_labor_por_carro" numeric(10,2)
);


ALTER TABLE "produccion"."production_productivity" OWNER TO "postgres";


COMMENT ON TABLE "produccion"."production_productivity" IS 'Parámetros de productividad teórica por producto y centro';



COMMENT ON COLUMN "produccion"."production_productivity"."operation_id" IS 'Operación para la cual se define la productividad (unidades por hora)';



COMMENT ON COLUMN "produccion"."production_productivity"."tiempo_minimo_fijo" IS 'Tiempo fijo en minutos (ej: 60 min en horno). Solo aplica si usa_tiempo_fijo = true';



COMMENT ON COLUMN "produccion"."production_productivity"."usa_tiempo_fijo" IS 'TRUE: usar tiempo_minimo_fijo. FALSE: usar units_per_hour con productividad';



COMMENT ON COLUMN "produccion"."production_productivity"."tiempo_labor_por_carro" IS 'Tiempo que ocupa una persona por carro (ej: 10 min decorando un carro)';



CREATE TABLE IF NOT EXISTS "produccion"."production_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shift_production_id" "uuid",
    "good_units" integer DEFAULT 0,
    "bad_units" integer DEFAULT 0,
    "recorded_at" timestamp without time zone DEFAULT "now"(),
    "recorded_by" "uuid",
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "produccion"."production_records" OWNER TO "postgres";


COMMENT ON TABLE "produccion"."production_records" IS 'Registros múltiples de unidades producidas';



CREATE TABLE IF NOT EXISTS "produccion"."production_route_tracking" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid",
    "work_center_id" "uuid",
    "shift_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "units_processed" integer DEFAULT 0,
    "units_pending" integer DEFAULT 0,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "produccion"."production_route_tracking" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "produccion"."production_routes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid",
    "work_center_id" "uuid",
    "sequence_order" integer NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "produccion"."production_routes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "produccion"."production_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "resource_id" "text" NOT NULL,
    "product_id" "text" NOT NULL,
    "quantity" integer DEFAULT 0 NOT NULL,
    "start_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "shift_number" integer,
    "week_plan_id" "uuid",
    "day_of_week" integer,
    "production_order_number" integer,
    "duration_hours" numeric(10,2),
    "cascade_source_id" "uuid",
    "cascade_level" integer DEFAULT 0,
    "status" "text" DEFAULT 'scheduled'::"text",
    CONSTRAINT "production_schedules_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6))),
    CONSTRAINT "production_schedules_shift_number_check" CHECK ((("shift_number" >= 1) AND ("shift_number" <= 3))),
    CONSTRAINT "valid_date_range" CHECK (("end_date" > "start_date")),
    CONSTRAINT "valid_day_of_week" CHECK ((("day_of_week" IS NULL) OR (("day_of_week" >= 0) AND ("day_of_week" <= 6)))),
    CONSTRAINT "valid_shift_number" CHECK ((("shift_number" IS NULL) OR (("shift_number" >= 1) AND ("shift_number" <= 3))))
);


ALTER TABLE "produccion"."production_schedules" OWNER TO "postgres";


COMMENT ON COLUMN "produccion"."production_schedules"."production_order_number" IS 'Auto-incrementing order number that links all operations in a cascading production flow. All operations created together share the same order number.';



CREATE TABLE IF NOT EXISTS "produccion"."production_shifts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "work_center_id" "uuid",
    "shift_name" character varying(255) NOT NULL,
    "started_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "ended_at" timestamp without time zone,
    "status" character varying(50) DEFAULT 'active'::character varying,
    "created_by" "uuid",
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "production_shifts_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'paused'::character varying, 'completed'::character varying])::"text"[])))
);


ALTER TABLE "produccion"."production_shifts" OWNER TO "postgres";


COMMENT ON TABLE "produccion"."production_shifts" IS 'Turnos de producción por centro de trabajo';



CREATE TABLE IF NOT EXISTS "produccion"."shift_definitions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(50) NOT NULL,
    "start_hour" integer NOT NULL,
    "duration_hours" integer DEFAULT 8 NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "shift_definitions_duration_hours_check" CHECK ((("duration_hours" > 0) AND ("duration_hours" <= 24))),
    CONSTRAINT "shift_definitions_start_hour_check" CHECK ((("start_hour" >= 0) AND ("start_hour" < 24)))
);


ALTER TABLE "produccion"."shift_definitions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "produccion"."shift_productions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shift_id" "uuid",
    "product_id" "uuid",
    "started_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "ended_at" timestamp without time zone,
    "status" character varying(50) DEFAULT 'active'::character varying,
    "total_good_units" integer DEFAULT 0,
    "total_bad_units" integer DEFAULT 0,
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "received_to_inventory" boolean DEFAULT false NOT NULL,
    CONSTRAINT "shift_productions_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'paused'::character varying, 'completed'::character varying])::"text"[])))
);


ALTER TABLE "produccion"."shift_productions" OWNER TO "postgres";


COMMENT ON TABLE "produccion"."shift_productions" IS 'Producciones específicas por producto dentro de un turno';



COMMENT ON COLUMN "produccion"."shift_productions"."received_to_inventory" IS 'Indicates whether this production has been received into inventory (WH3)';



CREATE TABLE IF NOT EXISTS "produccion"."weekly_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "week_start_date" "date" NOT NULL,
    "week_number" integer GENERATED ALWAYS AS ((EXTRACT(week FROM "week_start_date"))::integer) STORED,
    "year" integer GENERATED ALWAYS AS ((EXTRACT(year FROM "week_start_date"))::integer) STORED,
    "status" character varying(20) DEFAULT 'draft'::character varying,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "weekly_plans_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['draft'::character varying, 'active'::character varying, 'completed'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "produccion"."weekly_plans" OWNER TO "postgres";


CREATE OR REPLACE VIEW "produccion"."work_center_inventory_status" AS
 SELECT "wci"."id",
    "wci"."work_center_id",
    "wc"."code" AS "work_center_code",
    "wc"."name" AS "work_center_name",
    "wci"."material_id",
    "p"."name" AS "material_name",
    "p"."unit" AS "unit_of_measure",
    "wci"."quantity_available",
    "wci"."quantity_consumed",
    ("wci"."quantity_available" - "wci"."quantity_consumed") AS "net_available",
    "wci"."batch_number",
    "wci"."expiry_date",
    "wci"."transferred_at",
    "wci"."created_at",
    "wci"."updated_at"
   FROM (("produccion"."work_center_inventory" "wci"
     LEFT JOIN "produccion"."work_centers" "wc" ON (("wc"."id" = "wci"."work_center_id")))
     LEFT JOIN "public"."products" "p" ON (("p"."id" = "wci"."material_id")))
  ORDER BY "wci"."work_center_id", "wci"."material_id";


ALTER VIEW "produccion"."work_center_inventory_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "produccion"."work_center_operations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "work_center_id" "uuid" NOT NULL,
    "operation_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "produccion"."work_center_operations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "produccion"."work_center_staffing" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "work_center_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "shift_number" integer NOT NULL,
    "staff_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "work_center_staffing_shift_number_check" CHECK (("shift_number" = ANY (ARRAY[1, 2, 3]))),
    CONSTRAINT "work_center_staffing_staff_count_check" CHECK (("staff_count" >= 0))
);


ALTER TABLE "produccion"."work_center_staffing" OWNER TO "postgres";


COMMENT ON TABLE "produccion"."work_center_staffing" IS 'Stores staffing levels (number of people) scheduled for each work center by date and shift';



COMMENT ON COLUMN "produccion"."work_center_staffing"."shift_number" IS '1 = Turno 1 (22:00-06:00), 2 = Turno 2 (06:00-14:00), 3 = Turno 3 (14:00-22:00)';



COMMENT ON COLUMN "produccion"."work_center_staffing"."staff_count" IS 'Number of staff members scheduled for this shift';



CREATE OR REPLACE VIEW "produccion"."work_centers_with_locations" AS
 SELECT "wc"."id" AS "work_center_id",
    "wc"."code" AS "work_center_code",
    "wc"."name" AS "work_center_name",
    "wc"."location_id",
    "l"."code" AS "location_code",
    "l"."name" AS "location_name",
    "l"."path" AS "location_path",
        CASE
            WHEN ("wc"."location_id" IS NULL) THEN '❌ Missing'::"text"
            ELSE '✅ Linked'::"text"
        END AS "status"
   FROM ("produccion"."work_centers" "wc"
     LEFT JOIN "inventario"."locations" "l" ON (("wc"."location_id" = "l"."id")))
  ORDER BY "wc"."code";


ALTER VIEW "produccion"."work_centers_with_locations" OWNER TO "postgres";


COMMENT ON VIEW "produccion"."work_centers_with_locations" IS 'Helper view to verify work_center to location relationships';



CREATE TABLE IF NOT EXISTS "public"."access_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "user_email" "text",
    "attempted_path" "text" NOT NULL,
    "access_denied_reason" "text",
    "user_agent" "text",
    "ip_address" "text",
    "attempted_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."access_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."access_logs" IS 'Registro de intentos de acceso a rutas protegidas para auditoría de seguridad';



COMMENT ON COLUMN "public"."access_logs"."user_id" IS 'ID del usuario que intentó acceder (puede ser null para usuarios no autenticados)';



COMMENT ON COLUMN "public"."access_logs"."user_email" IS 'Email del usuario para referencia rápida';



COMMENT ON COLUMN "public"."access_logs"."attempted_path" IS 'Ruta que se intentó acceder';



COMMENT ON COLUMN "public"."access_logs"."access_denied_reason" IS 'Razón por la cual se denegó el acceso';



COMMENT ON COLUMN "public"."access_logs"."user_agent" IS 'User agent del navegador';



COMMENT ON COLUMN "public"."access_logs"."ip_address" IS 'Dirección IP del cliente';



CREATE TABLE IF NOT EXISTS "public"."adjustment_reasons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reason" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."adjustment_reasons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."branches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid",
    "name" character varying(255) NOT NULL,
    "address" "text",
    "contact_person" character varying(255),
    "phone" character varying(50),
    "email" character varying(255),
    "is_main" boolean DEFAULT false,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "observations" "text"
);


ALTER TABLE "public"."branches" OWNER TO "postgres";


COMMENT ON COLUMN "public"."branches"."observations" IS 'Observaciones y notas adicionales sobre la sucursal';



CREATE TABLE IF NOT EXISTS "public"."client_config" (
    "id" integer NOT NULL,
    "orders_by_units" boolean DEFAULT false,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "client_id" "uuid" NOT NULL,
    "delivers_to_main_branch" boolean DEFAULT false
);


ALTER TABLE "public"."client_config" OWNER TO "postgres";


COMMENT ON COLUMN "public"."client_config"."delivers_to_main_branch" IS 'Indica si las entregas al cliente se realizan en su sede principal';



CREATE SEQUENCE IF NOT EXISTS "public"."client_config_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."client_config_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."client_config_id_seq" OWNED BY "public"."client_config"."id";



CREATE TABLE IF NOT EXISTS "public"."client_credit_terms" (
    "id" integer NOT NULL,
    "client_id" "uuid" NOT NULL,
    "credit_days" integer DEFAULT 30 NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "client_credit_terms_credit_days_check" CHECK (("credit_days" >= 0))
);


ALTER TABLE "public"."client_credit_terms" OWNER TO "postgres";


COMMENT ON TABLE "public"."client_credit_terms" IS 'Días de crédito por cliente - aplica a todas las sucursales del cliente';



COMMENT ON COLUMN "public"."client_credit_terms"."client_id" IS 'ID del cliente';



COMMENT ON COLUMN "public"."client_credit_terms"."credit_days" IS 'Días de crédito (0 = contado)';



CREATE SEQUENCE IF NOT EXISTS "public"."client_credit_terms_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."client_credit_terms_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."client_credit_terms_id_seq" OWNED BY "public"."client_credit_terms"."id";



CREATE TABLE IF NOT EXISTS "public"."client_frequencies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "day_of_week" integer NOT NULL,
    "is_active" boolean DEFAULT true,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "client_frequencies_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6)))
);


ALTER TABLE "public"."client_frequencies" OWNER TO "postgres";


COMMENT ON TABLE "public"."client_frequencies" IS 'Almacena los días de frecuencia de entrega por sucursal';



COMMENT ON COLUMN "public"."client_frequencies"."day_of_week" IS 'Día de la semana: 0=Domingo, 1=Lunes, ..., 6=Sábado';



COMMENT ON COLUMN "public"."client_frequencies"."is_active" IS 'Indica si la frecuencia está activa';



COMMENT ON COLUMN "public"."client_frequencies"."notes" IS 'Notas adicionales sobre la frecuencia';



CREATE TABLE IF NOT EXISTS "public"."client_price_lists" (
    "id" integer NOT NULL,
    "product_id" "uuid",
    "client_id" "uuid",
    "unit_price" numeric(10,2) NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "client_price_lists_unit_price_check" CHECK (("unit_price" >= (0)::numeric))
);


ALTER TABLE "public"."client_price_lists" OWNER TO "postgres";


COMMENT ON TABLE "public"."client_price_lists" IS 'Specific pricing per product per client';



CREATE SEQUENCE IF NOT EXISTS "public"."client_price_lists_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."client_price_lists_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."client_price_lists_id_seq" OWNED BY "public"."client_price_lists"."id";



CREATE TABLE IF NOT EXISTS "public"."clientes_rag" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "embedding" "extensions"."vector"(1536),
    "content" "text",
    "metadata" "jsonb"
);


ALTER TABLE "public"."clientes_rag" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "contact_person" character varying(255),
    "phone" character varying(50),
    "email" character varying(255),
    "address" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "razon_social" character varying,
    "lead_status" character varying(50) DEFAULT 'prospect'::character varying,
    "lead_source_id" "uuid",
    "assigned_user_id" "uuid",
    "facturador" character varying(20),
    "category" character varying(20),
    "nit" character varying(20),
    "billing_type" "public"."billing_type_enum" DEFAULT 'facturable'::"public"."billing_type_enum",
    "is_active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "clients_category_check" CHECK ((("category")::"text" = ANY ((ARRAY['CAFE'::character varying, 'UNIVERSIDAD'::character varying, 'CONVENIENCIA'::character varying, 'HOTEL'::character varying, 'COLEGIO'::character varying, 'CATERING'::character varying, 'SUPERMERCADO'::character varying, 'CLUB'::character varying, 'RESTAURANTE'::character varying, 'OTRO'::character varying])::"text"[]))),
    CONSTRAINT "clients_facturador_check" CHECK ((("facturador")::"text" = ANY ((ARRAY['LA FABRIKA CO'::character varying, 'PASTRY CHEF'::character varying])::"text"[])))
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


COMMENT ON COLUMN "public"."clients"."razon_social" IS 'Razón social de la empresa (nombre legal)';



COMMENT ON COLUMN "public"."clients"."lead_status" IS 'Lead status for CRM pipeline: prospect, contacted, qualified, proposal, negotiation, closed_won, closed_lost, client';



COMMENT ON COLUMN "public"."clients"."nit" IS 'Número de Identificación Tributaria del cliente';



COMMENT ON COLUMN "public"."clients"."billing_type" IS 'Tipo de facturación del cliente: facturable (directo) o remision (requiere remisión previa)';



COMMENT ON COLUMN "public"."clients"."is_active" IS 'Soft deletion flag. False means client is inactive/deleted but preserved for order history.';



CREATE TABLE IF NOT EXISTS "public"."dispatch_inventory_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "allow_dispatch_without_inventory" boolean DEFAULT false NOT NULL,
    "default_dispatch_location_id" "uuid",
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "single_row_config" CHECK (("id" = '00000000-0000-0000-0000-000000000000'::"uuid"))
);


ALTER TABLE "public"."dispatch_inventory_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."dispatch_inventory_config" IS 'Configuration for dispatch-inventory integration. Default location is WH3-GENERAL (General PT) where finished goods from production are received and stored.';



COMMENT ON COLUMN "public"."dispatch_inventory_config"."allow_dispatch_without_inventory" IS 'If true, allows dispatching products even when inventory balance would go negative';



COMMENT ON COLUMN "public"."dispatch_inventory_config"."default_dispatch_location_id" IS 'Default inventory location for dispatch OUT movements';



CREATE TABLE IF NOT EXISTS "public"."emails" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "conversation_id" "text",
    "message_id" "text",
    "from_email" "text",
    "to_email" "text",
    "subject" "text",
    "body" "text",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid"
);


ALTER TABLE "public"."emails" OWNER TO "postgres";


COMMENT ON TABLE "public"."emails" IS 'Email conversation between client and admin';



CREATE TABLE IF NOT EXISTS "public"."employees" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."employees" OWNER TO "postgres";


ALTER TABLE "public"."employees" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."employees_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."export_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "export_date" timestamp without time zone DEFAULT "now"(),
    "invoice_number_start" integer NOT NULL,
    "invoice_number_end" integer NOT NULL,
    "total_orders" integer DEFAULT 0 NOT NULL,
    "total_amount" numeric(12,2) DEFAULT 0,
    "routes_exported" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "route_names" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "file_name" character varying(255) NOT NULL,
    "file_data" "bytea",
    "export_summary" "jsonb",
    "created_by" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."export_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."export_history" IS 'Tracks all World Office export operations with file storage for re-download';



CREATE TABLE IF NOT EXISTS "public"."inventories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "status" character varying(50) DEFAULT 'draft'::character varying,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "inventory_type" character varying(50),
    "location_id" "uuid",
    CONSTRAINT "inventories_inventory_type_check" CHECK ((("inventory_type" IS NULL) OR (("inventory_type")::"text" = ANY (ARRAY[('produccion'::character varying)::"text", ('producto_terminado'::character varying)::"text", ('producto_en_proceso'::character varying)::"text", ('bodega_materias_primas'::character varying)::"text", ('producto_no_conforme'::character varying)::"text"])))),
    CONSTRAINT "inventories_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['draft'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "public"."inventories" OWNER TO "postgres";


COMMENT ON COLUMN "public"."inventories"."inventory_type" IS 'DEPRECATED: Use location_id instead. This column is kept for backward compatibility but should be NULL for new records.';



COMMENT ON COLUMN "public"."inventories"."location_id" IS 'Direct reference to the specific location being counted. Replaces the inventory_type mapping to bin_type approach.';



CREATE TABLE IF NOT EXISTS "public"."inventory_adjustments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "inventory_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "counted_quantity" numeric(12,3) NOT NULL,
    "actual_quantity" numeric(12,3) NOT NULL,
    "difference" numeric(12,3) NOT NULL,
    "adjustment_type" character varying(20) NOT NULL,
    "adjustment_quantity" numeric(12,3) NOT NULL,
    "reason_id" "uuid",
    "custom_reason" "text",
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "movement_id" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "warehouse_quantity" numeric(12,3) DEFAULT 0,
    "production_quantity" numeric(12,3) DEFAULT 0,
    CONSTRAINT "inventory_adjustments_adjustment_type_check" CHECK ((("adjustment_type")::"text" = ANY ((ARRAY['positive'::character varying, 'negative'::character varying])::"text"[]))),
    CONSTRAINT "inventory_adjustments_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::"text"[])))
);


ALTER TABLE "public"."inventory_adjustments" OWNER TO "postgres";


COMMENT ON COLUMN "public"."inventory_adjustments"."warehouse_quantity" IS 'Quantity to adjust in warehouse inventory';



COMMENT ON COLUMN "public"."inventory_adjustments"."production_quantity" IS 'Quantity to adjust in production inventory';



CREATE TABLE IF NOT EXISTS "public"."inventory_count_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "inventory_count_id" "uuid",
    "product_id" "uuid",
    "quantity_units" integer DEFAULT 0 NOT NULL,
    "grams_per_unit" numeric(15,3) DEFAULT 1 NOT NULL,
    "total_grams" numeric(15,3) GENERATED ALWAYS AS ((("quantity_units")::numeric * "grams_per_unit")) STORED,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "snapshot_quantity" numeric DEFAULT 0
);


ALTER TABLE "public"."inventory_count_items" OWNER TO "postgres";


COMMENT ON COLUMN "public"."inventory_count_items"."snapshot_quantity" IS 'Snapshot of inventory balance (from inventario.inventory_balances) at the moment the count was finalized. Used to calculate adjustments based on the state at counting time, not current state.';



CREATE TABLE IF NOT EXISTS "public"."inventory_counts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "inventory_id" "uuid",
    "count_number" integer DEFAULT 1 NOT NULL,
    "status" character varying(50) DEFAULT 'in_progress'::character varying,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    CONSTRAINT "inventory_counts_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['in_progress'::character varying, 'completed'::character varying])::"text"[])))
);


ALTER TABLE "public"."inventory_counts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_final_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "inventory_id" "uuid",
    "product_id" "uuid",
    "final_quantity" integer NOT NULL,
    "final_grams_per_unit" numeric(15,3) NOT NULL,
    "final_total_grams" numeric(15,3) GENERATED ALWAYS AS ((("final_quantity")::numeric * "final_grams_per_unit")) STORED,
    "final_value" numeric(15,2),
    "variance_from_count1_percentage" numeric(5,2),
    "variance_from_count2_percentage" numeric(5,2),
    "resolution_method" character varying(50),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."inventory_final_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_reconciliations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "inventory_id" "uuid",
    "product_id" "uuid",
    "count1_quantity" integer,
    "count1_grams_per_unit" numeric(15,3),
    "count1_total_grams" numeric(15,3),
    "count2_quantity" integer,
    "count2_grams_per_unit" numeric(15,3),
    "count2_total_grams" numeric(15,3),
    "final_quantity" integer NOT NULL,
    "final_grams_per_unit" numeric(15,3) NOT NULL,
    "final_total_grams" numeric(15,3) GENERATED ALWAYS AS ((("final_quantity")::numeric * "final_grams_per_unit")) STORED,
    "variance_percentage" numeric(5,2),
    "resolution_method" character varying(50) DEFAULT 'manual'::character varying,
    "notes" "text",
    "resolved_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "inventory_reconciliations_resolution_method_check" CHECK ((("resolution_method")::"text" = ANY ((ARRAY['accept_count1'::character varying, 'accept_count2'::character varying, 'manual'::character varying, 'third_count'::character varying])::"text"[])))
);


ALTER TABLE "public"."inventory_reconciliations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lead_activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid",
    "user_id" "uuid",
    "activity_type" character varying(50) NOT NULL,
    "title" character varying(255) NOT NULL,
    "description" "text",
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "scheduled_date" timestamp with time zone,
    "completed_date" timestamp with time zone,
    "estimated_value" numeric(12,2),
    "actual_value" numeric(12,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."lead_activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lead_sources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."lead_sources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "event_type" character varying(50) NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."order_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."order_events" IS 'Audit log for all order changes - enterprise compliance';



COMMENT ON COLUMN "public"."order_events"."event_type" IS 'Type of event: created, status_change, item_added, item_updated, cancelled, etc.';



COMMENT ON COLUMN "public"."order_events"."payload" IS 'JSON payload with event-specific data (old_status, new_status, item_id, etc.)';



CREATE TABLE IF NOT EXISTS "public"."order_invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "export_history_id" "uuid",
    "invoice_number" integer NOT NULL,
    "invoice_date" "date" NOT NULL,
    "order_amount" numeric(10,2) DEFAULT 0,
    "client_name" character varying(255),
    "route_name" character varying(255),
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."order_invoices" OWNER TO "postgres";


COMMENT ON TABLE "public"."order_invoices" IS 'Granular tracking of which orders were invoiced in which export';



CREATE TABLE IF NOT EXISTS "public"."order_item_deliveries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "route_order_id" "uuid",
    "order_item_id" "uuid",
    "delivery_status" character varying(50) DEFAULT 'pending'::character varying,
    "quantity_delivered" integer DEFAULT 0,
    "quantity_rejected" integer DEFAULT 0,
    "rejection_reason" "text",
    "evidence_url" "text",
    "delivery_notes" "text",
    "delivered_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "order_item_deliveries_delivery_status_check" CHECK ((("delivery_status")::"text" = ANY ((ARRAY['pending'::character varying, 'delivered'::character varying, 'partial'::character varying, 'rejected'::character varying])::"text"[])))
);


ALTER TABLE "public"."order_item_deliveries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_item_deliveries_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "delivery_id" "uuid",
    "order_item_id" "uuid",
    "order_id" "uuid",
    "action" character varying(20) NOT NULL,
    "old_data" "jsonb",
    "new_data" "jsonb",
    "changed_by" "uuid",
    "changed_at" timestamp with time zone DEFAULT "now"(),
    "ip_address" "inet",
    "user_agent" "text",
    CONSTRAINT "check_data_present" CHECK ((((("action")::"text" = 'INSERT'::"text") AND ("new_data" IS NOT NULL)) OR ((("action")::"text" = 'UPDATE'::"text") AND ("old_data" IS NOT NULL) AND ("new_data" IS NOT NULL)) OR ((("action")::"text" = 'DELETE'::"text") AND ("old_data" IS NOT NULL)))),
    CONSTRAINT "order_item_deliveries_audit_action_check" CHECK ((("action")::"text" = ANY ((ARRAY['INSERT'::character varying, 'UPDATE'::character varying, 'DELETE'::character varying])::"text"[])))
);


ALTER TABLE "public"."order_item_deliveries_audit" OWNER TO "postgres";


COMMENT ON TABLE "public"."order_item_deliveries_audit" IS 'Registro completo de auditoría para todas las operaciones en order_item_deliveries. Captura entregas, devoluciones y cambios en cantidades.';



COMMENT ON COLUMN "public"."order_item_deliveries_audit"."delivery_id" IS 'ID de la entrega afectada';



COMMENT ON COLUMN "public"."order_item_deliveries_audit"."order_item_id" IS 'ID del item entregado';



COMMENT ON COLUMN "public"."order_item_deliveries_audit"."order_id" IS 'ID de la orden (para facilitar queries)';



COMMENT ON COLUMN "public"."order_item_deliveries_audit"."action" IS 'Tipo de operación: INSERT, UPDATE o DELETE';



COMMENT ON COLUMN "public"."order_item_deliveries_audit"."old_data" IS 'Snapshot completo del registro antes del cambio (JSONB)';



COMMENT ON COLUMN "public"."order_item_deliveries_audit"."new_data" IS 'Snapshot completo del registro después del cambio (JSONB)';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" character varying(255) NOT NULL,
    "name" character varying(255) NOT NULL,
    "role" character varying(50) NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "permissions" "jsonb" DEFAULT '{"crm": false, "users": false, "orders": false, "routes": false, "clients": false, "returns": false, "inventory": false, "production": false, "order_management_orders": false, "order_management_routes": false, "order_management_returns": false, "order_management_dispatch": false, "order_management_settings": false, "order_management_dashboard": false, "order_management_review_area1": false, "order_management_review_area2": false}'::"jsonb",
    "status" "text" DEFAULT 'active'::"text",
    "last_login" timestamp with time zone,
    "auth_user_id" "uuid",
    "cedula" character varying(20),
    "company_id" "uuid",
    CONSTRAINT "users_role_check" CHECK ((("role")::"text" = ANY (ARRAY[('super_admin'::character varying)::"text", ('admin'::character varying)::"text", ('administrator'::character varying)::"text", ('coordinador_logistico'::character varying)::"text", ('commercial'::character varying)::"text", ('reviewer'::character varying)::"text", ('reviewer_area1'::character varying)::"text", ('reviewer_area2'::character varying)::"text", ('dispatcher'::character varying)::"text", ('driver'::character varying)::"text", ('client'::character varying)::"text"]))),
    CONSTRAINT "users_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON COLUMN "public"."users"."role" IS 'User role: admin, administrator, coordinador_logistico, commercial, reviewer, reviewer_area1, reviewer_area2, dispatcher, driver, client';



COMMENT ON COLUMN "public"."users"."permissions" IS 'User permissions: crm, users, orders, inventory, production, plan_master, nucleo, ecommerce, inventory_adjustment, compras, kardex, store_visits, recepcion_pt';



COMMENT ON COLUMN "public"."users"."status" IS 'User account status: active or inactive';



COMMENT ON COLUMN "public"."users"."last_login" IS 'Timestamp of user last login';



COMMENT ON COLUMN "public"."users"."cedula" IS 'Número de cédula o documento de identidad del usuario';



COMMENT ON COLUMN "public"."users"."company_id" IS 'Links client role users to their company (clients table). Used to determine which client the user can create orders for.';



COMMENT ON CONSTRAINT "users_role_check" ON "public"."users" IS 'super_admin: Full system access including user management
   admin: Legacy admin role
   administrator: Standard administrator
   coordinador_logistico: Logistics coordinator
   commercial: Sales representative
   reviewer: Order reviewer
   reviewer_area1: First area reviewer
   reviewer_area2: Second area reviewer
   dispatcher: Dispatch coordinator
   driver: Delivery driver
   client: Customer account';



CREATE OR REPLACE VIEW "public"."order_item_deliveries_audit_with_user" AS
 SELECT "oida"."id",
    "oida"."delivery_id",
    "oida"."order_item_id",
    "oida"."order_id",
    "oida"."action",
    "oida"."old_data",
    "oida"."new_data",
    "oida"."changed_by",
    "oida"."changed_at",
    "oida"."ip_address",
    "oida"."user_agent",
    "u"."name" AS "changed_by_name",
    "u"."email" AS "changed_by_email",
    "u"."role" AS "changed_by_role"
   FROM ("public"."order_item_deliveries_audit" "oida"
     LEFT JOIN "public"."users" "u" ON (("oida"."changed_by" = "u"."id")))
  ORDER BY "oida"."changed_at" DESC;


ALTER VIEW "public"."order_item_deliveries_audit_with_user" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_item_id" "uuid",
    "order_id" "uuid",
    "action" character varying(20) NOT NULL,
    "old_data" "jsonb",
    "new_data" "jsonb",
    "changed_by" "uuid",
    "changed_at" timestamp with time zone DEFAULT "now"(),
    "ip_address" "inet",
    "user_agent" "text",
    CONSTRAINT "check_data_present" CHECK ((((("action")::"text" = 'INSERT'::"text") AND ("new_data" IS NOT NULL)) OR ((("action")::"text" = 'UPDATE'::"text") AND ("old_data" IS NOT NULL) AND ("new_data" IS NOT NULL)) OR ((("action")::"text" = 'DELETE'::"text") AND ("old_data" IS NOT NULL)))),
    CONSTRAINT "order_items_audit_action_check" CHECK ((("action")::"text" = ANY ((ARRAY['INSERT'::character varying, 'UPDATE'::character varying, 'DELETE'::character varying])::"text"[])))
);


ALTER TABLE "public"."order_items_audit" OWNER TO "postgres";


COMMENT ON TABLE "public"."order_items_audit" IS 'Registro completo de auditoría para todas las operaciones en order_items. Captura cambios en productos, cantidades y precios.';



COMMENT ON COLUMN "public"."order_items_audit"."order_item_id" IS 'Reference to the order item. NULL for deleted items to preserve audit history.';



COMMENT ON COLUMN "public"."order_items_audit"."order_id" IS 'ID de la orden a la que pertenece el item';



COMMENT ON COLUMN "public"."order_items_audit"."action" IS 'Tipo de operación: INSERT, UPDATE o DELETE';



COMMENT ON COLUMN "public"."order_items_audit"."old_data" IS 'Snapshot completo del registro antes del cambio (JSONB)';



COMMENT ON COLUMN "public"."order_items_audit"."new_data" IS 'Snapshot completo del registro después del cambio (JSONB)';



CREATE OR REPLACE VIEW "public"."order_items_audit_with_user" AS
 SELECT "oia"."id",
    "oia"."order_item_id",
    "oia"."order_id",
    "oia"."action",
    "oia"."old_data",
    "oia"."new_data",
    "oia"."changed_by",
    "oia"."changed_at",
    "oia"."ip_address",
    "oia"."user_agent",
    "u"."name" AS "changed_by_name",
    "u"."email" AS "changed_by_email",
    "u"."role" AS "changed_by_role"
   FROM ("public"."order_items_audit" "oia"
     LEFT JOIN "public"."users" "u" ON (("oia"."changed_by" = "u"."id")))
  ORDER BY "oia"."changed_at" DESC;


ALTER VIEW "public"."order_items_audit_with_user" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_status_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "previous_status" character varying(50),
    "new_status" character varying(50),
    "changed_by" "uuid",
    "change_reason" "text",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."order_status_history" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."orders_audit_with_user" AS
 SELECT "oa"."id",
    "oa"."order_id",
    "oa"."action",
    "oa"."old_data",
    "oa"."new_data",
    "oa"."changed_by",
    "oa"."changed_at",
    "oa"."ip_address",
    "oa"."user_agent",
    "u"."name" AS "changed_by_name",
    "u"."email" AS "changed_by_email",
    "u"."role" AS "changed_by_role",
    "public"."get_order_change_summary"("oa".*) AS "change_summary"
   FROM ("public"."orders_audit" "oa"
     LEFT JOIN "public"."users" "u" ON (("oa"."changed_by" = "u"."id")))
  ORDER BY "oa"."changed_at" DESC;


ALTER VIEW "public"."orders_audit_with_user" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pipeline_stages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "stage_order" integer NOT NULL,
    "probability" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pipeline_stages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_aliases" (
    "id" integer NOT NULL,
    "product_id" "uuid",
    "real_product_name" character varying,
    "client_alias" character varying,
    "client_name" character varying,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "client_id" "uuid"
);


ALTER TABLE "public"."product_aliases" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."product_aliases_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."product_aliases_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."product_aliases_id_seq" OWNED BY "public"."product_aliases"."id";



CREATE TABLE IF NOT EXISTS "public"."product_commercial_info" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "commercial_name" "text",
    "brand" "text",
    "marketing_description" "text",
    "target_market" "text"[],
    "sales_channel" "text"[],
    "seasonality" "text",
    "promotional_tags" "text"[],
    "competitor_products" "jsonb",
    "usp" "text",
    "sales_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."product_commercial_info" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_costs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "material_cost" numeric(12,2) DEFAULT 0,
    "labor_cost" numeric(12,2) DEFAULT 0,
    "overhead_cost" numeric(12,2) DEFAULT 0,
    "packaging_cost" numeric(12,2) DEFAULT 0,
    "total_production_cost" numeric(12,2) GENERATED ALWAYS AS ((((COALESCE("material_cost", (0)::numeric) + COALESCE("labor_cost", (0)::numeric)) + COALESCE("overhead_cost", (0)::numeric)) + COALESCE("packaging_cost", (0)::numeric))) STORED,
    "base_selling_price" numeric(12,2),
    "profit_margin_percentage" numeric(5,2),
    "break_even_units" integer,
    "cost_calculation_date" "date" DEFAULT CURRENT_DATE,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."product_costs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_inventory_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "reorder_point" integer DEFAULT 0,
    "safety_stock" integer DEFAULT 0,
    "max_stock_level" integer,
    "lead_time_days" integer DEFAULT 0,
    "abc_classification" "text",
    "rotation_classification" "text",
    "storage_location" "text",
    "requires_cold_chain" boolean DEFAULT false,
    "is_perishable" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."product_inventory_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_media" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "media_type" "text" NOT NULL,
    "media_category" "text",
    "file_url" "text" NOT NULL,
    "file_name" "text",
    "file_size_kb" integer,
    "thumbnail_url" "text",
    "display_order" integer DEFAULT 0,
    "is_primary" boolean DEFAULT false,
    "caption" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."product_media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_price_lists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "price_list_name" "text" NOT NULL,
    "price" numeric(12,2) NOT NULL,
    "min_quantity" integer DEFAULT 1,
    "max_quantity" integer,
    "client_category" "text",
    "is_active" boolean DEFAULT true,
    "valid_from" "date",
    "valid_until" "date",
    "discount_percentage" numeric(5,2),
    "currency" "text" DEFAULT 'COP'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."product_price_lists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_production_process" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "process_steps" "jsonb",
    "total_cycle_time_minutes" integer,
    "theoretical_yield_percentage" numeric(5,2),
    "labor_hours_per_batch" numeric(6,2),
    "quality_checkpoints" "jsonb",
    "process_diagrams" "text"[],
    "notes" "text",
    "version" integer DEFAULT 1,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."product_production_process" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_quality_specs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quality_parameters" "jsonb",
    "sensory_attributes" "jsonb",
    "microbiological_specs" "jsonb",
    "physical_chemical_specs" "jsonb",
    "control_frequency" "text",
    "inspection_points" "text"[],
    "rejection_criteria" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."product_quality_specs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_technical_specs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "dimensions" "jsonb",
    "shelf_life_days" integer,
    "storage_conditions" "text",
    "packaging_type" "text",
    "packaging_units_per_box" integer,
    "net_weight" numeric(10,3),
    "gross_weight" numeric(10,3),
    "allergens" "text"[],
    "certifications" "text"[],
    "custom_attributes" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."product_technical_specs" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."product_completeness" AS
 SELECT "id" AS "product_id",
    "name",
    "category",
    "visible_in_ecommerce",
        CASE
            WHEN (("description" IS NOT NULL) AND ("unit" IS NOT NULL) AND ("price" IS NOT NULL)) THEN true
            ELSE false
        END AS "basic_info_complete",
    (EXISTS ( SELECT 1
           FROM "public"."product_technical_specs"
          WHERE ("product_technical_specs"."product_id" = "p"."id"))) AS "has_technical_specs",
    (EXISTS ( SELECT 1
           FROM "public"."product_quality_specs"
          WHERE ("product_quality_specs"."product_id" = "p"."id"))) AS "has_quality_specs",
    (EXISTS ( SELECT 1
           FROM "public"."product_production_process"
          WHERE (("product_production_process"."product_id" = "p"."id") AND ("product_production_process"."is_active" = true)))) AS "has_production_process",
    (EXISTS ( SELECT 1
           FROM "produccion"."bill_of_materials"
          WHERE ("bill_of_materials"."product_id" = "p"."id"))) AS "has_bill_of_materials",
    (EXISTS ( SELECT 1
           FROM "public"."product_costs"
          WHERE ("product_costs"."product_id" = "p"."id"))) AS "has_costs",
    (EXISTS ( SELECT 1
           FROM "public"."product_price_lists"
          WHERE (("product_price_lists"."product_id" = "p"."id") AND ("product_price_lists"."is_active" = true)))) AS "has_price_lists",
    (EXISTS ( SELECT 1
           FROM "public"."product_commercial_info"
          WHERE ("product_commercial_info"."product_id" = "p"."id"))) AS "has_commercial_info",
    (EXISTS ( SELECT 1
           FROM "public"."product_media"
          WHERE ("product_media"."product_id" = "p"."id"))) AS "has_media",
    (EXISTS ( SELECT 1
           FROM "public"."product_inventory_config"
          WHERE ("product_inventory_config"."product_id" = "p"."id"))) AS "has_inventory_config",
    ((((((((
        CASE
            WHEN (("description" IS NOT NULL) AND ("unit" IS NOT NULL) AND ("price" IS NOT NULL)) THEN 11.11
            ELSE (0)::numeric
        END +
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM "public"."product_technical_specs"
              WHERE ("product_technical_specs"."product_id" = "p"."id"))) THEN 11.11
            ELSE (0)::numeric
        END) +
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM "public"."product_quality_specs"
              WHERE ("product_quality_specs"."product_id" = "p"."id"))) THEN 11.11
            ELSE (0)::numeric
        END) +
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM "public"."product_production_process"
              WHERE (("product_production_process"."product_id" = "p"."id") AND ("product_production_process"."is_active" = true)))) THEN 11.11
            ELSE (0)::numeric
        END) +
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM "produccion"."bill_of_materials"
              WHERE ("bill_of_materials"."product_id" = "p"."id"))) THEN 11.11
            ELSE (0)::numeric
        END) +
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM "public"."product_costs"
              WHERE ("product_costs"."product_id" = "p"."id"))) THEN 11.11
            ELSE (0)::numeric
        END) +
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM "public"."product_price_lists"
              WHERE (("product_price_lists"."product_id" = "p"."id") AND ("product_price_lists"."is_active" = true)))) THEN 11.11
            ELSE (0)::numeric
        END) +
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM "public"."product_commercial_info"
              WHERE ("product_commercial_info"."product_id" = "p"."id"))) THEN 11.11
            ELSE (0)::numeric
        END) +
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM "public"."product_media"
              WHERE ("product_media"."product_id" = "p"."id"))) THEN 11.11
            ELSE (0)::numeric
        END) AS "completeness_percentage"
   FROM "public"."products" "p";


ALTER VIEW "public"."product_completeness" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."product_config_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."product_config_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."product_config_id_seq" OWNED BY "public"."product_config"."id";



CREATE TABLE IF NOT EXISTS "public"."product_configurations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid",
    "units_per_can" integer DEFAULT 1 NOT NULL,
    "cans_per_car" integer DEFAULT 1,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."product_configurations" OWNER TO "postgres";


COMMENT ON TABLE "public"."product_configurations" IS 'Configuración de unidades por lata/carro por producto';



CREATE TABLE IF NOT EXISTS "public"."productos_rag" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "embedding" "extensions"."vector"(1536),
    "content" "text",
    "metadata" "jsonb"
);


ALTER TABLE "public"."productos_rag" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."receiving_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action" character varying(50) NOT NULL,
    "target_table" character varying(50) NOT NULL,
    "target_id" "uuid" NOT NULL,
    "before_data" "jsonb",
    "after_data" "jsonb",
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."receiving_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."receiving_exceptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid",
    "branch_id" "uuid",
    "exception_date" "date" NOT NULL,
    "type" character varying(20) NOT NULL,
    "start_time" time without time zone,
    "end_time" time without time zone,
    "note" "text",
    "source" character varying(20) DEFAULT 'user'::character varying,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "receiving_exceptions_client_or_branch_check" CHECK (((("client_id" IS NOT NULL) AND ("branch_id" IS NULL)) OR (("client_id" IS NULL) AND ("branch_id" IS NOT NULL)))),
    CONSTRAINT "receiving_exceptions_source_check" CHECK ((("source")::"text" = ANY ((ARRAY['user'::character varying, 'imported'::character varying, 'holiday_api'::character varying])::"text"[]))),
    CONSTRAINT "receiving_exceptions_time_check" CHECK ((((("type")::"text" = 'blocked'::"text") AND ("start_time" IS NULL) AND ("end_time" IS NULL)) OR ((("type")::"text" = ANY ((ARRAY['open_extra'::character varying, 'special_hours'::character varying])::"text"[])) AND ("start_time" IS NOT NULL) AND ("end_time" IS NOT NULL) AND ("start_time" < "end_time")))),
    CONSTRAINT "receiving_exceptions_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['blocked'::character varying, 'open_extra'::character varying, 'special_hours'::character varying])::"text"[])))
);


ALTER TABLE "public"."receiving_exceptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."receiving_patterns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid",
    "branch_id" "uuid",
    "name" character varying(255) NOT NULL,
    "rrule" "text" NOT NULL,
    "effect_type" character varying(20) NOT NULL,
    "start_time" time without time zone,
    "end_time" time without time zone,
    "note" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "receiving_patterns_client_or_branch_check" CHECK (((("client_id" IS NOT NULL) AND ("branch_id" IS NULL)) OR (("client_id" IS NULL) AND ("branch_id" IS NOT NULL)))),
    CONSTRAINT "receiving_patterns_effect_type_check" CHECK ((("effect_type")::"text" = ANY ((ARRAY['block'::character varying, 'open_extra'::character varying])::"text"[]))),
    CONSTRAINT "receiving_patterns_time_check" CHECK ((("start_time" IS NULL) OR ("end_time" IS NULL) OR ("start_time" < "end_time")))
);


ALTER TABLE "public"."receiving_patterns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."receiving_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid",
    "branch_id" "uuid",
    "day_of_week" integer NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "status" character varying(20) DEFAULT 'available'::character varying NOT NULL,
    "timezone" character varying(50) DEFAULT 'America/Bogota'::character varying,
    "applied_template_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "receiving_schedules_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6))),
    CONSTRAINT "receiving_schedules_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['available'::character varying, 'unavailable'::character varying])::"text"[]))),
    CONSTRAINT "receiving_schedules_time_check" CHECK (("start_time" < "end_time"))
);


ALTER TABLE "public"."receiving_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."receiving_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "payload" "jsonb" NOT NULL,
    "created_by" "uuid",
    "is_public" boolean DEFAULT false,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."receiving_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."remision_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "remision_id" "uuid",
    "product_id" "uuid",
    "product_name" character varying(255) NOT NULL,
    "quantity_delivered" numeric(10,3) DEFAULT 0 NOT NULL,
    "unit_price" numeric(10,2) DEFAULT 0 NOT NULL,
    "total_price" numeric(12,2) DEFAULT 0 NOT NULL,
    "product_unit" character varying(50),
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."remision_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."remision_items" IS 'Items de las remisiones con cantidades disponibles al momento de la remisión';



COMMENT ON COLUMN "public"."remision_items"."quantity_delivered" IS 'Cantidad remisionada (basada en quantity_available del order_item)';



CREATE TABLE IF NOT EXISTS "public"."remisions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "remision_number" character varying(50) NOT NULL,
    "client_data" "jsonb" NOT NULL,
    "total_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "pdf_path" character varying(500),
    "pdf_data" "bytea",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."remisions" OWNER TO "postgres";


COMMENT ON TABLE "public"."remisions" IS 'Tabla de remisiones generadas para pedidos que requieren este flujo';



CREATE TABLE IF NOT EXISTS "public"."returns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "product_id" "uuid",
    "quantity_returned" integer NOT NULL,
    "return_reason" character varying(255),
    "return_date" timestamp without time zone DEFAULT "now"(),
    "processed_by" "uuid",
    "rejection_reason" "text",
    "route_id" "uuid",
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "status_updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "returns_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'rejected'::character varying])::"text"[])))
);


ALTER TABLE "public"."returns" OWNER TO "postgres";


COMMENT ON COLUMN "public"."returns"."status" IS 'Status of the return: pending, accepted, or rejected';



COMMENT ON COLUMN "public"."returns"."status_updated_at" IS 'Timestamp when the status was last updated';



CREATE SEQUENCE IF NOT EXISTS "public"."route_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."route_number_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."route_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "route_id" "uuid",
    "order_id" "uuid",
    "delivery_sequence" integer NOT NULL,
    "delivery_status" character varying(50) DEFAULT 'pending'::character varying,
    "delivery_time" timestamp without time zone,
    "evidence_url" "text",
    "delivery_notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "route_orders_delivery_status_check" CHECK ((("delivery_status")::"text" = ANY ((ARRAY['pending'::character varying, 'delivered'::character varying, 'partial'::character varying, 'rejected'::character varying])::"text"[])))
);


ALTER TABLE "public"."route_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."routes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "route_name" character varying(255) NOT NULL,
    "driver_id" "uuid",
    "route_date" "date" NOT NULL,
    "status" character varying(50) DEFAULT 'planned'::character varying,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "vehicle_id" "uuid",
    "route_number" integer NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    CONSTRAINT "routes_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['planned'::character varying, 'in_progress'::character varying, 'completed'::character varying])::"text"[])))
);


ALTER TABLE "public"."routes" OWNER TO "postgres";


COMMENT ON COLUMN "public"."routes"."route_name" IS 'Auto-generated route name based on date and sequence';



COMMENT ON COLUMN "public"."routes"."driver_id" IS 'Driver assigned to route (optional, can be assigned later)';



COMMENT ON COLUMN "public"."routes"."vehicle_id" IS 'Vehicle assigned to route (optional, can be assigned later)';



COMMENT ON COLUMN "public"."routes"."created_by" IS 'Usuario que creó la ruta';



COMMENT ON COLUMN "public"."routes"."updated_by" IS 'Usuario que modificó la ruta por última vez';



CREATE TABLE IF NOT EXISTS "public"."sales_opportunities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid",
    "assigned_user_id" "uuid",
    "pipeline_stage_id" "uuid",
    "title" character varying(255) NOT NULL,
    "description" "text",
    "estimated_value" numeric(12,2),
    "expected_close_date" "date",
    "actual_close_date" "date",
    "probability" integer DEFAULT 0,
    "status" character varying(20) DEFAULT 'open'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sales_opportunities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_config" (
    "id" integer NOT NULL,
    "config_key" character varying(100) NOT NULL,
    "config_value" "text",
    "description" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."system_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."system_config" IS 'Global system configuration for World Office integration';



CREATE SEQUENCE IF NOT EXISTS "public"."system_config_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."system_config_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."system_config_id_seq" OWNED BY "public"."system_config"."id";



CREATE TABLE IF NOT EXISTS "public"."user_migration_instructions" (
    "id" integer NOT NULL,
    "user_id" "uuid",
    "email" "text",
    "name" "text",
    "role" "text",
    "temp_password" "text" DEFAULT 'TempPass123!'::"text",
    "migration_status" "text" DEFAULT 'pending'::"text",
    "auth_user_created_id" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_migration_instructions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."user_migration_instructions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_migration_instructions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_migration_instructions_id_seq" OWNED BY "public"."user_migration_instructions"."id";



CREATE TABLE IF NOT EXISTS "public"."vehicles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vehicle_code" character varying(50) NOT NULL,
    "driver_name" character varying(255),
    "capacity_kg" numeric(10,2),
    "status" character varying(50) DEFAULT 'available'::character varying,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "driver_id" "uuid",
    CONSTRAINT "vehicles_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['available'::character varying, 'in_use'::character varying, 'maintenance'::character varying])::"text"[])))
);


ALTER TABLE "public"."vehicles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."video_tutorials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module_path" "text" NOT NULL,
    "video_url" "text" NOT NULL,
    "title" "text",
    "description" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."video_tutorials" OWNER TO "postgres";


COMMENT ON TABLE "public"."video_tutorials" IS 'Stores YouTube video tutorial links for each module/page';



COMMENT ON COLUMN "public"."video_tutorials"."module_path" IS 'Unique identifier for the page/module (e.g., /crm, /produccion, /order-management/dashboard)';



COMMENT ON COLUMN "public"."video_tutorials"."video_url" IS 'Full YouTube video URL (will be converted to embed format)';



COMMENT ON COLUMN "public"."video_tutorials"."title" IS 'Optional custom title for the tutorial (defaults to module name)';



COMMENT ON COLUMN "public"."video_tutorials"."description" IS 'Optional description of what the tutorial covers';



CREATE TABLE IF NOT EXISTS "visitas"."product_evaluations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "visit_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "has_stock" boolean DEFAULT false NOT NULL,
    "score_baking" integer,
    "score_display" integer,
    "score_presentation" integer,
    "score_taste" integer,
    "storage_temperature" numeric(5,2),
    "score_staff_training" integer,
    "score_baking_params" integer,
    "comments" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "is_displayed" boolean,
    CONSTRAINT "product_evaluations_score_baking_check" CHECK ((("score_baking" >= 1) AND ("score_baking" <= 5))),
    CONSTRAINT "product_evaluations_score_baking_params_check" CHECK ((("score_baking_params" >= 1) AND ("score_baking_params" <= 5))),
    CONSTRAINT "product_evaluations_score_display_check" CHECK ((("score_display" >= 1) AND ("score_display" <= 5))),
    CONSTRAINT "product_evaluations_score_presentation_check" CHECK ((("score_presentation" >= 1) AND ("score_presentation" <= 5))),
    CONSTRAINT "product_evaluations_score_staff_training_check" CHECK ((("score_staff_training" >= 1) AND ("score_staff_training" <= 5))),
    CONSTRAINT "product_evaluations_score_taste_check" CHECK ((("score_taste" >= 1) AND ("score_taste" <= 5)))
);


ALTER TABLE "visitas"."product_evaluations" OWNER TO "postgres";


COMMENT ON COLUMN "visitas"."product_evaluations"."is_displayed" IS 'Indicates if the product is displayed/exhibited in the store. If false, only temperature, training and comments are evaluated.';



CREATE TABLE IF NOT EXISTS "visitas"."store_visits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "branch_id" "uuid",
    "branch_name_custom" "text",
    "visit_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "operator_name" character varying(255),
    "operator_phone" character varying(50),
    "general_comments" "text",
    "average_score" numeric(3,2),
    "created_by" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "check_branch" CHECK (((("branch_id" IS NOT NULL) AND ("branch_name_custom" IS NULL)) OR (("branch_id" IS NULL) AND ("branch_name_custom" IS NOT NULL))))
);


ALTER TABLE "visitas"."store_visits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "visitas"."visit_photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "visit_id" "uuid" NOT NULL,
    "product_evaluation_id" "uuid",
    "photo_url" "text" NOT NULL,
    "photo_type" character varying(50) NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "visit_photos_photo_type_check" CHECK ((("photo_type")::"text" = ANY ((ARRAY['product'::character varying, 'general'::character varying])::"text"[])))
);


ALTER TABLE "visitas"."visit_photos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "workflows"."ordenes_compra" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email_id" "text" NOT NULL,
    "email_subject" "text" NOT NULL,
    "email_from" "text" NOT NULL,
    "email_body_preview" "text",
    "received_at" timestamp with time zone NOT NULL,
    "pdf_url" "text" NOT NULL,
    "pdf_filename" "text" NOT NULL,
    "openai_file_id" "text",
    "cliente" "text" NOT NULL,
    "sucursal" "text",
    "oc_number" "text" NOT NULL,
    "direccion" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "processing_logs" "jsonb" DEFAULT '[]'::"jsonb",
    "error_message" "text",
    "braintrust_classification_log_id" "text",
    "braintrust_extraction_log_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "cliente_id" "uuid",
    "sucursal_id" "uuid",
    "order_number" "text",
    "fecha_orden" "date",
    "valor_total" numeric(12,2),
    "observaciones" "text",
    "braintrust_log_ids" "text"[],
    CONSTRAINT "ordenes_compra_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processed'::"text", 'error'::"text"])))
);


ALTER TABLE "workflows"."ordenes_compra" OWNER TO "postgres";


COMMENT ON TABLE "workflows"."ordenes_compra" IS 'Órdenes de compra procesadas automáticamente desde emails';



COMMENT ON COLUMN "workflows"."ordenes_compra"."email_id" IS 'ID único del email de Outlook';



COMMENT ON COLUMN "workflows"."ordenes_compra"."status" IS 'Estado del procesamiento: pending, processed, error';



COMMENT ON COLUMN "workflows"."ordenes_compra"."processing_logs" IS 'Logs de procesamiento en formato JSONB';



COMMENT ON COLUMN "workflows"."ordenes_compra"."cliente_id" IS 'Referencia al cliente identificado (puede ser NULL si no se encuentra)';



COMMENT ON COLUMN "workflows"."ordenes_compra"."order_number" IS 'Número de orden interno generado (ej: OC-20251106-001)';



COMMENT ON COLUMN "workflows"."ordenes_compra"."braintrust_log_ids" IS 'Array de IDs de logs en Braintrust para tracking';



CREATE TABLE IF NOT EXISTS "workflows"."ordenes_compra_productos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "orden_compra_id" "uuid" NOT NULL,
    "producto" "text" NOT NULL,
    "cantidad" integer NOT NULL,
    "fecha_entrega" "date",
    "precio" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "producto_id" "uuid",
    "producto_nombre" "text",
    "unidad" "text" DEFAULT 'unidades'::"text",
    "precio_unitario" numeric(10,2),
    "confidence_score" numeric(3,2),
    CONSTRAINT "ordenes_compra_productos_cantidad_solicitada_check" CHECK (("cantidad" > 0)),
    CONSTRAINT "ordenes_compra_productos_confidence_score_check" CHECK ((("confidence_score" >= (0)::numeric) AND ("confidence_score" <= (1)::numeric))),
    CONSTRAINT "ordenes_compra_productos_precio_unitario_check" CHECK (("precio_unitario" >= (0)::numeric))
);


ALTER TABLE "workflows"."ordenes_compra_productos" OWNER TO "postgres";


COMMENT ON TABLE "workflows"."ordenes_compra_productos" IS 'Productos extraídos de cada orden de compra';



COMMENT ON COLUMN "workflows"."ordenes_compra_productos"."producto_nombre" IS 'Nombre del producto extraído (puede diferir del nombre en BD)';



COMMENT ON COLUMN "workflows"."ordenes_compra_productos"."confidence_score" IS 'Nivel de confianza del match de producto (0-1)';



ALTER TABLE ONLY "public"."client_config" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."client_config_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."client_credit_terms" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."client_credit_terms_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."client_price_lists" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."client_price_lists_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."product_aliases" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."product_aliases_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."product_config" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."product_config_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."system_config" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."system_config_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_migration_instructions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."user_migration_instructions_id_seq"'::"regclass");



ALTER TABLE ONLY "compras"."explosion_purchase_tracking"
    ADD CONSTRAINT "explosion_purchase_tracking_material_id_requirement_date_key" UNIQUE ("material_id", "requirement_date");



ALTER TABLE ONLY "compras"."explosion_purchase_tracking"
    ADD CONSTRAINT "explosion_purchase_tracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "compras"."inventory_movements"
    ADD CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "compras"."material_explosion_history"
    ADD CONSTRAINT "material_explosion_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "compras"."material_explosion_items"
    ADD CONSTRAINT "material_explosion_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "compras"."material_inventory_balances"
    ADD CONSTRAINT "material_inventory_balances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "compras"."material_receptions"
    ADD CONSTRAINT "material_receptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "compras"."material_receptions"
    ADD CONSTRAINT "material_receptions_reception_number_key" UNIQUE ("reception_number");



ALTER TABLE ONLY "compras"."material_returns"
    ADD CONSTRAINT "material_returns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "compras"."material_returns"
    ADD CONSTRAINT "material_returns_return_number_key" UNIQUE ("return_number");



ALTER TABLE ONLY "compras"."material_suppliers"
    ADD CONSTRAINT "material_suppliers_material_id_supplier_id_key" UNIQUE ("material_id", "supplier_id");



ALTER TABLE ONLY "compras"."material_suppliers"
    ADD CONSTRAINT "material_suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "compras"."material_transfers"
    ADD CONSTRAINT "material_transfers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "compras"."material_transfers"
    ADD CONSTRAINT "material_transfers_transfer_number_key" UNIQUE ("transfer_number");



ALTER TABLE ONLY "compras"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "compras"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_order_number_key" UNIQUE ("order_number");



ALTER TABLE ONLY "compras"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "compras"."reception_items"
    ADD CONSTRAINT "reception_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "compras"."return_items"
    ADD CONSTRAINT "return_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "compras"."suppliers"
    ADD CONSTRAINT "suppliers_access_token_key" UNIQUE ("access_token");



ALTER TABLE ONLY "compras"."suppliers"
    ADD CONSTRAINT "suppliers_nit_key" UNIQUE ("nit");



ALTER TABLE ONLY "compras"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "compras"."transfer_items"
    ADD CONSTRAINT "transfer_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "compras"."material_inventory_balances"
    ADD CONSTRAINT "unique_material_balance" UNIQUE ("material_id");



ALTER TABLE ONLY "inventario"."inventory_balances"
    ADD CONSTRAINT "inventory_balances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "inventario"."inventory_balances"
    ADD CONSTRAINT "inventory_balances_product_id_location_id_key" UNIQUE ("product_id", "location_id");



ALTER TABLE ONLY "inventario"."inventory_movements"
    ADD CONSTRAINT "inventory_movements_movement_number_key" UNIQUE ("movement_number");



ALTER TABLE ONLY "inventario"."inventory_movements"
    ADD CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "inventario"."locations"
    ADD CONSTRAINT "locations_code_key" UNIQUE ("code");



ALTER TABLE ONLY "inventario"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "produccion"."bill_of_materials"
    ADD CONSTRAINT "bill_of_materials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "produccion"."bill_of_materials"
    ADD CONSTRAINT "bill_of_materials_product_operation_material_key" UNIQUE ("product_id", "operation_id", "material_id");



ALTER TABLE ONLY "produccion"."material_consumptions"
    ADD CONSTRAINT "material_consumptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "produccion"."operations"
    ADD CONSTRAINT "operations_code_key" UNIQUE ("code");



ALTER TABLE ONLY "produccion"."operations"
    ADD CONSTRAINT "operations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "produccion"."product_work_center_mapping"
    ADD CONSTRAINT "product_work_center_mapping_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "produccion"."product_work_center_mapping"
    ADD CONSTRAINT "product_work_center_mapping_unique_assignment" UNIQUE ("product_id", "operation_id", "work_center_id");



ALTER TABLE ONLY "produccion"."production_productivity"
    ADD CONSTRAINT "production_productivity_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "produccion"."production_productivity"
    ADD CONSTRAINT "production_productivity_product_id_work_center_id_key" UNIQUE ("product_id", "work_center_id");



ALTER TABLE ONLY "produccion"."production_productivity"
    ADD CONSTRAINT "production_productivity_product_operation_key" UNIQUE ("product_id", "operation_id");



ALTER TABLE ONLY "produccion"."production_records"
    ADD CONSTRAINT "production_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "produccion"."production_route_tracking"
    ADD CONSTRAINT "production_route_tracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "produccion"."production_route_tracking"
    ADD CONSTRAINT "production_route_tracking_product_id_work_center_id_shift_d_key" UNIQUE ("product_id", "work_center_id", "shift_date");



ALTER TABLE ONLY "produccion"."production_routes"
    ADD CONSTRAINT "production_routes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "produccion"."production_routes"
    ADD CONSTRAINT "production_routes_product_id_work_center_id_sequence_order_key" UNIQUE ("product_id", "work_center_id", "sequence_order");



ALTER TABLE ONLY "produccion"."production_schedules"
    ADD CONSTRAINT "production_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "produccion"."production_shifts"
    ADD CONSTRAINT "production_shifts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "produccion"."shift_definitions"
    ADD CONSTRAINT "shift_definitions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "produccion"."shift_productions"
    ADD CONSTRAINT "shift_productions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "produccion"."work_center_staffing"
    ADD CONSTRAINT "unique_work_center_date_shift" UNIQUE ("work_center_id", "date", "shift_number");



ALTER TABLE ONLY "produccion"."weekly_plans"
    ADD CONSTRAINT "weekly_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "produccion"."weekly_plans"
    ADD CONSTRAINT "weekly_plans_week_start_date_key" UNIQUE ("week_start_date");



ALTER TABLE ONLY "produccion"."work_center_inventory"
    ADD CONSTRAINT "work_center_inventory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "produccion"."work_center_inventory"
    ADD CONSTRAINT "work_center_inventory_work_center_id_material_id_batch_numb_key" UNIQUE ("work_center_id", "material_id", "batch_number", "expiry_date");



ALTER TABLE ONLY "produccion"."work_center_operations"
    ADD CONSTRAINT "work_center_operations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "produccion"."work_center_operations"
    ADD CONSTRAINT "work_center_operations_work_center_id_operation_id_key" UNIQUE ("work_center_id", "operation_id");



ALTER TABLE ONLY "produccion"."work_center_staffing"
    ADD CONSTRAINT "work_center_staffing_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "produccion"."work_centers"
    ADD CONSTRAINT "work_centers_code_key" UNIQUE ("code");



ALTER TABLE ONLY "produccion"."work_centers"
    ADD CONSTRAINT "work_centers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."access_logs"
    ADD CONSTRAINT "access_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."adjustment_reasons"
    ADD CONSTRAINT "adjustment_reasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."adjustment_reasons"
    ADD CONSTRAINT "adjustment_reasons_reason_key" UNIQUE ("reason");



ALTER TABLE ONLY "public"."branches"
    ADD CONSTRAINT "branches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_config"
    ADD CONSTRAINT "client_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_credit_terms"
    ADD CONSTRAINT "client_credit_terms_client_id_key" UNIQUE ("client_id");



ALTER TABLE ONLY "public"."client_credit_terms"
    ADD CONSTRAINT "client_credit_terms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_frequencies"
    ADD CONSTRAINT "client_frequencies_branch_id_day_of_week_key" UNIQUE ("branch_id", "day_of_week");



ALTER TABLE ONLY "public"."client_frequencies"
    ADD CONSTRAINT "client_frequencies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_price_lists"
    ADD CONSTRAINT "client_price_lists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_price_lists"
    ADD CONSTRAINT "client_price_lists_product_id_client_id_key" UNIQUE ("product_id", "client_id");



ALTER TABLE ONLY "public"."clientes_rag"
    ADD CONSTRAINT "clientes_rag_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dispatch_inventory_config"
    ADD CONSTRAINT "dispatch_inventory_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."emails"
    ADD CONSTRAINT "emails_message_id_unique" UNIQUE ("message_id");



ALTER TABLE ONLY "public"."emails"
    ADD CONSTRAINT "emails_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."export_history"
    ADD CONSTRAINT "export_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventories"
    ADD CONSTRAINT "inventories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_adjustments"
    ADD CONSTRAINT "inventory_adjustments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_count_items"
    ADD CONSTRAINT "inventory_count_items_inventory_count_id_product_id_key" UNIQUE ("inventory_count_id", "product_id");



ALTER TABLE ONLY "public"."inventory_count_items"
    ADD CONSTRAINT "inventory_count_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_counts"
    ADD CONSTRAINT "inventory_counts_inventory_id_count_number_key" UNIQUE ("inventory_id", "count_number");



ALTER TABLE ONLY "public"."inventory_counts"
    ADD CONSTRAINT "inventory_counts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_final_results"
    ADD CONSTRAINT "inventory_final_results_inventory_id_product_id_key" UNIQUE ("inventory_id", "product_id");



ALTER TABLE ONLY "public"."inventory_final_results"
    ADD CONSTRAINT "inventory_final_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_reconciliations"
    ADD CONSTRAINT "inventory_reconciliations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_activities"
    ADD CONSTRAINT "lead_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_sources"
    ADD CONSTRAINT "lead_sources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_events"
    ADD CONSTRAINT "order_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_invoices"
    ADD CONSTRAINT "order_invoices_order_id_export_history_id_key" UNIQUE ("order_id", "export_history_id");



ALTER TABLE ONLY "public"."order_invoices"
    ADD CONSTRAINT "order_invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_item_deliveries_audit"
    ADD CONSTRAINT "order_item_deliveries_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_item_deliveries"
    ADD CONSTRAINT "order_item_deliveries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items_audit"
    ADD CONSTRAINT "order_items_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_status_history"
    ADD CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders_audit"
    ADD CONSTRAINT "orders_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_order_number_key" UNIQUE ("order_number");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pipeline_stages"
    ADD CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_aliases"
    ADD CONSTRAINT "product_aliases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_commercial_info"
    ADD CONSTRAINT "product_commercial_info_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_config"
    ADD CONSTRAINT "product_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_configurations"
    ADD CONSTRAINT "product_configurations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_configurations"
    ADD CONSTRAINT "product_configurations_product_id_key" UNIQUE ("product_id");



ALTER TABLE ONLY "public"."product_costs"
    ADD CONSTRAINT "product_costs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_inventory_config"
    ADD CONSTRAINT "product_inventory_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_inventory_config"
    ADD CONSTRAINT "product_inventory_config_product_id_key" UNIQUE ("product_id");



ALTER TABLE ONLY "public"."product_media"
    ADD CONSTRAINT "product_media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_price_lists"
    ADD CONSTRAINT "product_price_lists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_production_process"
    ADD CONSTRAINT "product_production_process_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_quality_specs"
    ADD CONSTRAINT "product_quality_specs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_technical_specs"
    ADD CONSTRAINT "product_technical_specs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."productos_rag"
    ADD CONSTRAINT "productos_rag_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."receiving_audit_logs"
    ADD CONSTRAINT "receiving_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."receiving_exceptions"
    ADD CONSTRAINT "receiving_exceptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."receiving_patterns"
    ADD CONSTRAINT "receiving_patterns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."receiving_schedules"
    ADD CONSTRAINT "receiving_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."receiving_templates"
    ADD CONSTRAINT "receiving_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."remision_items"
    ADD CONSTRAINT "remision_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."remisions"
    ADD CONSTRAINT "remisions_order_id_key" UNIQUE ("order_id");



ALTER TABLE ONLY "public"."remisions"
    ADD CONSTRAINT "remisions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."remisions"
    ADD CONSTRAINT "remisions_remision_number_key" UNIQUE ("remision_number");



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."route_orders"
    ADD CONSTRAINT "route_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."routes"
    ADD CONSTRAINT "routes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."routes"
    ADD CONSTRAINT "routes_route_number_unique" UNIQUE ("route_number");



ALTER TABLE ONLY "public"."sales_opportunities"
    ADD CONSTRAINT "sales_opportunities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_config"
    ADD CONSTRAINT "system_config_config_key_key" UNIQUE ("config_key");



ALTER TABLE ONLY "public"."system_config"
    ADD CONSTRAINT "system_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "unique_cedula" UNIQUE ("cedula");



ALTER TABLE ONLY "public"."user_migration_instructions"
    ADD CONSTRAINT "user_migration_instructions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vehicles"
    ADD CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vehicles"
    ADD CONSTRAINT "vehicles_vehicle_code_key" UNIQUE ("vehicle_code");



ALTER TABLE ONLY "public"."video_tutorials"
    ADD CONSTRAINT "video_tutorials_module_path_key" UNIQUE ("module_path");



ALTER TABLE ONLY "public"."video_tutorials"
    ADD CONSTRAINT "video_tutorials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "visitas"."product_evaluations"
    ADD CONSTRAINT "product_evaluations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "visitas"."product_evaluations"
    ADD CONSTRAINT "product_evaluations_visit_id_product_id_key" UNIQUE ("visit_id", "product_id");



ALTER TABLE ONLY "visitas"."store_visits"
    ADD CONSTRAINT "store_visits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "visitas"."visit_photos"
    ADD CONSTRAINT "visit_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "workflows"."ordenes_compra"
    ADD CONSTRAINT "ordenes_compra_email_id_key" UNIQUE ("email_id");



ALTER TABLE ONLY "workflows"."ordenes_compra"
    ADD CONSTRAINT "ordenes_compra_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "workflows"."ordenes_compra_productos"
    ADD CONSTRAINT "ordenes_compra_productos_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_explosion_tracking_date" ON "compras"."explosion_purchase_tracking" USING "btree" ("requirement_date");



CREATE INDEX "idx_explosion_tracking_material" ON "compras"."explosion_purchase_tracking" USING "btree" ("material_id");



CREATE INDEX "idx_explosion_tracking_material_date" ON "compras"."explosion_purchase_tracking" USING "btree" ("material_id", "requirement_date");



CREATE INDEX "idx_explosion_tracking_po_item" ON "compras"."explosion_purchase_tracking" USING "btree" ("purchase_order_item_id");



CREATE INDEX "idx_explosion_tracking_status" ON "compras"."explosion_purchase_tracking" USING "btree" ("status");



CREATE INDEX "idx_inventory_movements_balance" ON "compras"."inventory_movements" USING "btree" ("balance_after");



CREATE INDEX "idx_inventory_movements_covering" ON "compras"."inventory_movements" USING "btree" ("movement_date" DESC, "material_id", "movement_type", "quantity_change", "warehouse_type") INCLUDE ("unit_of_measure", "notes", "created_at");



COMMENT ON INDEX "compras"."idx_inventory_movements_covering" IS 'Covering index to avoid table lookups for common SELECT columns';



CREATE INDEX "idx_inventory_movements_date_desc" ON "compras"."inventory_movements" USING "btree" ("movement_date" DESC, "created_at" DESC);



COMMENT ON INDEX "compras"."idx_inventory_movements_date_desc" IS 'Optimizes default query: recent movements ordered by date DESC';



CREATE INDEX "idx_inventory_movements_material" ON "compras"."inventory_movements" USING "btree" ("material_id");



CREATE INDEX "idx_inventory_movements_material_date" ON "compras"."inventory_movements" USING "btree" ("material_id", "movement_date" DESC) WHERE ("movement_date" IS NOT NULL);



COMMENT ON INDEX "compras"."idx_inventory_movements_material_date" IS 'Optimizes filtering by specific material within date range';



CREATE INDEX "idx_inventory_movements_material_type_date" ON "compras"."inventory_movements" USING "btree" ("material_id", "movement_type", "movement_date" DESC);



COMMENT ON INDEX "compras"."idx_inventory_movements_material_type_date" IS 'Optimizes complex filter: material + type + date range';



CREATE INDEX "idx_inventory_movements_reference" ON "compras"."inventory_movements" USING "btree" ("reference_id");



CREATE INDEX "idx_inventory_movements_type" ON "compras"."inventory_movements" USING "btree" ("movement_type");



CREATE INDEX "idx_inventory_movements_type_date" ON "compras"."inventory_movements" USING "btree" ("movement_type", "movement_date" DESC);



COMMENT ON INDEX "compras"."idx_inventory_movements_type_date" IS 'Optimizes filtering by movement type (reception, consumption, etc.)';



CREATE INDEX "idx_inventory_movements_warehouse_type" ON "compras"."inventory_movements" USING "btree" ("warehouse_type") WHERE ("warehouse_type" IS NOT NULL);



CREATE INDEX "idx_inventory_movements_warehouse_type_date" ON "compras"."inventory_movements" USING "btree" ("warehouse_type", "movement_date" DESC) WHERE ("warehouse_type" IS NOT NULL);



COMMENT ON INDEX "compras"."idx_inventory_movements_warehouse_type_date" IS 'Optimizes filtering by warehouse vs production location';



CREATE INDEX "idx_material_balances_last_updated" ON "compras"."material_inventory_balances" USING "btree" ("last_updated_at" DESC);



CREATE INDEX "idx_material_balances_material_id" ON "compras"."material_inventory_balances" USING "btree" ("material_id");



CREATE INDEX "idx_material_balances_production_desc" ON "compras"."material_inventory_balances" USING "btree" ("production_stock" DESC) WHERE ("production_stock" > (0)::numeric);



CREATE INDEX "idx_material_balances_production_stock" ON "compras"."material_inventory_balances" USING "btree" ("production_stock") WHERE ("production_stock" > (0)::numeric);



CREATE INDEX "idx_material_balances_total_stock" ON "compras"."material_inventory_balances" USING "btree" ("total_stock") WHERE ("total_stock" > (0)::numeric);



CREATE INDEX "idx_material_balances_total_stock_desc" ON "compras"."material_inventory_balances" USING "btree" ("total_stock" DESC) WHERE ("total_stock" > (0)::numeric);



COMMENT ON INDEX "compras"."idx_material_balances_total_stock_desc" IS 'Optimizes queries for materials sorted by total stock';



CREATE INDEX "idx_material_balances_updated" ON "compras"."material_inventory_balances" USING "btree" ("last_updated_at" DESC);



COMMENT ON INDEX "compras"."idx_material_balances_updated" IS 'Optimizes cache invalidation queries by last_updated_at';



CREATE INDEX "idx_material_balances_warehouse_desc" ON "compras"."material_inventory_balances" USING "btree" ("warehouse_stock" DESC) WHERE ("warehouse_stock" > (0)::numeric);



CREATE INDEX "idx_material_balances_warehouse_stock" ON "compras"."material_inventory_balances" USING "btree" ("warehouse_stock") WHERE ("warehouse_stock" > (0)::numeric);



CREATE INDEX "idx_material_explosion_date" ON "compras"."material_explosion_history" USING "btree" ("calculation_date" DESC);



CREATE INDEX "idx_material_explosion_items_explosion" ON "compras"."material_explosion_items" USING "btree" ("explosion_id");



CREATE INDEX "idx_material_explosion_items_material" ON "compras"."material_explosion_items" USING "btree" ("material_id");



CREATE INDEX "idx_material_explosion_product" ON "compras"."material_explosion_history" USING "btree" ("product_id");



CREATE INDEX "idx_material_receptions_date" ON "compras"."material_receptions" USING "btree" ("reception_date" DESC);



CREATE INDEX "idx_material_receptions_material" ON "compras"."material_receptions" USING "btree" ("material_id");



CREATE INDEX "idx_material_receptions_number" ON "compras"."material_receptions" USING "btree" ("reception_number");



CREATE INDEX "idx_material_receptions_operator" ON "compras"."material_receptions" USING "btree" ("operator_id");



CREATE INDEX "idx_material_receptions_order" ON "compras"."material_receptions" USING "btree" ("purchase_order_id");



CREATE INDEX "idx_material_receptions_supplier" ON "compras"."material_receptions" USING "btree" ("supplier_id");



CREATE INDEX "idx_material_returns_status" ON "compras"."material_returns" USING "btree" ("status");



CREATE INDEX "idx_material_returns_work_center" ON "compras"."material_returns" USING "btree" ("work_center_id");



CREATE INDEX "idx_material_suppliers_material" ON "compras"."material_suppliers" USING "btree" ("material_id");



CREATE INDEX "idx_material_suppliers_preferred" ON "compras"."material_suppliers" USING "btree" ("is_preferred") WHERE ("is_preferred" = true);



CREATE INDEX "idx_material_suppliers_status" ON "compras"."material_suppliers" USING "btree" ("status");



CREATE INDEX "idx_material_suppliers_supplier" ON "compras"."material_suppliers" USING "btree" ("supplier_id");



CREATE INDEX "idx_material_transfers_requested_by" ON "compras"."material_transfers" USING "btree" ("requested_by");



CREATE INDEX "idx_material_transfers_status" ON "compras"."material_transfers" USING "btree" ("status");



CREATE INDEX "idx_material_transfers_work_center" ON "compras"."material_transfers" USING "btree" ("work_center_id");



CREATE INDEX "idx_purchase_order_items_material" ON "compras"."purchase_order_items" USING "btree" ("material_id");



CREATE INDEX "idx_purchase_order_items_order" ON "compras"."purchase_order_items" USING "btree" ("purchase_order_id");



CREATE INDEX "idx_purchase_orders_number" ON "compras"."purchase_orders" USING "btree" ("order_number");



CREATE INDEX "idx_purchase_orders_order_date" ON "compras"."purchase_orders" USING "btree" ("order_date" DESC);



CREATE INDEX "idx_purchase_orders_status" ON "compras"."purchase_orders" USING "btree" ("status");



CREATE INDEX "idx_purchase_orders_supplier" ON "compras"."purchase_orders" USING "btree" ("supplier_id");



CREATE INDEX "idx_reception_items_expiry" ON "compras"."reception_items" USING "btree" ("expiry_date");



CREATE INDEX "idx_reception_items_material" ON "compras"."reception_items" USING "btree" ("material_id");



CREATE INDEX "idx_reception_items_po_item" ON "compras"."reception_items" USING "btree" ("purchase_order_item_id");



CREATE INDEX "idx_reception_items_reception" ON "compras"."reception_items" USING "btree" ("reception_id");



CREATE INDEX "idx_return_items_material" ON "compras"."return_items" USING "btree" ("material_id");



CREATE INDEX "idx_return_items_return" ON "compras"."return_items" USING "btree" ("return_id");



CREATE INDEX "idx_suppliers_access_token" ON "compras"."suppliers" USING "btree" ("access_token") WHERE ("access_token" IS NOT NULL);



CREATE INDEX "idx_suppliers_nit" ON "compras"."suppliers" USING "btree" ("nit");



CREATE INDEX "idx_suppliers_status" ON "compras"."suppliers" USING "btree" ("status");



CREATE INDEX "idx_transfer_items_material" ON "compras"."transfer_items" USING "btree" ("material_id");



CREATE INDEX "idx_transfer_items_transfer" ON "compras"."transfer_items" USING "btree" ("transfer_id");



CREATE INDEX "idx_balances_location" ON "inventario"."inventory_balances" USING "btree" ("location_id");



CREATE INDEX "idx_balances_positive" ON "inventario"."inventory_balances" USING "btree" ("quantity_on_hand") WHERE ("quantity_on_hand" > (0)::numeric);



CREATE INDEX "idx_balances_product" ON "inventario"."inventory_balances" USING "btree" ("product_id");



CREATE UNIQUE INDEX "idx_balances_product_location" ON "inventario"."inventory_balances" USING "btree" ("product_id", "location_id");



CREATE INDEX "idx_inventory_movements_status_location_to" ON "inventario"."inventory_movements" USING "btree" ("status", "location_id_to") WHERE ((("status")::"text" = 'pending'::"text") AND (("movement_type")::"text" = 'TRANSFER_IN'::"text"));



CREATE INDEX "idx_locations_bin_type" ON "inventario"."locations" USING "btree" ("bin_type") WHERE ("bin_type" IS NOT NULL);



CREATE UNIQUE INDEX "idx_locations_code" ON "inventario"."locations" USING "btree" ("code");



CREATE INDEX "idx_locations_level" ON "inventario"."locations" USING "btree" ("level");



CREATE INDEX "idx_locations_parent" ON "inventario"."locations" USING "btree" ("parent_id");



CREATE INDEX "idx_locations_path" ON "inventario"."locations" USING "gin" ("to_tsvector"('"simple"'::"regconfig", "path"));



CREATE INDEX "idx_locations_type_active" ON "inventario"."locations" USING "btree" ("location_type", "is_active");



CREATE INDEX "idx_movements_batch" ON "inventario"."inventory_movements" USING "btree" ("batch_number") WHERE ("batch_number" IS NOT NULL);



CREATE INDEX "idx_movements_expiry" ON "inventario"."inventory_movements" USING "btree" ("expiry_date") WHERE ("expiry_date" IS NOT NULL);



CREATE INDEX "idx_movements_expiry_product" ON "inventario"."inventory_movements" USING "btree" ("product_id", "expiry_date") WHERE ("expiry_date" IS NOT NULL);



CREATE INDEX "idx_movements_linked" ON "inventario"."inventory_movements" USING "btree" ("linked_movement_id") WHERE ("linked_movement_id" IS NOT NULL);



CREATE INDEX "idx_movements_location_from" ON "inventario"."inventory_movements" USING "btree" ("location_id_from", "movement_date" DESC);



CREATE INDEX "idx_movements_location_to" ON "inventario"."inventory_movements" USING "btree" ("location_id_to", "movement_date" DESC);



CREATE INDEX "idx_movements_product_date" ON "inventario"."inventory_movements" USING "btree" ("product_id", "movement_date" DESC);



CREATE INDEX "idx_movements_reason_date" ON "inventario"."inventory_movements" USING "btree" ("reason_type", "movement_date" DESC);



CREATE INDEX "idx_movements_recorded_by" ON "inventario"."inventory_movements" USING "btree" ("recorded_by", "movement_date" DESC);



CREATE INDEX "idx_movements_reference" ON "inventario"."inventory_movements" USING "btree" ("reference_id", "reference_type");



CREATE INDEX "idx_movements_type_reason" ON "inventario"."inventory_movements" USING "btree" ("movement_type", "reason_type");



CREATE INDEX "idx_bill_of_materials_operation" ON "produccion"."bill_of_materials" USING "btree" ("operation_id");



CREATE INDEX "idx_daily_demand_date" ON "produccion"."daily_demand_history" USING "btree" ("delivery_date");



CREATE INDEX "idx_daily_demand_product_dow" ON "produccion"."daily_demand_history" USING "btree" ("product_id", "day_of_week");



CREATE INDEX "idx_material_consumptions_shift_production" ON "produccion"."material_consumptions" USING "btree" ("shift_production_id");



CREATE INDEX "idx_operations_display_order" ON "produccion"."operations" USING "btree" ("display_order");



CREATE INDEX "idx_product_work_center_mapping_operation_id" ON "produccion"."product_work_center_mapping" USING "btree" ("operation_id");



CREATE INDEX "idx_product_work_center_mapping_product_id" ON "produccion"."product_work_center_mapping" USING "btree" ("product_id");



CREATE INDEX "idx_product_work_center_mapping_work_center_id" ON "produccion"."product_work_center_mapping" USING "btree" ("work_center_id");



CREATE INDEX "idx_production_productivity_operation" ON "produccion"."production_productivity" USING "btree" ("operation_id");



CREATE INDEX "idx_production_records_shift_production" ON "produccion"."production_records" USING "btree" ("shift_production_id");



CREATE INDEX "idx_production_route_tracking_date" ON "produccion"."production_route_tracking" USING "btree" ("shift_date");



CREATE INDEX "idx_production_schedules_cascade_source" ON "produccion"."production_schedules" USING "btree" ("cascade_source_id");



CREATE INDEX "idx_production_schedules_dates" ON "produccion"."production_schedules" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_production_schedules_day_shift" ON "produccion"."production_schedules" USING "btree" ("day_of_week", "shift_number");



CREATE INDEX "idx_production_schedules_order_number" ON "produccion"."production_schedules" USING "btree" ("production_order_number");



CREATE INDEX "idx_production_schedules_product_id" ON "produccion"."production_schedules" USING "btree" ("product_id");



CREATE INDEX "idx_production_schedules_resource_id" ON "produccion"."production_schedules" USING "btree" ("resource_id");



CREATE INDEX "idx_production_shifts_status" ON "produccion"."production_shifts" USING "btree" ("status");



CREATE INDEX "idx_production_shifts_work_center" ON "produccion"."production_shifts" USING "btree" ("work_center_id");



CREATE INDEX "idx_schedules_resource_date" ON "produccion"."production_schedules" USING "btree" ("resource_id", "start_date");



CREATE INDEX "idx_schedules_week_plan" ON "produccion"."production_schedules" USING "btree" ("week_plan_id");



CREATE INDEX "idx_shift_productions_product_id" ON "produccion"."shift_productions" USING "btree" ("product_id");



CREATE INDEX "idx_shift_productions_received_to_inventory" ON "produccion"."shift_productions" USING "btree" ("received_to_inventory") WHERE ("received_to_inventory" = false);



CREATE INDEX "idx_shift_productions_shift_id" ON "produccion"."shift_productions" USING "btree" ("shift_id");



CREATE INDEX "idx_weekly_plans_year_week" ON "produccion"."weekly_plans" USING "btree" ("year", "week_number");



CREATE INDEX "idx_work_center_inventory_expiry" ON "produccion"."work_center_inventory" USING "btree" ("expiry_date");



CREATE INDEX "idx_work_center_inventory_material" ON "produccion"."work_center_inventory" USING "btree" ("material_id");



CREATE INDEX "idx_work_center_inventory_work_center" ON "produccion"."work_center_inventory" USING "btree" ("work_center_id");



CREATE INDEX "idx_work_center_operations_operation_id" ON "produccion"."work_center_operations" USING "btree" ("operation_id");



CREATE INDEX "idx_work_center_operations_work_center_id" ON "produccion"."work_center_operations" USING "btree" ("work_center_id");



CREATE INDEX "idx_work_center_staffing_date" ON "produccion"."work_center_staffing" USING "btree" ("date");



CREATE INDEX "idx_work_center_staffing_date_range" ON "produccion"."work_center_staffing" USING "btree" ("work_center_id", "date");



CREATE INDEX "idx_work_center_staffing_work_center" ON "produccion"."work_center_staffing" USING "btree" ("work_center_id");



CREATE INDEX "idx_work_centers_capacidad" ON "produccion"."work_centers" USING "btree" ("capacidad_maxima_carros") WHERE ("capacidad_maxima_carros" IS NOT NULL);



CREATE INDEX "idx_work_centers_is_last_operation" ON "produccion"."work_centers" USING "btree" ("is_last_operation") WHERE ("is_last_operation" = true);



CREATE INDEX "idx_work_centers_location" ON "produccion"."work_centers" USING "btree" ("location_id");



CREATE INDEX "idx_work_centers_operation" ON "produccion"."work_centers" USING "btree" ("operation_id");



CREATE INDEX "shift_productions_started_at_idx" ON "produccion"."shift_productions" USING "btree" ("started_at");



CREATE INDEX "export_history_created_at_idx" ON "public"."export_history" USING "btree" ("created_at");



CREATE INDEX "idx_access_logs_attempted_at" ON "public"."access_logs" USING "btree" ("attempted_at");



CREATE INDEX "idx_access_logs_path" ON "public"."access_logs" USING "btree" ("attempted_path");



CREATE INDEX "idx_access_logs_user_email" ON "public"."access_logs" USING "btree" ("user_email");



CREATE INDEX "idx_access_logs_user_id" ON "public"."access_logs" USING "btree" ("user_id");



CREATE INDEX "idx_branches_client_id" ON "public"."branches" USING "btree" ("client_id");



CREATE INDEX "idx_branches_observations" ON "public"."branches" USING "gin" ("to_tsvector"('"spanish"'::"regconfig", "observations"));



CREATE INDEX "idx_client_config_client_id" ON "public"."client_config" USING "btree" ("client_id");



CREATE INDEX "idx_client_credit_terms_client" ON "public"."client_credit_terms" USING "btree" ("client_id");



CREATE INDEX "idx_client_frequencies_active" ON "public"."client_frequencies" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_client_frequencies_branch_day" ON "public"."client_frequencies" USING "btree" ("branch_id", "day_of_week");



CREATE INDEX "idx_client_frequencies_branch_id" ON "public"."client_frequencies" USING "btree" ("branch_id");



CREATE INDEX "idx_client_frequencies_day_of_week" ON "public"."client_frequencies" USING "btree" ("day_of_week");



CREATE INDEX "idx_client_price_lists_client" ON "public"."client_price_lists" USING "btree" ("client_id");



CREATE INDEX "idx_client_price_lists_product" ON "public"."client_price_lists" USING "btree" ("product_id");



CREATE INDEX "idx_clients_assigned_user" ON "public"."clients" USING "btree" ("assigned_user_id");



CREATE INDEX "idx_clients_billing_type" ON "public"."clients" USING "btree" ("billing_type");



CREATE INDEX "idx_clients_category" ON "public"."clients" USING "btree" ("category");



CREATE INDEX "idx_clients_facturador" ON "public"."clients" USING "btree" ("facturador");



CREATE INDEX "idx_clients_is_active" ON "public"."clients" USING "btree" ("is_active");



CREATE INDEX "idx_clients_lead_source" ON "public"."clients" USING "btree" ("lead_source_id");



CREATE INDEX "idx_clients_lead_status" ON "public"."clients" USING "btree" ("lead_status");



CREATE INDEX "idx_clients_nit" ON "public"."clients" USING "btree" ("nit");



CREATE INDEX "idx_export_history_created_by" ON "public"."export_history" USING "btree" ("created_by");



CREATE INDEX "idx_export_history_export_date" ON "public"."export_history" USING "btree" ("export_date");



CREATE INDEX "idx_inventories_created_by" ON "public"."inventories" USING "btree" ("created_by");



CREATE INDEX "idx_inventories_inventory_type" ON "public"."inventories" USING "btree" ("inventory_type");



CREATE INDEX "idx_inventories_location_id" ON "public"."inventories" USING "btree" ("location_id");



CREATE INDEX "idx_inventories_status" ON "public"."inventories" USING "btree" ("status");



CREATE INDEX "idx_inventory_adjustments_created" ON "public"."inventory_adjustments" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_inventory_adjustments_inventory" ON "public"."inventory_adjustments" USING "btree" ("inventory_id");



CREATE INDEX "idx_inventory_adjustments_product" ON "public"."inventory_adjustments" USING "btree" ("product_id");



CREATE INDEX "idx_inventory_adjustments_status" ON "public"."inventory_adjustments" USING "btree" ("status");



CREATE INDEX "idx_inventory_count_items_count_id" ON "public"."inventory_count_items" USING "btree" ("inventory_count_id");



CREATE INDEX "idx_inventory_count_items_product_id" ON "public"."inventory_count_items" USING "btree" ("product_id");



CREATE INDEX "idx_inventory_counts_inventory_id" ON "public"."inventory_counts" USING "btree" ("inventory_id");



CREATE INDEX "idx_inventory_final_results_inventory_id" ON "public"."inventory_final_results" USING "btree" ("inventory_id");



CREATE INDEX "idx_inventory_final_results_product_id" ON "public"."inventory_final_results" USING "btree" ("product_id");



CREATE INDEX "idx_inventory_reconciliations_inventory_id" ON "public"."inventory_reconciliations" USING "btree" ("inventory_id");



CREATE INDEX "idx_lead_activities_client_id" ON "public"."lead_activities" USING "btree" ("client_id");



CREATE INDEX "idx_lead_activities_scheduled_date" ON "public"."lead_activities" USING "btree" ("scheduled_date");



CREATE INDEX "idx_lead_activities_user_id" ON "public"."lead_activities" USING "btree" ("user_id");



CREATE INDEX "idx_order_events_created_at" ON "public"."order_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_order_events_order_id" ON "public"."order_events" USING "btree" ("order_id");



CREATE INDEX "idx_order_events_type" ON "public"."order_events" USING "btree" ("event_type");



CREATE INDEX "idx_order_invoices_export_history_id" ON "public"."order_invoices" USING "btree" ("export_history_id");



CREATE INDEX "idx_order_invoices_invoice_number" ON "public"."order_invoices" USING "btree" ("invoice_number");



CREATE INDEX "idx_order_invoices_order_id" ON "public"."order_invoices" USING "btree" ("order_id");



CREATE INDEX "idx_order_item_deliveries_audit_action" ON "public"."order_item_deliveries_audit" USING "btree" ("action");



CREATE INDEX "idx_order_item_deliveries_audit_changed_at" ON "public"."order_item_deliveries_audit" USING "btree" ("changed_at" DESC);



CREATE INDEX "idx_order_item_deliveries_audit_changed_by" ON "public"."order_item_deliveries_audit" USING "btree" ("changed_by");



CREATE INDEX "idx_order_item_deliveries_audit_delivery_id" ON "public"."order_item_deliveries_audit" USING "btree" ("delivery_id");



CREATE INDEX "idx_order_item_deliveries_audit_new_data" ON "public"."order_item_deliveries_audit" USING "gin" ("new_data");



CREATE INDEX "idx_order_item_deliveries_audit_old_data" ON "public"."order_item_deliveries_audit" USING "gin" ("old_data");



CREATE INDEX "idx_order_item_deliveries_audit_order_id" ON "public"."order_item_deliveries_audit" USING "btree" ("order_id");



CREATE INDEX "idx_order_item_deliveries_audit_order_item_id" ON "public"."order_item_deliveries_audit" USING "btree" ("order_item_id");



CREATE INDEX "idx_order_item_deliveries_order_item" ON "public"."order_item_deliveries" USING "btree" ("order_item_id");



CREATE INDEX "idx_order_item_deliveries_order_item_id" ON "public"."order_item_deliveries" USING "btree" ("order_item_id");



CREATE INDEX "idx_order_item_deliveries_route_order" ON "public"."order_item_deliveries" USING "btree" ("route_order_id");



CREATE INDEX "idx_order_item_deliveries_status" ON "public"."order_item_deliveries" USING "btree" ("delivery_status");



CREATE UNIQUE INDEX "idx_order_item_deliveries_unique" ON "public"."order_item_deliveries" USING "btree" ("route_order_id", "order_item_id");



CREATE INDEX "idx_order_items_audit_action" ON "public"."order_items_audit" USING "btree" ("action");



CREATE INDEX "idx_order_items_audit_changed_at" ON "public"."order_items_audit" USING "btree" ("changed_at" DESC);



CREATE INDEX "idx_order_items_audit_changed_by" ON "public"."order_items_audit" USING "btree" ("changed_by");



CREATE INDEX "idx_order_items_audit_new_data" ON "public"."order_items_audit" USING "gin" ("new_data");



CREATE INDEX "idx_order_items_audit_old_data" ON "public"."order_items_audit" USING "gin" ("old_data");



CREATE INDEX "idx_order_items_audit_order_id" ON "public"."order_items_audit" USING "btree" ("order_id");



CREATE INDEX "idx_order_items_audit_order_item_id" ON "public"."order_items_audit" USING "btree" ("order_item_id");



CREATE INDEX "idx_order_items_order_id" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_orders_audit_action" ON "public"."orders_audit" USING "btree" ("action");



CREATE INDEX "idx_orders_audit_changed_at" ON "public"."orders_audit" USING "btree" ("changed_at" DESC);



CREATE INDEX "idx_orders_audit_changed_by" ON "public"."orders_audit" USING "btree" ("changed_by");



CREATE INDEX "idx_orders_audit_new_data" ON "public"."orders_audit" USING "gin" ("new_data");



CREATE INDEX "idx_orders_audit_old_data" ON "public"."orders_audit" USING "gin" ("old_data");



CREATE INDEX "idx_orders_audit_order_id" ON "public"."orders_audit" USING "btree" ("order_id");



CREATE INDEX "idx_orders_branch_id" ON "public"."orders" USING "btree" ("branch_id");



CREATE INDEX "idx_orders_has_pending_missing" ON "public"."orders" USING "btree" ("has_pending_missing") WHERE ("has_pending_missing" = true);



CREATE INDEX "idx_orders_invoice_export_id" ON "public"."orders" USING "btree" ("invoice_export_id");



CREATE INDEX "idx_orders_invoiced_at" ON "public"."orders" USING "btree" ("invoiced_at");



CREATE INDEX "idx_orders_invoiced_flags" ON "public"."orders" USING "btree" ("is_invoiced", "is_invoiced_from_remision") WHERE ((("is_invoiced" = false) OR ("is_invoiced" IS NULL)) AND ("is_invoiced_from_remision" = false));



CREATE INDEX "idx_orders_is_invoiced" ON "public"."orders" USING "btree" ("is_invoiced");



CREATE INDEX "idx_orders_is_invoiced_from_remision" ON "public"."orders" USING "btree" ("is_invoiced_from_remision");



CREATE INDEX "idx_orders_requires_remision" ON "public"."orders" USING "btree" ("requires_remision");



CREATE INDEX "idx_orders_status_remisionado" ON "public"."orders" USING "btree" ("status") WHERE (("status")::"text" = 'remisionado'::"text");



CREATE INDEX "idx_product_commercial_info_product" ON "public"."product_commercial_info" USING "btree" ("product_id");



CREATE INDEX "idx_product_costs_product" ON "public"."product_costs" USING "btree" ("product_id");



CREATE INDEX "idx_product_inventory_config_product" ON "public"."product_inventory_config" USING "btree" ("product_id");



CREATE INDEX "idx_product_media_primary" ON "public"."product_media" USING "btree" ("product_id", "is_primary");



CREATE INDEX "idx_product_media_product" ON "public"."product_media" USING "btree" ("product_id");



CREATE INDEX "idx_product_price_lists_active" ON "public"."product_price_lists" USING "btree" ("product_id", "is_active");



CREATE INDEX "idx_product_price_lists_product" ON "public"."product_price_lists" USING "btree" ("product_id");



CREATE INDEX "idx_product_production_process_active" ON "public"."product_production_process" USING "btree" ("product_id", "is_active");



CREATE INDEX "idx_product_production_process_product" ON "public"."product_production_process" USING "btree" ("product_id");



CREATE INDEX "idx_product_quality_specs_product" ON "public"."product_quality_specs" USING "btree" ("product_id");



CREATE INDEX "idx_product_technical_specs_product" ON "public"."product_technical_specs" USING "btree" ("product_id");



CREATE INDEX "idx_products_category" ON "public"."products" USING "btree" ("category");



CREATE INDEX "idx_products_codigo_wo" ON "public"."products" USING "btree" ("codigo_wo");



CREATE INDEX "idx_products_is_active" ON "public"."products" USING "btree" ("is_active");



CREATE INDEX "idx_products_is_active_category" ON "public"."products" USING "btree" ("is_active", "category");



CREATE INDEX "idx_products_lote_minimo" ON "public"."products" USING "btree" ("lote_minimo") WHERE ("lote_minimo" IS NOT NULL);



CREATE INDEX "idx_products_subcategory" ON "public"."products" USING "btree" ("subcategory");



CREATE INDEX "idx_products_tax_rate" ON "public"."products" USING "btree" ("tax_rate");



CREATE INDEX "idx_products_visible_in_ecommerce" ON "public"."products" USING "btree" ("visible_in_ecommerce");



CREATE INDEX "idx_receiving_audit_logs_target" ON "public"."receiving_audit_logs" USING "btree" ("target_table", "target_id");



CREATE INDEX "idx_receiving_audit_logs_user" ON "public"."receiving_audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_receiving_exceptions_branch" ON "public"."receiving_exceptions" USING "btree" ("branch_id");



CREATE INDEX "idx_receiving_exceptions_client" ON "public"."receiving_exceptions" USING "btree" ("client_id");



CREATE INDEX "idx_receiving_exceptions_date" ON "public"."receiving_exceptions" USING "btree" ("exception_date");



CREATE INDEX "idx_receiving_patterns_active" ON "public"."receiving_patterns" USING "btree" ("is_active");



CREATE INDEX "idx_receiving_patterns_branch" ON "public"."receiving_patterns" USING "btree" ("branch_id");



CREATE INDEX "idx_receiving_patterns_client" ON "public"."receiving_patterns" USING "btree" ("client_id");



CREATE INDEX "idx_receiving_schedules_branch" ON "public"."receiving_schedules" USING "btree" ("branch_id");



CREATE INDEX "idx_receiving_schedules_client" ON "public"."receiving_schedules" USING "btree" ("client_id");



CREATE INDEX "idx_receiving_schedules_day" ON "public"."receiving_schedules" USING "btree" ("day_of_week");



CREATE INDEX "idx_receiving_schedules_template" ON "public"."receiving_schedules" USING "btree" ("applied_template_id");



CREATE INDEX "idx_receiving_templates_created_by" ON "public"."receiving_templates" USING "btree" ("created_by");



CREATE INDEX "idx_receiving_templates_public" ON "public"."receiving_templates" USING "btree" ("is_public");



CREATE INDEX "idx_remision_items_product_id" ON "public"."remision_items" USING "btree" ("product_id");



CREATE INDEX "idx_remision_items_remision_id" ON "public"."remision_items" USING "btree" ("remision_id");



CREATE INDEX "idx_remisions_created_at" ON "public"."remisions" USING "btree" ("created_at");



CREATE INDEX "idx_remisions_created_at_date" ON "public"."remisions" USING "btree" ((("created_at")::"date"));



CREATE INDEX "idx_remisions_order_id" ON "public"."remisions" USING "btree" ("order_id");



CREATE INDEX "idx_remisions_remision_number" ON "public"."remisions" USING "btree" ("remision_number");



CREATE INDEX "idx_returns_product_status" ON "public"."returns" USING "btree" ("product_id", "status");



CREATE INDEX "idx_returns_rejection_reason" ON "public"."returns" USING "btree" ("rejection_reason") WHERE ("rejection_reason" IS NOT NULL);



CREATE INDEX "idx_returns_route_id" ON "public"."returns" USING "btree" ("route_id") WHERE ("route_id" IS NOT NULL);



CREATE INDEX "idx_returns_route_status" ON "public"."returns" USING "btree" ("route_id", "status");



CREATE INDEX "idx_returns_status" ON "public"."returns" USING "btree" ("status");



CREATE INDEX "idx_routes_created_by" ON "public"."routes" USING "btree" ("created_by");



CREATE INDEX "idx_routes_route_name" ON "public"."routes" USING "btree" ("route_name");



CREATE INDEX "idx_routes_route_number" ON "public"."routes" USING "btree" ("route_number");



CREATE INDEX "idx_routes_updated_by" ON "public"."routes" USING "btree" ("updated_by");



CREATE INDEX "idx_routes_vehicle_id" ON "public"."routes" USING "btree" ("vehicle_id");



CREATE INDEX "idx_sales_opportunities_assigned_user" ON "public"."sales_opportunities" USING "btree" ("assigned_user_id");



CREATE INDEX "idx_sales_opportunities_client_id" ON "public"."sales_opportunities" USING "btree" ("client_id");



CREATE INDEX "idx_sales_opportunities_stage" ON "public"."sales_opportunities" USING "btree" ("pipeline_stage_id");



CREATE INDEX "idx_system_config_key" ON "public"."system_config" USING "btree" ("config_key");



CREATE INDEX "idx_users_cedula" ON "public"."users" USING "btree" ("cedula");



CREATE INDEX "idx_users_company_id" ON "public"."users" USING "btree" ("company_id");



CREATE INDEX "idx_users_permissions" ON "public"."users" USING "gin" ("permissions");



CREATE INDEX "idx_users_status" ON "public"."users" USING "btree" ("status");



CREATE INDEX "idx_vehicles_driver_id" ON "public"."vehicles" USING "btree" ("driver_id");



CREATE INDEX "idx_video_tutorials_created_by" ON "public"."video_tutorials" USING "btree" ("created_by");



CREATE INDEX "idx_video_tutorials_module_path" ON "public"."video_tutorials" USING "btree" ("module_path");



CREATE INDEX "orders_created_at_idx" ON "public"."orders" USING "btree" ("created_at");



CREATE INDEX "orders_has_pending_missing_idx" ON "public"."orders" USING "btree" ("has_pending_missing");



CREATE INDEX "orders_status_idx" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "orders_vat_amount_idx" ON "public"."orders" USING "btree" ("vat_amount");



CREATE INDEX "idx_product_evaluations_product" ON "visitas"."product_evaluations" USING "btree" ("product_id");



CREATE INDEX "idx_product_evaluations_visit" ON "visitas"."product_evaluations" USING "btree" ("visit_id");



CREATE INDEX "idx_store_visits_branch" ON "visitas"."store_visits" USING "btree" ("branch_id");



CREATE INDEX "idx_store_visits_client" ON "visitas"."store_visits" USING "btree" ("client_id");



CREATE INDEX "idx_store_visits_created_by" ON "visitas"."store_visits" USING "btree" ("created_by");



CREATE INDEX "idx_store_visits_date" ON "visitas"."store_visits" USING "btree" ("visit_date");



CREATE INDEX "idx_visit_photos_visit" ON "visitas"."visit_photos" USING "btree" ("visit_id");



CREATE INDEX "idx_ordenes_compra_cliente" ON "workflows"."ordenes_compra" USING "btree" ("cliente");



CREATE INDEX "idx_ordenes_compra_cliente_id" ON "workflows"."ordenes_compra" USING "btree" ("cliente_id");



CREATE INDEX "idx_ordenes_compra_email_id" ON "workflows"."ordenes_compra" USING "btree" ("email_id");



CREATE INDEX "idx_ordenes_compra_oc_number" ON "workflows"."ordenes_compra" USING "btree" ("oc_number");



CREATE INDEX "idx_ordenes_compra_order_number" ON "workflows"."ordenes_compra" USING "btree" ("order_number");



CREATE INDEX "idx_ordenes_compra_received_at" ON "workflows"."ordenes_compra" USING "btree" ("received_at" DESC);



CREATE INDEX "idx_ordenes_compra_status" ON "workflows"."ordenes_compra" USING "btree" ("status");



CREATE INDEX "idx_ordenes_compra_sucursal_id" ON "workflows"."ordenes_compra" USING "btree" ("sucursal_id");



CREATE INDEX "idx_productos_orden_id" ON "workflows"."ordenes_compra_productos" USING "btree" ("orden_compra_id");



CREATE INDEX "idx_productos_producto_id" ON "workflows"."ordenes_compra_productos" USING "btree" ("producto_id");



CREATE OR REPLACE TRIGGER "delete_movement_on_reception_item_delete" AFTER DELETE ON "compras"."reception_items" FOR EACH ROW EXECUTE FUNCTION "compras"."delete_movement_on_reception_item_delete"();



CREATE OR REPLACE TRIGGER "inventory_movement_on_reception_item" AFTER INSERT ON "compras"."reception_items" FOR EACH ROW EXECUTE FUNCTION "compras"."create_movement_on_reception_item"();



CREATE OR REPLACE TRIGGER "inventory_movement_on_return_receipt" AFTER UPDATE ON "compras"."material_returns" FOR EACH ROW EXECUTE FUNCTION "compras"."create_movement_on_return_receipt"();



CREATE OR REPLACE TRIGGER "inventory_movement_on_transfer_item" AFTER INSERT ON "compras"."transfer_items" FOR EACH ROW EXECUTE FUNCTION "compras"."create_movement_on_transfer_item"();



COMMENT ON TRIGGER "inventory_movement_on_transfer_item" ON "compras"."transfer_items" IS 'Creates inventory movement when a transfer item is added. Triggers on transfer_items instead of material_transfers to ensure items exist.';



CREATE OR REPLACE TRIGGER "reception_number_trigger" BEFORE INSERT ON "compras"."material_receptions" FOR EACH ROW EXECUTE FUNCTION "compras"."set_reception_number"();



CREATE OR REPLACE TRIGGER "return_number_trigger" BEFORE INSERT ON "compras"."material_returns" FOR EACH ROW EXECUTE FUNCTION "compras"."assign_return_number"();



CREATE OR REPLACE TRIGGER "transfer_number_trigger" BEFORE INSERT ON "compras"."material_transfers" FOR EACH ROW EXECUTE FUNCTION "compras"."assign_transfer_number"();



CREATE OR REPLACE TRIGGER "trg_generate_purchase_order_number" BEFORE INSERT ON "compras"."purchase_orders" FOR EACH ROW WHEN ((("new"."order_number" IS NULL) OR (("new"."order_number")::"text" = ''::"text"))) EXECUTE FUNCTION "public"."generate_purchase_order_number"();



CREATE OR REPLACE TRIGGER "trg_material_suppliers_updated_at" BEFORE UPDATE ON "compras"."material_suppliers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_purchase_order_items_updated_at" BEFORE UPDATE ON "compras"."purchase_order_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_purchase_orders_updated_at" BEFORE UPDATE ON "compras"."purchase_orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_suppliers_updated_at" BEFORE UPDATE ON "compras"."suppliers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_update_purchase_order_status" AFTER UPDATE OF "quantity_received" ON "compras"."purchase_order_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_purchase_order_status"();



CREATE OR REPLACE TRIGGER "trg_update_purchase_order_total_delete" AFTER DELETE ON "compras"."purchase_order_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_purchase_order_total"();



CREATE OR REPLACE TRIGGER "trg_update_purchase_order_total_insert" AFTER INSERT ON "compras"."purchase_order_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_purchase_order_total"();



CREATE OR REPLACE TRIGGER "trg_update_purchase_order_total_update" AFTER UPDATE ON "compras"."purchase_order_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_purchase_order_total"();



CREATE OR REPLACE TRIGGER "trigger_set_supplier_token" BEFORE INSERT ON "compras"."suppliers" FOR EACH ROW EXECUTE FUNCTION "compras"."set_supplier_token"();



CREATE OR REPLACE TRIGGER "trigger_update_balance_on_movement_delete" AFTER DELETE ON "compras"."inventory_movements" FOR EACH ROW EXECUTE FUNCTION "compras"."update_balance_on_movement_delete"();



CREATE OR REPLACE TRIGGER "trigger_update_balance_on_movement_insert" AFTER INSERT ON "compras"."inventory_movements" FOR EACH ROW EXECUTE FUNCTION "compras"."update_balance_on_movement_insert"();



CREATE OR REPLACE TRIGGER "trigger_update_balance_on_movement_update" AFTER UPDATE ON "compras"."inventory_movements" FOR EACH ROW EXECUTE FUNCTION "compras"."update_balance_on_movement_update"();



CREATE OR REPLACE TRIGGER "update_explosion_tracking_on_reception" AFTER INSERT ON "compras"."reception_items" FOR EACH ROW WHEN (("new"."purchase_order_item_id" IS NOT NULL)) EXECUTE FUNCTION "compras"."update_explosion_on_reception"();



CREATE OR REPLACE TRIGGER "update_explosion_tracking_status_trigger" BEFORE INSERT OR UPDATE ON "compras"."explosion_purchase_tracking" FOR EACH ROW EXECUTE FUNCTION "compras"."update_explosion_tracking_status"();



CREATE OR REPLACE TRIGGER "update_material_receptions_timestamp" BEFORE UPDATE ON "compras"."material_receptions" FOR EACH ROW EXECUTE FUNCTION "compras"."update_material_receptions_timestamp"();



CREATE OR REPLACE TRIGGER "update_movement_on_reception_item_update" AFTER UPDATE ON "compras"."reception_items" FOR EACH ROW EXECUTE FUNCTION "compras"."update_movement_on_reception_item_update"();



CREATE OR REPLACE TRIGGER "update_reception_items_timestamp" BEFORE UPDATE ON "compras"."reception_items" FOR EACH ROW EXECUTE FUNCTION "compras"."update_reception_items_timestamp"();



CREATE OR REPLACE TRIGGER "work_center_inventory_on_return" AFTER INSERT ON "compras"."material_returns" FOR EACH ROW EXECUTE FUNCTION "compras"."update_work_center_inventory_on_return"();



CREATE OR REPLACE TRIGGER "work_center_inventory_on_transfer_receipt" AFTER UPDATE ON "compras"."transfer_items" FOR EACH ROW WHEN ((("new"."quantity_received" IS NOT NULL) AND ("old"."quantity_received" IS NULL))) EXECUTE FUNCTION "compras"."update_work_center_inventory_on_receipt"();



CREATE OR REPLACE TRIGGER "trigger_update_location_path" BEFORE INSERT OR UPDATE OF "code", "parent_id" ON "inventario"."locations" FOR EACH ROW EXECUTE FUNCTION "inventario"."update_location_path"();



CREATE OR REPLACE TRIGGER "check_schedule_conflict" BEFORE INSERT OR UPDATE ON "produccion"."production_schedules" FOR EACH ROW EXECUTE FUNCTION "produccion"."check_schedule_conflict"();



CREATE OR REPLACE TRIGGER "check_schedule_conflicts_trigger" BEFORE INSERT OR UPDATE ON "produccion"."production_schedules" FOR EACH ROW EXECUTE FUNCTION "produccion"."check_schedule_conflicts"();



CREATE OR REPLACE TRIGGER "trg_create_location_for_work_center" AFTER INSERT ON "produccion"."work_centers" FOR EACH ROW EXECUTE FUNCTION "produccion"."create_location_for_work_center"();



COMMENT ON TRIGGER "trg_create_location_for_work_center" ON "produccion"."work_centers" IS 'Automatically creates an inventory location (bin) under the production warehouse whenever a new work center is created';



CREATE OR REPLACE TRIGGER "trigger_weekly_plans_updated_at" BEFORE UPDATE ON "produccion"."weekly_plans" FOR EACH ROW EXECUTE FUNCTION "produccion"."update_weekly_plans_updated_at"();



CREATE OR REPLACE TRIGGER "update_product_work_center_mapping_updated_at" BEFORE UPDATE ON "produccion"."product_work_center_mapping" FOR EACH ROW EXECUTE FUNCTION "produccion"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_production_schedules_timestamp" BEFORE UPDATE ON "produccion"."production_schedules" FOR EACH ROW EXECUTE FUNCTION "produccion"."update_production_schedules_timestamp"();



CREATE OR REPLACE TRIGGER "update_production_totals_trigger" AFTER INSERT OR DELETE OR UPDATE ON "produccion"."production_records" FOR EACH ROW EXECUTE FUNCTION "produccion"."update_shift_production_totals"();



CREATE OR REPLACE TRIGGER "update_work_center_staffing_timestamp" BEFORE UPDATE ON "produccion"."work_center_staffing" FOR EACH ROW EXECUTE FUNCTION "produccion"."update_work_center_staffing_timestamp"();



CREATE OR REPLACE TRIGGER "adjustment_reasons_updated_at" BEFORE UPDATE ON "public"."adjustment_reasons" FOR EACH ROW EXECUTE FUNCTION "public"."update_inventory_adjustments_updated_at"();



CREATE OR REPLACE TRIGGER "audit_order_items_changes_trigger" BEFORE INSERT OR DELETE OR UPDATE ON "public"."order_items" FOR EACH ROW EXECUTE FUNCTION "public"."audit_order_items_changes"();



CREATE OR REPLACE TRIGGER "inventory_adjustments_updated_at" BEFORE UPDATE ON "public"."inventory_adjustments" FOR EACH ROW EXECUTE FUNCTION "public"."update_inventory_adjustments_updated_at"();



CREATE OR REPLACE TRIGGER "order_item_deliveries_audit_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."order_item_deliveries" FOR EACH ROW EXECUTE FUNCTION "public"."audit_order_item_deliveries_changes"();



CREATE OR REPLACE TRIGGER "order_items_audit_after_trigger" AFTER INSERT OR UPDATE ON "public"."order_items" FOR EACH ROW EXECUTE FUNCTION "public"."audit_order_items_changes"();



CREATE OR REPLACE TRIGGER "order_items_audit_before_trigger" BEFORE DELETE ON "public"."order_items" FOR EACH ROW EXECUTE FUNCTION "public"."audit_order_items_changes"();



CREATE OR REPLACE TRIGGER "orders_audit_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."audit_orders_changes"();



CREATE OR REPLACE TRIGGER "returns_status_timestamp_trigger" BEFORE UPDATE ON "public"."returns" FOR EACH ROW EXECUTE FUNCTION "public"."update_returns_status_timestamp"();



CREATE OR REPLACE TRIGGER "trg_create_client_config" AFTER INSERT ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."create_client_config"();



CREATE OR REPLACE TRIGGER "trigger_adjust_delivery_date" BEFORE INSERT OR UPDATE OF "expected_delivery_date" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."adjust_delivery_date_by_frequency"();



COMMENT ON TRIGGER "trigger_adjust_delivery_date" ON "public"."orders" IS 'Automatically adjusts expected_delivery_date based on client branch frequencies while preserving the original requested date';



CREATE OR REPLACE TRIGGER "trigger_assign_route_number" BEFORE INSERT ON "public"."routes" FOR EACH ROW EXECUTE FUNCTION "public"."assign_route_number"();



CREATE OR REPLACE TRIGGER "trigger_client_frequencies_updated_at" BEFORE UPDATE ON "public"."client_frequencies" FOR EACH ROW EXECUTE FUNCTION "public"."update_client_frequencies_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_remisions_updated_at" BEFORE UPDATE ON "public"."remisions" FOR EACH ROW EXECUTE FUNCTION "public"."update_remision_updated_at"();



CREATE OR REPLACE TRIGGER "update_branches_updated_at" BEFORE UPDATE ON "public"."branches" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_inventories_updated_at" BEFORE UPDATE ON "public"."inventories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_inventory_count_items_updated_at" BEFORE UPDATE ON "public"."inventory_count_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_lead_activities_updated_at" BEFORE UPDATE ON "public"."lead_activities" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_order_item_deliveries_updated_at" BEFORE UPDATE ON "public"."order_item_deliveries" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_product_commercial_info_updated_at" BEFORE UPDATE ON "public"."product_commercial_info" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_product_costs_updated_at" BEFORE UPDATE ON "public"."product_costs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_product_inventory_config_updated_at" BEFORE UPDATE ON "public"."product_inventory_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_product_price_lists_updated_at" BEFORE UPDATE ON "public"."product_price_lists" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_product_production_process_updated_at" BEFORE UPDATE ON "public"."product_production_process" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_product_quality_specs_updated_at" BEFORE UPDATE ON "public"."product_quality_specs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_product_technical_specs_updated_at" BEFORE UPDATE ON "public"."product_technical_specs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_receiving_exceptions_updated_at" BEFORE UPDATE ON "public"."receiving_exceptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_receiving_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_receiving_patterns_updated_at" BEFORE UPDATE ON "public"."receiving_patterns" FOR EACH ROW EXECUTE FUNCTION "public"."update_receiving_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_receiving_schedules_updated_at" BEFORE UPDATE ON "public"."receiving_schedules" FOR EACH ROW EXECUTE FUNCTION "public"."update_receiving_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_receiving_templates_updated_at" BEFORE UPDATE ON "public"."receiving_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_receiving_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_sales_opportunities_updated_at" BEFORE UPDATE ON "public"."sales_opportunities" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "video_tutorials_updated_at" BEFORE UPDATE ON "public"."video_tutorials" FOR EACH ROW EXECUTE FUNCTION "public"."update_video_tutorials_updated_at"();



CREATE OR REPLACE TRIGGER "product_evaluation_score_update" AFTER INSERT OR DELETE OR UPDATE ON "visitas"."product_evaluations" FOR EACH ROW EXECUTE FUNCTION "visitas"."update_visit_score_trigger"();



CREATE OR REPLACE TRIGGER "product_evaluations_updated_at" BEFORE UPDATE ON "visitas"."product_evaluations" FOR EACH ROW EXECUTE FUNCTION "visitas"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "store_visits_updated_at" BEFORE UPDATE ON "visitas"."store_visits" FOR EACH ROW EXECUTE FUNCTION "visitas"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_ordenes_compra_updated_at" BEFORE UPDATE ON "workflows"."ordenes_compra" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "compras"."explosion_purchase_tracking"
    ADD CONSTRAINT "explosion_purchase_tracking_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "compras"."explosion_purchase_tracking"
    ADD CONSTRAINT "explosion_purchase_tracking_purchase_order_item_id_fkey" FOREIGN KEY ("purchase_order_item_id") REFERENCES "compras"."purchase_order_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "compras"."inventory_movements"
    ADD CONSTRAINT "inventory_movements_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "compras"."inventory_movements"
    ADD CONSTRAINT "inventory_movements_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "compras"."material_explosion_history"
    ADD CONSTRAINT "material_explosion_history_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "compras"."material_explosion_history"
    ADD CONSTRAINT "material_explosion_history_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "compras"."material_explosion_items"
    ADD CONSTRAINT "material_explosion_items_explosion_id_fkey" FOREIGN KEY ("explosion_id") REFERENCES "compras"."material_explosion_history"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "compras"."material_explosion_items"
    ADD CONSTRAINT "material_explosion_items_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "compras"."material_explosion_items"
    ADD CONSTRAINT "material_explosion_items_suggested_supplier_id_fkey" FOREIGN KEY ("suggested_supplier_id") REFERENCES "compras"."suppliers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "compras"."material_inventory_balances"
    ADD CONSTRAINT "material_inventory_balances_last_movement_id_fkey" FOREIGN KEY ("last_movement_id") REFERENCES "compras"."inventory_movements"("id");



ALTER TABLE ONLY "compras"."material_inventory_balances"
    ADD CONSTRAINT "material_inventory_balances_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "compras"."material_receptions"
    ADD CONSTRAINT "material_receptions_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "compras"."material_receptions"
    ADD CONSTRAINT "material_receptions_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "compras"."material_receptions"
    ADD CONSTRAINT "material_receptions_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "compras"."purchase_orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "compras"."material_receptions"
    ADD CONSTRAINT "material_receptions_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "compras"."suppliers"("id");



ALTER TABLE ONLY "compras"."material_returns"
    ADD CONSTRAINT "material_returns_accepted_by_fkey" FOREIGN KEY ("accepted_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "compras"."material_returns"
    ADD CONSTRAINT "material_returns_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "compras"."material_returns"
    ADD CONSTRAINT "material_returns_work_center_id_fkey" FOREIGN KEY ("work_center_id") REFERENCES "produccion"."work_centers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "compras"."material_suppliers"
    ADD CONSTRAINT "material_suppliers_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "compras"."material_suppliers"
    ADD CONSTRAINT "material_suppliers_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "compras"."suppliers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "compras"."material_transfers"
    ADD CONSTRAINT "material_transfers_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "compras"."material_transfers"
    ADD CONSTRAINT "material_transfers_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "compras"."material_transfers"
    ADD CONSTRAINT "material_transfers_work_center_id_fkey" FOREIGN KEY ("work_center_id") REFERENCES "produccion"."work_centers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "compras"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "compras"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_material_supplier_id_fkey" FOREIGN KEY ("material_supplier_id") REFERENCES "compras"."material_suppliers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "compras"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "compras"."purchase_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "compras"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "compras"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "compras"."suppliers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "compras"."reception_items"
    ADD CONSTRAINT "reception_items_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "compras"."reception_items"
    ADD CONSTRAINT "reception_items_purchase_order_item_id_fkey" FOREIGN KEY ("purchase_order_item_id") REFERENCES "compras"."purchase_order_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "compras"."reception_items"
    ADD CONSTRAINT "reception_items_reception_id_fkey" FOREIGN KEY ("reception_id") REFERENCES "compras"."material_receptions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "compras"."return_items"
    ADD CONSTRAINT "return_items_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "compras"."return_items"
    ADD CONSTRAINT "return_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "compras"."material_returns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "compras"."transfer_items"
    ADD CONSTRAINT "transfer_items_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "compras"."transfer_items"
    ADD CONSTRAINT "transfer_items_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "compras"."material_transfers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "inventario"."inventory_balances"
    ADD CONSTRAINT "inventory_balances_last_movement_id_fkey" FOREIGN KEY ("last_movement_id") REFERENCES "inventario"."inventory_movements"("id");



ALTER TABLE ONLY "inventario"."inventory_balances"
    ADD CONSTRAINT "inventory_balances_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "inventario"."locations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "inventario"."inventory_balances"
    ADD CONSTRAINT "inventory_balances_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "inventario"."inventory_movements"
    ADD CONSTRAINT "inventory_movements_linked_movement_id_fkey" FOREIGN KEY ("linked_movement_id") REFERENCES "inventario"."inventory_movements"("id");



ALTER TABLE ONLY "inventario"."inventory_movements"
    ADD CONSTRAINT "inventory_movements_location_id_from_fkey" FOREIGN KEY ("location_id_from") REFERENCES "inventario"."locations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "inventario"."inventory_movements"
    ADD CONSTRAINT "inventory_movements_location_id_to_fkey" FOREIGN KEY ("location_id_to") REFERENCES "inventario"."locations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "inventario"."inventory_movements"
    ADD CONSTRAINT "inventory_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "inventario"."inventory_movements"
    ADD CONSTRAINT "inventory_movements_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "inventario"."inventory_movements"
    ADD CONSTRAINT "inventory_movements_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "inventario"."locations"
    ADD CONSTRAINT "locations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "inventario"."locations"
    ADD CONSTRAINT "locations_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "inventario"."locations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "produccion"."bill_of_materials"
    ADD CONSTRAINT "bill_of_materials_material_product_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "produccion"."bill_of_materials"
    ADD CONSTRAINT "bill_of_materials_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "produccion"."operations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "produccion"."bill_of_materials"
    ADD CONSTRAINT "bill_of_materials_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "produccion"."material_consumptions"
    ADD CONSTRAINT "material_consumptions_material_product_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "produccion"."material_consumptions"
    ADD CONSTRAINT "material_consumptions_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "produccion"."material_consumptions"
    ADD CONSTRAINT "material_consumptions_shift_production_id_fkey" FOREIGN KEY ("shift_production_id") REFERENCES "produccion"."shift_productions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "produccion"."product_work_center_mapping"
    ADD CONSTRAINT "product_work_center_mapping_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "produccion"."operations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "produccion"."product_work_center_mapping"
    ADD CONSTRAINT "product_work_center_mapping_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "produccion"."product_work_center_mapping"
    ADD CONSTRAINT "product_work_center_mapping_work_center_id_fkey" FOREIGN KEY ("work_center_id") REFERENCES "produccion"."work_centers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "produccion"."production_productivity"
    ADD CONSTRAINT "production_productivity_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "produccion"."operations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "produccion"."production_productivity"
    ADD CONSTRAINT "production_productivity_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "produccion"."production_productivity"
    ADD CONSTRAINT "production_productivity_work_center_id_fkey" FOREIGN KEY ("work_center_id") REFERENCES "produccion"."work_centers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "produccion"."production_records"
    ADD CONSTRAINT "production_records_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "produccion"."production_records"
    ADD CONSTRAINT "production_records_shift_production_id_fkey" FOREIGN KEY ("shift_production_id") REFERENCES "produccion"."shift_productions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "produccion"."production_route_tracking"
    ADD CONSTRAINT "production_route_tracking_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "produccion"."production_route_tracking"
    ADD CONSTRAINT "production_route_tracking_work_center_id_fkey" FOREIGN KEY ("work_center_id") REFERENCES "produccion"."work_centers"("id");



ALTER TABLE ONLY "produccion"."production_routes"
    ADD CONSTRAINT "production_routes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "produccion"."production_routes"
    ADD CONSTRAINT "production_routes_work_center_id_fkey" FOREIGN KEY ("work_center_id") REFERENCES "produccion"."work_centers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "produccion"."production_schedules"
    ADD CONSTRAINT "production_schedules_cascade_source_id_fkey" FOREIGN KEY ("cascade_source_id") REFERENCES "produccion"."production_schedules"("id");



ALTER TABLE ONLY "produccion"."production_schedules"
    ADD CONSTRAINT "production_schedules_week_plan_id_fkey" FOREIGN KEY ("week_plan_id") REFERENCES "produccion"."weekly_plans"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "produccion"."production_shifts"
    ADD CONSTRAINT "production_shifts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "produccion"."production_shifts"
    ADD CONSTRAINT "production_shifts_work_center_id_fkey" FOREIGN KEY ("work_center_id") REFERENCES "produccion"."work_centers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "produccion"."shift_productions"
    ADD CONSTRAINT "shift_productions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "produccion"."shift_productions"
    ADD CONSTRAINT "shift_productions_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "produccion"."production_shifts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "produccion"."work_center_inventory"
    ADD CONSTRAINT "work_center_inventory_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "produccion"."work_center_inventory"
    ADD CONSTRAINT "work_center_inventory_work_center_id_fkey" FOREIGN KEY ("work_center_id") REFERENCES "produccion"."work_centers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "produccion"."work_center_operations"
    ADD CONSTRAINT "work_center_operations_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "produccion"."operations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "produccion"."work_center_operations"
    ADD CONSTRAINT "work_center_operations_work_center_id_fkey" FOREIGN KEY ("work_center_id") REFERENCES "produccion"."work_centers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "produccion"."work_center_staffing"
    ADD CONSTRAINT "work_center_staffing_work_center_id_fkey" FOREIGN KEY ("work_center_id") REFERENCES "produccion"."work_centers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "produccion"."work_centers"
    ADD CONSTRAINT "work_centers_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "inventario"."locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "produccion"."work_centers"
    ADD CONSTRAINT "work_centers_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "produccion"."operations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."access_logs"
    ADD CONSTRAINT "access_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."branches"
    ADD CONSTRAINT "branches_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_credit_terms"
    ADD CONSTRAINT "client_credit_terms_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_frequencies"
    ADD CONSTRAINT "client_frequencies_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_price_lists"
    ADD CONSTRAINT "client_price_lists_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_price_lists"
    ADD CONSTRAINT "client_price_lists_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_lead_source_id_fkey" FOREIGN KEY ("lead_source_id") REFERENCES "public"."lead_sources"("id");



ALTER TABLE ONLY "public"."dispatch_inventory_config"
    ADD CONSTRAINT "dispatch_inventory_config_default_dispatch_location_id_fkey" FOREIGN KEY ("default_dispatch_location_id") REFERENCES "inventario"."locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dispatch_inventory_config"
    ADD CONSTRAINT "dispatch_inventory_config_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."emails"
    ADD CONSTRAINT "emails_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."export_history"
    ADD CONSTRAINT "export_history_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."client_config"
    ADD CONSTRAINT "fk_client_config_client_id" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "fk_orders_invoice_export" FOREIGN KEY ("invoice_export_id") REFERENCES "public"."export_history"("id");



ALTER TABLE ONLY "public"."inventories"
    ADD CONSTRAINT "inventories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."inventories"
    ADD CONSTRAINT "inventories_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "inventario"."locations"("id");



ALTER TABLE ONLY "public"."inventory_adjustments"
    ADD CONSTRAINT "inventory_adjustments_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."inventory_adjustments"
    ADD CONSTRAINT "inventory_adjustments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."inventory_adjustments"
    ADD CONSTRAINT "inventory_adjustments_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_adjustments"
    ADD CONSTRAINT "inventory_adjustments_movement_id_fkey" FOREIGN KEY ("movement_id") REFERENCES "inventario"."inventory_movements"("id") ON DELETE SET NULL;



COMMENT ON CONSTRAINT "inventory_adjustments_movement_id_fkey" ON "public"."inventory_adjustments" IS 'References movement in inventario schema created by apply_inventory_adjustment';



ALTER TABLE ONLY "public"."inventory_adjustments"
    ADD CONSTRAINT "inventory_adjustments_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_adjustments"
    ADD CONSTRAINT "inventory_adjustments_reason_id_fkey" FOREIGN KEY ("reason_id") REFERENCES "public"."adjustment_reasons"("id");



ALTER TABLE ONLY "public"."inventory_count_items"
    ADD CONSTRAINT "inventory_count_items_inventory_count_id_fkey" FOREIGN KEY ("inventory_count_id") REFERENCES "public"."inventory_counts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_count_items"
    ADD CONSTRAINT "inventory_count_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."inventory_counts"
    ADD CONSTRAINT "inventory_counts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."inventory_counts"
    ADD CONSTRAINT "inventory_counts_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_final_results"
    ADD CONSTRAINT "inventory_final_results_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_final_results"
    ADD CONSTRAINT "inventory_final_results_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."inventory_reconciliations"
    ADD CONSTRAINT "inventory_reconciliations_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_reconciliations"
    ADD CONSTRAINT "inventory_reconciliations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."inventory_reconciliations"
    ADD CONSTRAINT "inventory_reconciliations_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."lead_activities"
    ADD CONSTRAINT "lead_activities_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_activities"
    ADD CONSTRAINT "lead_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_events"
    ADD CONSTRAINT "order_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."order_events"
    ADD CONSTRAINT "order_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_invoices"
    ADD CONSTRAINT "order_invoices_export_history_id_fkey" FOREIGN KEY ("export_history_id") REFERENCES "public"."export_history"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_invoices"
    ADD CONSTRAINT "order_invoices_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_item_deliveries_audit"
    ADD CONSTRAINT "order_item_deliveries_audit_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."order_item_deliveries_audit"
    ADD CONSTRAINT "order_item_deliveries_audit_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_item_deliveries"
    ADD CONSTRAINT "order_item_deliveries_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_item_deliveries"
    ADD CONSTRAINT "order_item_deliveries_route_order_id_fkey" FOREIGN KEY ("route_order_id") REFERENCES "public"."route_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items_audit"
    ADD CONSTRAINT "order_items_audit_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."order_items_audit"
    ADD CONSTRAINT "order_items_audit_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items_audit"
    ADD CONSTRAINT "order_items_audit_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."order_status_history"
    ADD CONSTRAINT "order_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."order_status_history"
    ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_assigned_route_id_fkey" FOREIGN KEY ("assigned_route_id") REFERENCES "public"."routes"("id");



ALTER TABLE ONLY "public"."orders_audit"
    ADD CONSTRAINT "orders_audit_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."orders_audit"
    ADD CONSTRAINT "orders_audit_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."product_aliases"
    ADD CONSTRAINT "product_aliases_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."product_aliases"
    ADD CONSTRAINT "product_aliases_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."product_commercial_info"
    ADD CONSTRAINT "product_commercial_info_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_config"
    ADD CONSTRAINT "product_config_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."product_configurations"
    ADD CONSTRAINT "product_configurations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_costs"
    ADD CONSTRAINT "product_costs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_inventory_config"
    ADD CONSTRAINT "product_inventory_config_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_media"
    ADD CONSTRAINT "product_media_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_price_lists"
    ADD CONSTRAINT "product_price_lists_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_production_process"
    ADD CONSTRAINT "product_production_process_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_quality_specs"
    ADD CONSTRAINT "product_quality_specs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_technical_specs"
    ADD CONSTRAINT "product_technical_specs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."receiving_audit_logs"
    ADD CONSTRAINT "receiving_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."receiving_exceptions"
    ADD CONSTRAINT "receiving_exceptions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."receiving_exceptions"
    ADD CONSTRAINT "receiving_exceptions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."receiving_patterns"
    ADD CONSTRAINT "receiving_patterns_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."receiving_patterns"
    ADD CONSTRAINT "receiving_patterns_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."receiving_schedules"
    ADD CONSTRAINT "receiving_schedules_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."receiving_schedules"
    ADD CONSTRAINT "receiving_schedules_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."receiving_templates"
    ADD CONSTRAINT "receiving_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."remision_items"
    ADD CONSTRAINT "remision_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."remision_items"
    ADD CONSTRAINT "remision_items_remision_id_fkey" FOREIGN KEY ("remision_id") REFERENCES "public"."remisions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."remisions"
    ADD CONSTRAINT "remisions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."remisions"
    ADD CONSTRAINT "remisions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id");



ALTER TABLE ONLY "public"."route_orders"
    ADD CONSTRAINT "route_orders_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."route_orders"
    ADD CONSTRAINT "route_orders_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."routes"
    ADD CONSTRAINT "routes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."routes"
    ADD CONSTRAINT "routes_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."routes"
    ADD CONSTRAINT "routes_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."routes"
    ADD CONSTRAINT "routes_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id");



ALTER TABLE ONLY "public"."sales_opportunities"
    ADD CONSTRAINT "sales_opportunities_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sales_opportunities"
    ADD CONSTRAINT "sales_opportunities_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales_opportunities"
    ADD CONSTRAINT "sales_opportunities_pipeline_stage_id_fkey" FOREIGN KEY ("pipeline_stage_id") REFERENCES "public"."pipeline_stages"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vehicles"
    ADD CONSTRAINT "vehicles_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."video_tutorials"
    ADD CONSTRAINT "video_tutorials_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "visitas"."product_evaluations"
    ADD CONSTRAINT "product_evaluations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "visitas"."product_evaluations"
    ADD CONSTRAINT "product_evaluations_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visitas"."store_visits"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "visitas"."store_visits"
    ADD CONSTRAINT "store_visits_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "visitas"."store_visits"
    ADD CONSTRAINT "store_visits_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "visitas"."store_visits"
    ADD CONSTRAINT "store_visits_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "visitas"."visit_photos"
    ADD CONSTRAINT "visit_photos_product_evaluation_id_fkey" FOREIGN KEY ("product_evaluation_id") REFERENCES "visitas"."product_evaluations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "visitas"."visit_photos"
    ADD CONSTRAINT "visit_photos_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visitas"."store_visits"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "workflows"."ordenes_compra_productos"
    ADD CONSTRAINT "ordenes_compra_productos_orden_compra_id_fkey" FOREIGN KEY ("orden_compra_id") REFERENCES "workflows"."ordenes_compra"("id") ON DELETE CASCADE;



CREATE POLICY "Allow anon to delete material_suppliers" ON "compras"."material_suppliers" FOR DELETE TO "anon" USING (true);



COMMENT ON POLICY "Allow anon to delete material_suppliers" ON "compras"."material_suppliers" IS 'Allows anonymous users (suppliers) to remove material assignments';



CREATE POLICY "Allow anon to insert material_suppliers" ON "compras"."material_suppliers" FOR INSERT TO "anon" WITH CHECK (true);



COMMENT ON POLICY "Allow anon to insert material_suppliers" ON "compras"."material_suppliers" IS 'Allows anonymous users (suppliers) to assign materials to themselves';



CREATE POLICY "Allow anon to read material_suppliers" ON "compras"."material_suppliers" FOR SELECT TO "anon" USING (true);



COMMENT ON POLICY "Allow anon to read material_suppliers" ON "compras"."material_suppliers" IS 'Allows anonymous users (suppliers) to view their material assignments';



CREATE POLICY "Allow anon to update material_suppliers" ON "compras"."material_suppliers" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);



COMMENT ON POLICY "Allow anon to update material_suppliers" ON "compras"."material_suppliers" IS 'Allows anonymous users (suppliers) to update their material assignments';



CREATE POLICY "Allow anon to update suppliers" ON "compras"."suppliers" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);



COMMENT ON POLICY "Allow anon to update suppliers" ON "compras"."suppliers" IS 'Allows anonymous users (suppliers) to update their delivery days';



CREATE POLICY "Allow authenticated users to view inventory movements" ON "compras"."inventory_movements" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow suppliers to view their own data via token" ON "compras"."suppliers" FOR SELECT USING (true);



CREATE POLICY "Enable delete for authenticated users" ON "compras"."material_suppliers" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable delete for authenticated users" ON "compras"."purchase_order_items" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable delete for authenticated users" ON "compras"."purchase_orders" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable delete for authenticated users" ON "compras"."suppliers" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable insert for anonymous users (supplier registration)" ON "compras"."material_suppliers" FOR INSERT TO "anon" WITH CHECK (true);



COMMENT ON POLICY "Enable insert for anonymous users (supplier registration)" ON "compras"."material_suppliers" IS 'Allows public supplier registration to assign materials to the newly created supplier.';



CREATE POLICY "Enable insert for anonymous users (supplier registration)" ON "compras"."suppliers" FOR INSERT TO "anon" WITH CHECK (true);



COMMENT ON POLICY "Enable insert for anonymous users (supplier registration)" ON "compras"."suppliers" IS 'Allows public supplier registration through the external form without authentication. Other operations (SELECT, UPDATE, DELETE) remain restricted to authenticated users only.';



CREATE POLICY "Enable insert for authenticated users" ON "compras"."material_explosion_history" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users" ON "compras"."material_explosion_items" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users" ON "compras"."material_suppliers" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users" ON "compras"."purchase_order_items" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users" ON "compras"."purchase_orders" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users" ON "compras"."suppliers" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable read access for all authenticated users" ON "compras"."material_explosion_history" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all authenticated users" ON "compras"."material_explosion_items" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all authenticated users" ON "compras"."material_suppliers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all authenticated users" ON "compras"."purchase_order_items" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all authenticated users" ON "compras"."purchase_orders" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all authenticated users" ON "compras"."suppliers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable select for anonymous users (NIT verification)" ON "compras"."suppliers" FOR SELECT TO "anon" USING (true);



COMMENT ON POLICY "Enable select for anonymous users (NIT verification)" ON "compras"."suppliers" IS 'Allows public form to verify if a NIT is already registered before submitting.';



CREATE POLICY "Enable update for authenticated users" ON "compras"."material_suppliers" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Enable update for authenticated users" ON "compras"."purchase_order_items" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Enable update for authenticated users" ON "compras"."purchase_orders" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Enable update for authenticated users" ON "compras"."suppliers" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "delete_material_balances" ON "compras"."material_inventory_balances" FOR DELETE TO "authenticated" USING (false);



ALTER TABLE "compras"."explosion_purchase_tracking" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "explosion_tracking_allow_authenticated_delete" ON "compras"."explosion_purchase_tracking" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "explosion_tracking_allow_authenticated_insert" ON "compras"."explosion_purchase_tracking" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "explosion_tracking_allow_authenticated_select" ON "compras"."explosion_purchase_tracking" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "explosion_tracking_allow_authenticated_update" ON "compras"."explosion_purchase_tracking" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "insert_material_balances" ON "compras"."material_inventory_balances" FOR INSERT TO "authenticated" WITH CHECK (false);



ALTER TABLE "compras"."inventory_movements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inventory_movements_delete_authenticated" ON "compras"."inventory_movements" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "inventory_movements_insert_authenticated" ON "compras"."inventory_movements" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "inventory_movements_select_all_authenticated" ON "compras"."inventory_movements" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "inventory_movements_select_anon" ON "compras"."inventory_movements" FOR SELECT TO "anon" USING (true);



CREATE POLICY "inventory_movements_update_authenticated" ON "compras"."inventory_movements" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "compras"."material_explosion_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "compras"."material_explosion_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "compras"."material_inventory_balances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "compras"."material_receptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "material_receptions_delete_authenticated" ON "compras"."material_receptions" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "material_receptions_insert_authenticated" ON "compras"."material_receptions" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "material_receptions_select_all_authenticated" ON "compras"."material_receptions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "material_receptions_select_anon" ON "compras"."material_receptions" FOR SELECT TO "anon" USING (true);



CREATE POLICY "material_receptions_update_authenticated" ON "compras"."material_receptions" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "compras"."material_returns" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "material_returns_allow_authenticated_insert" ON "compras"."material_returns" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "material_returns_allow_authenticated_select" ON "compras"."material_returns" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "material_returns_allow_authenticated_update" ON "compras"."material_returns" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "compras"."material_suppliers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "compras"."material_transfers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "material_transfers_allow_authenticated_insert" ON "compras"."material_transfers" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "material_transfers_allow_authenticated_select" ON "compras"."material_transfers" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "material_transfers_allow_authenticated_update" ON "compras"."material_transfers" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "compras"."purchase_order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "compras"."purchase_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "compras"."reception_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reception_items_allow_authenticated_delete" ON "compras"."reception_items" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "reception_items_allow_authenticated_insert" ON "compras"."reception_items" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "reception_items_allow_authenticated_select" ON "compras"."reception_items" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "reception_items_allow_authenticated_update" ON "compras"."reception_items" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "compras"."return_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "return_items_allow_authenticated_insert" ON "compras"."return_items" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "return_items_allow_authenticated_select" ON "compras"."return_items" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "return_items_allow_authenticated_update" ON "compras"."return_items" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "select_material_balances" ON "compras"."material_inventory_balances" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "compras"."suppliers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "compras"."transfer_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "transfer_items_allow_authenticated_insert" ON "compras"."transfer_items" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "transfer_items_allow_authenticated_select" ON "compras"."transfer_items" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "transfer_items_allow_authenticated_update" ON "compras"."transfer_items" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "update_material_balances" ON "compras"."material_inventory_balances" FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);



CREATE POLICY "Enable all for authenticated users" ON "inventario"."inventory_balances" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all for authenticated users" ON "inventario"."inventory_movements" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all for authenticated users" ON "inventario"."locations" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "inventario"."inventory_balances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "inventario"."inventory_movements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "inventario"."locations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Allow admin to insert/update/delete operations" ON "produccion"."operations" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow admin to insert/update/delete product_work_center_mapping" ON "produccion"."product_work_center_mapping" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to create production_schedules" ON "produccion"."production_schedules" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to create work_center_staffing" ON "produccion"."work_center_staffing" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to delete production_schedules" ON "produccion"."production_schedules" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete work_center_staffing" ON "produccion"."work_center_staffing" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to manage work_center_operations" ON "produccion"."work_center_operations" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to read production_schedules" ON "produccion"."production_schedules" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to read work_center_staffing" ON "produccion"."work_center_staffing" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to select operations" ON "produccion"."operations" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to select product_work_center_mapping" ON "produccion"."product_work_center_mapping" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to select work_center_operations" ON "produccion"."work_center_operations" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to update production_schedules" ON "produccion"."production_schedules" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update work_center_staffing" ON "produccion"."work_center_staffing" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to view work center inventory" ON "produccion"."work_center_inventory" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "produccion"."operations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "produccion"."product_work_center_mapping" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "produccion"."production_schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "produccion"."work_center_inventory" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "work_center_inventory_allow_authenticated_insert" ON "produccion"."work_center_inventory" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "work_center_inventory_allow_authenticated_select" ON "produccion"."work_center_inventory" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "work_center_inventory_allow_authenticated_update" ON "produccion"."work_center_inventory" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "produccion"."work_center_operations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "produccion"."work_center_staffing" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Allow all operations for authenticated users" ON "public"."client_frequencies" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow anon to create MP products" ON "public"."products" FOR INSERT TO "anon" WITH CHECK ((("category")::"text" = 'MP'::"text"));



COMMENT ON POLICY "Allow anon to create MP products" ON "public"."products" IS 'Allows anonymous users (suppliers) to create new MP category products if they do not exist';



CREATE POLICY "Allow anon to read MP products" ON "public"."products" FOR SELECT TO "anon" USING ((("category")::"text" = 'MP'::"text"));



COMMENT ON POLICY "Allow anon to read MP products" ON "public"."products" IS 'Allows anonymous users (suppliers) to view MP category products for material selection';



CREATE POLICY "Allow authenticated users full access" ON "public"."products" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated users can view video tutorials" ON "public"."video_tutorials" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable delete for authenticated users" ON "public"."order_item_deliveries" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable insert for authenticated users" ON "public"."order_item_deliveries" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable read access for authenticated users" ON "public"."order_item_deliveries" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read for authenticated users" ON "public"."dispatch_inventory_config" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable update for admin users" ON "public"."dispatch_inventory_config" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable update for authenticated users" ON "public"."order_item_deliveries" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Sistema puede insertar access_logs" ON "public"."access_logs" FOR INSERT WITH CHECK (true);



CREATE POLICY "Solo admins pueden ver access_logs" ON "public"."access_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_user_id" = "auth"."uid"()) AND (("u"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Super admins can create video tutorials" ON "public"."video_tutorials" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'super_admin'::"text")))));



CREATE POLICY "Super admins can delete video tutorials" ON "public"."video_tutorials" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'super_admin'::"text")))));



CREATE POLICY "Super admins can update video tutorials" ON "public"."video_tutorials" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'super_admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'super_admin'::"text")))));



ALTER TABLE "public"."access_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."adjustment_reasons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "adjustment_reasons_allow_authenticated_select" ON "public"."adjustment_reasons" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."client_frequencies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dispatch_inventory_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_adjustments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inventory_adjustments_allow_authenticated_delete" ON "public"."inventory_adjustments" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "inventory_adjustments_allow_authenticated_insert" ON "public"."inventory_adjustments" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "inventory_adjustments_allow_authenticated_select" ON "public"."inventory_adjustments" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "inventory_adjustments_allow_authenticated_update" ON "public"."inventory_adjustments" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."order_item_deliveries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."video_tutorials" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Allow authenticated to view ordenes_compra" ON "workflows"."ordenes_compra" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated to view productos" ON "workflows"."ordenes_compra_productos" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow service role full access to ordenes_compra" ON "workflows"."ordenes_compra" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Allow service role full access to productos" ON "workflows"."ordenes_compra_productos" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "workflows"."ordenes_compra" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "workflows"."ordenes_compra_productos" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "compras" TO "authenticated";
GRANT USAGE ON SCHEMA "compras" TO "service_role";
GRANT USAGE ON SCHEMA "compras" TO "anon";



GRANT USAGE ON SCHEMA "inventario" TO "anon";
GRANT USAGE ON SCHEMA "inventario" TO "authenticated";
GRANT USAGE ON SCHEMA "inventario" TO "service_role";






GRANT USAGE ON SCHEMA "produccion" TO "anon";
GRANT USAGE ON SCHEMA "produccion" TO "authenticated";
GRANT USAGE ON SCHEMA "produccion" TO "service_role";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "supabase_auth_admin";



GRANT USAGE ON SCHEMA "visitas" TO "anon";
GRANT USAGE ON SCHEMA "visitas" TO "authenticated";
GRANT USAGE ON SCHEMA "visitas" TO "service_role";



GRANT USAGE ON SCHEMA "workflows" TO "authenticated";
GRANT USAGE ON SCHEMA "workflows" TO "service_role";
GRANT USAGE ON SCHEMA "workflows" TO "anon";





















































































































GRANT ALL ON FUNCTION "compras"."generate_reception_number"() TO "authenticated";



GRANT ALL ON FUNCTION "compras"."set_reception_number"() TO "authenticated";



GRANT ALL ON FUNCTION "compras"."update_explosion_on_reception"() TO "authenticated";



GRANT ALL ON FUNCTION "compras"."update_explosion_tracking_status"() TO "authenticated";

































































































































































































































































































































































































































GRANT ALL ON FUNCTION "inventario"."accept_pending_return"("p_movement_in_id" "uuid", "p_accepted_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "inventario"."accept_pending_return"("p_movement_in_id" "uuid", "p_accepted_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "inventario"."accept_pending_return"("p_movement_in_id" "uuid", "p_accepted_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "inventario"."calculate_balance_after"("p_product_id" "uuid", "p_location_id" "uuid", "p_quantity" numeric, "p_movement_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "inventario"."calculate_balance_after"("p_product_id" "uuid", "p_location_id" "uuid", "p_quantity" numeric, "p_movement_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "inventario"."calculate_balance_after"("p_product_id" "uuid", "p_location_id" "uuid", "p_quantity" numeric, "p_movement_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "inventario"."calculate_balance_after_dispatch"("p_product_id" "uuid", "p_location_id" "uuid", "p_quantity" numeric, "p_movement_type" character varying, "p_allow_negative" boolean) TO "anon";
GRANT ALL ON FUNCTION "inventario"."calculate_balance_after_dispatch"("p_product_id" "uuid", "p_location_id" "uuid", "p_quantity" numeric, "p_movement_type" character varying, "p_allow_negative" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "inventario"."calculate_balance_after_dispatch"("p_product_id" "uuid", "p_location_id" "uuid", "p_quantity" numeric, "p_movement_type" character varying, "p_allow_negative" boolean) TO "service_role";



GRANT ALL ON FUNCTION "inventario"."confirm_pending_transfer"("p_movement_in_id" "uuid", "p_confirmed_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "inventario"."confirm_pending_transfer"("p_movement_in_id" "uuid", "p_confirmed_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "inventario"."confirm_pending_transfer"("p_movement_in_id" "uuid", "p_confirmed_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "inventario"."create_pending_return"("p_product_id" "uuid", "p_quantity" numeric, "p_location_id_from" "uuid", "p_location_id_to" "uuid", "p_reference_id" "uuid", "p_reference_type" character varying, "p_notes" "text", "p_recorded_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "inventario"."create_pending_return"("p_product_id" "uuid", "p_quantity" numeric, "p_location_id_from" "uuid", "p_location_id_to" "uuid", "p_reference_id" "uuid", "p_reference_type" character varying, "p_notes" "text", "p_recorded_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "inventario"."create_pending_return"("p_product_id" "uuid", "p_quantity" numeric, "p_location_id_from" "uuid", "p_location_id_to" "uuid", "p_reference_id" "uuid", "p_reference_type" character varying, "p_notes" "text", "p_recorded_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "inventario"."create_pending_transfer"("p_product_id" "uuid", "p_quantity" numeric, "p_location_id_from" "uuid", "p_location_id_to" "uuid", "p_reference_id" "uuid", "p_reference_type" character varying, "p_notes" "text", "p_recorded_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "inventario"."create_pending_transfer"("p_product_id" "uuid", "p_quantity" numeric, "p_location_id_from" "uuid", "p_location_id_to" "uuid", "p_reference_id" "uuid", "p_reference_type" character varying, "p_notes" "text", "p_recorded_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "inventario"."create_pending_transfer"("p_product_id" "uuid", "p_quantity" numeric, "p_location_id_from" "uuid", "p_location_id_to" "uuid", "p_reference_id" "uuid", "p_reference_type" character varying, "p_notes" "text", "p_recorded_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "inventario"."generate_movement_number"() TO "anon";
GRANT ALL ON FUNCTION "inventario"."generate_movement_number"() TO "authenticated";
GRANT ALL ON FUNCTION "inventario"."generate_movement_number"() TO "service_role";



GRANT ALL ON FUNCTION "inventario"."get_current_balance"("p_product_id" "uuid", "p_location_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "inventario"."get_current_balance"("p_product_id" "uuid", "p_location_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "inventario"."get_current_balance"("p_product_id" "uuid", "p_location_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "inventario"."get_default_location"("p_reason_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "inventario"."get_default_location"("p_reason_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "inventario"."get_default_location"("p_reason_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "inventario"."get_pending_returns"() TO "anon";
GRANT ALL ON FUNCTION "inventario"."get_pending_returns"() TO "authenticated";
GRANT ALL ON FUNCTION "inventario"."get_pending_returns"() TO "service_role";



GRANT ALL ON FUNCTION "inventario"."get_pending_transfers_for_location"("p_location_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "inventario"."get_pending_transfers_for_location"("p_location_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "inventario"."get_pending_transfers_for_location"("p_location_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "inventario"."get_product_balance_by_location"("p_product_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "inventario"."get_product_balance_by_location"("p_product_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "inventario"."get_product_balance_by_location"("p_product_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "inventario"."get_product_balance_total"("p_product_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "inventario"."get_product_balance_total"("p_product_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "inventario"."get_product_balance_total"("p_product_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "inventario"."perform_batch_dispatch_movements"("p_order_id" "uuid", "p_order_number" character varying, "p_items" "jsonb", "p_location_id_from" "uuid", "p_notes" "text", "p_recorded_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "inventario"."perform_batch_dispatch_movements"("p_order_id" "uuid", "p_order_number" character varying, "p_items" "jsonb", "p_location_id_from" "uuid", "p_notes" "text", "p_recorded_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "inventario"."perform_batch_dispatch_movements"("p_order_id" "uuid", "p_order_number" character varying, "p_items" "jsonb", "p_location_id_from" "uuid", "p_notes" "text", "p_recorded_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "inventario"."perform_dispatch_movement"("p_product_id" "uuid", "p_quantity" numeric, "p_location_id_from" "uuid", "p_order_id" "uuid", "p_order_number" character varying, "p_notes" "text", "p_recorded_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "inventario"."perform_dispatch_movement"("p_product_id" "uuid", "p_quantity" numeric, "p_location_id_from" "uuid", "p_order_id" "uuid", "p_order_number" character varying, "p_notes" "text", "p_recorded_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "inventario"."perform_dispatch_movement"("p_product_id" "uuid", "p_quantity" numeric, "p_location_id_from" "uuid", "p_order_id" "uuid", "p_order_number" character varying, "p_notes" "text", "p_recorded_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "inventario"."perform_inventory_movement"("p_product_id" "uuid", "p_quantity" numeric, "p_movement_type" character varying, "p_reason_type" character varying, "p_location_id_from" "uuid", "p_location_id_to" "uuid", "p_reference_id" "uuid", "p_reference_type" character varying, "p_notes" "text", "p_recorded_by" "uuid", "p_batch_number" character varying, "p_expiry_date" "date") TO "anon";
GRANT ALL ON FUNCTION "inventario"."perform_inventory_movement"("p_product_id" "uuid", "p_quantity" numeric, "p_movement_type" character varying, "p_reason_type" character varying, "p_location_id_from" "uuid", "p_location_id_to" "uuid", "p_reference_id" "uuid", "p_reference_type" character varying, "p_notes" "text", "p_recorded_by" "uuid", "p_batch_number" character varying, "p_expiry_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "inventario"."perform_inventory_movement"("p_product_id" "uuid", "p_quantity" numeric, "p_movement_type" character varying, "p_reason_type" character varying, "p_location_id_from" "uuid", "p_location_id_to" "uuid", "p_reference_id" "uuid", "p_reference_type" character varying, "p_notes" "text", "p_recorded_by" "uuid", "p_batch_number" character varying, "p_expiry_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "inventario"."perform_transfer"("p_product_id" "uuid", "p_quantity" numeric, "p_location_id_from" "uuid", "p_location_id_to" "uuid", "p_reference_id" "uuid", "p_reference_type" character varying, "p_notes" "text", "p_recorded_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "inventario"."perform_transfer"("p_product_id" "uuid", "p_quantity" numeric, "p_location_id_from" "uuid", "p_location_id_to" "uuid", "p_reference_id" "uuid", "p_reference_type" character varying, "p_notes" "text", "p_recorded_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "inventario"."perform_transfer"("p_product_id" "uuid", "p_quantity" numeric, "p_location_id_from" "uuid", "p_location_id_to" "uuid", "p_reference_id" "uuid", "p_reference_type" character varying, "p_notes" "text", "p_recorded_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "inventario"."update_inventory_balance"("p_product_id" "uuid", "p_location_id" "uuid", "p_quantity" numeric, "p_movement_type" character varying, "p_movement_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "inventario"."update_inventory_balance"("p_product_id" "uuid", "p_location_id" "uuid", "p_quantity" numeric, "p_movement_type" character varying, "p_movement_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "inventario"."update_inventory_balance"("p_product_id" "uuid", "p_location_id" "uuid", "p_quantity" numeric, "p_movement_type" character varying, "p_movement_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "inventario"."update_inventory_balance_dispatch"("p_product_id" "uuid", "p_location_id" "uuid", "p_quantity" numeric, "p_movement_type" character varying, "p_movement_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "inventario"."update_inventory_balance_dispatch"("p_product_id" "uuid", "p_location_id" "uuid", "p_quantity" numeric, "p_movement_type" character varying, "p_movement_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "inventario"."update_inventory_balance_dispatch"("p_product_id" "uuid", "p_location_id" "uuid", "p_quantity" numeric, "p_movement_type" character varying, "p_movement_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "inventario"."update_location_path"() TO "anon";
GRANT ALL ON FUNCTION "inventario"."update_location_path"() TO "authenticated";
GRANT ALL ON FUNCTION "inventario"."update_location_path"() TO "service_role";



GRANT ALL ON FUNCTION "produccion"."calculate_daily_balance"("p_product_id" "uuid", "p_date" "date", "p_initial_balance" integer) TO "authenticated";



GRANT ALL ON FUNCTION "produccion"."delete_production_order"("order_number" integer) TO "authenticated";



GRANT ALL ON FUNCTION "produccion"."get_daily_forecast"("p_product_id" "uuid", "p_day_of_week" integer, "p_target_date" "date") TO "authenticated";



GRANT ALL ON FUNCTION "produccion"."get_demand_breakdown_by_client"("p_product_id" "uuid", "p_target_date" "date") TO "authenticated";



GRANT ALL ON FUNCTION "produccion"."get_next_production_order_number"() TO "authenticated";



GRANT ALL ON FUNCTION "produccion"."get_production_order_schedules"("order_number" integer) TO "authenticated";



GRANT ALL ON FUNCTION "produccion"."get_weekly_balance_projection"("p_product_id" "uuid", "p_week_start_date" "date") TO "authenticated";



GRANT ALL ON FUNCTION "produccion"."get_weekly_forecast"("p_week_start_date" "date") TO "authenticated";



GRANT ALL ON FUNCTION "produccion"."refresh_daily_demand_history"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."adjust_delivery_date_by_frequency"() TO "anon";
GRANT ALL ON FUNCTION "public"."adjust_delivery_date_by_frequency"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."adjust_delivery_date_by_frequency"() TO "service_role";



GRANT ALL ON FUNCTION "public"."apply_inventory_adjustment"("p_adjustment_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."apply_inventory_adjustment"("p_adjustment_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_inventory_adjustment"("p_adjustment_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."assign_route_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."assign_route_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_route_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_order_item_deliveries_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_order_item_deliveries_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_order_item_deliveries_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_order_items_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_order_items_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_order_items_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_orders_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_orders_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_orders_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_consumption_efficiency"("p_actual_index" numeric, "p_standard_index" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_consumption_efficiency"("p_actual_index" numeric, "p_standard_index" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_consumption_efficiency"("p_actual_index" numeric, "p_standard_index" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_consumption_index"("p_material_consumed" numeric, "p_units_produced" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_consumption_index"("p_material_consumed" numeric, "p_units_produced" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_consumption_index"("p_material_consumed" numeric, "p_units_produced" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_expected_consumption"("p_product_id" "uuid", "p_work_center_code" character varying, "p_total_units" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_expected_consumption"("p_product_id" "uuid", "p_work_center_code" character varying, "p_total_units" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_expected_consumption"("p_product_id" "uuid", "p_work_center_code" character varying, "p_total_units" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_inventory_variance"("count1_total" numeric, "count2_total" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_inventory_variance"("count1_total" numeric, "count2_total" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_inventory_variance"("count1_total" numeric, "count2_total" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_next_frequency_date"("base_date" "date", "frequency_days" integer[]) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_next_frequency_date"("base_date" "date", "frequency_days" integer[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_next_frequency_date"("base_date" "date", "frequency_days" integer[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_order_total"("order_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_order_total"("order_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_order_total"("order_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_production_total"("p_quantity_cars" integer, "p_quantity_cans_per_car" integer, "p_quantity_cans" integer, "p_quantity_units" integer, "p_product_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_production_total"("p_quantity_cars" integer, "p_quantity_cans_per_car" integer, "p_quantity_cans" integer, "p_quantity_units" integer, "p_product_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_production_total"("p_quantity_cars" integer, "p_quantity_cans_per_car" integer, "p_quantity_cans" integer, "p_quantity_units" integer, "p_product_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_theoretical_consumption"("p_product_id" "uuid", "p_material_name" character varying, "p_work_center_code" character varying, "p_total_units" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_theoretical_consumption"("p_product_id" "uuid", "p_material_name" character varying, "p_work_center_code" character varying, "p_total_units" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_theoretical_consumption"("p_product_id" "uuid", "p_material_name" character varying, "p_work_center_code" character varying, "p_total_units" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_time_efficiency"("p_shift_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_time_efficiency"("p_shift_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_time_efficiency"("p_shift_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_create_new_shift"("center_code" "text", "target_date" "date", "target_shift_number" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."can_create_new_shift"("center_code" "text", "target_date" "date", "target_shift_number" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_create_new_shift"("center_code" "text", "target_date" "date", "target_shift_number" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."check_migration_progress"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_migration_progress"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_migration_progress"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_schedule_overlap"("p_day_of_week" integer, "p_start_time" time without time zone, "p_end_time" time without time zone, "p_client_id" "uuid", "p_branch_id" "uuid", "p_exclude_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_schedule_overlap"("p_day_of_week" integer, "p_start_time" time without time zone, "p_end_time" time without time zone, "p_client_id" "uuid", "p_branch_id" "uuid", "p_exclude_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_schedule_overlap"("p_day_of_week" integer, "p_start_time" time without time zone, "p_end_time" time without time zone, "p_client_id" "uuid", "p_branch_id" "uuid", "p_exclude_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_access_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_access_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_access_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_client_config"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_client_config"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_client_config"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_new_shift"("center_code" "text", "user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_new_shift"("center_code" "text", "user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_new_shift"("center_code" "text", "user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_purchase_order_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_purchase_order_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_purchase_order_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_active_frequencies_for_day"("target_day" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_frequencies_for_day"("target_day" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_frequencies_for_day"("target_day" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_active_shift_for_center"("center_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_shift_for_center"("center_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_shift_for_center"("center_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_dispatch_config"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_dispatch_config"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_dispatch_config"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_effective_receiving_schedule"("p_date" "date", "p_client_id" "uuid", "p_branch_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_effective_receiving_schedule"("p_date" "date", "p_client_id" "uuid", "p_branch_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_effective_receiving_schedule"("p_date" "date", "p_client_id" "uuid", "p_branch_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_export_statistics"("start_date" "date", "end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_export_statistics"("start_date" "date", "end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_export_statistics"("start_date" "date", "end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_finished_goods_inventory"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_finished_goods_inventory"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_finished_goods_inventory"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_inventory_summary"("inventory_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_inventory_summary"("inventory_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_inventory_summary"("inventory_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_next_remision_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_next_remision_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_next_remision_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_non_invoiced_remision_orders"("start_date" "date", "end_date" "date", "client_id_filter" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_non_invoiced_remision_orders"("start_date" "date", "end_date" "date", "client_id_filter" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_non_invoiced_remision_orders"("start_date" "date", "end_date" "date", "client_id_filter" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."orders_audit" TO "anon";
GRANT ALL ON TABLE "public"."orders_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."orders_audit" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_order_change_summary"("audit_log" "public"."orders_audit") TO "anon";
GRANT ALL ON FUNCTION "public"."get_order_change_summary"("audit_log" "public"."orders_audit") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_order_change_summary"("audit_log" "public"."orders_audit") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_orders_for_direct_billing"("route_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_orders_for_direct_billing"("route_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_orders_for_direct_billing"("route_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_orders_for_remision"("route_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_orders_for_remision"("route_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_orders_for_remision"("route_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pending_orders_for_routes"("route_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_pending_orders_for_routes"("route_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pending_orders_for_routes"("route_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_product_demand_ema"("p_product_id" "uuid", "p_weeks" integer, "p_alpha" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."get_product_demand_ema"("p_product_id" "uuid", "p_weeks" integer, "p_alpha" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_product_demand_ema"("p_product_id" "uuid", "p_weeks" integer, "p_alpha" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_product_demanded_quantity"("p_product_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_product_demanded_quantity"("p_product_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_product_demanded_quantity"("p_product_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_product_dispatch_history"("p_product_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_product_dispatch_history"("p_product_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_product_dispatch_history"("p_product_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_product_pending_orders"("p_product_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_product_pending_orders"("p_product_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_product_pending_orders"("p_product_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_product_production_history"("p_product_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_product_production_history"("p_product_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_product_production_history"("p_product_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_remision_statistics"("start_date" "date", "end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_remision_statistics"("start_date" "date", "end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_remision_statistics"("start_date" "date", "end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_required_materials_for_product"("p_product_id" "uuid", "p_work_center_code" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."get_required_materials_for_product"("p_product_id" "uuid", "p_work_center_code" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_required_materials_for_product"("p_product_id" "uuid", "p_work_center_code" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_shift_consumption_summary"("p_shift_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_shift_consumption_summary"("p_shift_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_shift_consumption_summary"("p_shift_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_user_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_user_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_user_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_user_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_user_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_user_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_active_shift"("center_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_active_shift"("center_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_active_shift"("center_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_frequency_for_day"("target_branch_id" "uuid", "target_day" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."has_frequency_for_day"("target_branch_id" "uuid", "target_day" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_frequency_for_day"("target_branch_id" "uuid", "target_day" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."link_auth_user"("p_email" "text", "p_auth_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."link_auth_user"("p_email" "text", "p_auth_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."link_auth_user"("p_email" "text", "p_auth_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_orders_as_invoiced"("order_ids" "uuid"[], "export_history_id" "uuid", "invoice_start" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."mark_orders_as_invoiced"("order_ids" "uuid"[], "export_history_id" "uuid", "invoice_start" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_orders_as_invoiced"("order_ids" "uuid"[], "export_history_id" "uuid", "invoice_start" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_remision_orders_as_invoiced"("order_ids" "uuid"[], "export_history_id" "uuid", "invoice_start" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."mark_remision_orders_as_invoiced"("order_ids" "uuid"[], "export_history_id" "uuid", "invoice_start" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_remision_orders_as_invoiced"("order_ids" "uuid"[], "export_history_id" "uuid", "invoice_start" integer) TO "service_role";









GRANT ALL ON FUNCTION "public"."properly_close_shift"("shift_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."properly_close_shift"("shift_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."properly_close_shift"("shift_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_audit_context"("setting_name" "text", "new_value" "text", "is_local" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."set_audit_context"("setting_name" "text", "new_value" "text", "is_local" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_audit_context"("setting_name" "text", "new_value" "text", "is_local" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."test_delivery_date_adjustment"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_delivery_date_adjustment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_delivery_date_adjustment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_calculate_consumption_index"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_calculate_consumption_index"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_calculate_consumption_index"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_calculate_consumption_metrics"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_calculate_consumption_metrics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_calculate_consumption_metrics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_calculate_production_total"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_calculate_production_total"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_calculate_production_total"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_calculate_simple_total"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_calculate_simple_total"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_calculate_simple_total"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_client_frequencies_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_client_frequencies_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_client_frequencies_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_inventory_adjustments_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_inventory_adjustments_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_inventory_adjustments_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_last_login"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_last_login"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_last_login"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_purchase_order_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_purchase_order_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_purchase_order_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_purchase_order_total"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_purchase_order_total"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_purchase_order_total"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_receiving_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_receiving_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_receiving_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_remision_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_remision_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_remision_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_returns_status_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_returns_status_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_returns_status_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_video_tutorials_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_video_tutorials_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_video_tutorials_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_material_consumption"("p_product_id" "uuid", "p_work_center_code" character varying, "p_material_name" character varying, "p_total_units" integer, "p_actual_consumption" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."validate_material_consumption"("p_product_id" "uuid", "p_work_center_code" character varying, "p_material_name" character varying, "p_total_units" integer, "p_actual_consumption" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_material_consumption"("p_product_id" "uuid", "p_work_center_code" character varying, "p_material_name" character varying, "p_total_units" integer, "p_actual_consumption" numeric) TO "service_role";












GRANT ALL ON FUNCTION "visitas"."calculate_visit_average_score"("p_visit_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "visitas"."calculate_visit_average_score"("p_visit_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "visitas"."calculate_visit_average_score"("p_visit_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "visitas"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "visitas"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "visitas"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "visitas"."update_visit_score_trigger"() TO "anon";
GRANT ALL ON FUNCTION "visitas"."update_visit_score_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "visitas"."update_visit_score_trigger"() TO "service_role";















GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "compras"."inventory_movements" TO "authenticated";
GRANT ALL ON TABLE "compras"."inventory_movements" TO "service_role";
GRANT SELECT ON TABLE "compras"."inventory_movements" TO "anon";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT SELECT ON TABLE "compras"."all_inventory_movements" TO "authenticated";
GRANT SELECT ON TABLE "compras"."all_inventory_movements" TO "service_role";
GRANT SELECT ON TABLE "compras"."all_inventory_movements" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "compras"."material_receptions" TO "authenticated";
GRANT ALL ON TABLE "compras"."material_receptions" TO "service_role";
GRANT SELECT ON TABLE "compras"."material_receptions" TO "anon";



GRANT SELECT ON TABLE "compras"."all_material_inventory_status" TO "authenticated";
GRANT SELECT ON TABLE "compras"."all_material_inventory_status" TO "service_role";
GRANT SELECT ON TABLE "compras"."all_material_inventory_status" TO "anon";



GRANT SELECT ON TABLE "compras"."diagnostic_movements" TO "authenticated";



GRANT SELECT ON TABLE "compras"."diagnostic_products" TO "authenticated";



GRANT SELECT ON TABLE "compras"."diagnostic_warehouse_all_products" TO "authenticated";



GRANT ALL ON TABLE "produccion"."work_center_inventory" TO "anon";
GRANT ALL ON TABLE "produccion"."work_center_inventory" TO "authenticated";
GRANT ALL ON TABLE "produccion"."work_center_inventory" TO "service_role";



GRANT ALL ON TABLE "produccion"."work_centers" TO "anon";
GRANT ALL ON TABLE "produccion"."work_centers" TO "authenticated";
GRANT ALL ON TABLE "produccion"."work_centers" TO "service_role";



GRANT SELECT ON TABLE "compras"."diagnostic_work_center_inventory" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "compras"."explosion_purchase_tracking" TO "authenticated";
GRANT ALL ON TABLE "compras"."explosion_purchase_tracking" TO "service_role";



GRANT SELECT ON TABLE "compras"."inventory_calculation_debug" TO "authenticated";



GRANT SELECT ON TABLE "compras"."inventory_movements_debug" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "compras"."material_explosion_history" TO "authenticated";
GRANT ALL ON TABLE "compras"."material_explosion_history" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "compras"."material_explosion_items" TO "authenticated";
GRANT ALL ON TABLE "compras"."material_explosion_items" TO "service_role";



GRANT SELECT ON TABLE "compras"."material_inventory_balances" TO "authenticated";
GRANT SELECT ON TABLE "compras"."material_inventory_balances" TO "anon";
GRANT ALL ON TABLE "compras"."material_inventory_balances" TO "service_role";



GRANT SELECT ON TABLE "compras"."material_inventory_status" TO "authenticated";



GRANT SELECT,INSERT,UPDATE ON TABLE "compras"."material_returns" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "compras"."material_suppliers" TO "authenticated";
GRANT ALL ON TABLE "compras"."material_suppliers" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "compras"."material_suppliers" TO "anon";



GRANT SELECT,INSERT,UPDATE ON TABLE "compras"."material_transfers" TO "authenticated";



GRANT SELECT ON TABLE "compras"."mp_material_inventory_status" TO "authenticated";
GRANT SELECT ON TABLE "compras"."mp_material_inventory_status" TO "service_role";
GRANT SELECT ON TABLE "compras"."mp_material_inventory_status" TO "anon";



GRANT SELECT,INSERT,UPDATE ON TABLE "compras"."return_items" TO "authenticated";



GRANT SELECT ON TABLE "compras"."pending_returns_summary" TO "authenticated";



GRANT SELECT,INSERT,UPDATE ON TABLE "compras"."transfer_items" TO "authenticated";



GRANT SELECT ON TABLE "compras"."pending_transfers_summary" TO "authenticated";



GRANT SELECT ON TABLE "compras"."production_inventory_debug" TO "authenticated";



GRANT SELECT ON TABLE "compras"."production_inventory_status" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "compras"."purchase_order_items" TO "authenticated";
GRANT ALL ON TABLE "compras"."purchase_order_items" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "compras"."purchase_orders" TO "authenticated";
GRANT ALL ON TABLE "compras"."purchase_orders" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "compras"."reception_items" TO "authenticated";
GRANT ALL ON TABLE "compras"."reception_items" TO "service_role";



GRANT SELECT ON TABLE "compras"."return_item_details" TO "authenticated";



GRANT USAGE ON SEQUENCE "compras"."return_number_seq" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "compras"."suppliers" TO "authenticated";
GRANT ALL ON TABLE "compras"."suppliers" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "compras"."suppliers" TO "anon";



GRANT SELECT ON TABLE "compras"."transfer_item_details" TO "authenticated";



GRANT USAGE ON SEQUENCE "compras"."transfer_number_seq" TO "authenticated";



GRANT SELECT ON TABLE "compras"."warehouse_inventory_debug" TO "authenticated";



GRANT SELECT ON TABLE "compras"."warehouse_inventory_status" TO "authenticated";
GRANT SELECT ON TABLE "compras"."warehouse_inventory_status" TO "anon";















GRANT ALL ON TABLE "inventario"."inventory_balances" TO "anon";
GRANT ALL ON TABLE "inventario"."inventory_balances" TO "authenticated";
GRANT ALL ON TABLE "inventario"."inventory_balances" TO "service_role";



GRANT ALL ON TABLE "inventario"."inventory_movements" TO "anon";
GRANT ALL ON TABLE "inventario"."inventory_movements" TO "authenticated";
GRANT ALL ON TABLE "inventario"."inventory_movements" TO "service_role";



GRANT ALL ON TABLE "inventario"."locations" TO "anon";
GRANT ALL ON TABLE "inventario"."locations" TO "authenticated";
GRANT ALL ON TABLE "inventario"."locations" TO "service_role";



GRANT ALL ON SEQUENCE "inventario"."movement_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "inventario"."movement_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "inventario"."movement_number_seq" TO "service_role";



GRANT ALL ON TABLE "produccion"."bill_of_materials" TO "anon";
GRANT ALL ON TABLE "produccion"."bill_of_materials" TO "authenticated";
GRANT ALL ON TABLE "produccion"."bill_of_materials" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."product_config" TO "anon";
GRANT ALL ON TABLE "public"."product_config" TO "authenticated";
GRANT ALL ON TABLE "public"."product_config" TO "service_role";



GRANT ALL ON TABLE "produccion"."daily_demand_history" TO "anon";
GRANT ALL ON TABLE "produccion"."daily_demand_history" TO "authenticated";
GRANT ALL ON TABLE "produccion"."daily_demand_history" TO "service_role";



GRANT ALL ON TABLE "produccion"."material_consumptions" TO "anon";
GRANT ALL ON TABLE "produccion"."material_consumptions" TO "authenticated";
GRANT ALL ON TABLE "produccion"."material_consumptions" TO "service_role";



GRANT ALL ON TABLE "produccion"."operations" TO "anon";
GRANT ALL ON TABLE "produccion"."operations" TO "authenticated";
GRANT ALL ON TABLE "produccion"."operations" TO "service_role";



GRANT ALL ON TABLE "produccion"."pending_returns_by_center" TO "anon";
GRANT ALL ON TABLE "produccion"."pending_returns_by_center" TO "authenticated";
GRANT ALL ON TABLE "produccion"."pending_returns_by_center" TO "service_role";



GRANT ALL ON TABLE "produccion"."pending_transfers_by_center" TO "anon";
GRANT ALL ON TABLE "produccion"."pending_transfers_by_center" TO "authenticated";
GRANT ALL ON TABLE "produccion"."pending_transfers_by_center" TO "service_role";



GRANT ALL ON TABLE "produccion"."product_work_center_mapping" TO "anon";
GRANT ALL ON TABLE "produccion"."product_work_center_mapping" TO "authenticated";
GRANT ALL ON TABLE "produccion"."product_work_center_mapping" TO "service_role";



GRANT ALL ON SEQUENCE "produccion"."production_order_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "produccion"."production_order_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "produccion"."production_order_number_seq" TO "service_role";



GRANT ALL ON TABLE "produccion"."production_productivity" TO "anon";
GRANT ALL ON TABLE "produccion"."production_productivity" TO "authenticated";
GRANT ALL ON TABLE "produccion"."production_productivity" TO "service_role";



GRANT ALL ON TABLE "produccion"."production_records" TO "anon";
GRANT ALL ON TABLE "produccion"."production_records" TO "authenticated";
GRANT ALL ON TABLE "produccion"."production_records" TO "service_role";



GRANT ALL ON TABLE "produccion"."production_route_tracking" TO "anon";
GRANT ALL ON TABLE "produccion"."production_route_tracking" TO "authenticated";
GRANT ALL ON TABLE "produccion"."production_route_tracking" TO "service_role";



GRANT ALL ON TABLE "produccion"."production_routes" TO "anon";
GRANT ALL ON TABLE "produccion"."production_routes" TO "authenticated";
GRANT ALL ON TABLE "produccion"."production_routes" TO "service_role";



GRANT ALL ON TABLE "produccion"."production_schedules" TO "anon";
GRANT ALL ON TABLE "produccion"."production_schedules" TO "authenticated";
GRANT ALL ON TABLE "produccion"."production_schedules" TO "service_role";



GRANT ALL ON TABLE "produccion"."production_shifts" TO "anon";
GRANT ALL ON TABLE "produccion"."production_shifts" TO "authenticated";
GRANT ALL ON TABLE "produccion"."production_shifts" TO "service_role";



GRANT ALL ON TABLE "produccion"."shift_definitions" TO "anon";
GRANT ALL ON TABLE "produccion"."shift_definitions" TO "authenticated";
GRANT ALL ON TABLE "produccion"."shift_definitions" TO "service_role";



GRANT ALL ON TABLE "produccion"."shift_productions" TO "anon";
GRANT ALL ON TABLE "produccion"."shift_productions" TO "authenticated";
GRANT ALL ON TABLE "produccion"."shift_productions" TO "service_role";



GRANT ALL ON TABLE "produccion"."weekly_plans" TO "anon";
GRANT ALL ON TABLE "produccion"."weekly_plans" TO "authenticated";
GRANT ALL ON TABLE "produccion"."weekly_plans" TO "service_role";



GRANT ALL ON TABLE "produccion"."work_center_inventory_status" TO "anon";
GRANT ALL ON TABLE "produccion"."work_center_inventory_status" TO "authenticated";
GRANT ALL ON TABLE "produccion"."work_center_inventory_status" TO "service_role";



GRANT ALL ON TABLE "produccion"."work_center_operations" TO "anon";
GRANT ALL ON TABLE "produccion"."work_center_operations" TO "authenticated";
GRANT ALL ON TABLE "produccion"."work_center_operations" TO "service_role";



GRANT ALL ON TABLE "produccion"."work_center_staffing" TO "anon";
GRANT ALL ON TABLE "produccion"."work_center_staffing" TO "authenticated";
GRANT ALL ON TABLE "produccion"."work_center_staffing" TO "service_role";



GRANT ALL ON TABLE "produccion"."work_centers_with_locations" TO "anon";
GRANT ALL ON TABLE "produccion"."work_centers_with_locations" TO "authenticated";
GRANT ALL ON TABLE "produccion"."work_centers_with_locations" TO "service_role";



GRANT ALL ON TABLE "public"."access_logs" TO "anon";
GRANT ALL ON TABLE "public"."access_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."access_logs" TO "service_role";



GRANT ALL ON TABLE "public"."adjustment_reasons" TO "anon";
GRANT ALL ON TABLE "public"."adjustment_reasons" TO "authenticated";
GRANT ALL ON TABLE "public"."adjustment_reasons" TO "service_role";



GRANT ALL ON TABLE "public"."branches" TO "anon";
GRANT ALL ON TABLE "public"."branches" TO "authenticated";
GRANT ALL ON TABLE "public"."branches" TO "service_role";



GRANT ALL ON TABLE "public"."client_config" TO "anon";
GRANT ALL ON TABLE "public"."client_config" TO "authenticated";
GRANT ALL ON TABLE "public"."client_config" TO "service_role";



GRANT ALL ON SEQUENCE "public"."client_config_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."client_config_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."client_config_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."client_credit_terms" TO "anon";
GRANT ALL ON TABLE "public"."client_credit_terms" TO "authenticated";
GRANT ALL ON TABLE "public"."client_credit_terms" TO "service_role";



GRANT ALL ON SEQUENCE "public"."client_credit_terms_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."client_credit_terms_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."client_credit_terms_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."client_frequencies" TO "anon";
GRANT ALL ON TABLE "public"."client_frequencies" TO "authenticated";
GRANT ALL ON TABLE "public"."client_frequencies" TO "service_role";



GRANT ALL ON TABLE "public"."client_price_lists" TO "anon";
GRANT ALL ON TABLE "public"."client_price_lists" TO "authenticated";
GRANT ALL ON TABLE "public"."client_price_lists" TO "service_role";



GRANT ALL ON SEQUENCE "public"."client_price_lists_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."client_price_lists_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."client_price_lists_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."clientes_rag" TO "anon";
GRANT ALL ON TABLE "public"."clientes_rag" TO "authenticated";
GRANT ALL ON TABLE "public"."clientes_rag" TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."dispatch_inventory_config" TO "anon";
GRANT ALL ON TABLE "public"."dispatch_inventory_config" TO "authenticated";
GRANT ALL ON TABLE "public"."dispatch_inventory_config" TO "service_role";



GRANT ALL ON TABLE "public"."emails" TO "anon";
GRANT ALL ON TABLE "public"."emails" TO "authenticated";
GRANT ALL ON TABLE "public"."emails" TO "service_role";



GRANT ALL ON TABLE "public"."employees" TO "anon";
GRANT ALL ON TABLE "public"."employees" TO "authenticated";
GRANT ALL ON TABLE "public"."employees" TO "service_role";



GRANT ALL ON SEQUENCE "public"."employees_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."employees_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."employees_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."export_history" TO "anon";
GRANT ALL ON TABLE "public"."export_history" TO "authenticated";
GRANT ALL ON TABLE "public"."export_history" TO "service_role";



GRANT ALL ON TABLE "public"."inventories" TO "anon";
GRANT ALL ON TABLE "public"."inventories" TO "authenticated";
GRANT ALL ON TABLE "public"."inventories" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_adjustments" TO "anon";
GRANT ALL ON TABLE "public"."inventory_adjustments" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_adjustments" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_count_items" TO "anon";
GRANT ALL ON TABLE "public"."inventory_count_items" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_count_items" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_counts" TO "anon";
GRANT ALL ON TABLE "public"."inventory_counts" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_counts" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_final_results" TO "anon";
GRANT ALL ON TABLE "public"."inventory_final_results" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_final_results" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_reconciliations" TO "anon";
GRANT ALL ON TABLE "public"."inventory_reconciliations" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_reconciliations" TO "service_role";



GRANT ALL ON TABLE "public"."lead_activities" TO "anon";
GRANT ALL ON TABLE "public"."lead_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_activities" TO "service_role";



GRANT ALL ON TABLE "public"."lead_sources" TO "anon";
GRANT ALL ON TABLE "public"."lead_sources" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_sources" TO "service_role";



GRANT ALL ON TABLE "public"."order_events" TO "anon";
GRANT ALL ON TABLE "public"."order_events" TO "authenticated";
GRANT ALL ON TABLE "public"."order_events" TO "service_role";



GRANT ALL ON TABLE "public"."order_invoices" TO "anon";
GRANT ALL ON TABLE "public"."order_invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."order_invoices" TO "service_role";



GRANT ALL ON TABLE "public"."order_item_deliveries" TO "anon";
GRANT ALL ON TABLE "public"."order_item_deliveries" TO "authenticated";
GRANT ALL ON TABLE "public"."order_item_deliveries" TO "service_role";



GRANT ALL ON TABLE "public"."order_item_deliveries_audit" TO "anon";
GRANT ALL ON TABLE "public"."order_item_deliveries_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."order_item_deliveries_audit" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";
GRANT ALL ON TABLE "public"."users" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."order_item_deliveries_audit_with_user" TO "anon";
GRANT ALL ON TABLE "public"."order_item_deliveries_audit_with_user" TO "authenticated";
GRANT ALL ON TABLE "public"."order_item_deliveries_audit_with_user" TO "service_role";



GRANT ALL ON TABLE "public"."order_items_audit" TO "anon";
GRANT ALL ON TABLE "public"."order_items_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items_audit" TO "service_role";



GRANT ALL ON TABLE "public"."order_items_audit_with_user" TO "anon";
GRANT ALL ON TABLE "public"."order_items_audit_with_user" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items_audit_with_user" TO "service_role";



GRANT ALL ON TABLE "public"."order_status_history" TO "anon";
GRANT ALL ON TABLE "public"."order_status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."order_status_history" TO "service_role";



GRANT ALL ON TABLE "public"."orders_audit_with_user" TO "anon";
GRANT ALL ON TABLE "public"."orders_audit_with_user" TO "authenticated";
GRANT ALL ON TABLE "public"."orders_audit_with_user" TO "service_role";



GRANT ALL ON TABLE "public"."pipeline_stages" TO "anon";
GRANT ALL ON TABLE "public"."pipeline_stages" TO "authenticated";
GRANT ALL ON TABLE "public"."pipeline_stages" TO "service_role";



GRANT ALL ON TABLE "public"."product_aliases" TO "anon";
GRANT ALL ON TABLE "public"."product_aliases" TO "authenticated";
GRANT ALL ON TABLE "public"."product_aliases" TO "service_role";



GRANT ALL ON SEQUENCE "public"."product_aliases_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."product_aliases_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."product_aliases_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."product_commercial_info" TO "anon";
GRANT ALL ON TABLE "public"."product_commercial_info" TO "authenticated";
GRANT ALL ON TABLE "public"."product_commercial_info" TO "service_role";



GRANT ALL ON TABLE "public"."product_costs" TO "anon";
GRANT ALL ON TABLE "public"."product_costs" TO "authenticated";
GRANT ALL ON TABLE "public"."product_costs" TO "service_role";



GRANT ALL ON TABLE "public"."product_inventory_config" TO "anon";
GRANT ALL ON TABLE "public"."product_inventory_config" TO "authenticated";
GRANT ALL ON TABLE "public"."product_inventory_config" TO "service_role";



GRANT ALL ON TABLE "public"."product_media" TO "anon";
GRANT ALL ON TABLE "public"."product_media" TO "authenticated";
GRANT ALL ON TABLE "public"."product_media" TO "service_role";



GRANT ALL ON TABLE "public"."product_price_lists" TO "anon";
GRANT ALL ON TABLE "public"."product_price_lists" TO "authenticated";
GRANT ALL ON TABLE "public"."product_price_lists" TO "service_role";



GRANT ALL ON TABLE "public"."product_production_process" TO "anon";
GRANT ALL ON TABLE "public"."product_production_process" TO "authenticated";
GRANT ALL ON TABLE "public"."product_production_process" TO "service_role";



GRANT ALL ON TABLE "public"."product_quality_specs" TO "anon";
GRANT ALL ON TABLE "public"."product_quality_specs" TO "authenticated";
GRANT ALL ON TABLE "public"."product_quality_specs" TO "service_role";



GRANT ALL ON TABLE "public"."product_technical_specs" TO "anon";
GRANT ALL ON TABLE "public"."product_technical_specs" TO "authenticated";
GRANT ALL ON TABLE "public"."product_technical_specs" TO "service_role";



GRANT ALL ON TABLE "public"."product_completeness" TO "anon";
GRANT ALL ON TABLE "public"."product_completeness" TO "authenticated";
GRANT ALL ON TABLE "public"."product_completeness" TO "service_role";



GRANT ALL ON SEQUENCE "public"."product_config_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."product_config_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."product_config_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."product_configurations" TO "anon";
GRANT ALL ON TABLE "public"."product_configurations" TO "authenticated";
GRANT ALL ON TABLE "public"."product_configurations" TO "service_role";



GRANT ALL ON TABLE "public"."productos_rag" TO "anon";
GRANT ALL ON TABLE "public"."productos_rag" TO "authenticated";
GRANT ALL ON TABLE "public"."productos_rag" TO "service_role";



GRANT ALL ON TABLE "public"."receiving_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."receiving_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."receiving_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."receiving_exceptions" TO "anon";
GRANT ALL ON TABLE "public"."receiving_exceptions" TO "authenticated";
GRANT ALL ON TABLE "public"."receiving_exceptions" TO "service_role";



GRANT ALL ON TABLE "public"."receiving_patterns" TO "anon";
GRANT ALL ON TABLE "public"."receiving_patterns" TO "authenticated";
GRANT ALL ON TABLE "public"."receiving_patterns" TO "service_role";



GRANT ALL ON TABLE "public"."receiving_schedules" TO "anon";
GRANT ALL ON TABLE "public"."receiving_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."receiving_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."receiving_templates" TO "anon";
GRANT ALL ON TABLE "public"."receiving_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."receiving_templates" TO "service_role";



GRANT ALL ON TABLE "public"."remision_items" TO "anon";
GRANT ALL ON TABLE "public"."remision_items" TO "authenticated";
GRANT ALL ON TABLE "public"."remision_items" TO "service_role";



GRANT ALL ON TABLE "public"."remisions" TO "anon";
GRANT ALL ON TABLE "public"."remisions" TO "authenticated";
GRANT ALL ON TABLE "public"."remisions" TO "service_role";



GRANT ALL ON TABLE "public"."returns" TO "anon";
GRANT ALL ON TABLE "public"."returns" TO "authenticated";
GRANT ALL ON TABLE "public"."returns" TO "service_role";



GRANT ALL ON SEQUENCE "public"."route_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."route_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."route_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."route_orders" TO "anon";
GRANT ALL ON TABLE "public"."route_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."route_orders" TO "service_role";



GRANT ALL ON TABLE "public"."routes" TO "anon";
GRANT ALL ON TABLE "public"."routes" TO "authenticated";
GRANT ALL ON TABLE "public"."routes" TO "service_role";



GRANT ALL ON TABLE "public"."sales_opportunities" TO "anon";
GRANT ALL ON TABLE "public"."sales_opportunities" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_opportunities" TO "service_role";



GRANT ALL ON TABLE "public"."system_config" TO "anon";
GRANT ALL ON TABLE "public"."system_config" TO "authenticated";
GRANT ALL ON TABLE "public"."system_config" TO "service_role";



GRANT ALL ON SEQUENCE "public"."system_config_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."system_config_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."system_config_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_migration_instructions" TO "anon";
GRANT ALL ON TABLE "public"."user_migration_instructions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_migration_instructions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_migration_instructions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_migration_instructions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_migration_instructions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."vehicles" TO "anon";
GRANT ALL ON TABLE "public"."vehicles" TO "authenticated";
GRANT ALL ON TABLE "public"."vehicles" TO "service_role";



GRANT ALL ON TABLE "public"."video_tutorials" TO "anon";
GRANT ALL ON TABLE "public"."video_tutorials" TO "authenticated";
GRANT ALL ON TABLE "public"."video_tutorials" TO "service_role";









GRANT ALL ON TABLE "visitas"."product_evaluations" TO "anon";
GRANT ALL ON TABLE "visitas"."product_evaluations" TO "authenticated";
GRANT ALL ON TABLE "visitas"."product_evaluations" TO "service_role";



GRANT ALL ON TABLE "visitas"."store_visits" TO "anon";
GRANT ALL ON TABLE "visitas"."store_visits" TO "authenticated";
GRANT ALL ON TABLE "visitas"."store_visits" TO "service_role";



GRANT ALL ON TABLE "visitas"."visit_photos" TO "anon";
GRANT ALL ON TABLE "visitas"."visit_photos" TO "authenticated";
GRANT ALL ON TABLE "visitas"."visit_photos" TO "service_role";



GRANT SELECT ON TABLE "workflows"."ordenes_compra" TO "authenticated";
GRANT ALL ON TABLE "workflows"."ordenes_compra" TO "service_role";



GRANT SELECT ON TABLE "workflows"."ordenes_compra_productos" TO "authenticated";
GRANT ALL ON TABLE "workflows"."ordenes_compra_productos" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "inventario" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "inventario" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "inventario" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "inventario" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "inventario" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "inventario" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "inventario" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "inventario" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "inventario" GRANT ALL ON TABLES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "produccion" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "produccion" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "produccion" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "produccion" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "produccion" GRANT ALL ON FUNCTIONS TO "postgres";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "produccion" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "produccion" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "produccion" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "produccion" GRANT ALL ON TABLES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "visitas" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "visitas" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "visitas" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "visitas" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "visitas" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "visitas" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "visitas" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "visitas" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "visitas" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "visitas" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "visitas" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "visitas" GRANT ALL ON TABLES TO "service_role";



























alter table "compras"."explosion_purchase_tracking" drop constraint "explosion_purchase_tracking_status_check";

alter table "compras"."inventory_movements" drop constraint "inventory_movements_movement_type_check";

alter table "compras"."inventory_movements" drop constraint "inventory_movements_warehouse_type_check";

alter table "compras"."material_receptions" drop constraint "material_receptions_type_check";

alter table "compras"."material_suppliers" drop constraint "material_suppliers_status_check";

alter table "compras"."purchase_orders" drop constraint "purchase_orders_status_check";

alter table "compras"."suppliers" drop constraint "suppliers_status_check";

alter table "inventario"."inventory_movements" drop constraint "inventory_movements_movement_type_check";

alter table "inventario"."inventory_movements" drop constraint "inventory_movements_reason_type_check";

alter table "inventario"."inventory_movements" drop constraint "inventory_movements_status_check";

alter table "inventario"."inventory_movements" drop constraint "valid_movement_locations";

alter table "inventario"."locations" drop constraint "locations_bin_type_check";

alter table "inventario"."locations" drop constraint "locations_location_type_check";

alter table "produccion"."material_consumptions" drop constraint "material_consumptions_consumption_type_check";

alter table "produccion"."production_shifts" drop constraint "production_shifts_status_check";

alter table "produccion"."shift_productions" drop constraint "shift_productions_status_check";

alter table "produccion"."weekly_plans" drop constraint "weekly_plans_status_check";

alter table "public"."clients" drop constraint "clients_category_check";

alter table "public"."clients" drop constraint "clients_facturador_check";

alter table "public"."inventories" drop constraint "inventories_status_check";

alter table "public"."inventory_adjustments" drop constraint "inventory_adjustments_adjustment_type_check";

alter table "public"."inventory_adjustments" drop constraint "inventory_adjustments_status_check";

alter table "public"."inventory_counts" drop constraint "inventory_counts_status_check";

alter table "public"."inventory_reconciliations" drop constraint "inventory_reconciliations_resolution_method_check";

alter table "public"."order_item_deliveries" drop constraint "order_item_deliveries_delivery_status_check";

alter table "public"."order_item_deliveries_audit" drop constraint "order_item_deliveries_audit_action_check";

alter table "public"."order_items" drop constraint "order_items_availability_status_check";

alter table "public"."order_items_audit" drop constraint "order_items_audit_action_check";

alter table "public"."orders" drop constraint "orders_status_check";

alter table "public"."orders_audit" drop constraint "orders_audit_action_check";

alter table "public"."receiving_exceptions" drop constraint "receiving_exceptions_source_check";

alter table "public"."receiving_exceptions" drop constraint "receiving_exceptions_time_check";

alter table "public"."receiving_exceptions" drop constraint "receiving_exceptions_type_check";

alter table "public"."receiving_patterns" drop constraint "receiving_patterns_effect_type_check";

alter table "public"."receiving_schedules" drop constraint "receiving_schedules_status_check";

alter table "public"."returns" drop constraint "returns_status_check";

alter table "public"."route_orders" drop constraint "route_orders_delivery_status_check";

alter table "public"."routes" drop constraint "routes_status_check";

alter table "public"."vehicles" drop constraint "vehicles_status_check";

alter table "visitas"."visit_photos" drop constraint "visit_photos_photo_type_check";

drop materialized view if exists "produccion"."daily_demand_history";

alter table "compras"."explosion_purchase_tracking" add constraint "explosion_purchase_tracking_status_check" CHECK (((status)::text = ANY ((ARRAY['not_ordered'::character varying, 'ordered'::character varying, 'partially_received'::character varying, 'received'::character varying])::text[]))) not valid;

alter table "compras"."explosion_purchase_tracking" validate constraint "explosion_purchase_tracking_status_check";

alter table "compras"."inventory_movements" add constraint "inventory_movements_movement_type_check" CHECK (((movement_type)::text = ANY ((ARRAY['reception'::character varying, 'consumption'::character varying, 'adjustment'::character varying, 'return'::character varying, 'waste'::character varying, 'transfer'::character varying])::text[]))) not valid;

alter table "compras"."inventory_movements" validate constraint "inventory_movements_movement_type_check";

alter table "compras"."inventory_movements" add constraint "inventory_movements_warehouse_type_check" CHECK (((warehouse_type)::text = ANY ((ARRAY['warehouse'::character varying, 'production'::character varying])::text[]))) not valid;

alter table "compras"."inventory_movements" validate constraint "inventory_movements_warehouse_type_check";

alter table "compras"."material_receptions" add constraint "material_receptions_type_check" CHECK (((type)::text = ANY ((ARRAY['specific_material'::character varying, 'purchase_order'::character varying])::text[]))) not valid;

alter table "compras"."material_receptions" validate constraint "material_receptions_type_check";

alter table "compras"."material_suppliers" add constraint "material_suppliers_status_check" CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::text[]))) not valid;

alter table "compras"."material_suppliers" validate constraint "material_suppliers_status_check";

alter table "compras"."purchase_orders" add constraint "purchase_orders_status_check" CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'ordered'::character varying, 'partially_received'::character varying, 'received'::character varying, 'cancelled'::character varying])::text[]))) not valid;

alter table "compras"."purchase_orders" validate constraint "purchase_orders_status_check";

alter table "compras"."suppliers" add constraint "suppliers_status_check" CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::text[]))) not valid;

alter table "compras"."suppliers" validate constraint "suppliers_status_check";

alter table "inventario"."inventory_movements" add constraint "inventory_movements_movement_type_check" CHECK (((movement_type)::text = ANY ((ARRAY['IN'::character varying, 'OUT'::character varying, 'TRANSFER_IN'::character varying, 'TRANSFER_OUT'::character varying])::text[]))) not valid;

alter table "inventario"."inventory_movements" validate constraint "inventory_movements_movement_type_check";

alter table "inventario"."inventory_movements" add constraint "inventory_movements_reason_type_check" CHECK (((reason_type)::text = ANY ((ARRAY['purchase'::character varying, 'production'::character varying, 'sale'::character varying, 'consumption'::character varying, 'adjustment'::character varying, 'return'::character varying, 'waste'::character varying, 'transfer'::character varying, 'initial'::character varying])::text[]))) not valid;

alter table "inventario"."inventory_movements" validate constraint "inventory_movements_reason_type_check";

alter table "inventario"."inventory_movements" add constraint "inventory_movements_status_check" CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[]))) not valid;

alter table "inventario"."inventory_movements" validate constraint "inventory_movements_status_check";

alter table "inventario"."inventory_movements" add constraint "valid_movement_locations" CHECK (((((movement_type)::text = 'IN'::text) AND (location_id_from IS NULL) AND (location_id_to IS NOT NULL)) OR (((movement_type)::text = 'OUT'::text) AND (location_id_from IS NOT NULL) AND (location_id_to IS NULL)) OR (((movement_type)::text = ANY ((ARRAY['TRANSFER_IN'::character varying, 'TRANSFER_OUT'::character varying])::text[])) AND (location_id_from IS NOT NULL) AND (location_id_to IS NOT NULL)))) not valid;

alter table "inventario"."inventory_movements" validate constraint "valid_movement_locations";

alter table "inventario"."locations" add constraint "locations_bin_type_check" CHECK (((bin_type)::text = ANY ((ARRAY['storage'::character varying, 'receiving'::character varying, 'shipping'::character varying, 'production'::character varying, 'general'::character varying, 'quarantine'::character varying, 'staging'::character varying])::text[]))) not valid;

alter table "inventario"."locations" validate constraint "locations_bin_type_check";

alter table "inventario"."locations" add constraint "locations_location_type_check" CHECK (((location_type)::text = ANY ((ARRAY['warehouse'::character varying, 'zone'::character varying, 'aisle'::character varying, 'bin'::character varying])::text[]))) not valid;

alter table "inventario"."locations" validate constraint "locations_location_type_check";

alter table "produccion"."material_consumptions" add constraint "material_consumptions_consumption_type_check" CHECK (((consumption_type)::text = ANY ((ARRAY['consumed'::character varying, 'wasted'::character varying])::text[]))) not valid;

alter table "produccion"."material_consumptions" validate constraint "material_consumptions_consumption_type_check";

alter table "produccion"."production_shifts" add constraint "production_shifts_status_check" CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'paused'::character varying, 'completed'::character varying])::text[]))) not valid;

alter table "produccion"."production_shifts" validate constraint "production_shifts_status_check";

alter table "produccion"."shift_productions" add constraint "shift_productions_status_check" CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'paused'::character varying, 'completed'::character varying])::text[]))) not valid;

alter table "produccion"."shift_productions" validate constraint "shift_productions_status_check";

alter table "produccion"."weekly_plans" add constraint "weekly_plans_status_check" CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'active'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[]))) not valid;

alter table "produccion"."weekly_plans" validate constraint "weekly_plans_status_check";

alter table "public"."clients" add constraint "clients_category_check" CHECK (((category)::text = ANY ((ARRAY['CAFE'::character varying, 'UNIVERSIDAD'::character varying, 'CONVENIENCIA'::character varying, 'HOTEL'::character varying, 'COLEGIO'::character varying, 'CATERING'::character varying, 'SUPERMERCADO'::character varying, 'CLUB'::character varying, 'RESTAURANTE'::character varying, 'OTRO'::character varying])::text[]))) not valid;

alter table "public"."clients" validate constraint "clients_category_check";

alter table "public"."clients" add constraint "clients_facturador_check" CHECK (((facturador)::text = ANY ((ARRAY['LA FABRIKA CO'::character varying, 'PASTRY CHEF'::character varying])::text[]))) not valid;

alter table "public"."clients" validate constraint "clients_facturador_check";

alter table "public"."inventories" add constraint "inventories_status_check" CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[]))) not valid;

alter table "public"."inventories" validate constraint "inventories_status_check";

alter table "public"."inventory_adjustments" add constraint "inventory_adjustments_adjustment_type_check" CHECK (((adjustment_type)::text = ANY ((ARRAY['positive'::character varying, 'negative'::character varying])::text[]))) not valid;

alter table "public"."inventory_adjustments" validate constraint "inventory_adjustments_adjustment_type_check";

alter table "public"."inventory_adjustments" add constraint "inventory_adjustments_status_check" CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[]))) not valid;

alter table "public"."inventory_adjustments" validate constraint "inventory_adjustments_status_check";

alter table "public"."inventory_counts" add constraint "inventory_counts_status_check" CHECK (((status)::text = ANY ((ARRAY['in_progress'::character varying, 'completed'::character varying])::text[]))) not valid;

alter table "public"."inventory_counts" validate constraint "inventory_counts_status_check";

alter table "public"."inventory_reconciliations" add constraint "inventory_reconciliations_resolution_method_check" CHECK (((resolution_method)::text = ANY ((ARRAY['accept_count1'::character varying, 'accept_count2'::character varying, 'manual'::character varying, 'third_count'::character varying])::text[]))) not valid;

alter table "public"."inventory_reconciliations" validate constraint "inventory_reconciliations_resolution_method_check";

alter table "public"."order_item_deliveries" add constraint "order_item_deliveries_delivery_status_check" CHECK (((delivery_status)::text = ANY ((ARRAY['pending'::character varying, 'delivered'::character varying, 'partial'::character varying, 'rejected'::character varying])::text[]))) not valid;

alter table "public"."order_item_deliveries" validate constraint "order_item_deliveries_delivery_status_check";

alter table "public"."order_item_deliveries_audit" add constraint "order_item_deliveries_audit_action_check" CHECK (((action)::text = ANY ((ARRAY['INSERT'::character varying, 'UPDATE'::character varying, 'DELETE'::character varying])::text[]))) not valid;

alter table "public"."order_item_deliveries_audit" validate constraint "order_item_deliveries_audit_action_check";

alter table "public"."order_items" add constraint "order_items_availability_status_check" CHECK (((availability_status)::text = ANY ((ARRAY['pending'::character varying, 'available'::character varying, 'partial'::character varying, 'unavailable'::character varying])::text[]))) not valid;

alter table "public"."order_items" validate constraint "order_items_availability_status_check";

alter table "public"."order_items_audit" add constraint "order_items_audit_action_check" CHECK (((action)::text = ANY ((ARRAY['INSERT'::character varying, 'UPDATE'::character varying, 'DELETE'::character varying])::text[]))) not valid;

alter table "public"."order_items_audit" validate constraint "order_items_audit_action_check";

alter table "public"."orders" add constraint "orders_status_check" CHECK (((status)::text = ANY ((ARRAY['received'::character varying, 'review_area1'::character varying, 'review_area2'::character varying, 'ready_dispatch'::character varying, 'dispatched'::character varying, 'in_delivery'::character varying, 'delivered'::character varying, 'partially_delivered'::character varying, 'returned'::character varying, 'remisionado'::character varying, 'pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'cancelled'::character varying, 'on_hold'::character varying])::text[]))) not valid;

alter table "public"."orders" validate constraint "orders_status_check";

alter table "public"."orders_audit" add constraint "orders_audit_action_check" CHECK (((action)::text = ANY ((ARRAY['INSERT'::character varying, 'UPDATE'::character varying, 'DELETE'::character varying])::text[]))) not valid;

alter table "public"."orders_audit" validate constraint "orders_audit_action_check";

alter table "public"."receiving_exceptions" add constraint "receiving_exceptions_source_check" CHECK (((source)::text = ANY ((ARRAY['user'::character varying, 'imported'::character varying, 'holiday_api'::character varying])::text[]))) not valid;

alter table "public"."receiving_exceptions" validate constraint "receiving_exceptions_source_check";

alter table "public"."receiving_exceptions" add constraint "receiving_exceptions_time_check" CHECK (((((type)::text = 'blocked'::text) AND (start_time IS NULL) AND (end_time IS NULL)) OR (((type)::text = ANY ((ARRAY['open_extra'::character varying, 'special_hours'::character varying])::text[])) AND (start_time IS NOT NULL) AND (end_time IS NOT NULL) AND (start_time < end_time)))) not valid;

alter table "public"."receiving_exceptions" validate constraint "receiving_exceptions_time_check";

alter table "public"."receiving_exceptions" add constraint "receiving_exceptions_type_check" CHECK (((type)::text = ANY ((ARRAY['blocked'::character varying, 'open_extra'::character varying, 'special_hours'::character varying])::text[]))) not valid;

alter table "public"."receiving_exceptions" validate constraint "receiving_exceptions_type_check";

alter table "public"."receiving_patterns" add constraint "receiving_patterns_effect_type_check" CHECK (((effect_type)::text = ANY ((ARRAY['block'::character varying, 'open_extra'::character varying])::text[]))) not valid;

alter table "public"."receiving_patterns" validate constraint "receiving_patterns_effect_type_check";

alter table "public"."receiving_schedules" add constraint "receiving_schedules_status_check" CHECK (((status)::text = ANY ((ARRAY['available'::character varying, 'unavailable'::character varying])::text[]))) not valid;

alter table "public"."receiving_schedules" validate constraint "receiving_schedules_status_check";

alter table "public"."returns" add constraint "returns_status_check" CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'rejected'::character varying])::text[]))) not valid;

alter table "public"."returns" validate constraint "returns_status_check";

alter table "public"."route_orders" add constraint "route_orders_delivery_status_check" CHECK (((delivery_status)::text = ANY ((ARRAY['pending'::character varying, 'delivered'::character varying, 'partial'::character varying, 'rejected'::character varying])::text[]))) not valid;

alter table "public"."route_orders" validate constraint "route_orders_delivery_status_check";

alter table "public"."routes" add constraint "routes_status_check" CHECK (((status)::text = ANY ((ARRAY['planned'::character varying, 'in_progress'::character varying, 'completed'::character varying])::text[]))) not valid;

alter table "public"."routes" validate constraint "routes_status_check";

alter table "public"."vehicles" add constraint "vehicles_status_check" CHECK (((status)::text = ANY ((ARRAY['available'::character varying, 'in_use'::character varying, 'maintenance'::character varying])::text[]))) not valid;

alter table "public"."vehicles" validate constraint "vehicles_status_check";

alter table "visitas"."visit_photos" add constraint "visit_photos_photo_type_check" CHECK (((photo_type)::text = ANY ((ARRAY['product'::character varying, 'general'::character varying])::text[]))) not valid;

alter table "visitas"."visit_photos" validate constraint "visit_photos_photo_type_check";

create or replace view "compras"."diagnostic_warehouse_all_products" as  SELECT p.id,
    p.name,
    p.category,
    COALESCE(sum(im.quantity_change), (0)::numeric) AS total_movement,
    count(im.id) AS movement_count
   FROM (public.products p
     LEFT JOIN compras.inventory_movements im ON (((p.id = im.material_id) AND ((im.movement_type)::text = ANY ((ARRAY['reception'::character varying, 'transfer'::character varying, 'return'::character varying])::text[])))))
  GROUP BY p.id, p.name, p.category
 HAVING (count(im.id) > 0)
  ORDER BY p.name;


create or replace view "compras"."inventory_calculation_debug" as  SELECT id,
    name,
    COALESCE(( SELECT sum(inventory_movements.quantity_change) AS sum
           FROM compras.inventory_movements
          WHERE ((inventory_movements.material_id = p.id) AND ((inventory_movements.movement_type)::text = ANY ((ARRAY['reception'::character varying, 'transfer'::character varying, 'return'::character varying])::text[])))), (0)::numeric) AS warehouse_calculated,
    COALESCE(( SELECT sum(work_center_inventory.quantity_available) AS sum
           FROM produccion.work_center_inventory
          WHERE (work_center_inventory.material_id = p.id)), (0)::numeric) AS production_calculated,
    ( SELECT count(*) AS count
           FROM compras.inventory_movements
          WHERE (inventory_movements.material_id = p.id)) AS total_movements
   FROM public.products p
  WHERE ((category)::text = 'mp'::text)
  ORDER BY name;


create or replace view "compras"."material_inventory_status" as  SELECT p.id,
    p.name,
    p.category,
    COALESCE(sum(
        CASE
            WHEN ((im.movement_type)::text = ANY ((ARRAY['reception'::character varying, 'adjustment'::character varying])::text[])) THEN im.quantity_change
            ELSE (0)::numeric
        END), (0)::numeric) AS current_stock,
    COALESCE(sum(
        CASE
            WHEN ((im.movement_type)::text = 'consumption'::text) THEN im.quantity_change
            ELSE (0)::numeric
        END), (0)::numeric) AS total_consumed,
    COALESCE(sum(
        CASE
            WHEN ((im.movement_type)::text = 'waste'::text) THEN im.quantity_change
            ELSE (0)::numeric
        END), (0)::numeric) AS total_waste,
    max(im.movement_date) AS last_movement_date,
    count(DISTINCT
        CASE
            WHEN (mr.id IS NOT NULL) THEN mr.id
            ELSE NULL::uuid
        END) AS total_receptions
   FROM ((public.products p
     LEFT JOIN compras.inventory_movements im ON (((p.id = im.material_id) AND ((im.location)::text = 'Bodega'::text))))
     LEFT JOIN compras.material_receptions mr ON ((p.id = mr.material_id)))
  GROUP BY p.id, p.name, p.category;


create or replace view "compras"."production_inventory_status" as  SELECT p.id AS material_id,
    p.name,
    p.category,
    COALESCE(sum(
        CASE
            WHEN (((im.movement_type)::text = ANY ((ARRAY['transfer'::character varying, 'adjustment'::character varying])::text[])) AND ((im.location)::text = 'Producción'::text)) THEN im.quantity_change
            ELSE (0)::numeric
        END), (0)::numeric) AS current_stock,
    0 AS minimum_stock
   FROM (public.products p
     LEFT JOIN compras.inventory_movements im ON ((p.id = im.material_id)))
  WHERE ((p.category)::text = 'mp'::text)
  GROUP BY p.id, p.name, p.category;


create or replace view "compras"."warehouse_inventory_debug" as  WITH movement_details AS (
         SELECT inventory_movements.material_id,
            inventory_movements.movement_type,
            inventory_movements.quantity_change,
            inventory_movements.movement_date
           FROM compras.inventory_movements
          WHERE ((inventory_movements.movement_type)::text = ANY ((ARRAY['reception'::character varying, 'transfer'::character varying, 'return'::character varying])::text[]))
        ), summary_by_type AS (
         SELECT p.id,
            p.name,
            'reception'::text AS type,
            sum(
                CASE
                    WHEN ((md.movement_type)::text = 'reception'::text) THEN md.quantity_change
                    ELSE (0)::numeric
                END) AS qty
           FROM (public.products p
             LEFT JOIN movement_details md ON ((p.id = md.material_id)))
          WHERE ((p.category)::text = 'mp'::text)
          GROUP BY p.id, p.name
        UNION ALL
         SELECT p.id,
            p.name,
            'transfer'::text AS type,
            sum(
                CASE
                    WHEN ((md.movement_type)::text = 'transfer'::text) THEN md.quantity_change
                    ELSE (0)::numeric
                END) AS qty
           FROM (public.products p
             LEFT JOIN movement_details md ON ((p.id = md.material_id)))
          WHERE ((p.category)::text = 'mp'::text)
          GROUP BY p.id, p.name
        UNION ALL
         SELECT p.id,
            p.name,
            'return'::text AS type,
            sum(
                CASE
                    WHEN ((md.movement_type)::text = 'return'::text) THEN md.quantity_change
                    ELSE (0)::numeric
                END) AS qty
           FROM (public.products p
             LEFT JOIN movement_details md ON ((p.id = md.material_id)))
          WHERE ((p.category)::text = 'mp'::text)
          GROUP BY p.id, p.name
        )
 SELECT id,
    name,
    type,
    COALESCE(qty, (0)::numeric) AS quantity
   FROM summary_by_type
  WHERE ((qty IS NOT NULL) OR (type = 'reception'::text))
  ORDER BY name,
        CASE type
            WHEN 'reception'::text THEN 1
            WHEN 'transfer'::text THEN 2
            WHEN 'return'::text THEN 3
            ELSE NULL::integer
        END;


create or replace view "compras"."warehouse_inventory_status" as  WITH movement_summary AS (
         SELECT inventory_movements.material_id,
            sum(inventory_movements.quantity_change) AS net_warehouse_stock,
            max(inventory_movements.movement_date) AS last_movement_date
           FROM compras.inventory_movements
          WHERE ((inventory_movements.movement_type)::text = ANY ((ARRAY['reception'::character varying, 'transfer'::character varying, 'return'::character varying])::text[]))
          GROUP BY inventory_movements.material_id
        )
 SELECT p.id,
    p.name,
    p.category,
    p.unit,
    COALESCE(ms.net_warehouse_stock, (0)::numeric) AS current_stock,
    0 AS total_consumed,
    0 AS total_waste,
    ms.last_movement_date,
    COALESCE(ms.net_warehouse_stock, (0)::numeric) AS total_receptions
   FROM (public.products p
     LEFT JOIN movement_summary ms ON ((p.id = ms.material_id)))
  WHERE (((p.category)::text = 'MP'::text) AND (ms.material_id IS NOT NULL))
  ORDER BY p.name;


create materialized view "produccion"."daily_demand_history" as  SELECT oi.product_id,
    (EXTRACT(dow FROM o.expected_delivery_date))::integer AS day_of_week,
    o.expected_delivery_date AS delivery_date,
    (sum(((COALESCE(oi.quantity_requested, 0) - COALESCE(oi.quantity_returned, 0)) * COALESCE(pc.units_per_package, 1))))::integer AS demand_units
   FROM ((public.order_items oi
     JOIN public.orders o ON ((o.id = oi.order_id)))
     LEFT JOIN public.product_config pc ON ((pc.product_id = oi.product_id)))
  WHERE (((o.status)::text <> ALL ((ARRAY['cancelled'::character varying, 'returned'::character varying])::text[])) AND (o.expected_delivery_date IS NOT NULL))
  GROUP BY oi.product_id, (EXTRACT(dow FROM o.expected_delivery_date)), o.expected_delivery_date;


CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_deleted AFTER DELETE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_user_delete();

CREATE TRIGGER on_auth_user_updated AFTER UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();


  create policy "Anyone can delete visit-photos"
  on "storage"."objects"
  as permissive
  for delete
  to public
using ((bucket_id = 'visit-photos'::text));



  create policy "Anyone can read visit-photos"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'visit-photos'::text));



  create policy "Anyone can update visit-photos"
  on "storage"."objects"
  as permissive
  for update
  to public
using ((bucket_id = 'visit-photos'::text))
with check ((bucket_id = 'visit-photos'::text));



  create policy "Anyone can upload to visit-photos"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check ((bucket_id = 'visit-photos'::text));



  create policy "Authenticated users can delete product photos"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using ((bucket_id = 'Fotos_producto'::text));



  create policy "Authenticated users can update product photos"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using ((bucket_id = 'Fotos_producto'::text));



  create policy "Authenticated users can upload product photos"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'Fotos_producto'::text));



  create policy "Policies 1npj0l3_0"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'ordenesdecompra'::text));



  create policy "Policies 1npj0l3_1"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check ((bucket_id = 'ordenesdecompra'::text));



  create policy "Policies 1npj0l3_2"
  on "storage"."objects"
  as permissive
  for update
  to public
using ((bucket_id = 'ordenesdecompra'::text));



  create policy "Policies 1npj0l3_3"
  on "storage"."objects"
  as permissive
  for delete
  to public
using ((bucket_id = 'ordenesdecompra'::text));



  create policy "Policy pxpmr7_0"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check ((bucket_id = 'evidencia_de_entrega'::text));



  create policy "Policy pxpmr7_1"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'evidencia_de_entrega'::text));



  create policy "Policy pxpmr7_2"
  on "storage"."objects"
  as permissive
  for update
  to public
using ((bucket_id = 'evidencia_de_entrega'::text));



  create policy "Policy pxpmr7_3"
  on "storage"."objects"
  as permissive
  for delete
  to public
using ((bucket_id = 'evidencia_de_entrega'::text));



  create policy "Public Access for Product Photos"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'Fotos_producto'::text));



