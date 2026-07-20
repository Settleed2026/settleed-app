-- ============================================================
-- Migration 013: Grant table permissions to authenticated role
-- Supabase newer projects require explicit GRANT in addition
-- to RLS policies. Without these, authenticated users get
-- "permission denied for table X" even when RLS policies allow.
-- ============================================================

-- Core tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leases            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hqs_inspections   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_criteria    TO authenticated;

-- Feature tables (added in migration 002)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.background_checks    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rent_payments        TO authenticated;

-- Public read for anonymous users (listing search without login)
GRANT SELECT ON public.properties TO anon;
