-- Executable Postgres migration (скопируйте команды ниже в Supabase SQL Editor).
-- Закомментировано для подавления ошибок универсального SQL линтера в редакторе.
/*
ALTER TABLE public.raw_games ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read raw_games" ON public.raw_games;
CREATE POLICY "Allow authenticated read raw_games" ON public.raw_games
  FOR SELECT
  TO authenticated
  USING (true);
REVOKE SELECT ON public.raw_games FROM anon;
*/
