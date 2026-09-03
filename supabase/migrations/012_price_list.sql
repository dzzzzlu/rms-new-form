-- ============================================================
-- Migration 012: Update credential price list
-- Aligns document fees with the official price list.
-- ============================================================

update documents set fee = 500.00, description = 'Official record of academic performance' where name = 'Transcript of Records';
update documents set fee = 300.00, description = 'Proof of current enrollment' where name = 'Certificate of Enrollment';
update documents set fee = 150.00, description = 'Second copy of grades' where name = '2nd Copy of Copy of Grades';
update documents set fee = 300.00, description = 'Certified true copy of grades' where name = 'Certified True Copy - Copy of Grades';
update documents set fee = 300.00, description = 'Certified true copy of Certificate of Registration' where name = 'Certified True Copy - COR';
update documents set fee = 500.00, description = 'Certificate of good moral character' where name = 'Good Moral Certificate';
update documents set fee = 350.00, description = 'Original or certified copy of diploma' where name = 'Diploma';
update documents set fee = 150.00, description = 'Any other document handled by the registrar' where name = 'Other Registrar Document';

-- Drop the old 'Certificate of Grades' entry if it exists (replaced by the priced grade items)
delete from documents where name = 'Certificate of Grades';
