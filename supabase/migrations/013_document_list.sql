-- Restrict the document list to the official Registrar's Office documents
-- (user-specified list with exact names/prices).

-- 1) Update descriptions/fees/prices for the certificates that remain.
update documents set fee = 500.00, description = 'Official record of academic performance (500 per page)' where name = 'Transcript of Records';
update documents set fee = 300.00, description = 'Proof of current enrollment' where name = 'Certificate of Enrollment';
update documents set fee = 150.00, description = 'Second copy of grades' where name = '2nd Copy of Grades';
update documents set fee = 300.00, description = 'Certified true copy of grades' where name = 'Certified True Copy - Copy of Grades';
update documents set fee = 300.00, description = 'Certified true copy of Certificate of Registration' where name = 'Certified True Copy - COR';
update documents set fee = 500.00, description = 'Certificate of good moral character' where name = 'Good Moral Certificate';

-- 2) Avoid duplicates in case the old 8-item list was seeded.
insert into documents (name, description, fee, processing_days)
select '2nd Copy of Grades', 'Second copy of grades', 150.00, 2
where not exists (select 1 from documents where name = '2nd Copy of Grades');

-- 3) Remove documents that are not part of the official list.
delete from documents where name = 'Diploma';
delete from documents where name = 'Other Registrar Document';
delete from documents where name = '2nd Copy of Copy of Grades' and id not in (select id from documents where name = '2nd Copy of Grades');