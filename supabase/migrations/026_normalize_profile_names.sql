-- 026: Normalize stored profile names to Title Case.
-- Existing rows may have been entered in ALL CAPS (e.g. "DELA CRUZ, JUAN").
-- Names should only capitalize the first letter of each word.
-- initcap() lowercases the rest of each word and capitalizes the first letter
-- (words are split on non-alphanumeric characters), e.g. "TABUGA" -> "Tabuga",
-- "dela cruz" -> "Dela Cruz".

update public.profiles
set
  first_name  = initcap(first_name),
  middle_name = initcap(middle_name),
  last_name   = initcap(last_name),
  full_name   = initcap(full_name)
where
  (first_name  is not null and first_name  <> initcap(first_name)) or
  (middle_name is not null and middle_name <> initcap(middle_name)) or
  (last_name   is not null and last_name   <> initcap(last_name)) or
  (full_name   is not null and full_name   <> initcap(full_name));
