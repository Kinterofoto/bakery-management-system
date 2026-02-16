-- Create attendance_logs table (using bigint for employee_id to match existing employees table)
create table if not exists public.attendance_logs (
    id uuid not null default gen_random_uuid(),
    employee_id bigint not null references public.employees(id),
    timestamp timestamp with time zone default now(),
    type text not null,
    photo_url text,
    confidence_score double precision,
    created_at timestamp with time zone default now(),
    constraint attendance_logs_pkey primary key (id)
);

-- Alter employees table to add HR fields
alter table public.employees 
add column if not exists first_name text,
add column if not exists last_name text,
add column if not exists photo_url text,
add column if not exists face_descriptor jsonb,
add column if not exists is_active boolean default true,
add column if not exists updated_at timestamp with time zone default now();

-- Storage bucket for HR (if not exists)
insert into storage.buckets (id, name, public)
values ('hr', 'hr', true)
on conflict (id) do nothing;

-- RLS Policies
alter table public.attendance_logs enable row level security;

-- Existing employees table already has some policies probably, but let's ensure these exist suitable for HR
create policy "Allow public read employees" on public.employees for select using (true);
create policy "Allow public insert employees" on public.employees for insert with check (true);
create policy "Allow public update employees" on public.employees for update using (true);

create policy "Allow public read attendance" on public.attendance_logs for select using (true);
create policy "Allow public insert attendance" on public.attendance_logs for insert with check (true);

-- Storage policies
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'hr' );

create policy "Public Insert"
on storage.objects for insert
with check ( bucket_id = 'hr' );
