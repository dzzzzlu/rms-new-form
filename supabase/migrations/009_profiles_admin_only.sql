-- ============================================================
-- Migration 009: Profile updates admin-only + messaging read
-- Run this in Supabase SQL Editor AFTER 008_email_verification.sql
-- ============================================================

-- Remove "anyone can update own profile" policy
drop policy if exists "profiles_update_own" on profiles;

-- Only staff (admin/registrar/guidance) can update profiles
drop policy if exists "profiles_update_staff" on profiles;
create policy "profiles_update_staff" on profiles
  for update using (is_staff());

-- All authenticated users can read profiles (needed for chat to show names)
drop policy if exists "profiles_select_own_or_staff" on profiles;
create policy "profiles_select_all" on profiles
  for select using (auth.role() = 'authenticated');
