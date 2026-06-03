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

-- ===== part content (compiled from authoritative sources: spacex.com, blueorigin.com,
-- nasa.gov, Wikipedia. Review/edit any of this in Studio → Rocket Explorer.) =====
update public.rocket_parts p set
  what_it_is=$$The rounded cap at the very top of the Starship upper stage. It streamlines the front of the vehicle and forms the top of the payload bay.$$,
  how_it_works=$$Its tapered shape cuts aerodynamic drag and protects the payload during ascent. The two forward flaps mount on this section, and on cargo versions a hatch near the nose opens to deploy satellites.$$,
  specs=$$[["Vehicle diameter","9 m"],["Upper-stage height","~52 m (Block 2)"],["Material","Stainless steel"],["Payload volume","~600+ m³"]]$$::jsonb
from public.rockets r where p.rocket_id=r.id and r.slug='starship' and p.mesh_key='nose';

update public.rocket_parts p set
  what_it_is=$$Starship is the upper stage — the reusable spacecraft that carries crew or cargo to orbit and beyond, riding atop the Super Heavy booster at launch.$$,
  how_it_works=$$After the booster separates, the ship's Raptor engines fire to reach orbital speed. To return, it reenters belly-first, performs a "belly-flop", then flips upright and lands vertically on its engines. It is built of stainless steel and burns methane and liquid oxygen.$$,
  specs=$$[["Engines","6 × Raptor (3 SL + 3 vac)"],["Height","~52 m (Block 2)"],["Diameter","9 m"],["Propellant","Methane + LOX"],["Payload to LEO","~35 t (Block 2)"]]$$::jsonb
from public.rockets r where p.rocket_id=r.id and r.slug='starship' and p.mesh_key='ship';

update public.rocket_parts p set
  what_it_is=$$The large movable aerodynamic surfaces on the upper stage — two forward near the nose, two aft near the engines — that steer the ship during reentry.$$,
  how_it_works=$$Falling belly-first, the four flaps move independently like an air brake to control the ship's orientation, much as a skydiver shifts their limbs. They guide it toward the pad and assist the flip just before landing, removing the need for wings.$$,
  specs=$$[["Count","4 (2 fwd + 2 aft)"],["Role","Reentry attitude control"],["Material","Stainless steel"]]$$::jsonb
from public.rockets r where p.rocket_id=r.id and r.slug='starship' and p.mesh_key='flaps';

update public.rocket_parts p set
  what_it_is=$$Super Heavy is the first stage — the giant lower booster that provides the thrust to lift the stack off the pad. It is fully reusable and returns to be caught by the launch tower.$$,
  how_it_works=$$Its 33 Raptor engines burn methane and liquid oxygen to push through the lower atmosphere. After separating it flips around, boosts back, and steers with grid fins to a tower "chopstick" catch instead of landing on legs.$$,
  specs=$$[["Engines","33 × Raptor"],["Thrust","~73.5 MN (Block 1)"],["Height","~71 m"],["Diameter","9 m"],["Propellant","~3,400 t methalox"]]$$::jsonb
from public.rockets r where p.rocket_id=r.id and r.slug='starship' and p.mesh_key='booster';

update public.rocket_parts p set
  what_it_is=$$The lattice-like steering surfaces near the top of Super Heavy that help guide the booster back to the launch tower.$$,
  how_it_works=$$Made of stainless steel and moved by electric actuators, they tilt to control the booster's orientation as it falls. Their open, waffle-like shape gives aerodynamic control while staying compact; Super Heavy has four and they do not fold flat.$$,
  specs=$$[["Count","4"],["Material","Stainless steel"],["Actuation","Electric"],["Mass each","~3 t"]]$$::jsonb
from public.rockets r where p.rocket_id=r.id and r.slug='starship' and p.mesh_key='grid';

update public.rocket_parts p set
  what_it_is=$$Raptor is the reusable engine that powers both stages, burning liquid methane and liquid oxygen. It comes in a sea-level version and a vacuum version with a larger nozzle.$$,
  how_it_works=$$Raptor uses an efficient full-flow staged-combustion cycle. The booster uses 33 engines; the ship uses 6 (three sea-level, three vacuum). Sea-level engines suit the atmosphere, while vacuum engines have extended nozzles for efficiency in space.$$,
  specs=$$[["On booster","33"],["On ship","6 (3 SL + 3 vac)"],["Cycle","Full-flow staged combustion"],["Propellant","Methane + LOX"]]$$::jsonb
from public.rockets r where p.rocket_id=r.id and r.slug='starship' and p.mesh_key='engines';

update public.rocket_parts p set
  what_it_is=$$The protective nose cone at the top of the rocket. It shelters the satellite from wind, heat, and pressure during the climb through the atmosphere.$$,
  how_it_works=$$A two-piece clamshell shell encloses the payload at launch; once the air is thin enough, the halves split and fall away to expose it. Its wide 7-meter diameter gives large or multiple satellites extra room.$$,
  specs=$$[["Diameter","7 m"],["Type","Two-piece clamshell"],["Benefit","~2× volume of 5 m fairings"]]$$::jsonb
from public.rockets r where p.rocket_id=r.id and r.slug='new-glenn' and p.mesh_key='fairing';

update public.rocket_parts p set
  what_it_is=$$The upper stage that sits above the booster and carries the payload the rest of the way to orbit. It is expendable and keeps burning after the first stage separates.$$,
  how_it_works=$$Once the booster separates, the second stage's BE-3U engines ignite in vacuum to accelerate the payload to orbital speed, burning high-efficiency liquid hydrogen and oxygen before releasing the payload into its target orbit.$$,
  specs=$$[["Engines","2 × BE-3U"],["Propellant","Liquid hydrogen + LOX"],["Height","~23 m"],["Vacuum Isp","~445 s"]]$$::jsonb
from public.rockets r where p.rocket_id=r.id and r.slug='new-glenn' and p.mesh_key='stage2';

update public.rocket_parts p set
  what_it_is=$$The large lower stage that lifts the rocket off the pad. It is reusable, flying back to land on a ship at sea for refurbishment and reflight.$$,
  how_it_works=$$At liftoff its seven BE-4 engines burn methane and oxygen to push the rocket up. After its propellant is spent it separates, reorients, and uses its engines and aerodynamic surfaces to land vertically on an ocean platform.$$,
  specs=$$[["Engines","7 × BE-4"],["Diameter","7 m"],["Height","~58 m"],["Propellant","Methane + LOX"],["Reuse target","25+ flights"]]$$::jsonb
from public.rockets r where p.rocket_id=r.id and r.slug='new-glenn' and p.mesh_key='booster';

update public.rocket_parts p set
  what_it_is=$$Two large fixed wing-like fins on the lower first stage. Unlike the rocket's movable fins they do not move, but they add stability and steering on the way back from space.$$,
  how_it_works=$$As the booster descends, the strakes generate aerodynamic lift and stability — like fins on an aircraft — giving more cross-range control to reach the landing ship. They work alongside four movable fins higher up that actively adjust attitude.$$,
  specs=$$[["Count","2 (fixed)"],["Role","Descent lift + stability"],["Paired with","4 movable fins"]]$$::jsonb
from public.rockets r where p.rocket_id=r.id and r.slug='new-glenn' and p.mesh_key='strakes';

update public.rocket_parts p set
  what_it_is=$$The BE-4 is Blue Origin's large first-stage engine; seven of them provide the thrust to lift New Glenn off the ground.$$,
  how_it_works=$$Each BE-4 burns methane and liquid oxygen in an efficient oxygen-rich staged-combustion cycle and throttles deeply to control the booster's landing. The second stage uses a different engine, the BE-3U, optimized for vacuum on hydrogen and oxygen.$$,
  specs=$$[["First stage","7 × BE-4"],["Cycle","Oxygen-rich staged combustion"],["Propellant","Methane + LOX"],["Second stage","2 × BE-3U (LH2/LOX)"]]$$::jsonb
from public.rockets r where p.rocket_id=r.id and r.slug='new-glenn' and p.mesh_key='engines';

update public.rocket_parts p set
  what_it_is=$$Orion is the spacecraft on top of the rocket that carries the astronauts — a crew module where they live and work, plus a European Service Module that supplies power, air, water, and propulsion.$$,
  how_it_works=$$The pressurized crew module protects astronauts during launch, deep space, and reentry, where its heat shield absorbs the heat before parachutes lower it to a splashdown. The ESA-built service module provides in-space propulsion and power via four solar array wings, and a launch abort system can pull the capsule clear in an emergency.$$,
  specs=$$[["Crew","Up to 4"],["Mission","Up to 21 days"],["Module diameter","~5 m"],["Service module","ESA / Airbus"],["Solar wings","4"]]$$::jsonb
from public.rockets r where p.rocket_id=r.id and r.slug='sls' and p.mesh_key='orion';

update public.rocket_parts p set
  what_it_is=$$The Interim Cryogenic Propulsion Stage is the upper stage on SLS Block 1. After the boosters and core drop away, it gives Orion the push to leave Earth orbit toward the Moon.$$,
  how_it_works=$$A single RL10 engine burning liquid hydrogen and oxygen performs the translunar injection burn that sends Orion to the Moon. It is adapted from ULA's Delta Cryogenic Second Stage with a stretched hydrogen tank and restart capability; on Artemis I it fired for about 18 minutes.$$,
  specs=$$[["Engine","1 × RL10"],["Thrust","24,750 lbf"],["Propellant","LH2 / LOX"],["Height","~13.7 m"]]$$::jsonb
from public.rockets r where p.rocket_id=r.id and r.slug='sls' and p.mesh_key='icps';

update public.rocket_parts p set
  what_it_is=$$The large orange central stage that forms the backbone of SLS. It holds the main propellant and carries the four RS-25 engines at its base.$$,
  how_it_works=$$It stores super-cold liquid hydrogen and oxygen in two giant tanks and feeds the four RS-25 engines, which fire together for about eight minutes during ascent. It is built by Boeing at NASA's Michoud facility using friction stir welding.$$,
  specs=$$[["Height","212+ ft (~65 m)"],["Diameter","8.4 m (27.6 ft)"],["Engines","4 × RS-25"],["Burn time","~8 min"],["Propellant","LH2 / LOX"]]$$::jsonb
from public.rockets r where p.rocket_id=r.id and r.slug='sls' and p.mesh_key='core';

update public.rocket_parts p set
  what_it_is=$$The two white boosters strapped to the core — the largest, most powerful solid-propellant boosters ever flown — providing most of the thrust at liftoff.$$,
  how_it_works=$$Each is packed with rubbery solid propellant that burns from the inside out and cannot be shut off, consuming about six tons per second. Together they supply over 75% of liftoff thrust, burn for about two minutes, then separate and fall away.$$,
  specs=$$[["Count","2 (5-segment)"],["Thrust each","3.6M lbf"],["Burn time","~126 s"],["Share at liftoff",">75%"]]$$::jsonb
from public.rockets r where p.rocket_id=r.id and r.slug='sls' and p.mesh_key='srb';

update public.rocket_parts p set
  what_it_is=$$The four engines clustered at the base of the core stage — the same engine type, upgraded, that powered the Space Shuttle for over three decades.$$,
  how_it_works=$$Each RS-25 burns liquid hydrogen and oxygen, using high-speed turbopumps to feed the combustion chamber. The four run together for about eight minutes, producing over two million pounds of thrust combined, and run hotter than on the Shuttle (109–111% power).$$,
  specs=$$[["Quantity","4 (core)"],["Combined thrust",">2M lbf (vac)"],["Propellant","LH2 / LOX"],["Power level","109–111%"],["Heritage","Shuttle main engine"]]$$::jsonb
from public.rockets r where p.rocket_id=r.id and r.slug='sls' and p.mesh_key='rs25';
