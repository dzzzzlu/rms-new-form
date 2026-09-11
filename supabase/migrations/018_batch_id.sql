alter table requests add column if not exists batch_id uuid;

create index if not exists requests_batch_id_idx on requests (batch_id);