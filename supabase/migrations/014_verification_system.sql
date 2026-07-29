-- ============================================================
-- Migration 014: Landlord & Property Verification System
--
-- Implements trust-and-safety controls per spec:
--   - Landlord verification statuses (unverified → verified)
--   - Property verification statuses (draft → approved)
--   - Admin role with is_admin flag
--   - verification_documents (private bucket)
--   - landlord_reviews (admin queue)
--   - audit_logs
--   - fraud_alerts
--   - listing_reports (tenant reporting)
--   - Updated RLS: only approved properties from verified landlords are public
--   - Triggers preventing self-verification
--   - Seeds existing landlords/properties as verified/approved
-- ============================================================

-- ============================================================
-- 1. ADMIN FLAG on profiles
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- ============================================================
-- 2. LANDLORD VERIFICATION STATUS
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified'
  CHECK (verification_status IN (
    'unverified',
    'identity_pending',
    'property_pending',
    'verified',
    'rejected',
    'suspended'
  ));

-- ============================================================
-- 3. PROPERTY VERIFICATION STATUS
-- Properties get a separate column from the listing lifecycle status.
-- listing status  (active/inactive/rented) = landlord-controlled
-- verification_status (draft/approved/…)   = admin-controlled
-- ============================================================
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'draft'
  CHECK (verification_status IN (
    'draft',
    'verification_pending',
    'approved',
    'rejected',
    'suspended',
    'archived'
  ));

-- ============================================================
-- 4. VERIFICATION DOCUMENTS
-- Stores metadata; actual files go in a private Supabase Storage bucket.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.verification_documents (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  landlord_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id      uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  document_type    text NOT NULL CHECK (document_type IN (
    'government_id',
    'selfie',
    'property_deed',
    'property_tax',
    'mortgage_statement',
    'insurance_declaration',
    'utility_statement',
    'management_agreement',
    'authorization_letter',
    'business_registration',
    'other'
  )),
  storage_path     text NOT NULL,
  file_name        text NOT NULL,
  mime_type        text,
  status           text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected')),
  review_notes     text,
  reviewed_by      uuid REFERENCES public.profiles(id),
  reviewed_at      timestamptz,
  uploaded_at      timestamptz DEFAULT now()
);

ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. LANDLORD REVIEWS (admin queue)
-- One row per review event (identity review, property review).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.landlord_reviews (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  landlord_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id      uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  review_type      text NOT NULL CHECK (review_type IN ('identity', 'property')),
  status           text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'more_info')),
  reviewer_id      uuid REFERENCES public.profiles(id),
  reviewed_at      timestamptz,
  notes            text,
  rejection_reason text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

ALTER TABLE public.landlord_reviews ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER landlord_reviews_updated_at
  BEFORE UPDATE ON public.landlord_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 6. AUDIT LOGS
-- Immutable record of all verification and moderation actions.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    uuid REFERENCES public.profiles(id),
  action      text NOT NULL,
  target_type text NOT NULL,
  target_id   uuid,
  metadata    jsonb,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 7. FRAUD ALERTS
-- Created automatically when blocked content is detected or
-- tenants report suspicious activity.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fraud_alerts (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_type   text NOT NULL,
  severity     text NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  landlord_id  uuid REFERENCES public.profiles(id),
  property_id  uuid REFERENCES public.properties(id),
  details      jsonb,
  status       text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'resolved', 'dismissed')),
  resolved_by  uuid REFERENCES public.profiles(id),
  resolved_at  timestamptz,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.fraud_alerts ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 8. LISTING REPORTS (tenant-submitted)
-- Auto-hides a property after configurable number of credible reports.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.listing_reports (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id  uuid NOT NULL REFERENCES public.profiles(id),
  property_id  uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  landlord_id  uuid REFERENCES public.profiles(id),
  report_type  text NOT NULL CHECK (report_type IN (
    'scam',
    'fake_listing',
    'wrong_info',
    'payment_request',
    'harassment',
    'other'
  )),
  description  text,
  status       text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.listing_reports ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 9. ADMIN HELPER FUNCTION
-- Stable security-definer function — safe to use inside RLS policies.
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- ============================================================
-- 10. UPDATED RLS — PROPERTIES
-- Public may only see properties that are:
--   • listing status = active
--   • verification_status = approved
--   • belonging to a verified landlord
-- ============================================================
DROP POLICY IF EXISTS "Public view active properties" ON public.properties;
CREATE POLICY "Public view active properties"
  ON public.properties FOR SELECT
  USING (
    status = 'active'
    AND verification_status = 'approved'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = landlord_id
        AND verification_status = 'verified'
    )
  );

-- Landlords can see ALL their own properties (any status)
DROP POLICY IF EXISTS "Landlords manage own properties" ON public.properties;

CREATE POLICY "Landlords view own properties"
  ON public.properties FOR SELECT
  USING (auth.uid() = landlord_id);

-- Landlords can insert only drafts (verification_status enforced by trigger)
CREATE POLICY "Landlords insert own properties"
  ON public.properties FOR INSERT
  WITH CHECK (
    auth.uid() = landlord_id
    AND verification_status = 'draft'
  );

-- Landlords can update their own properties — trigger prevents status tampering
CREATE POLICY "Landlords update own properties"
  ON public.properties FOR UPDATE
  USING (auth.uid() = landlord_id);

-- Admins can do everything
CREATE POLICY "Admins manage all properties"
  ON public.properties FOR ALL
  USING (public.is_admin());

-- ============================================================
-- 11. UPDATED RLS — PROFILES
-- ============================================================
-- Admins can read/update any profile
CREATE POLICY "Admins manage all profiles"
  ON public.profiles FOR ALL
  USING (public.is_admin());

-- ============================================================
-- 12. TRIGGER: prevent self-verification on profiles
-- Users cannot change their own verification_status or is_admin.
-- Admins (is_admin() = true) are exempt.
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_profile_self_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- NULL auth.uid() = trusted backend context (SQL editor, migrations, service role)
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF NOT public.is_admin() THEN
    IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
      RAISE EXCEPTION 'Cannot change verification_status directly. Contact Settleed support.';
    END IF;
    IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
      RAISE EXCEPTION 'Cannot change admin status.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_self_verification ON public.profiles;
CREATE TRIGGER profiles_prevent_self_verification
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_self_verification();

-- ============================================================
-- 13. TRIGGER: prevent self-verification on properties
-- Landlords cannot arbitrarily change verification_status EXCEPT for
-- the specific transition: draft → verification_pending (submit for review).
-- All other status changes require admin.
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_property_self_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- NULL auth.uid() = trusted backend context (SQL editor, migrations, service role)
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF NOT public.is_admin() THEN
    IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
      -- Allow landlord to submit their own property for review
      IF OLD.verification_status = 'draft'
         AND NEW.verification_status = 'verification_pending'
         AND auth.uid() = NEW.landlord_id THEN
        RETURN NEW;
      END IF;
      RAISE EXCEPTION 'Cannot change property verification_status directly. Contact Settleed support.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS properties_prevent_self_verification ON public.properties;
CREATE TRIGGER properties_prevent_self_verification
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.prevent_property_self_verification();

-- ============================================================
-- 14. RLS — NEW TABLES
-- ============================================================

-- verification_documents
CREATE POLICY "Landlords view own docs"
  ON public.verification_documents FOR SELECT
  USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords upload docs"
  ON public.verification_documents FOR INSERT
  WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Admins manage verification_documents"
  ON public.verification_documents FOR ALL
  USING (public.is_admin());

-- landlord_reviews
CREATE POLICY "Landlords view own reviews"
  ON public.landlord_reviews FOR SELECT
  USING (auth.uid() = landlord_id);

-- Landlords can submit a review request (insert only their own)
CREATE POLICY "Landlords submit review requests"
  ON public.landlord_reviews FOR INSERT
  WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Admins manage landlord_reviews"
  ON public.landlord_reviews FOR ALL
  USING (public.is_admin());

-- audit_logs (append-only for service_role; admins read)
CREATE POLICY "Admins read audit_logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Service role insert audit_logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- fraud_alerts (admin only)
CREATE POLICY "Admins manage fraud_alerts"
  ON public.fraud_alerts FOR ALL
  USING (public.is_admin());

-- listing_reports
CREATE POLICY "Tenants create reports"
  ON public.listing_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Reporters view own reports"
  ON public.listing_reports FOR SELECT
  USING (auth.uid() = reporter_id);

CREATE POLICY "Admins manage listing_reports"
  ON public.listing_reports FOR ALL
  USING (public.is_admin());

-- ============================================================
-- 15. SEED: mark existing dev landlords + properties as verified
-- All landlords and properties created before this migration
-- are treated as pre-approved (they were dev/test accounts).
-- Real beta users will go through the new flow.
-- ============================================================
UPDATE public.profiles
  SET verification_status = 'verified'
  WHERE role = 'landlord'
    AND verification_status = 'unverified';

UPDATE public.properties
  SET verification_status = 'approved'
  WHERE verification_status = 'draft';

-- ============================================================
-- 16. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status
  ON public.profiles(verification_status);

CREATE INDEX IF NOT EXISTS idx_properties_verification_status
  ON public.properties(verification_status);

CREATE INDEX IF NOT EXISTS idx_landlord_reviews_landlord
  ON public.landlord_reviews(landlord_id);

CREATE INDEX IF NOT EXISTS idx_landlord_reviews_status
  ON public.landlord_reviews(status);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor
  ON public.audit_logs(actor_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_target
  ON public.audit_logs(target_id);

CREATE INDEX IF NOT EXISTS idx_fraud_alerts_landlord
  ON public.fraud_alerts(landlord_id);

CREATE INDEX IF NOT EXISTS idx_listing_reports_property
  ON public.listing_reports(property_id);

-- ============================================================
-- 17. GRANTS
-- ============================================================
GRANT SELECT, INSERT ON public.verification_documents TO authenticated;
GRANT SELECT, INSERT ON public.landlord_reviews       TO authenticated;
GRANT SELECT, INSERT    ON public.listing_reports        TO authenticated;

GRANT ALL ON public.verification_documents TO service_role;
GRANT ALL ON public.landlord_reviews       TO service_role;
GRANT ALL ON public.audit_logs             TO service_role;
GRANT ALL ON public.fraud_alerts           TO service_role;
GRANT ALL ON public.listing_reports        TO service_role;
