-- Restrict the document list to the official Registrar's Office documents.
-- Retired documents are HIDDEN (is_active = false) instead of deleted, because
-- existing requests reference them via foreign key (requests_document_id_fkey).

-- 1) Ensure the six official documents exist with the correct fees/descriptions.
update documents set fee = 500.00, description = 'Official record of academic performance (500 per page)' where name = 'Transcript of Records';
update documents set fee = 300.00, description = 'Proof of current enrollment' where name = 'Certificate of Enrollment';
update documents set fee = 150.00, description = 'Second copy of grades' where name = '2nd Copy of Grades';
update documents set fee = 300.00, description = 'Certified true copy of grades' where name = 'Certified True Copy - Copy of Grades';
update documents set fee = 300.00, description = 'Certified true copy of Certificate of Registration' where name = 'Certified True Copy - COR';
update documents set fee = 500.00, description = 'Certificate of good moral character' where name = 'Good Moral Certificate';

-- 2) Rename the old grades-copy spelling so historical requests show the new name.
--    (Only when the new name isn't already present, to avoid duplicates.)
update documents set name = '2nd Copy of Grades', description = 'Second copy of grades', fee = 150.00
where name = '2nd Copy of Copy of Grades'
  and not exists (select 1 from documents where name = '2nd Copy of Grades');

-- 3) If both versions somehow exist, hide the old spelling.
update documents set is_active = false
where name = '2nd Copy of Copy of Grades';

-- 4) Hide documents that are no longer part of the official list.
update documents set is_active = false where name = 'Diploma';
update documents set is_active = false where name = 'Other Registrar Document';

-- 5) Make sure the six official documents are active.
update documents set is_active = true
where name in ('Transcript of Records', 'Certificate of Enrollment', '2nd Copy of Grades', 'Certified True Copy - Copy of Grades', 'Certified True Copy - COR', 'Good Moral Certificate');