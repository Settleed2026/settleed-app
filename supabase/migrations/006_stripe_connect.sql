-- Migration 006: Stripe Connect columns for landlord payouts

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS connect_onboarding_status TEXT NOT NULL DEFAULT 'not_started';

-- Index for webhook lookups by stripe_account_id
CREATE INDEX IF NOT EXISTS profiles_stripe_account_id_idx ON profiles (stripe_account_id);

-- RLS: users can read their own connect status
-- (existing RLS policies on profiles already cover this via auth.uid() = id)
