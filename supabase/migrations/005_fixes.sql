-- 005_fixes.sql
-- Fixes schema mismatch, adds is_test flag, and ensures RLS grants are correct

-- 1. Add contact_preferences to profiles
-- Migration 003 added this column to properties; 004 incorrectly noted it existed
-- on profiles. Adding it now so the wizard buildFullPayload() can write it.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS contact_preferences text[] DEFAULT '{"email"}';

-- 2. Add is_test flag to properties
-- Marks seed / demo listings so they can be bulk-deleted before go-live.
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS is_test boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_properties_is_test ON properties(is_test);

-- 3. Ensure anon + authenticated roles can SELECT active properties
-- The policy "Public view active properties" exists but PostgREST may return 403
-- if the base table GRANT is missing. These are idempotent.
GRANT SELECT ON TABLE public.properties TO anon;
GRANT SELECT ON TABLE public.properties TO authenticated;

-- Tenants also need to read profiles for the dashboard voucher badge
GRANT SELECT ON TABLE public.profiles TO authenticated;
