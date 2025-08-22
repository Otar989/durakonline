-- Postgres RLS policy script (COMMENTED to silence non-Postgres SQL linters in editor).
-- Скопируй/выполни блок ниже в Supabase SQL Editor (Postgres). В этом файле оставлено в комментариях,
-- чтобы расширения / анализаторы для MySQL/MSSQL не подсвечивали ошибки синтаксиса.

/*
-- 1. Enable RLS
ALTER TABLE public.raw_games ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policy (idempotent)
DROP POLICY IF EXISTS "Allow authenticated read raw_games" ON public.raw_games;

-- 3. Read-only policy for authenticated users
CREATE POLICY "Allow authenticated read raw_games" ON public.raw_games
	FOR SELECT
	TO authenticated
	USING (true);

-- 4. (Optional) Explicitly revoke anon direct SELECT
REVOKE SELECT ON public.raw_games FROM anon;

-- 5. No INSERT/UPDATE/DELETE policies ==> only service role (bypass RLS) can write
-- If later needed:
-- CREATE POLICY "auth insert raw_games" ON public.raw_games FOR INSERT TO authenticated WITH CHECK (true);

-- Optional public aggregated view:
-- CREATE OR REPLACE VIEW public.game_stats AS
--   SELECT (summary->>'allow_translation')::bool AS allow_translation,
--          (summary->>'loser') AS loser,
--          (summary->>'ended_at') AS ended_at
--   FROM public.raw_games;
-- ALTER VIEW public.game_stats OWNER TO postgres;
-- DROP POLICY IF EXISTS "anon read game_stats" ON public.game_stats;
-- CREATE POLICY "anon read game_stats" ON public.game_stats FOR SELECT TO anon USING (true);
*/

-- Подробности см. также файл raw_games_policies.postgres.sql (чистый исполняемый вариант).
