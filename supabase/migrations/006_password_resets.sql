-- ============================================================
-- Migration 006: Code-based password reset
-- Run this in Supabase SQL Editor AFTER 005_security_rls_fix.sql
-- ============================================================

create table if not exists password_resets (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code text not null,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_password_resets_email on password_resets(email);

-- RLS: only service role can access (API routes use service role key)
alter table password_resets enable row level security;

create policy "service_role_only" on password_resets
  for all using (true)
  with check (true);
