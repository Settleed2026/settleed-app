-- Migration 026: Maintenance request pre-approval flow
-- Adds cost estimate + pre-approval status to maintenance_requests.
-- Run in Supabase SQL editor.

ALTER TABLE maintenance_requests
  ADD COLUMN IF NOT EXISTS cost_estimate       numeric(10,2),
  ADD COLUMN IF NOT EXISTS estimate_note       text,
  ADD COLUMN IF NOT EXISTS pre_approval_status text NOT NULL DEFAULT 'none'
    CHECK (pre_approval_status IN ('none', 'pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS pre_approval_responded_at timestamptz;

-- Index so landlord UI can quickly find requests awaiting approval
CREATE INDEX IF NOT EXISTS idx_maintenance_preapproval
  ON maintenance_requests (landlord_id, pre_approval_status)
  WHERE pre_approval_status = 'pending';

-- RLS: existing policies cover landlord_id / tenant_id access, no new policies needed
-- because we're only adding columns to existing table with existing RLS.
