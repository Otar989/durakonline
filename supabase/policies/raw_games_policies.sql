-- Enable RLS on raw_games and add minimal policies
-- Idempotent guards
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='raw_games'
  ) THEN
    RAISE NOTICE 'Table public.raw_games does not exist yet.';
  END IF;
END $$;

ALTER TABLE public.raw_games ENABLE ROW LEVEL SECURITY;

-- Policy: allow authenticated users to read aggregated game summaries
CREATE POLICY "Allow authenticated read raw_games" ON public.raw_games
FOR SELECT USING ( auth.role() = 'authenticated' );

-- (Optional) Prevent anonymous read
REVOKE ALL ON public.raw_games FROM anon;

-- Insert only via service role (we rely on backend with service key) so we deliberately DO NOT create INSERT policy.
-- If later you want to allow clients to insert with logged-in user token, uncomment below and remove service-only usage.
-- CREATE POLICY "Allow authenticated insert raw_games" ON public.raw_games
-- FOR INSERT WITH CHECK ( auth.role() = 'authenticated' );

-- You may also restrict SELECT columns via a view if needed.
