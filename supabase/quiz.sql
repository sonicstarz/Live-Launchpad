-- Live Launchpad — Live Quiz ("Go/No-Go"). Run ONCE in the Supabase SQL editor.
-- Quizzes + questions are EDITOR-ONLY (read & write): the host loads them with an
-- authenticated editor session; student phones never read the DB (gameplay is over
-- Supabase Realtime broadcast), so the correct answer is never exposed to players.

create table if not exists public.quizzes (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text not null default '',
  published   boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.quiz_questions (
  id            uuid primary key default gen_random_uuid(),
  quiz_id       uuid not null references public.quizzes(id) on delete cascade,
  prompt        text not null,
  choices       jsonb not null default '[]'::jsonb,   -- array of up to 4 strings
  correct_index int  not null default 0,
  time_limit_s  int  not null default 20,
  points        int  not null default 1000,
  source_url    text not null default '',             -- real source (content policy)
  sort_order    int  not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists quiz_questions_quiz_idx on public.quiz_questions(quiz_id, sort_order);

alter table public.quizzes        enable row level security;
alter table public.quiz_questions enable row level security;

-- EDITOR-ONLY read + write (no anon/public read — that would leak correct answers).
drop policy if exists "editor quizzes" on public.quizzes;
create policy "editor quizzes" on public.quizzes
  for all to authenticated using (public.is_editor()) with check (public.is_editor());

drop policy if exists "editor quiz_questions" on public.quiz_questions;
create policy "editor quiz_questions" on public.quiz_questions
  for all to authenticated using (public.is_editor()) with check (public.is_editor());
