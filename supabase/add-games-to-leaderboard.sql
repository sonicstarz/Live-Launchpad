-- Live Launchpad — allow GRAVITY ASSIST, FUEL TRANSFER and MOON BASE BUILDER
-- on the leaderboard. Run ONCE in the Supabase SQL Editor. Safe to re-run.
--
-- Without this, those three games' high scores are rejected by the database's
-- game-name check and silently fail to save (the games still play fine).

alter table public.scores drop constraint if exists scores_game_check;
alter table public.scores add  constraint scores_game_check
  check (game in ('snake','flappy','lander','orbital','swarm','gravity','fuel','moonbase'));
