-- Live Launchpad — accounts + editor role (Supabase Auth)
-- Run ONCE in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Safe to re-run. Run this AFTER schema.sql.

-- One profile row per signed-up user, carrying their role.
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  role       text not null default 'viewer' check (role in ('viewer','editor')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A logged-in user may read their OWN profile. The page gate uses this to learn
-- whether you're an 'editor'. (Nobody can read anyone else's profile.)
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- After you create your account (see runbook), make yourself an editor:
--   update public.profiles set role = 'editor' where email = 'calebarzie@gmail.com';
