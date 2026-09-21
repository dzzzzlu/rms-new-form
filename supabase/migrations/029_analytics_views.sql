-- ============================================================
-- Migration 029: Analytics views
-- Run this in Supabase SQL Editor
--
-- One denormalized row per request with every fact the analytics
-- dashboard needs (status, document, requester, timestamps,
-- fulfilment times, and revenue). The dashboard reads it through
-- PostgREST and falls back to client-side aggregation if the view
-- is not present yet.
-- ============================================================

create or replace view public.analytics_request_facts
with (security_invoker = true) as
select
  r.id,
  r.tracking_code,
  r.status,
  r.copies,
  r.created_at,
  r.updated_at,
  r.pickup_at,
  d.id as document_id,
  d.name as document_name,
  d.fee as document_fee,
  p.id as student_id,
  p.full_name,
  p.student_number,
  p.course,
  p.year_level,
  p.enrollment_status,
  p.is_alumni,
  (select min(sh.changed_at) from status_history sh
    where sh.request_id = r.id and lower(sh.status) = 'completed')
    as completed_at,
  (select min(sh.changed_at) from status_history sh
    where sh.request_id = r.id and lower(sh.status) = 'ready for pickup')
    as ready_at,
  (select max(sh.changed_at) from status_history sh
    where sh.request_id = r.id)
    as last_status_change_at,
  coalesce((
    select sum(pay.amount) from payments pay
    where pay.request_id = r.id and pay.status = 'Verified'
  ), 0) as paid_amount,
  (select pay.payment_method from payments pay
    where pay.request_id = r.id and pay.status = 'Verified'
    order by pay.verified_at nulls last, pay.id
    limit 1) as payment_method,
  (select pay.verified_at from payments pay
    where pay.request_id = r.id and pay.status = 'Verified'
    order by pay.verified_at nulls last, pay.id
    limit 1) as verified_at
from requests r
left join documents d on d.id = r.document_id
left join profiles p on p.id = r.user_id;