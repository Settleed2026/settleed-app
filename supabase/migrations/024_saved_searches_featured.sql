-- Migration 024: Saved searches + featured listings

-- Saved searches
CREATE TABLE IF NOT EXISTS public.saved_searches (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name          text NOT NULL DEFAULT 'My Search',
  filters       jsonb NOT NULL DEFAULT '{}',
  email_alerts  boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_tenant ON public.saved_searches(tenant_id);

ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenants manage own saved searches" ON public.saved_searches;
CREATE POLICY "Tenants manage own saved searches" ON public.saved_searches
  FOR ALL USING (auth.uid() = tenant_id);

-- Featured listings
DO $$ BEGIN
  ALTER TABLE public.properties ADD COLUMN is_featured boolean NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.properties ADD COLUMN featured_until date;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_properties_featured
  ON public.properties(is_featured)
  WHERE is_featured = true;
