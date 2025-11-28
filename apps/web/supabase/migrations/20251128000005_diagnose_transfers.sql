-- Diagnostic query to see what's happening with transfers

-- Check total transfers
DO $$
DECLARE
  total_transfers INTEGER;
  total_items INTEGER;
  total_movements INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_transfers FROM compras.material_transfers;
  SELECT COUNT(*) INTO total_items FROM compras.transfer_items;
  SELECT COUNT(*) INTO total_movements
  FROM compras.inventory_movements
  WHERE movement_type = 'transfer';

  RAISE NOTICE 'Total transfers: %', total_transfers;
  RAISE NOTICE 'Total transfer items: %', total_items;
  RAISE NOTICE 'Total transfer movements: %', total_movements;
END $$;

-- Show transfers without movements
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '=== Transfers without movements ===';
  FOR rec IN
    SELECT
      mt.id,
      mt.transfer_number,
      mt.status,
      mt.requested_at,
      COUNT(ti.id) as item_count,
      COUNT(im.id) as movement_count
    FROM compras.material_transfers mt
    LEFT JOIN compras.transfer_items ti ON ti.transfer_id = mt.id
    LEFT JOIN compras.inventory_movements im
      ON im.reference_id = mt.id
      AND im.reference_type = 'material_transfer'
    GROUP BY mt.id, mt.transfer_number, mt.status, mt.requested_at
  LOOP
    RAISE NOTICE 'Transfer: % | Items: % | Movements: % | Status: %',
      rec.transfer_number, rec.item_count, rec.movement_count, rec.status;
  END LOOP;
END $$;
