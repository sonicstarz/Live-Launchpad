-- Live Launchpad — starter Learning Center courses (real, curated YouTube videos).
-- Run ONCE in the Supabase SQL editor (after content.sql + add-course-categories.sql).
-- Idempotent: re-running won't duplicate. Every video is a real, verified YouTube
-- id pulled from the creator's own educational playlist — edit/curate further in
-- Studio → Learning Center.
--
-- Library: "Spaceflight Fundamentals"
--   • Space History & Stories      — from Scott Manley's "Rocket Science" playlist
--   • SpaceX Engineering Deep Dives — from Primal Space's SpaceX playlist

do $body$
declare lib uuid; c1 uuid; c2 uuid;
begin
  select id into lib from public.libraries where title = 'Spaceflight Fundamentals' limit 1;
  if lib is null then
    insert into public.libraries (title, description, sort_order)
    values ('Spaceflight Fundamentals', 'Curated starter courses — free lessons from trusted space creators on YouTube.', 0)
    returning id into lib;
  end if;

  -- ===== Course 1 =====
  select id into c1 from public.courses where library_id = lib and title = 'Space History & Stories' limit 1;
  if c1 is null then
    insert into public.courses (library_id, title, category, description, sort_order)
    values (lib, 'Space History & Stories', 'History', 'Apollo, Soyuz, satellites and the wild true stories of the Space Age — told by Scott Manley.', 0)
    returning id into c1;
  end if;
  insert into public.videos (course_id, title, youtube_id, sort_order)
  select c1, v.t, v.y, v.o from (values
    ($$The Moon Trees That Flew To The Moon On Apollo 14$$, $$fAAZYYsOxO8$$, 0),
    ($$Soviet Moon Rockets & The Mercury 13$$, $$xE5yXziOUAw$$, 1),
    ($$Soyuz 4 & 5 - Docking, Spacewalks and Nearly Burning Up$$, $$od1i0V57iGs$$, 2),
    ($$What Caused The Explosion That Crippled Apollo 13?$$, $$eO19LTJZM6c$$, 3),
    ($$The Accidental Spacecraft Splashdown Which Almost Killed Its Crew$$, $$m4pD1L7hedA$$, 4),
    ($$How NASA Went From Space Shuttles To SpaceX & Commercial Rockets$$, $$HGICHa1IZKo$$, 5),
    ($$The CIA's Secret Corona Spy Satellite Program$$, $$rLmpXgdgNZM$$, 6),
    ($$A History Of Cameras In Space$$, $$ph_apgmpYY0$$, 7),
    ($$The First Privately Funded Launch Vehicles - Conestoga & Percheron$$, $$AGCFWOVeSS4$$, 8),
    ($$How A Gold Bullet Almost Destroyed A Space Shuttle$$, $$u6rJpDPxYGU$$, 9),
    ($$The Oldest Satellite In Space - Vanguard 1$$, $$xBGkIWGTWkA$$, 10),
    ($$SCORE - The World's First Communications Satellite$$, $$mHHLI7jdXgc$$, 11)
  ) as v(t, y, o)
  where not exists (select 1 from public.videos x where x.course_id = c1 and x.youtube_id = v.y);

  -- ===== Course 2 =====
  select id into c2 from public.courses where library_id = lib and title = 'SpaceX Engineering Deep Dives' limit 1;
  if c2 is null then
    insert into public.courses (library_id, title, category, description, sort_order)
    values (lib, 'SpaceX Engineering Deep Dives', 'Hardware', 'How SpaceX actually designs, builds and tests Starship & Falcon 9 — from Primal Space.', 1)
    returning id into c2;
  end if;
  insert into public.videos (course_id, title, youtube_id, sort_order)
  select c2, v.t, v.y, v.o from (values
    ($$SpaceX's Critical Super Heavy Decision$$, $$pWE2jL6P1Kw$$, 0),
    ($$SpaceX's 80 Year Old Factory$$, $$-fkdMf6WerM$$, 1),
    ($$SpaceX's Genius New Starlink Technique$$, $$JXmqd3Ecm6c$$, 2),
    ($$How SpaceX Mastered Starship's Welding$$, $$CP8Hbr2jL_c$$, 3),
    ($$SpaceX's Abandoned Starship Factory$$, $$9Xc3DDHBoZE$$, 4),
    ($$SpaceX's Falcon 9 Identity Problem$$, $$RsXf7z15w10$$, 5),
    ($$How SpaceX Will Test 29 Raptor Engines$$, $$VlCkW-qdl1o$$, 6),
    ($$Why SpaceX Paused Starlink Launches$$, $$U1Kluw6x7sQ$$, 7),
    ($$SpaceX's Explosive Engine Problem$$, $$ETaQyxhZaKU$$, 8),
    ($$SpaceX's Boca Chica Rule Problem$$, $$xf4-aEhAUnY$$, 9)
  ) as v(t, y, o)
  where not exists (select 1 from public.videos x where x.course_id = c2 and x.youtube_id = v.y);
end $body$;
