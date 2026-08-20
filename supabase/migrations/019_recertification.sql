-- Migration 019: Recertification Tracking (Layer 2)
-- Adds recertification date to tenant profiles and a log table for sent alerts

-- 1. Add recertification fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS recertification_date    date,
  ADD COLUMN IF NOT EXISTS recert_alert_opt_in     boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ha_name                 text;   -- e.g. 'AHA', 'DCA', 'Other'

-- 2. Recertification alerts log (prevents duplicate sends)
CREATE TABLE IF NOT EXISTS public.recert_alerts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  days_before   integer NOT NULL,          -- 90, 60, 30, 14, or 7
  sent_at       timestamptz NOT NULL DEFAULT now(),
  email_type    text NOT NULL DEFAULT 'recertification_reminder',
  UNIQUE (tenant_id, days_before, sent_at::date)
);

ALTER TABLE public.recert_alerts ENABLE ROW LEVEL SECURITY;

-- Tenants can read their own alerts
CREATE POLICY "Tenants read own recert alerts"
  ON public.recert_alerts FOR SELECT
  USING (auth.uid() = tenant_id);

-- Service role can insert (used by cron API)
CREATE POLICY "Service role inserts recert alerts"
  ON public.recert_alerts FOR INSERT
  WITH CHECK (true);

-- 3. Index for efficient date-range queries in cron job
CREATE INDEX IF NOT EXISTS idx_profiles_recert_date
  ON public.profiles(recertification_date)
  WHERE recertification_date IS NOT NULL AND recert_alert_opt_in = true;

-- 4. Index on alert log for dedup checks
CREATE INDEX IF NOT EXISTS idx_recert_alerts_lookup
  ON public.recert_alerts(tenant_id, days_before);
