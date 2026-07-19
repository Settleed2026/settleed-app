-- Migration 009: Add stripe_subscription_id to profiles
-- Allows the app to look up, cancel, or check subscription status
-- without needing to search by customer across all Stripe subscriptions.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
