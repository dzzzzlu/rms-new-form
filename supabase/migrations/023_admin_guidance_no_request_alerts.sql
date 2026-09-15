-- ============================================================
-- Migration 023: Admin & guidance get no generic request alerts
-- Admins should only be notified about user/account requests
-- (signups pending approval). Guidance is notified about Good
-- Moral approvals from the app instead, so the "New document
-- request" bell message now goes to the registrar only.
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1) Only registrar gets "New document request" alerts.
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

-- 2) Clean out old "New document request" notifications in the
--    admin and guidance bells.
delete from public.notifications
where message like 'New document request:%'
  and user_id in (
    select id from public.profiles
    where role in ('admin', 'guidance')
  );