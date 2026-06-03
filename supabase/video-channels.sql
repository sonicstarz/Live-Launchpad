-- Live Launchpad — curated YouTube channels for the News → Videos feed.
-- Run ONCE in the Supabase SQL editor. Safe to re-run. Public READ; editor WRITE.
-- The videos Netlify function reads enabled channels here (falls back to a built-in
-- seed list if this table is empty). Manage channels in Studio → Videos.

create table if not exists public.video_channels (
  id          bigint generated always as identity primary key,
  channel_id  text not null unique,            -- YouTube UC… id
  name        text not null,
  keywords    text not null default '',        -- optional CSV; if set, only matching titles are kept
  enabled     boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.video_channels enable row level security;
drop policy if exists "read video_channels" on public.video_channels;
create policy "read video_channels" on public.video_channels for select using (true);
drop policy if exists "edit video_channels" on public.video_channels;
create policy "edit video_channels" on public.video_channels
  for all to authenticated using (public.is_editor()) with check (public.is_editor());

-- seed the verified curated set (skipped on conflict so re-running is safe)
insert into public.video_channels (channel_id, name, sort_order) values
  ('UCtI0Hodo5o5dUb67FeUjDeA','SpaceX',0),
  ('UCLA_DiR1FfKNvjuUpBHmylQ','NASA',1),
  ('UCryGec9PdUCLjpJW2mgCuLw','NASA JPL',2),
  ('UCIBaDdAbGlFDeS33shmlD0A','ESA',3),
  ('UCVxTHEKKLxNjGcvVaZindlg','Blue Origin',4),
  ('UC6uKrU_WqJ1R2HMTY3LIx5Q','Everyday Astronaut',5),
  ('UCSUu1lih2RifWkKtDOJdsBA','NASASpaceflight',6),
  ('UCoLdERT4-TJ82PJOHSrsZLQ','Spaceflight Now',7),
  ('UCxzC4EngIsMrPmbm6Nxvb-A','Scott Manley',8),
  ('UCBNHHEoiSF8pcLgqLKVugOw','Marcus House',9),
  ('UCczaM73yxttaZRh7ILYHnQg','Eager Space',10),
  ('UCelXvXZDvx8_TdOOffevzGg','Ellie in Space',11),
  ('UClZbmi9JzfnB2CEb0fG8iew','Primal Space',12),
  ('UCeMcDx6-rOq_RlKSPehk2tQ','The Space Race',13),
  ('UC-9b7aDP6ZN0coj9-xFnrtw','Astrum',14),
  ('UCogrSQkBJn1KF0N9I4oM7eQ','Fraser Cain',15)
on conflict (channel_id) do nothing;
