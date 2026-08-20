-- ============================================================
-- Migration 003: Security hardening
-- Run this in the Supabase SQL Editor AFTER 002_features.sql
-- ============================================================

-- 1) Harden handle_new_user trigger: always force role = 'student'
--    so self-registered users can never escalate via metadata.
create or replace function public.handle_new_user()
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

-- 2) Ensure is_staff() includes guidance (idempotent)
create or replace function public.is_staff()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('registrar', 'admin', 'guidance')
  );
$$ language sql security definer stable;
