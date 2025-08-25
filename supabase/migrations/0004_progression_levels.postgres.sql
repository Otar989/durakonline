-- Progression: experience (Postgres flavor)
alter table public.profiles add column if not exists experience bigint default 0;
-- level recalculated externally: level = floor(experience/1000)+1
