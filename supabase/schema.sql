-- Live Launchpad — arcade leaderboard schema (Supabase / Postgres)
-- Run this ONCE in your Supabase project: Dashboard → SQL Editor → New query → paste → Run.
-- It creates the scores table and the security rules that let the website's
-- public key read and write scores safely.

create table if not exists public.scores (
  id         bigint generated always as identity primary key,
  game       text        not null check (game in ('snake','flappy','lander','orbital','swarm')),
  name       text        not null check (name ~ '^[A-Z0-9]{1,3}$'),  -- 1–3 uppercase letters/numbers
  score      integer     not null check (score >= 0 and score <= 1000000),
  created_at timestamptz not null default now()
);

-- Makes "top 10 for a game" lookups fast.
create index if not exists scores_game_score_idx
  on public.scores (game, score desc);

-- Row Level Security: the public anon key can ONLY do what the policies below allow.
alter table public.scores enable row level security;

-- Anyone may read the leaderboard.
create policy "public read scores"
  on public.scores for select
  to anon
  using (true);

-- Anyone may submit a score. The CHECK constraints above keep junk out
-- (valid game, 1–3 uppercase alphanumerics, score within range).
create policy "public insert scores"
  on public.scores for insert
  to anon
  with check (true);
