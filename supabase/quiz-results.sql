-- Live Launchpad — quiz results history. Run ONCE in the Supabase SQL editor
-- (after quiz.sql). The host writes a row when a game ends; editors read history
-- in Studio → Quizzes. Editor-only.

create table if not exists public.quiz_results (
  id           bigint generated always as identity primary key,
  quiz_id      uuid references public.quizzes(id) on delete set null,
  quiz_title   text not null default '',
  code         text not null default '',
  player_count int  not null default 0,
  scores       jsonb not null default '[]'::jsonb,   -- [{name,score}] desc
  played_at    timestamptz not null default now()
);
create index if not exists quiz_results_quiz_idx on public.quiz_results(quiz_id, played_at desc);

alter table public.quiz_results enable row level security;
drop policy if exists "editor quiz_results" on public.quiz_results;
create policy "editor quiz_results" on public.quiz_results
  for all to authenticated using (public.is_editor()) with check (public.is_editor());
