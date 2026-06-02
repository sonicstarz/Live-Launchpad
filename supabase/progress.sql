-- Live Launchpad — per-user lesson progress (free accounts)
-- Run ONCE in the Supabase SQL Editor (after content.sql). Safe to re-run.
-- A row here means "this user has completed this video."

create table if not exists public.progress (
  user_id      uuid not null references auth.users(id) on delete cascade,
  video_id     uuid not null references public.videos(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

alter table public.progress enable row level security;

-- Each user can only see and change THEIR OWN progress.
drop policy if exists "read own progress" on public.progress;
create policy "read own progress"   on public.progress for select to authenticated using (auth.uid() = user_id);
drop policy if exists "insert own progress" on public.progress;
create policy "insert own progress" on public.progress for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "delete own progress" on public.progress;
create policy "delete own progress" on public.progress for delete to authenticated using (auth.uid() = user_id);
