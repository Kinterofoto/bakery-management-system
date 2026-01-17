-- Drop existing functions
drop function if exists public.get_finished_goods_inventory() cascade;
drop function if exists public.get_product_dispatched_quantity(uuid) cascade;
drop function if exists produccion.get_product_produced_quantity(uuid) cascade;

-- Simple function to get finished goods inventory using CTEs
create or replace function public.get_finished_goods_inventory()
returns table (
  product_id uuid,
  product_name text,
  produced_quantity bigint,
  dispatched_quantity bigint,
  available_quantity bigint
) as $$
with produced as (
  select
    sp.product_id,
    coalesce(sum(pr.good_units), 0)::bigint as total
  from produccion.production_records pr
  join produccion.shift_productions sp on pr.shift_production_id = sp.id
  group by sp.product_id
),
dispatched as (
  select
    oi.product_id,
    coalesce(sum(oid.quantity_delivered), 0)::bigint as total
  from public.order_item_deliveries oid
  join public.order_items oi on oid.order_item_id = oi.id
  where oid.delivery_status = 'delivered'
  group by oi.product_id
)
select
  p.id,
  p.name,
  coalesce(prod.total, 0),
  coalesce(disp.total, 0),
  (coalesce(prod.total, 0) - coalesce(disp.total, 0))
from public.products p
left join produced prod on prod.product_id = p.id
left join dispatched disp on disp.product_id = p.id
where p.category = 'PT'
order by p.name;
$$ language sql stable;
