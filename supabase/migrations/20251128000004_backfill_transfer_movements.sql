-- Backfill inventory movements for existing transfers
-- This migration creates inventory_movements records for all material_transfers
-- that don't have corresponding movements yet

-- Insert movements for transfers that are missing them
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
  movement_date,
  created_at
)
SELECT
  ti.material_id,
  'transfer'::varchar(30),
  -ti.quantity_requested, -- Negative because it's leaving central inventory
  ti.unit_of_measure,
  mt.id,
  'material_transfer',
  'Centro: ' || wc.code,
  'Traslado a ' || wc.name || ' - Lote: ' || COALESCE(ti.batch_number, 'N/A'),
  mt.requested_by,
  mt.requested_at,
  mt.created_at
FROM compras.material_transfers mt
JOIN compras.transfer_items ti ON ti.transfer_id = mt.id
JOIN produccion.work_centers wc ON wc.id = mt.work_center_id
WHERE NOT EXISTS (
  -- Only insert if movement doesn't exist already
  SELECT 1
  FROM compras.inventory_movements im
  WHERE im.reference_id = mt.id
  AND im.reference_type = 'material_transfer'
  AND im.material_id = ti.material_id
);

-- Log the results
DO $$
DECLARE
  inserted_count INTEGER;
BEGIN
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled % transfer movements', inserted_count;
END $$;
