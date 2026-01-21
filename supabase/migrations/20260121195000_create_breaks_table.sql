-- Create employee_breaks table
create table if not exists public.employee_breaks (
    id uuid not null default gen_random_uuid(),
    employee_id bigint not null references public.employees(id),
    start_time timestamp with time zone not null default now(),
    end_time timestamp with time zone,
    created_at timestamp with time zone default now(),
    created_by uuid, -- Could link to auth.users if supervisor is logged in
    constraint employee_breaks_pkey primary key (id)
);

-- Enable RLS
alter table public.employee_breaks enable row level security;

-- Policies
create policy "Allow public read breaks" on public.employee_breaks for select using (true);
create policy "Allow public insert breaks" on public.employee_breaks for insert with check (true);
create policy "Allow public update breaks" on public.employee_breaks for update using (true);
