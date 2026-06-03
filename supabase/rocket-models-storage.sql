-- Live Launchpad — Storage bucket for uploaded .glb rocket models
-- Run ONCE in the Supabase SQL Editor (after rocket-explorer.sql). Safe to re-run.
-- Public can READ the files (so the explorer can load them); only EDITORS
-- (public.is_editor()) can upload / replace / delete.

-- ===== bucket =====
insert into storage.buckets (id, name, public)
values ('rocket-models', 'rocket-models', true)
on conflict (id) do update set public = true;

-- ===== policies on storage.objects scoped to this bucket =====
drop policy if exists "rocket-models read" on storage.objects;
create policy "rocket-models read" on storage.objects
  for select using ( bucket_id = 'rocket-models' );

drop policy if exists "rocket-models insert" on storage.objects;
create policy "rocket-models insert" on storage.objects
  for insert to authenticated
  with check ( bucket_id = 'rocket-models' and public.is_editor() );

drop policy if exists "rocket-models update" on storage.objects;
create policy "rocket-models update" on storage.objects
  for update to authenticated
  using ( bucket_id = 'rocket-models' and public.is_editor() )
  with check ( bucket_id = 'rocket-models' and public.is_editor() );

drop policy if exists "rocket-models delete" on storage.objects;
create policy "rocket-models delete" on storage.objects
  for delete to authenticated
  using ( bucket_id = 'rocket-models' and public.is_editor() );
