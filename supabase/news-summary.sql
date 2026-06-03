-- Live Launchpad — daily AI news summary cache
-- Run ONCE in the Supabase SQL Editor. Safe to re-run.
-- The scheduled Netlify function writes here (using the SERVICE ROLE key, which
-- bypasses RLS). The public News page reads the latest row with the anon key.

create table if not exists public.news_summary (
  id            uuid primary key default gen_random_uuid(),
  generated_at  timestamptz not null default now(),
  headline      text not null default '',
  items         jsonb not null default '[]'::jsonb,   -- [{text, source_site, source_url}]
  article_count int  not null default 0
);

alter table public.news_summary enable row level security;

-- Anyone may read the latest summary. (No write policy — writes happen only via
-- the service-role key in the scheduled function, which bypasses RLS.)
drop policy if exists "read news_summary" on public.news_summary;
create policy "read news_summary" on public.news_summary for select using (true);
