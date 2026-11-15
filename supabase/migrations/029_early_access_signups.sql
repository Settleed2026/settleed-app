-- Migration 029: Early Access waiting list signups
-- Captures landlord and tenant signups from /early-access page

CREATE TABLE IF NOT EXISTS early_access_signups (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  role          text NOT NULL CHECK (role IN ('landlord', 'tenant')),
  name          text NOT NULL,
  email         text NOT NULL,
  zip           text,
  voucher_size  text,   -- tenant only: bedroom size (0,1,2,3,4,5+)
  unit_count    int,    -- landlord only: how many units they own (future)
  contacted_at  timestamptz,
  notes         text,
  UNIQUE (email, role)
);

-- Admin can read/write all; anon can insert only
ALTER TABLE early_access_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all" ON early_access_signups
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  );

CREATE POLICY "public_insert" ON early_access_signups
  FOR INSERT
  WITH CHECK (true);
