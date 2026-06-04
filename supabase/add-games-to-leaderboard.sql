-- Live Launchpad — allow all the newer arcade games on the leaderboard:
-- Gravity Assist, Fuel Transfer, Moon Base Builder, Spin Dock, Minefield,
-- Cargo Stack, Hull Breaker, Asteroids and Stellar 2048.
-- Run ONCE in the Supabase SQL Editor. Safe to re-run.
--
-- Without this, those games' high scores are rejected by the database's
-- game-name check and silently fail to save (the games still play fine).

alter table public.scores drop constraint if exists scores_game_check;
alter table public.scores add  constraint scores_game_check
  check (game in ('snake','flappy','lander','orbital','swarm','gravity','fuel','moonbase','docking',
                  'mines','cargo','breakout','asteroids','fusion'));
