-- Function to get production history for a product
create or replace function public.get_product_production_history(p_product_id uuid)
returns table (
  record_id uuid,
  shift_date timestamp,
  good_units bigint,
  bad_units bigint,
  notes text,
  recorded_by text
) as $$
select
  pr.id,
  sp.started_at,
  pr.good_units::bigint,
  pr.bad_units::bigint,
  pr.notes,
  u.email
from produccion.production_records pr
join produccion.shift_productions sp on pr.shift_production_id = sp.id
left join auth.users u on pr.recorded_by = u.id
where sp.product_id = p_product_id
order by sp.started_at desc;
$$ language sql stable;

-- Function to get dispatch history for a product
create or replace function public.get_product_dispatch_history(p_product_id uuid)
returns table (
  delivery_id uuid,
  delivery_date timestamp,
  order_id uuid,
  order_number text,
  client_name text,
  quantity_delivered bigint,
  quantity_rejected bigint,
  delivery_status text,
  rejection_reason text
) as $$
select
  oid.id,
  oid.delivered_at,
  o.id,
  o.order_number,
  c.name,
  oid.quantity_delivered::bigint,
  oid.quantity_rejected::bigint,
  oid.delivery_status,
  oid.rejection_reason
from public.order_item_deliveries oid
join public.order_items oi on oid.order_item_id = oi.id
join public.orders o on oi.order_id = o.id
join public.clients c on o.client_id = c.id
where oi.product_id = p_product_id
order by oid.delivered_at desc;
$$ language sql stable;
