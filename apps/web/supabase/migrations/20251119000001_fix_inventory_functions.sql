-- Drop existing functions if they exist
drop function if exists public.get_finished_goods_inventory() cascade;
drop function if exists public.get_product_dispatched_quantity(uuid) cascade;
drop function if exists produccion.get_product_produced_quantity(uuid) cascade;

-- Create function to get total produced quantity for a product
create or replace function produccion.get_product_produced_quantity(p_product_id uuid)
returns bigint as $$
declare
  total_quantity bigint := 0;
begin
  select coalesce(sum(pr.good_units), 0)::bigint
  into total_quantity
  from produccion.production_records pr
  join produccion.shift_productions sp on pr.shift_production_id = sp.id
  where sp.product_id = p_product_id;

  return total_quantity;
end;
$$ language plpgsql immutable;

-- Create function to get total dispatched quantity for a product
create or replace function public.get_product_dispatched_quantity(p_product_id uuid)
returns bigint as $$
declare
  total_quantity bigint := 0;
begin
  select coalesce(sum(oid.quantity_delivered), 0)::bigint
  into total_quantity
  from public.order_item_deliveries oid
  join public.order_items oi on oid.order_item_id = oi.id
  where oi.product_id = p_product_id
  and oid.delivery_status = 'delivered';

  return total_quantity;
end;
$$ language plpgsql immutable;

-- Create function to get finished goods inventory for all products
create or replace function public.get_finished_goods_inventory()
returns table (
  product_id uuid,
  product_name text,
  produced_quantity bigint,
  dispatched_quantity bigint,
  available_quantity bigint
) as $$
begin
  return query
  select
    p.id,
    p.name,
    produccion.get_product_produced_quantity(p.id),
    public.get_product_dispatched_quantity(p.id),
    (produccion.get_product_produced_quantity(p.id) - public.get_product_dispatched_quantity(p.id))
  from public.products p
  where p.category = 'PT'
  order by p.name;
end;
$$ language plpgsql stable;
