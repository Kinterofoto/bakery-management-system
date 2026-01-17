-- Grant execute permissions on RPC functions to authenticated users
grant execute on function public.get_finished_goods_inventory() to authenticated, anon;
grant execute on function public.get_product_production_history(uuid) to authenticated, anon;
grant execute on function public.get_product_dispatch_history(uuid) to authenticated, anon;

-- Grant necessary table permissions for the functions to work
grant select on table produccion.production_records to authenticated, anon;
grant select on table produccion.shift_productions to authenticated, anon;
grant select on table public.order_item_deliveries to authenticated, anon;
grant select on table public.order_items to authenticated, anon;
grant select on table public.orders to authenticated, anon;
grant select on table public.clients to authenticated, anon;
grant select on table public.products to authenticated, anon;
