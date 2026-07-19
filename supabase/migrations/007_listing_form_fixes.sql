-- 007_listing_form_fixes.sql
-- Fixes three bugs that prevented the listing form from saving drafts or publishing.

-- ── 1. Add missing accessibility column ──────────────────────────────────────
-- The listing form (step 5) collects accessibility features but this column
-- was never added to the schema. Its absence caused ALL saves to fail with
-- "column accessibility does not exist".
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS accessibility text[] DEFAULT '{}';

-- ── 2. Fix status check constraint to allow draft and deleted ────────────────
-- The original constraint only allowed ('active','inactive','rented').
-- handleSaveDraft() calls save('draft') which violated the constraint.
ALTER TABLE properties
  DROP CONSTRAINT IF EXISTS properties_status_check;

ALTER TABLE properties
  ADD CONSTRAINT properties_status_check
  CHECK (status IN ('draft', 'active', 'inactive', 'rented', 'deleted'));

-- ── 3. Make required fields nullable for draft support ───────────────────────
-- bedrooms, bathrooms, rent_amount are NOT NULL, but a landlord saving a draft
-- on step 1 (Location) hasn't filled those in yet. Allow NULL so drafts can be
-- saved at any point and resumed later.
ALTER TABLE properties
  ALTER COLUMN bedrooms     DROP NOT NULL,
  ALTER COLUMN bathrooms    DROP NOT NULL,
  ALTER COLUMN rent_amount  DROP NOT NULL,
  ALTER COLUMN neighborhood DROP NOT NULL,
  ALTER COLUMN zip_code     DROP NOT NULL;
