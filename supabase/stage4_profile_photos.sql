-- KithaLovers Stage 4: profile photo storage
-- Run once in Supabase Dashboard -> SQL Editor after the initial schema and Stage 2/3 migrations.
-- Profile photos are public because visible member profiles display them in discovery.
-- Upload, update and delete are restricted to each authenticated user's own folder.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

 drop policy if exists "Profile photos are publicly viewable" on storage.objects;
create policy "Profile photos are publicly viewable"
  on storage.objects for select
  using (bucket_id = 'profile-photos');

drop policy if exists "Members upload photos to their own folder" on storage.objects;
create policy "Members upload photos to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Members update photos in their own folder" on storage.objects;
create policy "Members update photos in their own folder"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Members delete photos in their own folder" on storage.objects;
create policy "Members delete photos in their own folder"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
