-- Live Launchpad — per-user video notes
-- Run ONCE in the Supabase SQL Editor (after content.sql). Safe to re-run.
-- One note per (user, video). Private to each user.

create table if not exists public.notes (
  user_id    uuid not null references auth.users(id) on delete cascade,
  video_id   uuid not null references public.videos(id) on delete cascade,
  body       text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

alter table public.notes enable row level security;

-- Each user can only see and change THEIR OWN notes.
drop policy if exists "read own notes" on public.notes;
create policy "read own notes"   on public.notes for select to authenticated using (auth.uid() = user_id);
drop policy if exists "insert own notes" on public.notes;
create policy "insert own notes" on public.notes for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "update own notes" on public.notes;
create policy "update own notes" on public.notes for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "delete own notes" on public.notes;
create policy "delete own notes" on public.notes for delete to authenticated using (auth.uid() = user_id);
