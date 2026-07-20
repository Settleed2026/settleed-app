-- ============================================================
-- Migration 012: Bug fixes
-- 1. Add 'canceling' to subscription_status check constraint
-- 2. Add current_street_address and current_apt_unit to profiles
-- ============================================================

-- 1. Fix subscription_status constraint to include 'canceling'
--    The cancel-subscription API sets status to 'canceling' (cancel_at_period_end)
--    while the subscription is still active until period end.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_status_check
  CHECK (subscription_status IN (
    'inactive', 'trialing', 'active', 'canceling', 'canceled', 'past_due'
  ));

-- 2. Add missing address columns for the tenant ProfileSetup wizard
--    buildFullPayload() writes these but they were missing from migration 004
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_street_address text,
  ADD COLUMN IF NOT EXISTS current_apt_unit       text;
