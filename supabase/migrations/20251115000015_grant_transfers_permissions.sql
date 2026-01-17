-- Grant permissions for transfer and return tables

-- Grant access to authenticated users for compras schema tables
GRANT SELECT, INSERT, UPDATE ON compras.material_transfers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON compras.transfer_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON compras.material_returns TO authenticated;
GRANT SELECT, INSERT, UPDATE ON compras.return_items TO authenticated;

-- Grant access to authenticated users for produccion schema
GRANT SELECT, INSERT, UPDATE ON produccion.work_center_inventory TO authenticated;

-- Grant access to sequences
GRANT USAGE ON compras.transfer_number_seq TO authenticated;
GRANT USAGE ON compras.return_number_seq TO authenticated;

-- Grant access to views
GRANT SELECT ON compras.pending_transfers_summary TO authenticated;
GRANT SELECT ON compras.pending_returns_summary TO authenticated;
GRANT SELECT ON produccion.work_center_inventory_status TO authenticated;
GRANT SELECT ON produccion.pending_transfers_by_center TO authenticated;
GRANT SELECT ON produccion.pending_returns_by_center TO authenticated;
GRANT SELECT ON compras.transfer_item_details TO authenticated;
GRANT SELECT ON compras.return_item_details TO authenticated;
