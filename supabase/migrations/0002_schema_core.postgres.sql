-- Core schema for accounts/economy/matches/ratings (Postgres flavor)
-- Duplicate of 0002_schema_core.sql for editors that mis-detect dialects.
-- Safe to re-run (IF NOT EXISTS guards) – idempotent.

create extension if not exists pgcrypto; -- for gen_random_uuid()

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  device_id text unique,
  email text unique,
  created_at timestamptz default now()
);

create table if not exists public.profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  nick text not null default 'Player',
  avatar jsonb default '{}'::jsonb,
  league text not null default 'Silver',
  level int not null default 1,
  rating numeric not null default 1000,
  streak int not null default 0,
  premium_until timestamptz,
  updated_at timestamptz default now()
);

create table if not exists public.wallets (
  user_id uuid primary key references public.users(id) on delete cascade,
  coins bigint not null default 0,
  credits bigint not null default 0,
  updated_at timestamptz default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz default now(),
  finished_at timestamptz,
  mode text not null default 'basic', -- basic|passing|cheat
  deck_size int not null default 36,
  room_id text,
  players jsonb not null, -- [{user_id,nick}]
  result jsonb,           -- {winner, loser, order:[], profit:[], surrender:bool, timeout:bool, leagueChanges:[]}
  state_hash text,
  logs jsonb
);

create table if not exists public.ratings (
  id bigint primary key generated always as identity,
  user_id uuid not null references public.users(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  delta numeric not null,
  k numeric not null,
  profit numeric not null,
  multipliers jsonb not null,
  created_at timestamptz default now()
);

create table if not exists public.inventories (
  user_id uuid not null references public.users(id) on delete cascade,
  sku text not null,
  meta jsonb default '{}'::jsonb,
  primary key(user_id, sku)
);

create table if not exists public.seasons (
  id text primary key,
  started_at timestamptz not null,
  ends_at timestamptz not null
);

create table if not exists public.leaderboards (
  season_id text not null references public.seasons(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  rating numeric not null default 0,
  primary key(season_id, user_id)
);

-- RLS enablement
alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.matches enable row level security;
alter table public.ratings enable row level security;
alter table public.inventories enable row level security;
alter table public.seasons enable row level security;
alter table public.leaderboards enable row level security;

-- Basic policies (service role writes; clients read own / public aggregates)
create policy if not exists "users_self" on public.users for select using (auth.uid() = id);
create policy if not exists "profiles_self" on public.profiles for select using (auth.uid() = user_id);
create policy if not exists "wallets_self" on public.wallets for select using (auth.uid() = user_id);
create policy if not exists "leaderboards_public" on public.leaderboards for select using (true);
create policy if not exists "seasons_public" on public.seasons for select using (true);

-- Useful indexes
create index if not exists idx_ratings_user_created on public.ratings(user_id, created_at desc);
create index if not exists idx_matches_started_at on public.matches(started_at desc);
create index if not exists idx_leaderboards_season_rating on public.leaderboards(season_id, rating desc);

-- updated_at auto-touch triggers (optional)
create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;$$ language plpgsql;

create trigger tg_profiles_updated_at before update on public.profiles
for each row execute procedure touch_updated_at();
create trigger tg_wallets_updated_at before update on public.wallets
for each row execute procedure touch_updated_at();
