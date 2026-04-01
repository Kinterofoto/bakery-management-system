-- ============================================================
-- Migration: Normalize raw materials (materias primas)
-- 1. Consolidate duplicate materials (migrate ALL FKs)
-- 2. Normalize all names to UPPERCASE
-- 3. Normalize units (g/gramos → gr, und → unidad)
-- 4. Add trigger to enforce UPPERCASE on insert/update
-- ============================================================

BEGIN;

-- ============================================================
-- Helper: migrate ALL references from one product to another
-- Handles every FK to products across all schemas
-- ============================================================
CREATE OR REPLACE FUNCTION _migrate_product_refs(
  p_source UUID,
  p_target UUID
) RETURNS void AS $$
BEGIN
  -- produccion.bill_of_materials (unique on product_id, operation_id, material_id)
  DELETE FROM produccion.bill_of_materials
  WHERE material_id = p_source
    AND (product_id, operation_id) IN (
      SELECT product_id, operation_id FROM produccion.bill_of_materials
      WHERE material_id = p_target
    );
  UPDATE produccion.bill_of_materials SET material_id = p_target WHERE material_id = p_source;

  -- produccion.material_consumptions
  UPDATE produccion.material_consumptions SET material_id = p_target WHERE material_id = p_source;

  -- compras.material_suppliers (unique on material_id, supplier_id)
  DELETE FROM compras.material_suppliers
  WHERE material_id = p_source
    AND supplier_id IN (
      SELECT supplier_id FROM compras.material_suppliers WHERE material_id = p_target
    );
  UPDATE compras.material_suppliers SET material_id = p_target WHERE material_id = p_source;

  -- compras.material_inventory_balances
  DELETE FROM compras.material_inventory_balances WHERE material_id = p_source
    AND EXISTS (SELECT 1 FROM compras.material_inventory_balances WHERE material_id = p_target);
  UPDATE compras.material_inventory_balances SET material_id = p_target WHERE material_id = p_source;

  -- compras.inventory_movements
  UPDATE compras.inventory_movements SET material_id = p_target WHERE material_id = p_source;

  -- compras.purchase_order_items
  UPDATE compras.purchase_order_items SET material_id = p_target WHERE material_id = p_source;

  -- compras.reception_items
  UPDATE compras.reception_items SET material_id = p_target WHERE material_id = p_source;

  -- compras.material_receptions
  UPDATE compras.material_receptions SET material_id = p_target WHERE material_id = p_source;

  -- compras.explosion_purchase_tracking
  UPDATE compras.explosion_purchase_tracking SET material_id = p_target WHERE material_id = p_source;

  -- compras.material_explosion_items
  UPDATE compras.material_explosion_items SET material_id = p_target WHERE material_id = p_source;

  -- compras.material_explosion_history
  UPDATE compras.material_explosion_history SET product_id = p_target WHERE product_id = p_source;

  -- compras.return_items
  UPDATE compras.return_items SET material_id = p_target WHERE material_id = p_source;

  -- compras.transfer_items
  UPDATE compras.transfer_items SET material_id = p_target WHERE material_id = p_source;

  -- produccion.work_center_inventory
  UPDATE produccion.work_center_inventory SET material_id = p_target WHERE material_id = p_source;

  -- inventario.inventory_balances (RESTRICT, unique on product_id+location_id)
  -- Must come before inventory_movements due to last_movement_id FK
  DELETE FROM inventario.inventory_balances
  WHERE product_id = p_source
    AND location_id IN (
      SELECT location_id FROM inventario.inventory_balances WHERE product_id = p_target
    );
  UPDATE inventario.inventory_balances SET product_id = p_target WHERE product_id = p_source;

  -- inventario.inventory_movements (RESTRICT)
  UPDATE inventario.inventory_movements SET product_id = p_target WHERE product_id = p_source;

  -- public.inventory_count_items (unique on inventory_count_id, product_id)
  DELETE FROM public.inventory_count_items
  WHERE product_id = p_source
    AND inventory_count_id IN (
      SELECT inventory_count_id FROM public.inventory_count_items WHERE product_id = p_target
    );
  UPDATE public.inventory_count_items SET product_id = p_target WHERE product_id = p_source;

  -- public.inventory_final_results (unique on inventory_id, product_id)
  DELETE FROM public.inventory_final_results
  WHERE product_id = p_source
    AND inventory_id IN (
      SELECT inventory_id FROM public.inventory_final_results WHERE product_id = p_target
    );
  UPDATE public.inventory_final_results SET product_id = p_target WHERE product_id = p_source;

  -- public.inventory_reconciliations
  UPDATE public.inventory_reconciliations SET product_id = p_target WHERE product_id = p_source;
  UPDATE public.inventory_adjustments SET product_id = p_target WHERE product_id = p_source;
  UPDATE public.order_items SET product_id = p_target WHERE product_id = p_source;
  UPDATE public.remision_items SET product_id = p_target WHERE product_id = p_source;
  UPDATE public.returns SET product_id = p_target WHERE product_id = p_source;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PHASE 1: Consolidate duplicates
-- ============================================================

-- HARINA DE TRIGO → HARINA DE TRIGO MULTIPROPOSITO
SELECT _migrate_product_refs('6023738a-5bb5-493e-819c-1b380cd0993b', '61231de6-279e-4953-8b10-ce3509aa81ce');
DELETE FROM public.products WHERE id = '6023738a-5bb5-493e-819c-1b380cd0993b';

-- HARINA DE TRIGO PARA HOJALDRES Y GALLETAS (9 → 0)
-- Migrate all refs to MULTIPROPOSITO, then delete all
SELECT _migrate_product_refs('23b81927-e69a-45bd-969c-e19fa97ae1c3', '61231de6-279e-4953-8b10-ce3509aa81ce');
SELECT _migrate_product_refs('66823a52-3a36-4141-bf07-6c63a86580bf', '61231de6-279e-4953-8b10-ce3509aa81ce');
SELECT _migrate_product_refs('2363be65-91ec-4fed-851e-588f7a45ae74', '61231de6-279e-4953-8b10-ce3509aa81ce');
SELECT _migrate_product_refs('bcb40e68-921c-455e-a725-bf8e87c5dfcc', '61231de6-279e-4953-8b10-ce3509aa81ce');
SELECT _migrate_product_refs('865ac4e4-33de-46a8-a2b2-4c6dafc9f785', '61231de6-279e-4953-8b10-ce3509aa81ce');
SELECT _migrate_product_refs('6c666740-d9d1-4279-ada1-9496e913cab9', '61231de6-279e-4953-8b10-ce3509aa81ce');
SELECT _migrate_product_refs('52854993-9638-4704-9e61-774718e0036a', '61231de6-279e-4953-8b10-ce3509aa81ce');
SELECT _migrate_product_refs('f11be983-6f54-4eb4-8807-be6f83f8e2a4', '61231de6-279e-4953-8b10-ce3509aa81ce');
SELECT _migrate_product_refs('c72bcfad-8920-4ee9-a84f-99cabb6c7e5c', '61231de6-279e-4953-8b10-ce3509aa81ce');
DELETE FROM public.products WHERE id IN (
  '66823a52-3a36-4141-bf07-6c63a86580bf',
  '2363be65-91ec-4fed-851e-588f7a45ae74',
  'bcb40e68-921c-455e-a725-bf8e87c5dfcc',
  '23b81927-e69a-45bd-969c-e19fa97ae1c3',
  '865ac4e4-33de-46a8-a2b2-4c6dafc9f785',
  '6c666740-d9d1-4279-ada1-9496e913cab9',
  '52854993-9638-4704-9e61-774718e0036a',
  'f11be983-6f54-4eb4-8807-be6f83f8e2a4',
  'c72bcfad-8920-4ee9-a84f-99cabb6c7e5c'
);

-- CHOCOLATE BELCOSTEAK (5 → 1, keep 84a4b374)
SELECT _migrate_product_refs('f0f053a9-0f6d-40e8-847e-a17b22df15ee', '84a4b374-1897-40ba-b750-b30db4c1f3cf');
SELECT _migrate_product_refs('5fbb2ae4-8e6f-4ffc-92c5-9c36ce3b07c4', '84a4b374-1897-40ba-b750-b30db4c1f3cf');
SELECT _migrate_product_refs('9266a46c-714f-413c-91be-8b3316ea1552', '84a4b374-1897-40ba-b750-b30db4c1f3cf');
SELECT _migrate_product_refs('4895d774-095f-4909-a14c-7d27178b8cb8', '84a4b374-1897-40ba-b750-b30db4c1f3cf');
DELETE FROM public.products WHERE id IN (
  '5fbb2ae4-8e6f-4ffc-92c5-9c36ce3b07c4',
  '9266a46c-714f-413c-91be-8b3316ea1552',
  '4895d774-095f-4909-a14c-7d27178b8cb8',
  'f0f053a9-0f6d-40e8-847e-a17b22df15ee'
);

-- HER CHIPS CHOCO (2 → 1, keep 850094a8)
SELECT _migrate_product_refs('4436beba-cf93-437c-a95b-14aa33726e15', '850094a8-5473-4299-b46d-de01ee818118');
DELETE FROM public.products WHERE id = '4436beba-cf93-437c-a95b-14aa33726e15';

-- HUEVOS (2 → 1, keep 3b00b662)
SELECT _migrate_product_refs('7e52612a-15d4-4a8a-8d85-475768e07e93', '3b00b662-a5fe-4328-862a-bdde3fedd684');
DELETE FROM public.products WHERE id = '7e52612a-15d4-4a8a-8d85-475768e07e93';

-- SAL (2 → 1, keep a67e4e27)
SELECT _migrate_product_refs('88bd5fb5-e834-4415-9ee6-cd81dd737a8e', 'a67e4e27-ba8a-4a87-a65d-ee40a62bd862');
DELETE FROM public.products WHERE id = '88bd5fb5-e834-4415-9ee6-cd81dd737a8e';

-- LEVADURA genéricas → LEVADURA FRESCA (c5b84919)
SELECT _migrate_product_refs('8d9e8e45-ace3-4244-bdcb-f9f1c9b3b8f3', 'c5b84919-47e0-4168-86e3-b7c094c8999c');
DELETE FROM public.products WHERE id = '8d9e8e45-ace3-4244-bdcb-f9f1c9b3b8f3';

SELECT _migrate_product_refs('d71b20da-1700-41fa-a980-071020ea1653', 'c5b84919-47e0-4168-86e3-b7c094c8999c');
DELETE FROM public.products WHERE id = 'd71b20da-1700-41fa-a980-071020ea1653';

-- LEVADURA INSTANTANIA (typo) → migrate any refs to INSTANTANEA, then delete
SELECT _migrate_product_refs('cd946bef-313e-45bf-8d17-c70815722070', '25819da9-eddd-449a-a0e2-ad9f357eb76c');
DELETE FROM public.products WHERE id = 'cd946bef-313e-45bf-8d17-c70815722070';

-- Rename LEVADURA INSTATANEA → LEVADURA INSTANTANEA
UPDATE public.products SET name = 'LEVADURA INSTANTANEA'
WHERE id = '25819da9-eddd-449a-a0e2-ad9f357eb76c';

-- TEST entries → clean all refs then delete
-- Delete from all RESTRICT FK tables first
DELETE FROM inventario.inventory_balances WHERE product_id IN ('7244ebc8-b703-4889-a259-48b4fa36c92c','06ea8d41-d361-49ab-ba80-1083dc728b4c','41f2dfed-63e8-4a6e-9423-c2dc0aa17eb0','c320846a-113f-4678-95ff-ff13ed6fe0b7');
DELETE FROM inventario.inventory_movements WHERE product_id IN ('7244ebc8-b703-4889-a259-48b4fa36c92c','06ea8d41-d361-49ab-ba80-1083dc728b4c','41f2dfed-63e8-4a6e-9423-c2dc0aa17eb0','c320846a-113f-4678-95ff-ff13ed6fe0b7');
DELETE FROM public.inventory_count_items WHERE product_id IN ('7244ebc8-b703-4889-a259-48b4fa36c92c','06ea8d41-d361-49ab-ba80-1083dc728b4c','41f2dfed-63e8-4a6e-9423-c2dc0aa17eb0','c320846a-113f-4678-95ff-ff13ed6fe0b7');
DELETE FROM public.inventory_final_results WHERE product_id IN ('7244ebc8-b703-4889-a259-48b4fa36c92c','06ea8d41-d361-49ab-ba80-1083dc728b4c','41f2dfed-63e8-4a6e-9423-c2dc0aa17eb0','c320846a-113f-4678-95ff-ff13ed6fe0b7');
DELETE FROM public.inventory_reconciliations WHERE product_id IN ('7244ebc8-b703-4889-a259-48b4fa36c92c','06ea8d41-d361-49ab-ba80-1083dc728b4c','41f2dfed-63e8-4a6e-9423-c2dc0aa17eb0','c320846a-113f-4678-95ff-ff13ed6fe0b7');
DELETE FROM public.inventory_adjustments WHERE product_id IN ('7244ebc8-b703-4889-a259-48b4fa36c92c','06ea8d41-d361-49ab-ba80-1083dc728b4c','41f2dfed-63e8-4a6e-9423-c2dc0aa17eb0','c320846a-113f-4678-95ff-ff13ed6fe0b7');
DELETE FROM compras.purchase_order_items WHERE material_id IN ('7244ebc8-b703-4889-a259-48b4fa36c92c','06ea8d41-d361-49ab-ba80-1083dc728b4c','41f2dfed-63e8-4a6e-9423-c2dc0aa17eb0','c320846a-113f-4678-95ff-ff13ed6fe0b7');
DELETE FROM produccion.bill_of_materials WHERE material_id IN ('7244ebc8-b703-4889-a259-48b4fa36c92c','06ea8d41-d361-49ab-ba80-1083dc728b4c','41f2dfed-63e8-4a6e-9423-c2dc0aa17eb0','c320846a-113f-4678-95ff-ff13ed6fe0b7');
DELETE FROM produccion.material_consumptions WHERE material_id IN ('7244ebc8-b703-4889-a259-48b4fa36c92c','06ea8d41-d361-49ab-ba80-1083dc728b4c','41f2dfed-63e8-4a6e-9423-c2dc0aa17eb0','c320846a-113f-4678-95ff-ff13ed6fe0b7');
DELETE FROM public.order_items WHERE product_id IN ('7244ebc8-b703-4889-a259-48b4fa36c92c','06ea8d41-d361-49ab-ba80-1083dc728b4c','41f2dfed-63e8-4a6e-9423-c2dc0aa17eb0','c320846a-113f-4678-95ff-ff13ed6fe0b7');
DELETE FROM public.remision_items WHERE product_id IN ('7244ebc8-b703-4889-a259-48b4fa36c92c','06ea8d41-d361-49ab-ba80-1083dc728b4c','41f2dfed-63e8-4a6e-9423-c2dc0aa17eb0','c320846a-113f-4678-95ff-ff13ed6fe0b7');
DELETE FROM public.returns WHERE product_id IN ('7244ebc8-b703-4889-a259-48b4fa36c92c','06ea8d41-d361-49ab-ba80-1083dc728b4c','41f2dfed-63e8-4a6e-9423-c2dc0aa17eb0','c320846a-113f-4678-95ff-ff13ed6fe0b7');
DELETE FROM public.products WHERE id IN (
  '7244ebc8-b703-4889-a259-48b4fa36c92c',
  '06ea8d41-d361-49ab-ba80-1083dc728b4c',
  '41f2dfed-63e8-4a6e-9423-c2dc0aa17eb0',
  'c320846a-113f-4678-95ff-ff13ed6fe0b7'
);

-- Drop helper function
DROP FUNCTION _migrate_product_refs(UUID, UUID);

-- ============================================================
-- PHASE 2: Normalize all MP names to UPPERCASE
-- ============================================================
UPDATE public.products
SET name = UPPER(TRIM(name))
WHERE name != UPPER(TRIM(name))
  AND category IN ('MP', 'mp');

-- ============================================================
-- PHASE 3: Normalize units (g/gramos → gr, und → unidad)
-- ============================================================
UPDATE public.products SET unit = 'gr' WHERE unit = 'g' AND category IN ('MP', 'mp');
UPDATE public.products SET unit = 'gr' WHERE unit = 'gramos' AND category IN ('MP', 'mp');
UPDATE public.products SET unit = 'unidad' WHERE unit = 'und' AND category IN ('MP', 'mp');

-- Normalize category casing
UPDATE public.products SET category = 'MP' WHERE category = 'mp';

-- ============================================================
-- PHASE 4: Trigger to enforce UPPERCASE on insert/update
-- ============================================================
CREATE OR REPLACE FUNCTION public.normalize_product_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.name := UPPER(TRIM(NEW.name));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalize_product_name ON public.products;
CREATE TRIGGER trg_normalize_product_name
  BEFORE INSERT OR UPDATE OF name ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_product_name();

COMMIT;
