-- Grant permissions for new inventory location views

GRANT SELECT ON compras.warehouse_inventory_status TO authenticated;
GRANT SELECT ON compras.production_inventory_status TO authenticated;
GRANT SELECT ON compras.inventory_status_by_location TO authenticated;
