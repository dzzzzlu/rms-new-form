-- Guarantee the six official Registrar's Office documents exist, are active,
-- and have the correct price/description. Idempotent: safe to run any number
-- of times and from any previous state (rows may have been deleted earlier,
-- e.g. copy-type documents that had no requests referencing them).

-- 1) Recreate any missing official documents.
insert into documents (name, description, fee, processing_days)
select v.name, v.description, v.fee, v.processing_days
from (values
  ('Transcript of Records', 'Official record of academic performance (500 per page)', 500.00, 5),
  ('Certificate of Enrollment', 'Proof of current enrollment', 300.00, 2),
  ('2nd Copy of Grades', 'Second copy of grades', 150.00, 2),
  ('Certified True Copy - Copy of Grades', 'Certified true copy of grades', 300.00, 2),
  ('Certified True Copy - COR', 'Certified true copy of Certificate of Registration', 300.00, 2),
  ('Good Moral Certificate', 'Certificate of good moral character', 500.00, 2)
) as v(name, description, fee, processing_days)
where not exists (select 1 from documents d where d.name = v.name);

-- 2) Sync all six to active with the correct price/description.
update documents d set is_active = true, fee = v.fee, description = v.description
from (values
  ('Transcript of Records', 'Official record of academic performance (500 per page)', 500.00),
  ('Certificate of Enrollment', 'Proof of current enrollment', 300.00),
  ('2nd Copy of Grades', 'Second copy of grades', 150.00),
  ('Certified True Copy - Copy of Grades', 'Certified true copy of grades', 300.00),
  ('Certified True Copy - COR', 'Certified true copy of Certificate of Registration', 300.00),
  ('Good Moral Certificate', 'Certificate of good moral character', 500.00)
) as v(name, description, fee)
where d.name = v.name;

-- 3) Hide any documents that are not on the official list.
update documents set is_active = false
where name not in ('Transcript of Records', 'Certificate of Enrollment', '2nd Copy of Grades', 'Certified True Copy - Copy of Grades', 'Certified True Copy - COR', 'Good Moral Certificate');