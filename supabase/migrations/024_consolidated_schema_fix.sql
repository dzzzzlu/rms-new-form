-- ============================================================
-- Migration 024: Consolidated schema fix
-- Safe to run ONCE on any database state. All statements are
-- idempotent ("add column if not exists", "create or replace").
-- Brings a partially-migrated project fully up to date:
--   - profiles.email_verified / is_active (login gating)
--   - handle_new_user hardened (new signups start pending)
--   - admin in-app alerts for new signups
--   - registrar-only request alerts (no admin/guidance spam)
--   - payments.reference_number / payment_method
--   - requests.batch_id / pickup_at
--   - notifications.link
--   - request_status includes 'Cancelled'
-- Run from Supabase > SQL Editor (paste whole block, press Run).
-- ============================================================

-- 1) profiles: verification + approval columns (trust existing accounts)
alter table public.profiles add column if not exists email_verified boolean not null default false;
alter table public.profiles add column if not exists is_active boolean not null default true;
update public.profiles set email_verified = true;

-- 2) payments: payment method + reference number (walk-in flow)
alter table public.payments add column if not exists payment_method text not null default 'gcash';
alter table public.payments add column if not exists reference_number text not null default '';
alter table public.payments alter column gcash_reference drop not null;
alter table public.payments alter column proof_image drop not null;
alter table public.payments alter column gcash_reference set default '';
alter table public.payments alter column proof_image set default '';

-- 3) requests + notifications columns used by the app
alter table public.requests add column if not exists batch_id uuid;
alter table public.requests add column if not exists pickup_at timestamptz;
alter table public.notifications add column if not exists link text not null default '';

-- 4) request_status enum includes 'Cancelled' (if not already present)
do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'request_status' and e.enumlabel = 'Cancelled'
  ) then
    alter type request_status add value 'Cancelled';
  end if;
end $$;

-- 5) indexes used by features
create index if not exists requests_batch_id_idx on public.requests (batch_id);
create index if not exists payments_reference_number_idx on public.payments (reference_number);
create index if not exists idx_notifications_user_id on public.notifications (user_id);

-- 6) handle_new_user: new student signups start INACTIVE + UNVERIFIED
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role, student_number, course, contact_number, is_alumni, school_year, is_active, email_verified)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    'student',
    new.raw_user_meta_data->>'student_number',
    new.raw_user_meta_data->>'course',
    new.raw_user_meta_data->>'contact_number',
    coalesce((new.raw_user_meta_data->>'is_alumni')::boolean, false),
    new.raw_user_meta_data->>'school_year',
    false,
    false
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 7) Admins get a bell notification for every new (pending) signup
create or replace function public.notify_admins_new_signup()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.notifications (user_id, message, link)
  select id, 'New signup pending approval: ' || new.full_name || ' (' || new.email || ')', '/admin/approvals'
  from public.profiles
  where role = 'admin' and is_active = true;
  return new;
end;
$$;

drop trigger if exists on_profile_insert_notify_admins on profiles;
create trigger on_profile_insert_notify_admins
  after insert on profiles
  for each row
  when (new.role = 'student')
  execute function public.notify_admins_new_signup();

-- 8) Only the registrar gets "New document request" alerts
create or replace function public.notify_staff_new_request()
returns trigger
language plpgsql
security definer
as $$
declare
  doc_name text;
begin
  select name into doc_name from public.documents where id = new.document_id;
  insert into public.notifications (user_id, request_id, message)
  select id, new.id, 'New document request: ' || doc_name || ' (' || new.tracking_code || ')'
  from public.profiles
  where role = 'registrar'
    and is_active = true;
  return new;
end;
$$;

drop trigger if exists on_request_insert_notify_staff on requests;
create trigger on_request_insert_notify_staff
  after insert on requests
  for each row execute function public.notify_staff_new_request();

-- 9) Any signed-in user may leave a bell notification (chat messages)
drop policy if exists "notifications_insert_staff" on notifications;
create policy "notifications_insert_any" on notifications
  for insert with check (auth.role() = 'authenticated');