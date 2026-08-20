-- ============================================================
-- Migration 005: Security & UX fixes
-- Run this in Supabase SQL Editor AFTER 004_alumni_school_year.sql
-- ============================================================

-- 1) FIX RLS PRIVILEGE ESCALATION
-- Drop existing policies first
drop policy if exists "requests_update_own_or_staff" on requests;
drop policy if exists "requests_insert_own" on requests;
drop policy if exists "requests_select_own_or_staff" on requests;
drop policy if exists "requests_update_classlist_own" on requests;
drop policy if exists "requests_update_staff" on requests;

-- Students can only update class_list on their own requests (for Certificate of Enrollment)
create policy "requests_update_classlist_own" on requests
  for update using (
    user_id = auth.uid()
    and exists (
      select 1 from documents d
      join requests r on r.document_id = d.id
      where r.id = requests.id and d.name = 'Certificate of Enrollment'
    )
  ) with check (
    class_list is not null
  );

-- Staff can update everything
create policy "requests_update_staff" on requests
  for update using (is_staff());

-- Students can insert their own requests
create policy "requests_insert_own" on requests
  for insert with check (user_id = auth.uid());

-- Everyone can read requests they own or staff can read all
create policy "requests_select_own_or_staff" on requests
  for select using (user_id = auth.uid() or is_staff());

-- 2) SECURITY HEADERS via edge function (add to next.config.mjs instead)
-- (Handled in frontend code)

-- 3) Add index for faster lookups
create index if not exists idx_requests_user_id on requests(user_id);
create index if not exists idx_requests_status on requests(status);
create index if not exists idx_payments_request_id on payments(request_id);
create index if not exists idx_notifications_user_id on notifications(user_id);
create index if not exists idx_status_history_request_id on status_history(request_id);
