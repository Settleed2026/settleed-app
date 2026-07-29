-- ============================================================
-- Migration 015: Lease Documents & Click-to-Sign
--
-- Adds:
--   - lease_type (digital | uploaded)
--   - Supabase Storage bucket for uploaded PDFs
--   - Full GA residential lease template fields
--   - Click-to-sign columns for landlord + tenant
--   - pending_tenant_signature status
--   - Tenant UPDATE policy for signing
-- ============================================================

-- 1. Add document & signature columns to leases
ALTER TABLE public.leases
  ADD COLUMN IF NOT EXISTS lease_type text NOT NULL DEFAULT 'digital'
    CHECK (lease_type IN ('digital', 'uploaded')),
  ADD COLUMN IF NOT EXISTS document_path text,
  ADD COLUMN IF NOT EXISTS document_url  text,

  -- Georgia lease template fields
  ADD COLUMN IF NOT EXISTS security_deposit     numeric(10,2),
  ADD COLUMN IF NOT EXISTS late_fee_amount      numeric(10,2),
  ADD COLUMN IF NOT EXISTS late_fee_grace_days  integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS utilities_included   text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pets_allowed         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pet_deposit          numeric(10,2),
  ADD COLUMN IF NOT EXISTS parking_included     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parking_spaces       integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS additional_terms     text,
  ADD COLUMN IF NOT EXISTS special_provisions   text,

  -- Click-to-sign
  ADD COLUMN IF NOT EXISTS landlord_signed_at       timestamptz,
  ADD COLUMN IF NOT EXISTS landlord_signature_name  text,
  ADD COLUMN IF NOT EXISTS tenant_signed_at         timestamptz,
  ADD COLUMN IF NOT EXISTS tenant_signature_name    text;

-- 2. Expand status to include pending_tenant_signature
--    (existing leases with status='active' are unaffected)
ALTER TABLE public.leases DROP CONSTRAINT IF EXISTS leases_status_check;
ALTER TABLE public.leases ADD CONSTRAINT leases_status_check
  CHECK (status IN ('pending_tenant_signature', 'active', 'expired', 'terminated'));

-- 3. Tenant can update their own lease (to sign it)
CREATE POLICY "Tenants update own lease to sign"
  ON public.leases FOR UPDATE
  USING (auth.uid() = tenant_id)
  WITH CHECK (auth.uid() = tenant_id);

-- 4. Supabase Storage bucket for lease PDFs (private)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('lease-documents', 'lease-documents', false)
  ON CONFLICT (id) DO NOTHING;

-- Storage RLS: landlords upload into their own folder
CREATE POLICY "Landlords upload lease docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'lease-documents'
    AND auth.uid() IS NOT NULL
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- Storage RLS: landlord reads their own files; tenant reads their lease doc
CREATE POLICY "Parties read lease docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'lease-documents'
    AND (
      -- Landlord owns the folder (path: {landlord_id}/filename.pdf)
      split_part(name, '/', 1) = auth.uid()::text
      OR
      -- Tenant is party to a lease that references this document
      EXISTS (
        SELECT 1 FROM public.leases
        WHERE tenant_id = auth.uid()
          AND document_path = name
      )
    )
  );

-- 5. Index for pending lease lookup
CREATE INDEX IF NOT EXISTS idx_leases_tenant_status
  ON public.leases(tenant_id, status);
