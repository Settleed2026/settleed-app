-- ============================================================
-- Migration 011: Add missing tenant profile columns
-- Fixes column name mismatches between code and DB schema
-- ============================================================

-- The TenantDashboard voucher modal and other components write:
--   household_size, has_pet, pet_type
-- Migration 004 added has_pets / pet_types / total_household_members
-- (different names). Adding the simple versions the code actually uses.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS household_size int,
  ADD COLUMN IF NOT EXISTS has_pet boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pet_type text;

-- Add updated_at to rent_payments (referenced in some queries)
ALTER TABLE public.rent_payments
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
