alter table payments add column if not exists reference_number text not null default '';

create index if not exists payments_reference_number_idx on payments (reference_number);