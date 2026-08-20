-- Add is_alumni and school_year to profiles
alter table profiles add column if not exists is_alumni boolean not null default false;
alter table profiles add column if not exists school_year text;

-- Update handle_new_user trigger to include new fields
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
