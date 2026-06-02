-- Live Launchpad — allow the new STAR SWARM game on the leaderboard.
-- Run ONCE in the Supabase SQL Editor (only needed if you already ran schema.sql
-- before STAR SWARM existed). Safe to re-run.

alter table public.scores drop constraint if exists scores_game_check;
alter table public.scores add  constraint scores_game_check
  check (game in ('snake','flappy','lander','orbital','swarm'));
