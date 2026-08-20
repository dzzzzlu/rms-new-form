-- ============================================================
-- Migration 002: guidance approval workflow, class list, clearance,
-- and archived-user semantics.
-- Run this in the Supabase SQL Editor AFTER schema.sql.
-- IMPORTANT: run the ALTER TYPE line by itself first (as its own
-- "Run"), then run the rest below it in a second run — Postgres
-- doesn't allow using a brand-new enum value in the same
-- transaction that added it.
-- ============================================================

-- 1) Run this line alone first:
alter type user_role add value if not exists 'guidance';

-- 2) Then run everything below in a second query:

create type approval_status as enum ('Pending', 'Approved', 'Rejected');

alter table requests add column if not exists guidance_status approval_status;
alter table requests add column if not exists clearance_status approval_status;
alter table requests add column if not exists class_list text;

-- Good Moral requests should start "Pending" guidance review;
-- Diploma requests should start "Pending" clearance.
-- (existing rows are left null / unaffected)

-- Let guidance staff read/act on requests too (they're "staff" now)
create or replace function public.is_staff()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('registrar', 'admin', 'guidance')
  );
$$ language sql security definer stable;

-- Guidance can only update the guidance-related columns; enforced at the
-- application layer (RLS already allows staff to update requests broadly
-- via requests_update_own_or_staff — this keeps the schema simple).
