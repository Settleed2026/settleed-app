-- ============================================================
-- Migration 010: Lease Activation
-- Adds active lease/property/landlord refs to profiles
-- Adds GRANTs for new tables from migration 002
-- ============================================================

-- Add active lease columns to profiles
-- These are set when a landlord activates a lease for the tenant
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS landlord_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS active_lease_id uuid REFERENCES public.leases(id) ON DELETE SET NULL;

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_profiles_property ON public.profiles(property_id);
CREATE INDEX IF NOT EXISTS idx_profiles_landlord ON public.profiles(landlord_id);

-- Grant authenticated users access to the tables created in migration 002
GRANT SELECT, INSERT ON public.maintenance_requests TO authenticated;
GRANT SELECT ON public.maintenance_requests TO anon;

GRANT SELECT, INSERT ON public.rent_payments TO authenticated;

GRANT SELECT, INSERT ON public.background_checks TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.leases TO authenticated;

-- Allow tenants to update their own profile (to store active lease refs)
-- Policy already exists from 001 but adding explicit update grant
GRANT UPDATE ON public.profiles TO authenticated;

-- Allow landlord to update tenant profiles when activating a lease
-- (done via service role in the API, so no additional RLS needed)
