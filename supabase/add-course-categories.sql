-- Live Launchpad — add a Category tag to courses (powers the learn-page filter)
-- Run ONCE in the Supabase SQL Editor (after content.sql). Safe to re-run.
-- Categories are free text (e.g. History, Science, Hardware, The Industry, Looking Forward).

alter table public.courses add column if not exists category text;
