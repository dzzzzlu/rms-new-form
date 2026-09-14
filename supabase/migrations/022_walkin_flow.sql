alter type request_status add value if not exists 'Cancelled';

-- Existing walk-in requests no longer need a payment-verification step.
update requests
set status = 'Pending'
where status = 'Payment Verification'
  and id in (select request_id from payments where payment_method = 'walk_in');