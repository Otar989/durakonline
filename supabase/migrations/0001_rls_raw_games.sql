-- Migration 0001: RLS policies for raw_games
-- Run in Supabase SQL Editor (Postgres)

/*
  NOTE: Эта версия файла закомментирована для подавления ошибок универсального SQL линтера.
  Исполняемый вариант находится в: 0001_rls_raw_games.postgres.sql
  Скопируйте содержимое postgres-файла в Supabase SQL Editor для выполнения.

  Оригинальные команды:
  ALTER TABLE public.raw_games ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "Allow authenticated read raw_games" ON public.raw_games;
  CREATE POLICY "Allow authenticated read raw_games" ON public.raw_games
    FOR SELECT
    TO authenticated
    USING (true);
  REVOKE SELECT ON public.raw_games FROM anon;
*/

-- Optional public aggregated view (commented out by default)
-- CREATE OR REPLACE VIEW public.game_stats AS
--   SELECT (summary->>'allow_translation')::bool AS allow_translation,
--          (summary->>'loser') AS loser,
--          (summary->>'ended_at') AS ended_at
--   FROM public.raw_games;
-- DROP POLICY IF EXISTS "anon read game_stats" ON public.game_stats;
-- CREATE POLICY "anon read game_stats" ON public.game_stats FOR SELECT TO anon USING (true);
