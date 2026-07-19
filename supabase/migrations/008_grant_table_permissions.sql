-- 008_grant_table_permissions.sql
-- Fix: authenticated role only had SELECT on properties and profiles.
-- RLS policies alone do not grant table-level access — both must be set.
-- Without these grants, landlords could read but not INSERT or UPDATE listings,
-- and the listing form save failed silently with "permission denied".

GRANT ALL ON TABLE public.properties TO authenticated;
GRANT ALL ON TABLE public.properties TO service_role;

GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;

-- Ensure anon can still read active listings and profiles
GRANT SELECT ON TABLE public.properties TO anon;
GRANT SELECT ON TABLE public.profiles TO anon;
