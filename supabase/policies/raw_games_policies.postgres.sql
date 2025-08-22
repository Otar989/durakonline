-- Executable Postgres script for Supabase RLS (run this, do NOT commit service keys)

ALTER TABLE public.raw_games ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read raw_games" ON public.raw_games;
CREATE POLICY "Allow authenticated read raw_games" ON public.raw_games
  FOR SELECT
  TO authenticated
  USING (true);
REVOKE SELECT ON public.raw_games FROM anon;

-- Optional view (uncomment if needed)
-- CREATE OR REPLACE VIEW public.game_stats AS
--   SELECT (summary->>'allow_translation')::bool AS allow_translation,
--          (summary->>'loser') AS loser,
--          (summary->>'ended_at') AS ended_at
--   FROM public.raw_games;
-- DROP POLICY IF EXISTS "anon read game_stats" ON public.game_stats;
-- CREATE POLICY "anon read game_stats" ON public.game_stats FOR SELECT TO anon USING (true);
