-- ============================================================
-- Migration 007: Chat / Messaging system
-- Run this in Supabase SQL Editor AFTER 006_password_resets.sql
-- ============================================================

create table if not exists messages (
  id bigserial primary key,
  sender_id uuid not null references profiles(id) on delete cascade,
  receiver_id uuid references profiles(id) on delete set null,
  request_id bigint references requests(id) on delete set null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_sender on messages(sender_id);
create index if not exists idx_messages_receiver on messages(receiver_id);
create index if not exists idx_messages_request on messages(request_id);
create index if not exists idx_messages_created on messages(created_at);

alter table messages enable row level security;

-- Users can read messages they sent or received
create policy "messages_select_participants" on messages
  for select using (
    sender_id = auth.uid() or receiver_id = auth.uid() or is_staff()
  );

-- Users can insert messages they send
create policy "messages_insert_own" on messages
  for insert with check (sender_id = auth.uid());

-- Users can mark their received messages as read
create policy "messages_update_read" on messages
  for update using (
    receiver_id = auth.uid() or is_staff()
  );
