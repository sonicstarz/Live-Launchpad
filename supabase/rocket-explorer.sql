-- Live Launchpad — Interactive 3D Rocket Explorer
-- Run ONCE in the Supabase SQL Editor (after content.sql). Safe to re-run.
-- Public can READ; only EDITORS (is_editor()) can write. Joins to the existing `videos` table.

-- ===== tables =====
create table if not exists public.rockets (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  operator      text default '',
  subtitle      text default '',
  height_m      numeric,
  model_url     text,
  model_kind    text not null default 'procedural' check (model_kind in ('procedural','glb')),
  display_order int  not null default 0,
  published     boolean not null default true,
  created_at    timestamptz not null default now()
);

create table if not exists public.rocket_parts (
  id            uuid primary key default gen_random_uuid(),
  rocket_id     uuid not null references public.rockets(id) on delete cascade,
  mesh_key      text not null,                 -- MUST match the named mesh in the model
  part_number   text default '',
  name          text not null,
  what_it_is    text default '',               -- human-authored (zero-AI policy)
  how_it_works  text default '',               -- human-authored
  specs         jsonb not null default '[]'::jsonb,  -- array of [label, value] pairs
  display_order int  not null default 0
);

create table if not exists public.part_videos (
  id            uuid primary key default gen_random_uuid(),
  part_id       uuid not null references public.rocket_parts(id) on delete cascade,
  video_id      uuid not null references public.videos(id) on delete cascade,
  display_order int  not null default 0,
  unique (part_id, video_id)
);

create index if not exists rocket_parts_rocket_idx on public.rocket_parts(rocket_id, display_order);
create index if not exists part_videos_part_idx     on public.part_videos(part_id, display_order);

-- ===== RLS: public read, editor write =====
alter table public.rockets      enable row level security;
alter table public.rocket_parts enable row level security;
alter table public.part_videos  enable row level security;

drop policy if exists "read rockets" on public.rockets;
create policy "read rockets" on public.rockets for select using (true);
drop policy if exists "edit rockets" on public.rockets;
create policy "edit rockets" on public.rockets for all to authenticated using (public.is_editor()) with check (public.is_editor());

drop policy if exists "read rocket_parts" on public.rocket_parts;
create policy "read rocket_parts" on public.rocket_parts for select using (true);
drop policy if exists "edit rocket_parts" on public.rocket_parts;
create policy "edit rocket_parts" on public.rocket_parts for all to authenticated using (public.is_editor()) with check (public.is_editor());

drop policy if exists "read part_videos" on public.part_videos;
create policy "read part_videos" on public.part_videos for select using (true);
drop policy if exists "edit part_videos" on public.part_videos;
create policy "edit part_videos" on public.part_videos for all to authenticated using (public.is_editor()) with check (public.is_editor());

-- ===== structural seed (real part names + mesh keys only; descriptions left blank for human authoring) =====
insert into public.rockets (slug,name,operator,subtitle,height_m,display_order) values
  ('starship','Starship','SpaceX','SpaceX · ~121 m',121,0),
  ('new-glenn','New Glenn','Blue Origin','Blue Origin · ~98 m',98,1),
  ('sls','SLS Block 1','NASA','NASA · ~98 m',98,2)
on conflict (slug) do nothing;

insert into public.rocket_parts (rocket_id, mesh_key, part_number, name, display_order)
select r.id, v.mesh_key, v.part_number, v.name, v.ord
from public.rockets r
join (values
  ('starship','nose','01','Nosecone',0),
  ('starship','ship','02','Ship (Upper Stage)',1),
  ('starship','flaps','03','Forward & Aft Flaps',2),
  ('starship','booster','04','Super Heavy Booster',3),
  ('starship','grid','05','Grid Fins',4),
  ('starship','engines','06','Raptor Engines',5),
  ('new-glenn','fairing','01','Payload Fairing',0),
  ('new-glenn','stage2','02','Second Stage',1),
  ('new-glenn','booster','03','First Stage Booster',2),
  ('new-glenn','strakes','04','Strakes',3),
  ('new-glenn','engines','05','BE-4 Engines',4),
  ('sls','orion','01','Orion Spacecraft',0),
  ('sls','icps','02','Interim Cryogenic Propulsion Stage',1),
  ('sls','core','03','Core Stage',2),
  ('sls','srb','04','Solid Rocket Boosters',3),
  ('sls','rs25','05','RS-25 Engines',4)
) as v(slug,mesh_key,part_number,name,ord) on r.slug=v.slug
where not exists (select 1 from public.rocket_parts p where p.rocket_id=r.id and p.mesh_key=v.mesh_key);
