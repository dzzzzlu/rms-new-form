-- Ensure the in-app notifications table, RLS, and staff helper exist.
-- Originally created in schema.sql; this re-runs safely on older databases
-- where only some migrations were applied (e.g. notification bell empty).

create table if not exists notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  request_id bigint references requests(id) on delete set null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_id on notifications(user_id);

alter table notifications enable row level security;

-- helper: is the current user staff (registrar/admin/guidance)?
create or replace function public.is_staff()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('registrar', 'admin', 'guidance')
  );
$$ language sql security definer stable;

drop policy if exists "notifications_select_own" on notifications;
create policy "notifications_select_own" on notifications
  for select using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on notifications;
create policy "notifications_update_own" on notifications
  for update using (user_id = auth.uid());

drop policy if exists "notifications_insert_staff" on notifications;
create policy "notifications_insert_staff" on notifications
  for insert with check (is_staff() or user_id = auth.uid());