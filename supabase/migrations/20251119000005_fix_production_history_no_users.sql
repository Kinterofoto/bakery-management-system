-- Drop and recreate production history function without auth.users reference
drop function if exists public.get_product_production_history(uuid) cascade;

-- Function to get production history for a product - WITHOUT auth.users reference
create or replace function public.get_product_production_history(p_product_id uuid)
returns table (
  record_id uuid,
  shift_date timestamp,
  good_units bigint,
  bad_units bigint,
  notes text,
  recorded_by text
)
language plpgsql
stable
as $$
begin
  return query
  select
    pr.id,
    sp.started_at,
    pr.good_units::bigint,
    pr.bad_units::bigint,
    pr.notes,
    'Operador'::text
  from produccion.production_records pr
  join produccion.shift_productions sp on pr.shift_production_id = sp.id
  where sp.product_id = p_product_id
  order by sp.started_at desc;
end;
$$;

-- Grant execute permission
grant execute on function public.get_product_production_history(uuid) to authenticated, anon;
