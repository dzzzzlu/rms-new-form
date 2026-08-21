-- ============================================================
-- Migration 008: Email verification on signup
-- Run this in Supabase SQL Editor AFTER 007_messages.sql
-- ============================================================

-- 1) REMOVE auto-confirm trigger (we now verify manually via codes)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- 2) Create a trigger that creates profile but does NOT auto-confirm email
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role, student_number, course, contact_number, is_alumni, school_year)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    'student',
    new.raw_user_meta_data->>'student_number',
    new.raw_user_meta_data->>'course',
    new.raw_user_meta_data->>'contact_number',
    coalesce((new.raw_user_meta_data->>'is_alumni')::boolean, false),
    new.raw_user_meta_data->>'school_year'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3) Email verification codes table
create table if not exists email_verifications (
  id bigserial primary key,
  email text not null,
  code text not null,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_email_verifications_email on email_verifications(email);

alter table email_verifications enable row level security;

create policy "service_role_only" on email_verifications
  for all using (true)
  with check (true);
