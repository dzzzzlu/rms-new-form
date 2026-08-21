-- ============================================================
-- Migration 010: Payment method (Walk-in / GCash)
-- Run this in Supabase SQL Editor AFTER 009_profiles_admin_only.sql
-- ============================================================

-- Add payment_method column
alter table payments add column if not exists payment_method text not null default 'gcash';

-- Make gcash_reference and proof_image nullable (walk-in doesn't need them)
alter table payments alter column gcash_reference drop not null;
alter table payments alter column proof_image drop not null;

-- Set defaults
alter table payments alter column gcash_reference set default '';
alter table payments alter column proof_image set default '';
