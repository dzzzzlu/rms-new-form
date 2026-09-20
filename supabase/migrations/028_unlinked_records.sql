-- ============================================================
-- Migration 028: Unlinked / historical records
-- Run this in Supabase SQL Editor
--
-- CSV rows imported on Admin > Import Past Records that do not
-- match an existing student account are stored HERE as data
-- only. They create NO auth account, no password, and no login
-- credentials. A real student can later claim them by linking
-- them to their account (student_id is set) either during
-- registration or from Student > Profile > Past Records.
-- ============================================================

create table if not exists public.imported_records (
  id bigint generated always as identity primary key,
  tracking_code text not null unique,
  student_number text,
  student_email text,
  full_name text,
  course text,
  document_name text,
  status text,
  copies int not null default 1,
  record_date date,
  student_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_imported_records_student_email
  on public.imported_records (lower(student_email));
create index if not exists idx_imported_records_student_number
  on public.imported_records (student_number);
create index if not exists idx_imported_records_student_id
  on public.imported_records (student_id);
create index if not exists idx_imported_records_document
  on public.imported_records (document_name);

alter table public.imported_records enable row level security;

-- Staff (registrar/admin/guidance) can read and insert historical records.
create policy "imported_records_select_staff" on public.imported_records
  for select using (public.is_staff());

create policy "imported_records_insert_staff" on public.imported_records
  for insert with check (public.is_staff());

-- Students can view records that have been linked to them; staff can
-- manage anything. Linking itself is done server-side (service role).
create policy "imported_records_select_owner" on public.imported_records
  for select using (public.is_staff() or student_id = auth.uid());

create policy "imported_records_update_owner_or_staff" on public.imported_records
  for update using (public.is_staff() or student_id = auth.uid());