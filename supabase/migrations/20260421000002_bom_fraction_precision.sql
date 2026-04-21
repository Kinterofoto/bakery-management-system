-- Increase BOM fraction precision from 3 to 6 decimals.
-- NUMERIC(12,3) loses precision when a user enters a specific gram amount
-- that rounds off the fraction (e.g. 5000 / 8030 = 0.622665… truncated to
-- 0.623, which when multiplied back gives 5002.7 g instead of 5000 g).
-- 6 decimals is enough to round-trip gram inputs up to 6-digit lotes.

ALTER TABLE produccion.bill_of_materials
  ALTER COLUMN quantity_needed TYPE numeric(15, 6),
  ALTER COLUMN original_quantity TYPE numeric(15, 6);
