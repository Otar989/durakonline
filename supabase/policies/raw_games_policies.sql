-- RLS setup for table public.raw_games
-- Run this in Supabase SQL editor (Postgres). Adjust naming if schema differs.

-- 1. Enable RLS (idempotent: re-execution is safe)
ALTER TABLE public.raw_games ENABLE ROW LEVEL SECURITY;

-- 2. Drop old policy if changed (optional)
DROP POLICY IF EXISTS "Allow authenticated read raw_games" ON public.raw_games;

-- 3. Read-only policy for authenticated users
CREATE POLICY "Allow authenticated read raw_games" ON public.raw_games
FOR SELECT
TO authenticated
USING (true);

-- 4. Deny anon explicit (anon otherwise has no policy) – optional
REVOKE SELECT ON public.raw_games FROM anon;

-- 5. DO NOT create INSERT/UPDATE/DELETE policies so only service role (bypasses RLS) can write
-- If later needed:
-- CREATE POLICY "auth insert raw_games" ON public.raw_games FOR INSERT TO authenticated WITH CHECK (true);

-- Optional aggregated safe view for public display (uncomment if you want anon stats):
-- CREATE OR REPLACE VIEW public.game_stats AS
--   SELECT (summary->>'allow_translation')::bool AS allow_translation,
--          (summary->>'loser') AS loser,
--          (summary->>'ended_at') AS ended_at
--   FROM public.raw_games;
-- ALTER VIEW public.game_stats OWNER TO postgres;
-- DROP POLICY IF EXISTS "anon read game_stats" ON public.game_stats;
-- CREATE POLICY "anon read game_stats" ON public.game_stats FOR SELECT TO anon USING (true);
