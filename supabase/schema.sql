-- ============================================================
-- Regis Marie College - Academic Document Request & Analytics System
-- Supabase (Postgres) schema
-- Run this in the Supabase SQL editor (Project > SQL Editor > New query)
-- ============================================================

create type user_role as enum ('student', 'registrar', 'admin', 'guidance');
create type request_status as enum (
  'Pending', 'Payment Verification', 'Processing',
  'Ready for Pickup', 'Completed', 'Rejected'
);
create type payment_status as enum ('Pending', 'Verified', 'Rejected');

-- ------------------------------------------------------------
-- Profiles (extends Supabase auth.users with role/school info)
-- ------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  student_number text unique,
  full_name text not null,
  email text not null,
  role user_role not null default 'student',
  course text,
  contact_number text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role, student_number, course, contact_number)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    'student',
    new.raw_user_meta_data->>'student_number',
    new.raw_user_meta_data->>'course',
    new.raw_user_meta_data->>'contact_number'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- Document Types
-- ------------------------------------------------------------
create table documents (
  id bigint generated always as identity primary key,
  name text not null,
  description text,
  fee numeric(10,2) not null default 0,
  processing_days int not null default 3,
  is_active boolean not null default true
);

insert into documents (name, description, fee, processing_days) values
('Transcript of Records', 'Official record of academic performance', 200.00, 5),
('Certificate of Enrollment', 'Proof of current enrollment', 50.00, 2),
('Certificate of Grades', 'Certified copy of grades for a term', 50.00, 2),
('Good Moral Certificate', 'Certificate of good moral character', 50.00, 2),
('Diploma', 'Original or certified copy of diploma', 300.00, 7),
('Other Registrar Document', 'Any other document handled by the registrar', 50.00, 3);

-- ------------------------------------------------------------
-- Requests
-- ------------------------------------------------------------
create table requests (
  id bigint generated always as identity primary key,
  tracking_code text not null unique,
  user_id uuid not null references profiles(id) on delete cascade,
  document_id bigint not null references documents(id),
  purpose text,
  copies int not null default 1,
  status request_status not null default 'Pending',
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Payments (GCash QR proof upload -> stored in Supabase Storage)
-- ------------------------------------------------------------
create table payments (
  id bigint generated always as identity primary key,
  request_id bigint not null references requests(id) on delete cascade,
  gcash_reference text not null,
  proof_image text not null, -- storage object path
  amount numeric(10,2) not null,
  status payment_status not null default 'Pending',
  verified_by uuid references profiles(id),
  verified_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Status History (audit trail for real-time tracking)
-- ------------------------------------------------------------
create table status_history (
  id bigint generated always as identity primary key,
  request_id bigint not null references requests(id) on delete cascade,
  status text not null,
  changed_by uuid references profiles(id),
  remarks text,
  changed_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Notifications
-- ------------------------------------------------------------
create table notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  request_id bigint references requests(id) on delete set null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_requests_status on requests(status);
create index idx_requests_user on requests(user_id);
create index idx_payments_status on payments(status);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table profiles enable row level security;
alter table documents enable row level security;
alter table requests enable row level security;
alter table payments enable row level security;
alter table status_history enable row level security;
alter table notifications enable row level security;

-- helper: is the current user staff (registrar/admin/guidance)?
create function public.is_staff()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('registrar', 'admin', 'guidance')
  );
$$ language sql security definer stable;

-- profiles: everyone can read their own row; staff can read/update all
create policy "profiles_select_own_or_staff" on profiles
  for select using (id = auth.uid() or is_staff());
create policy "profiles_update_own" on profiles
  for update using (id = auth.uid());
create policy "profiles_update_staff" on profiles
  for update using (is_staff());

-- documents: readable by anyone signed in; only admin writes (do via dashboard/service role)
create policy "documents_select_all" on documents
  for select using (auth.role() = 'authenticated');

-- requests: student sees own; staff sees all
create policy "requests_select_own_or_staff" on requests
  for select using (user_id = auth.uid() or is_staff());
create policy "requests_insert_own" on requests
  for insert with check (user_id = auth.uid());
create policy "requests_update_own_or_staff" on requests
  for update using (user_id = auth.uid() or is_staff());

-- payments: visible to the request owner or staff
create policy "payments_select_own_or_staff" on payments
  for select using (
    is_staff() or exists (select 1 from requests r where r.id = request_id and r.user_id = auth.uid())
  );
create policy "payments_insert_own" on payments
  for insert with check (
    exists (select 1 from requests r where r.id = request_id and r.user_id = auth.uid())
  );
create policy "payments_update_staff" on payments
  for update using (is_staff());

-- status_history: visible to the request owner or staff; only staff/system inserts
create policy "history_select_own_or_staff" on status_history
  for select using (
    is_staff() or exists (select 1 from requests r where r.id = request_id and r.user_id = auth.uid())
  );
create policy "history_insert_staff" on status_history
  for insert with check (is_staff());

-- notifications: only the owner can see/update their notifications
create policy "notifications_select_own" on notifications
  for select using (user_id = auth.uid());
create policy "notifications_update_own" on notifications
  for update using (user_id = auth.uid());
create policy "notifications_insert_staff" on notifications
  for insert with check (is_staff() or user_id = auth.uid());

-- ------------------------------------------------------------
-- Seed a default admin & registrar profile role
-- IMPORTANT: create these two users first via Supabase Auth (or the
-- /register page), then run the two updates below with their real emails.
-- ------------------------------------------------------------
-- update profiles set role = 'admin' where email = 'admin@regismarie.edu.ph';
-- update profiles set role = 'registrar' where email = 'registrar@regismarie.edu.ph';

-- ------------------------------------------------------------
-- Storage bucket for GCash payment proof uploads
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

create policy "payment_proofs_owner_read" on storage.objects
  for select using (bucket_id = 'payment-proofs' and (owner = auth.uid() or is_staff()));
create policy "payment_proofs_owner_write" on storage.objects
  for insert with check (bucket_id = 'payment-proofs' and owner = auth.uid());
