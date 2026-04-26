-- ApexTuner — initial schema
-- Tables: profiles, cars, tracks, tunes, tune_votes
-- Includes: RLS policies and an upvote_count trigger on tune_votes.

set check_function_bodies = off;

-- =============================================================
-- Enums
-- =============================================================
create type public.drivetrain_kind as enum ('FF', 'FR', 'MR', 'RR', '4WD');

create type public.car_category as enum (
  'N100', 'N200', 'N300', 'N400', 'N500', 'N600', 'N700', 'N800', 'N900', 'N1000',
  'Gr.4', 'Gr.3', 'Gr.2', 'Gr.1', 'Gr.B', 'Gr.X'
);

-- =============================================================
-- profiles (extends auth.users)
-- =============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 32),
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_username_idx on public.profiles (lower(username));

-- =============================================================
-- cars
-- =============================================================
create table public.cars (
  id uuid primary key default gen_random_uuid(),
  make text not null,
  model text not null,
  year integer not null check (year between 1900 and 2100),
  drivetrain public.drivetrain_kind not null,
  category public.car_category not null,
  created_at timestamptz not null default now(),
  unique (make, model, year)
);

create index cars_make_model_idx on public.cars (make, model);
create index cars_category_idx on public.cars (category);

-- =============================================================
-- tracks
-- =============================================================
create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  layout text not null,
  country text,
  created_at timestamptz not null default now(),
  unique (name, layout)
);

create index tracks_name_idx on public.tracks (name);

-- =============================================================
-- tunes
-- =============================================================
create table public.tunes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  car_id uuid not null references public.cars(id) on delete restrict,
  track_id uuid references public.tracks(id) on delete set null,
  title text not null check (char_length(title) between 3 and 120),
  description text,
  setup jsonb not null default '{}'::jsonb,
  lap_time_ms integer check (lap_time_ms is null or lap_time_ms > 0),
  upvote_count integer not null default 0,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tunes_author_idx on public.tunes (author_id);
create index tunes_car_idx on public.tunes (car_id);
create index tunes_track_idx on public.tunes (track_id);
create index tunes_lap_time_idx on public.tunes (lap_time_ms) where lap_time_ms is not null;
create index tunes_upvotes_idx on public.tunes (upvote_count desc);
create index tunes_setup_gin on public.tunes using gin (setup jsonb_path_ops);

-- =============================================================
-- tune_votes (composite key)
-- =============================================================
create table public.tune_votes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  tune_id uuid not null references public.tunes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, tune_id)
);

create index tune_votes_tune_idx on public.tune_votes (tune_id);

-- =============================================================
-- Trigger: keep tunes.upvote_count in sync with tune_votes
-- =============================================================
create or replace function public.tune_votes_sync_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.tunes
       set upvote_count = upvote_count + 1
     where id = new.tune_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.tunes
       set upvote_count = greatest(upvote_count - 1, 0)
     where id = old.tune_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger tune_votes_after_insert
  after insert on public.tune_votes
  for each row execute function public.tune_votes_sync_count();

create trigger tune_votes_after_delete
  after delete on public.tune_votes
  for each row execute function public.tune_votes_sync_count();

-- =============================================================
-- Trigger: maintain updated_at on profiles and tunes
-- =============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger tunes_set_updated_at
  before update on public.tunes
  for each row execute function public.set_updated_at();

-- =============================================================
-- Trigger: auto-create profile when an auth user is created
-- =============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'username',
      'driver_' || substr(new.id::text, 1, 8)
    ),
    coalesce(new.raw_user_meta_data->>'display_name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================
-- Row-Level Security
-- =============================================================
alter table public.profiles enable row level security;
alter table public.cars enable row level security;
alter table public.tracks enable row level security;
alter table public.tunes enable row level security;
alter table public.tune_votes enable row level security;

-- profiles
create policy "profiles_select_all"
  on public.profiles for select
  using (true);

create policy "profiles_insert_self"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_self"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- cars (read open; writes restricted to authenticated for now)
create policy "cars_select_all"
  on public.cars for select
  using (true);

create policy "cars_insert_authenticated"
  on public.cars for insert
  to authenticated
  with check (true);

-- tracks (read open; writes restricted to authenticated)
create policy "tracks_select_all"
  on public.tracks for select
  using (true);

create policy "tracks_insert_authenticated"
  on public.tracks for insert
  to authenticated
  with check (true);

-- tunes
create policy "tunes_select_public_or_author"
  on public.tunes for select
  using (is_public or auth.uid() = author_id);

create policy "tunes_insert_author"
  on public.tunes for insert
  to authenticated
  with check (auth.uid() = author_id);

create policy "tunes_update_author"
  on public.tunes for update
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "tunes_delete_author"
  on public.tunes for delete
  to authenticated
  using (auth.uid() = author_id);

-- tune_votes
create policy "tune_votes_select_all"
  on public.tune_votes for select
  using (true);

create policy "tune_votes_insert_self"
  on public.tune_votes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "tune_votes_delete_self"
  on public.tune_votes for delete
  to authenticated
  using (auth.uid() = user_id);
