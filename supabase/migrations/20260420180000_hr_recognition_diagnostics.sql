-- HR Recognition Diagnostics
-- Enables human-in-the-loop review of face recognition quality:
--  - Tracks top candidates and margin per attendance log so we can spot
--    false positives later.
--  - Stores the live-capture photo URL alongside the stored reference so a
--    human can visually audit what the camera actually saw.
--  - New table for FAILED recognition attempts (no face, below threshold,
--    ambiguous) — failures are where most of the signal lives.
--  - Fields for manual labeling (correct / incorrect + ground truth) so the
--    collected data becomes an eval set for future parameter tuning.

-- ── attendance_logs: diagnostic + review columns ─────────────────────
alter table public.attendance_logs
    add column if not exists top_candidates jsonb,
    add column if not exists margin double precision,
    add column if not exists extracted_embedding jsonb,
    add column if not exists review_status text,
    add column if not exists correct_employee_id bigint references public.employees(id),
    add column if not exists reviewed_at timestamptz,
    add column if not exists reviewed_notes text;

-- Check constraint for review_status (only add if missing)
do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'attendance_logs_review_status_check'
    ) then
        alter table public.attendance_logs
            add constraint attendance_logs_review_status_check
            check (review_status is null or review_status in ('correct', 'incorrect'));
    end if;
end$$;

create index if not exists idx_attendance_logs_review_pending
    on public.attendance_logs (timestamp desc)
    where review_status is null;

create index if not exists idx_attendance_logs_margin
    on public.attendance_logs (margin)
    where margin is not null;

create index if not exists idx_attendance_logs_correct_employee
    on public.attendance_logs (correct_employee_id)
    where correct_employee_id is not null;

-- ── attendance_recognition_failures: new table ───────────────────────
create table if not exists public.attendance_recognition_failures (
    id uuid primary key default gen_random_uuid(),
    timestamp timestamptz not null default now(),
    reason text not null check (reason in ('no_face_detected', 'below_threshold', 'ambiguous', 'multiple_faces', 'other')),
    photo_url text,
    top_candidates jsonb,
    best_similarity double precision,
    margin double precision,
    extracted_embedding jsonb,
    review_status text check (review_status is null or review_status in ('confirmed_no_match', 'should_have_matched')),
    correct_employee_id bigint references public.employees(id),
    reviewed_at timestamptz,
    reviewed_notes text,
    created_at timestamptz not null default now()
);

create index if not exists idx_recognition_failures_timestamp
    on public.attendance_recognition_failures (timestamp desc);

create index if not exists idx_recognition_failures_review_pending
    on public.attendance_recognition_failures (timestamp desc)
    where review_status is null;

create index if not exists idx_recognition_failures_reason
    on public.attendance_recognition_failures (reason, timestamp desc);

create index if not exists idx_recognition_failures_correct_employee
    on public.attendance_recognition_failures (correct_employee_id)
    where correct_employee_id is not null;

alter table public.attendance_recognition_failures enable row level security;

create policy "Allow public read recognition_failures"
    on public.attendance_recognition_failures
    for select using (true);

create policy "Allow public insert recognition_failures"
    on public.attendance_recognition_failures
    for insert with check (true);

create policy "Allow public update recognition_failures"
    on public.attendance_recognition_failures
    for update using (true);
