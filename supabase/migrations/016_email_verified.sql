-- ============================================================
-- Migration 016: Enforce email verification before login
-- Run this in Supabase SQL Editor
-- Prevents anyone from using the app without entering the code.
-- ============================================================

-- 1) Add the verified flag to profiles
alter table profiles add column if not exists email_verified boolean not null default false;

-- 2) Trust accounts that already exist (staff + previous students)
update profiles set email_verified = true;

-- 3) Harden handle_new_user: new signups start unverified
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

-- Trigger already exists from earlier migrations; re-point it just in case
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();