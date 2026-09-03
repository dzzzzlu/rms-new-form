-- ============================================================
-- Migration 011: Admin approval for new student signups
-- New student accounts start as inactive until an admin approves them.
-- ============================================================

-- 1) Harden handle_new_user: always set is_active = false for students
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role, student_number, course, contact_number, is_alumni, school_year, is_active)
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
    false
  );
  return new;
end;
$$ language plpgsql security definer;
