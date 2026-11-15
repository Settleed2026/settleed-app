-- Migration 028: Enrich applications table + reusable tenant profile
-- Adds full screening fields, document URLs, structured workflow statuses,
-- showing scheduler, decline reasons, and saved application profile.

-- ── 1. New columns on applications ──────────────────────────────────────────

ALTER TABLE public.applications
  -- Household composition
  ADD COLUMN IF NOT EXISTS adults_count        integer,
  ADD COLUMN IF NOT EXISTS children_count      integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS children_ages       jsonb   DEFAULT '[]',   -- e.g. [4, 7, 12]
  ADD COLUMN IF NOT EXISTS adult_names         jsonb   DEFAULT '[]',   -- e.g. ["Jane Doe", "Marcus Doe"]

  -- Income & employment
  ADD COLUMN IF NOT EXISTS monthly_income      numeric(10,2),
  ADD COLUMN IF NOT EXISTS income_source       text,                   -- 'employment','ssi','tanf','child_support','other'
  ADD COLUMN IF NOT EXISTS employer_name       text,
  ADD COLUMN IF NOT EXISTS employment_length   text,                   -- e.g. '2 years'

  -- Rental history
  ADD COLUMN IF NOT EXISTS current_address     text,
  ADD COLUMN IF NOT EXISTS time_at_address     text,                   -- e.g. '18 months'
  ADD COLUMN IF NOT EXISTS move_reason         text,
  ADD COLUMN IF NOT EXISTS prev_landlord_contact text,                 -- optional name + phone

  -- Fair Chance background disclosure
  ADD COLUMN IF NOT EXISTS has_criminal_history boolean,
  ADD COLUMN IF NOT EXISTS criminal_explanation text,

  -- Document URLs (Supabase Storage)
  ADD COLUMN IF NOT EXISTS id_document_url        text,
  ADD COLUMN IF NOT EXISTS voucher_document_url   text,
  ADD COLUMN IF NOT EXISTS income_document_url    text,
  ADD COLUMN IF NOT EXISTS reference_document_url text,

  -- Workflow enhancements
  ADD COLUMN IF NOT EXISTS decline_reason          text,
  ADD COLUMN IF NOT EXISTS showing_proposed_times  jsonb,  -- array of ISO date strings proposed by landlord
  ADD COLUMN IF NOT EXISTS showing_confirmed_at    timestamptz,
  ADD COLUMN IF NOT EXISTS showing_tenant_choice   text;   -- the slot the tenant picked

-- ── 2. New status values — extend check constraint ───────────────────────────
-- Drop old constraint and add updated one that includes new statuses
ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_status_check;

ALTER TABLE public.applications
  ADD CONSTRAINT applications_status_check
  CHECK (status IN (
    'pending',
    'reviewing',
    'info_requested',
    'showing_scheduled',
    'approved',       -- legacy: use 'selected' going forward
    'selected',       -- landlord has chosen this tenant
    'rejected',
    'withdrawn'
  ));

-- ── 3. Reusable application profile saved on profiles ────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS saved_application_data jsonb;

-- ── 4. Storage bucket for tenant documents ───────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tenant-documents',
  'tenant-documents',
  false,
  10485760,   -- 10 MB
  ARRAY['image/jpeg','image/png','image/webp','application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: tenant can upload/read their own docs; landlord can read docs for applications to their properties
CREATE POLICY IF NOT EXISTS "tenant_docs_own_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'tenant-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY IF NOT EXISTS "tenant_docs_own_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'tenant-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY IF NOT EXISTS "landlord_docs_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'tenant-documents'
    AND EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.properties p ON p.id = a.property_id
      WHERE a.tenant_id::text = (storage.foldername(name))[1]
        AND p.landlord_id = auth.uid()
    )
  );

-- ── 5. Application count helper view ─────────────────────────────────────────
CREATE OR REPLACE VIEW public.property_application_counts AS
SELECT
  property_id,
  COUNT(*) FILTER (WHERE status NOT IN ('withdrawn','rejected')) AS active_count,
  COUNT(*) AS total_count
FROM public.applications
GROUP BY property_id;

GRANT SELECT ON public.property_application_counts TO authenticated, anon;
