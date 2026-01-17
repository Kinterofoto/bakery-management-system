-- Create Views for Transfer and Inventory Management

-- =====================================================
-- VIEW: Pending Transfers Summary
-- =====================================================
CREATE OR REPLACE VIEW compras.pending_transfers_summary AS
SELECT
  mt.id,
  mt.transfer_number,
  mt.work_center_id,
  wc.code AS work_center_code,
  wc.name AS work_center_name,
  COUNT(ti.id) AS item_count,
  SUM(ti.quantity_requested) AS total_quantity_requested,
  COUNT(CASE WHEN ti.quantity_received IS NOT NULL THEN 1 END) AS items_received,
  mt.status,
  mt.requested_by,
  mt.requested_at,
  mt.received_at,
  mt.notes,
  STRING_AGG(DISTINCT p.name, ', ') AS materials_list
FROM compras.material_transfers mt
LEFT JOIN compras.transfer_items ti ON ti.transfer_id = mt.id
LEFT JOIN public.products p ON p.id = ti.material_id
LEFT JOIN produccion.work_centers wc ON wc.id = mt.work_center_id
GROUP BY
  mt.id,
  mt.transfer_number,
  mt.work_center_id,
  wc.code,
  wc.name,
  mt.status,
  mt.requested_by,
  mt.requested_at,
  mt.received_at,
  mt.notes;

-- =====================================================
-- VIEW: Pending Returns Summary
-- =====================================================
CREATE OR REPLACE VIEW compras.pending_returns_summary AS
SELECT
  mr.id,
  mr.return_number,
  mr.work_center_id,
  wc.code AS work_center_code,
  wc.name AS work_center_name,
  COUNT(ri.id) AS item_count,
  SUM(ri.quantity_returned) AS total_quantity_returned,
  mr.status,
  mr.requested_by,
  mr.reason,
  mr.requested_at,
  mr.accepted_at,
  mr.notes,
  STRING_AGG(DISTINCT p.name, ', ') AS materials_list
FROM compras.material_returns mr
LEFT JOIN compras.return_items ri ON ri.return_id = mr.id
LEFT JOIN public.products p ON p.id = ri.material_id
LEFT JOIN produccion.work_centers wc ON wc.id = mr.work_center_id
GROUP BY
  mr.id,
  mr.return_number,
  mr.work_center_id,
  wc.code,
  wc.name,
  mr.status,
  mr.requested_by,
  mr.reason,
  mr.requested_at,
  mr.accepted_at,
  mr.notes;

-- =====================================================
-- VIEW: Work Center Inventory Status
-- =====================================================
CREATE OR REPLACE VIEW produccion.work_center_inventory_status AS
SELECT
  wci.id,
  wci.work_center_id,
  wc.code AS work_center_code,
  wc.name AS work_center_name,
  wci.material_id,
  p.name AS material_name,
  p.unit AS unit_of_measure,
  wci.quantity_available,
  wci.quantity_consumed,
  (wci.quantity_available - wci.quantity_consumed) AS net_available,
  wci.batch_number,
  wci.expiry_date,
  wci.transferred_at,
  wci.created_at,
  wci.updated_at
FROM produccion.work_center_inventory wci
LEFT JOIN produccion.work_centers wc ON wc.id = wci.work_center_id
LEFT JOIN public.products p ON p.id = wci.material_id
ORDER BY wci.work_center_id, wci.material_id;

-- =====================================================
-- VIEW: Pending Transfers by Work Center
-- =====================================================
CREATE OR REPLACE VIEW produccion.pending_transfers_by_center AS
SELECT
  mt.id,
  mt.transfer_number,
  mt.work_center_id,
  wc.code AS work_center_code,
  wc.name AS work_center_name,
  COUNT(CASE WHEN mt.status = 'pending_receipt' THEN 1 END) AS pending_count,
  COUNT(CASE WHEN mt.status = 'partially_received' THEN 1 END) AS partially_received_count,
  COUNT(CASE WHEN mt.status = 'received' THEN 1 END) AS received_count,
  MAX(mt.requested_at) AS last_transfer_date
FROM compras.material_transfers mt
LEFT JOIN produccion.work_centers wc ON wc.id = mt.work_center_id
GROUP BY
  mt.id,
  mt.transfer_number,
  mt.work_center_id,
  wc.code,
  wc.name;

-- =====================================================
-- VIEW: Pending Returns by Work Center
-- =====================================================
CREATE OR REPLACE VIEW produccion.pending_returns_by_center AS
SELECT
  mr.work_center_id,
  wc.code AS work_center_code,
  wc.name AS work_center_name,
  COUNT(mr.id) AS total_returns,
  COUNT(CASE WHEN mr.status = 'pending_receipt' THEN 1 END) AS pending_count,
  COUNT(CASE WHEN mr.status = 'received' THEN 1 END) AS received_count,
  SUM(ri.quantity_returned) AS total_quantity_returned
FROM compras.material_returns mr
LEFT JOIN produccion.work_centers wc ON wc.id = mr.work_center_id
LEFT JOIN compras.return_items ri ON ri.return_id = mr.id
GROUP BY
  mr.work_center_id,
  wc.code,
  wc.name;

-- =====================================================
-- VIEW: Transfer Item Details
-- =====================================================
CREATE OR REPLACE VIEW compras.transfer_item_details AS
SELECT
  ti.id,
  ti.transfer_id,
  mt.transfer_number,
  mt.work_center_id,
  wc.name AS work_center_name,
  ti.material_id,
  p.name AS material_name,
  p.unit AS unit_of_measure,
  ti.quantity_requested,
  ti.quantity_received,
  COALESCE(ti.quantity_received, ti.quantity_requested) AS quantity_final,
  ti.batch_number,
  ti.expiry_date,
  mt.status,
  mt.requested_at,
  mt.received_at,
  ti.notes
FROM compras.transfer_items ti
LEFT JOIN compras.material_transfers mt ON mt.id = ti.transfer_id
LEFT JOIN produccion.work_centers wc ON wc.id = mt.work_center_id
LEFT JOIN public.products p ON p.id = ti.material_id;

-- =====================================================
-- VIEW: Return Item Details
-- =====================================================
CREATE OR REPLACE VIEW compras.return_item_details AS
SELECT
  ri.id,
  ri.return_id,
  mr.return_number,
  mr.work_center_id,
  wc.name AS work_center_name,
  ri.material_id,
  p.name AS material_name,
  p.unit AS unit_of_measure,
  ri.quantity_returned,
  ri.batch_number,
  ri.expiry_date,
  mr.status,
  mr.reason,
  mr.requested_at,
  mr.accepted_at,
  ri.notes
FROM compras.return_items ri
LEFT JOIN compras.material_returns mr ON mr.id = ri.return_id
LEFT JOIN produccion.work_centers wc ON wc.id = mr.work_center_id
LEFT JOIN public.products p ON p.id = ri.material_id;
