-- Daily bonus & match signals (Postgres flavor)
alter table public.profiles add column if not exists last_daily_claim timestamptz;
alter table public.profiles add column if not exists daily_streak int default 0;

create table if not exists public.match_signals (
  id bigint generated always as identity primary key,
  match_id uuid references public.matches(id) on delete cascade,
  signals jsonb not null,
  created_at timestamptz default now()
);

create index if not exists idx_match_signals_match on public.match_signals(match_id);
