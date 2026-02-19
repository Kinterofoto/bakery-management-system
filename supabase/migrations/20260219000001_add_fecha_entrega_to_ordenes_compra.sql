-- Add fecha_entrega (delivery date) at the order level in ordenes_compra
-- This is extracted from the email body or PDF and used to create orders
ALTER TABLE "workflows"."ordenes_compra"
  ADD COLUMN IF NOT EXISTS "fecha_entrega" date;
