-- ============================================================
-- Migration 025: Profile enrichment
-- Splits names into parts, adds year level + enrollment status,
-- data-privacy consent, notification preferences, and last login.
-- All statements are idempotent. Run in Supabase > SQL Editor.
-- ============================================================

-- Name parts (needed for printing documents)
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists middle_name text;

-- Year level + enrollment status
alter table public.profiles add column if not exists year_level text;
alter table public.profiles add column if not exists enrollment_status text not null default 'Currently Enrolled';

-- Data Privacy Act consent acknowledgement
alter table public.profiles add column if not exists consent_accepted_at timestamptz;

-- Notification preferences (email-only for now; sms reserved for later)
alter table public.profiles add column if not exists notification_prefs jsonb
  not null default '{"email_alerts":true,"pickup_reminders":true,"sms_alerts":false}'::jsonb;

-- Track last successful sign-in
alter table public.profiles add column if not exists last_login_at timestamptz;