-- Progression: experience for leveling
alter table public.profiles add column if not exists experience bigint default 0;
-- level уже существует; будем пересчитывать по формуле: level = floor(experience/1000)+1