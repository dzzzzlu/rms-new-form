-- Notification rules so the bell works for everyone:
--   1) Staff (admin/registrar/guidance) get notified when a student creates a request.
--   2) Any signed-in user may leave a bell notification for a message recipient
--      (covers chat messages in both directions: student <-> staff).

-- Allow any authenticated user to drop an in-app notification.
drop policy if exists "notifications_insert_staff" on notifications;
create policy "notifications_insert_any" on notifications
  for insert with check (auth.role() = 'authenticated');

-- Notify registrar/admin/guidance whenever a new request is created.
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
  where role in ('admin', 'registrar', 'guidance')
    and is_active = true;

  return new;
end;
$$;

drop trigger if exists on_request_insert_notify_staff on requests;
create trigger on_request_insert_notify_staff
  after insert on requests
  for each row execute function public.notify_staff_new_request();