-- Verification document upload (School ID / Registration Form / COR).
-- Students upload proof of identity during registration so approval is not
-- made "on faith".

alter table public.profiles
  add column if not exists verification_doc_path text,
  add column if not exists verification_doc_name text;

-- Private storage bucket with a hard 5 MB cap and image/PDF allow-list.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'verification-docs',
  'verification-docs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Anyone (pre-account, via the anon key) may upload a verification document.
drop policy if exists "verification docs upload" on storage.objects;
create policy "verification docs upload" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'verification-docs');

-- Only admins / registrars may read the uploaded documents.
drop policy if exists "verification docs read staff" on storage.objects;
create policy "verification docs read staff" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'verification-docs'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'registrar')
    )
  );
