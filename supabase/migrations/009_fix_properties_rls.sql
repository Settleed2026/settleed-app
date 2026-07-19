-- Migration 009: Ensure properties RLS and GRANTs are correct
-- Safe to re-run (all statements use IF EXISTS / OR REPLACE)

-- 1. Ensure RLS is enabled on properties
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- 2. Drop and recreate the public view policy cleanly
DROP POLICY IF EXISTS "Public view active properties" ON public.properties;
CREATE POLICY "Public view active properties"
  ON public.properties
  FOR SELECT
  USING (status = 'active');

-- 3. Ensure anon and authenticated roles can SELECT active properties
GRANT SELECT ON TABLE public.properties TO anon;
GRANT SELECT ON TABLE public.properties TO authenticated;
GRANT ALL   ON TABLE public.properties TO authenticated;
GRANT ALL   ON TABLE public.properties TO service_role;

-- 4. Ensure all active test listings have is_test = false so they show in search
UPDATE public.properties
  SET is_test = false
  WHERE status = 'active' AND (is_test IS NULL OR is_test = true);

-- 5. Verify (runs as postgres/superuser, bypasses RLS — just for confirmation)
SELECT id, status, is_test, neighborhood
  FROM public.properties
  WHERE status = 'active'
  ORDER BY created_at DESC;
