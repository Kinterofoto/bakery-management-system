-- Allow 'approved' status in ordenes_compra for approved email orders
ALTER TABLE "workflows"."ordenes_compra"
  DROP CONSTRAINT "ordenes_compra_status_check";

ALTER TABLE "workflows"."ordenes_compra"
  ADD CONSTRAINT "ordenes_compra_status_check"
  CHECK (status = ANY (ARRAY['pending'::text, 'processed'::text, 'error'::text, 'approved'::text]));
