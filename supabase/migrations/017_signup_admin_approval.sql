-- ============================================================
-- Migration 017: Admin approval gate + signup notifications
-- Run this in Supabase SQL Editor
-- New signups land as INACTIVE (pending); admins get a bell
-- notification and approve/reject every account from the
-- Admin > Approvals page.
-- ============================================================

-- 1) Hardening: every new student account starts PENDING approval.
--    Safe to run even if 011 was already applied.
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

-- 2) Notify every active admin when a student signs up (pending approval)
create or replace function public.notify_admins_new_signup()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.notifications (user_id, message)
  select id, 'New signup pending approval: ' || new.full_name || ' (' || new.email || ')'
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