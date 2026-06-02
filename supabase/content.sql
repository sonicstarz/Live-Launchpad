-- Live Launchpad — learning center content model (Libraries → Courses → Videos)
-- Run ONCE in the Supabase SQL Editor (after schema.sql and profiles.sql). Safe to re-run.
--
-- Anyone can READ this content (the learning center is free + public).
-- Only EDITORS (profiles.role = 'editor') can create/edit/delete it.

-- Helper: is the currently logged-in user an editor?
create or replace function public.is_editor()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'editor');
$$;

create table if not exists public.libraries (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text default '',
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.courses (
  id          uuid primary key default gen_random_uuid(),
  library_id  uuid not null references public.libraries(id) on delete cascade,
  title       text not null,
  description text default '',
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.videos (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  title       text not null,
  youtube_id  text not null,
  description text default '',
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists courses_library_idx on public.courses(library_id, sort_order);
create index if not exists videos_course_idx   on public.videos(course_id, sort_order);

-- Row Level Security
alter table public.libraries enable row level security;
alter table public.courses   enable row level security;
alter table public.videos    enable row level security;

-- Public read; editor-only write (insert/update/delete), per table.
drop policy if exists "read libraries" on public.libraries;
create policy "read libraries" on public.libraries for select using (true);
drop policy if exists "edit libraries" on public.libraries;
create policy "edit libraries" on public.libraries for all to authenticated using (public.is_editor()) with check (public.is_editor());

drop policy if exists "read courses" on public.courses;
create policy "read courses" on public.courses for select using (true);
drop policy if exists "edit courses" on public.courses;
create policy "edit courses" on public.courses for all to authenticated using (public.is_editor()) with check (public.is_editor());

drop policy if exists "read videos" on public.videos;
create policy "read videos" on public.videos for select using (true);
drop policy if exists "edit videos" on public.videos;
create policy "edit videos" on public.videos for all to authenticated using (public.is_editor()) with check (public.is_editor());
