-- ApexTuner — reference seed data
-- =================================================================
-- Idempotent: every INSERT below carries its own ON CONFLICT clause,
-- so re-running this file against the same database is safe and will
-- never raise 23505. Each row is its own statement on purpose — if you
-- partial-paste, the missing ON CONFLICT clause is obvious.
--
-- Conflict targets must match a real unique constraint on the table:
--   public.cars   → unique (make, model, year)
--   public.tracks → unique (name, layout)
--
-- `on conflict (name)` on tracks is rejected by Postgres (42P10)
-- unless we add a unique constraint on `name` alone — which would
-- forbid future multi-layout tracks (Nürburgring · Nordschleife vs
-- · GP vs · 24h). If you really want unique-by-name, ask for a
-- migration; until then `(name, layout)` is the correct target.

-- =================================================================
-- Cars: 10 iconic GT7 picks across categories
-- =================================================================
insert into public.cars (make, model, year, drivetrain, category)
values ('Nissan', 'Skyline GT-R V-Spec II Nür (R34)', 2002, '4WD', 'N500')
on conflict (make, model, year) do nothing;

insert into public.cars (make, model, year, drivetrain, category)
values ('Porsche', '911 GT3 RS (991)', 2016, 'RR', 'N700')
on conflict (make, model, year) do nothing;

insert into public.cars (make, model, year, drivetrain, category)
values ('Mazda', '787B', 1991, 'MR', 'Gr.1')
on conflict (make, model, year) do nothing;

insert into public.cars (make, model, year, drivetrain, category)
values ('Toyota', 'GR Supra RZ', 2020, 'FR', 'N500')
on conflict (make, model, year) do nothing;

insert into public.cars (make, model, year, drivetrain, category)
values ('Honda', 'NSX Type R', 1992, 'MR', 'N400')
on conflict (make, model, year) do nothing;

insert into public.cars (make, model, year, drivetrain, category)
values ('Lamborghini', 'Countach 25th Anniversary', 1988, 'MR', 'N500')
on conflict (make, model, year) do nothing;

insert into public.cars (make, model, year, drivetrain, category)
values ('Ferrari', 'F40', 1992, 'MR', 'N600')
on conflict (make, model, year) do nothing;

insert into public.cars (make, model, year, drivetrain, category)
values ('Mercedes-AMG', 'AMG GT3', 2016, 'FR', 'Gr.3')
on conflict (make, model, year) do nothing;

insert into public.cars (make, model, year, drivetrain, category)
values ('Subaru', 'WRX STI Type S', 2014, '4WD', 'N300')
on conflict (make, model, year) do nothing;

insert into public.cars (make, model, year, drivetrain, category)
values ('Chevrolet', 'Corvette ZR1 (C7)', 2019, 'FR', 'N700')
on conflict (make, model, year) do nothing;

-- =================================================================
-- Tracks: 3 marquee circuits
-- =================================================================
insert into public.tracks (name, layout, country)
values ('Nürburgring', 'Nordschleife', 'Germany')
on conflict (name, layout) do nothing;

insert into public.tracks (name, layout, country)
values ('Tsukuba Circuit', 'Full Track', 'Japan')
on conflict (name, layout) do nothing;

insert into public.tracks (name, layout, country)
values ('Circuit de Spa-Francorchamps', 'Full Track', 'Belgium')
on conflict (name, layout) do nothing;

-- =================================================================
-- Sample tunes
-- =================================================================
-- Three realistic GT7 setups, attributed to the oldest profile in the
-- system. If no profile exists yet (you haven't signed in via /login
-- once), this block prints a NOTICE and exits cleanly — re-run the
-- seed after your first sign-in and the tunes will populate.
--
-- Idempotency: each tune is keyed by (author_id, car_id, title); the
-- WHERE NOT EXISTS guard skips re-insert on subsequent runs.
do $$
declare
  v_author_id uuid;
  v_car_id    uuid;
  v_track_id  uuid;
  v_title     text;
begin
  select id
    into v_author_id
    from public.profiles
    order by created_at asc
    limit 1;

  if v_author_id is null then
    raise notice 'ApexTuner seed: no profile found, sample tunes skipped. Sign in via /login then re-run the seed.';
    return;
  end if;

  ---------------------------------------------------------------
  -- Tune 1: Skyline GT-R R34 at Nürburgring Nordschleife
  ---------------------------------------------------------------
  v_title := 'R34 Nür-Spec — endurance pace';
  select id into v_car_id from public.cars
    where make = 'Nissan'
      and model = 'Skyline GT-R V-Spec II Nür (R34)'
      and year = 2002
    limit 1;
  select id into v_track_id from public.tracks
    where name = 'Nürburgring' and layout = 'Nordschleife'
    limit 1;

  if v_car_id is not null and not exists (
    select 1 from public.tunes
     where author_id = v_author_id
       and car_id    = v_car_id
       and title     = v_title
  ) then
    insert into public.tunes
      (author_id, car_id, track_id, title, description, setup, lap_time_ms, is_public)
    values (
      v_author_id, v_car_id, v_track_id, v_title,
      'Comfortable BoP setup for long Nordschleife stints. Soft enough to live through the Karussell, stiff enough through Pflanzgarten. Front toe slightly out for trail braking.',
      $tune$ {
        "tires": { "front": "Sports Hard", "rear": "Sports Hard" },
        "downforce": { "front": 60, "rear": 110 },
        "ride_height_mm": { "front": 90, "rear": 95 },
        "spring_rate_kgf_mm": { "front": 9.4, "rear": 10.8 },
        "compression": { "front": 30, "rear": 32 },
        "extension": { "front": 28, "rear": 30 },
        "anti_roll_bar": { "front": 4, "rear": 5 },
        "camber_deg": { "front": -2.5, "rear": -1.8 },
        "toe_deg": { "front": -0.05, "rear": 0.10 },
        "differential": { "initial": 12, "accel": 28, "decel": 16 },
        "brake_balance": -2,
        "ballast_kg": 0,
        "power_restrictor_pct": 95,
        "transmission": { "final_drive": 3.62 }
      } $tune$::jsonb,
      408235,
      true
    );
  end if;

  ---------------------------------------------------------------
  -- Tune 2: Mazda 787B at Spa-Francorchamps
  ---------------------------------------------------------------
  v_title := '787B — Spa qualifying';
  select id into v_car_id from public.cars
    where make = 'Mazda' and model = '787B' and year = 1991
    limit 1;
  select id into v_track_id from public.tracks
    where name = 'Circuit de Spa-Francorchamps' and layout = 'Full Track'
    limit 1;

  if v_car_id is not null and not exists (
    select 1 from public.tunes
     where author_id = v_author_id
       and car_id    = v_car_id
       and title     = v_title
  ) then
    insert into public.tunes
      (author_id, car_id, track_id, title, description, setup, lap_time_ms, is_public)
    values (
      v_author_id, v_car_id, v_track_id, v_title,
      'Group 1 quali trim. Trail-brake friendly into Les Combes; full-send through Eau Rouge with planted front grip. Fuel map 5 for one-shot pace.',
      $tune$ {
        "tires": { "front": "Racing Soft", "rear": "Racing Soft" },
        "downforce": { "front": 380, "rear": 720 },
        "ride_height_mm": { "front": 60, "rear": 70 },
        "spring_rate_kgf_mm": { "front": 18.5, "rear": 22.0 },
        "compression": { "front": 38, "rear": 42 },
        "extension": { "front": 36, "rear": 40 },
        "anti_roll_bar": { "front": 6, "rear": 8 },
        "camber_deg": { "front": -3.4, "rear": -2.6 },
        "toe_deg": { "front": -0.08, "rear": 0.16 },
        "differential": { "initial": 22, "accel": 38, "decel": 22 },
        "brake_balance": -3,
        "ballast_kg": 0,
        "power_restrictor_pct": 100,
        "fuel_map": 5,
        "transmission": { "final_drive": 3.10, "max_speed_kph": 360 }
      } $tune$::jsonb,
      114812,
      true
    );
  end if;

  ---------------------------------------------------------------
  -- Tune 3: Honda NSX Type R at Tsukuba
  ---------------------------------------------------------------
  v_title := 'NSX-R momentum — Tsukuba';
  select id into v_car_id from public.cars
    where make = 'Honda' and model = 'NSX Type R' and year = 1992
    limit 1;
  select id into v_track_id from public.tracks
    where name = 'Tsukuba Circuit' and layout = 'Full Track'
    limit 1;

  if v_car_id is not null and not exists (
    select 1 from public.tunes
     where author_id = v_author_id
       and car_id    = v_car_id
       and title     = v_title
  ) then
    insert into public.tunes
      (author_id, car_id, track_id, title, description, setup, lap_time_ms, is_public)
    values (
      v_author_id, v_car_id, v_track_id, v_title,
      'Light, rev-happy N400 build. Pointy front end on turn-in, planted exit through final corner. Run third gear flat through the dunlop bridge.',
      $tune$ {
        "tires": { "front": "Sports Soft", "rear": "Sports Soft" },
        "downforce": { "front": 30, "rear": 60 },
        "ride_height_mm": { "front": 72, "rear": 75 },
        "spring_rate_kgf_mm": { "front": 8.2, "rear": 9.1 },
        "compression": { "front": 26, "rear": 28 },
        "extension": { "front": 24, "rear": 26 },
        "anti_roll_bar": { "front": 3, "rear": 4 },
        "camber_deg": { "front": -2.8, "rear": -2.0 },
        "toe_deg": { "front": -0.12, "rear": 0.08 },
        "differential": { "initial": 10, "accel": 24, "decel": 14 },
        "brake_balance": 0,
        "ballast_kg": 0,
        "power_restrictor_pct": 100,
        "transmission": { "final_drive": 4.40 }
      } $tune$::jsonb,
      61847,
      true
    );
  end if;

  raise notice 'ApexTuner seed: complete.';
end $$;
