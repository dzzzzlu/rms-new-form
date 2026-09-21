-- ------------------------------------------------------------
-- 030: Student pickup preference + payment reference validation
-- ------------------------------------------------------------

-- 1) Student can optionally request a preferred pickup date/time.
--    The registrar's authoritative schedule (pickup_at) stays unchanged.
alter table requests
  add column preferred_pickup_at timestamptz;

-- 2) Preferred pickup must be on or after the request was submitted
--    and at most 30 days later. NOT VALID so existing rows are untouched.
alter table requests
  add constraint requests_preferred_pickup_within_30d
  check (
    preferred_pickup_at is null
    or (
      preferred_pickup_at >= created_at
      and preferred_pickup_at <= created_at + interval '30 days'
    )
  )
  not valid;

-- 3) Server-side validation of the GCash/PayMaya reference number:
--    exactly 13 digits, unless the payment is a walk-in (no reference).
--    A trigger is used instead of a CHECK constraint so legacy rows with
--    non-conforming references can still be verified/updated later.
create or replace function public.validate_gcash_reference()
returns trigger
language plpgsql
as $$
begin
  if new.payment_method <> 'walk_in'
     and new.gcash_reference <> ''
     and new.gcash_reference !~ '^[0-9]{13}$' then
    raise exception 'GCash reference number must be exactly 13 digits.';
  end if;
  return new;
end;
$$;

drop trigger if exists payments_gcash_reference_check on payments;

create trigger payments_gcash_reference_check
before insert or update of payment_method, gcash_reference on payments
for each row execute function public.validate_gcash_reference();