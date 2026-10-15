-- Migration 027: User suspension flag
-- Adds suspended_at to profiles so the admin UI can reflect suspension state.
-- The actual auth ban is set via Supabase Admin API in api/admin-user-action.js.
-- Run in Supabase SQL editor.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz DEFAULT NULL;

-- Index so admin queries for suspended users are fast
CREATE INDEX IF NOT EXISTS idx_profiles_suspended
  ON profiles (suspended_at)
  WHERE suspended_at IS NOT NULL;
