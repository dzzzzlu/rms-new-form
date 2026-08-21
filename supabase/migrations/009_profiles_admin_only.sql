-- ============================================================
-- Migration 009: Profile updates admin-only
-- Run this in Supabase SQL Editor AFTER 008_email_verification.sql
-- ============================================================

-- Remove "anyone can update own profile" policy
drop policy if exists "profiles_update_own" on profiles;

-- Only staff (admin/registrar/guidance) can update profiles
-- (profiles_update_staff already exists from schema.sql)
-- Recreate to be safe:
drop policy if exists "profiles_update_staff" on profiles;
create policy "profiles_update_staff" on profiles
  for update using (is_staff());
