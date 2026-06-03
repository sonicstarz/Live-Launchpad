-- Live Launchpad — newsletter / launch-alert subscribers
-- Run ONCE in the Supabase SQL Editor. Safe to re-run.
-- The public site INSERTS signups with the anon (publishable) key; nobody can
-- READ the list with that key (no select policy) — you read it via the dashboard
-- or the service-role key. Same direct-write pattern as the arcade leaderboard.

create table if not exists public.subscribers (
  id          bigint generated always as identity primary key,
  email       text not null,
  source      text not null default 'site',   -- which page/form it came from
  created_at  timestamptz not null default now(),
  unique (email)
);

alter table public.subscribers enable row level security;

-- anon may add themselves (insert only), but cannot read or modify the list
drop policy if exists "anon subscribe" on public.subscribers;
create policy "anon subscribe" on public.subscribers
  for insert to anon with check (true);
