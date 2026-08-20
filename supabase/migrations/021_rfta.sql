-- Migration 021: RFTA (Request for Tenancy Approval) tracker

CREATE TABLE IF NOT EXISTS public.rfta_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  landlord_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  application_id  uuid REFERENCES public.applications(id) ON DELETE SET NULL,

  -- Status flow: draft → submitted → ha_reviewing → inspection_scheduled
  --              → inspection_passed | inspection_failed → approved | denied
  status          text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','submitted','ha_reviewing','inspection_scheduled',
                                    'inspection_passed','inspection_failed','approved','denied')),

  ha_name         text,                    -- Housing authority (AHA, DCA, etc.)
  submitted_date  date,                    -- Date RFTA was submitted to HA
  inspection_date date,                    -- Scheduled inspection date
  approved_date   date,                    -- Date HA approved
  rent_approved   numeric(10,2),           -- HA-approved rent amount
  lease_start_date date,                   -- Agreed lease start

  -- Documents
  rfta_document_url  text,                 -- Uploaded RFTA form
  hap_contract_url   text,                 -- HAP contract (post-approval)

  notes           text,                    -- Internal notes / HA comments
  denial_reason   text,                    -- If denied

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (property_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_rfta_landlord   ON public.rfta_submissions(landlord_id);
CREATE INDEX IF NOT EXISTS idx_rfta_tenant     ON public.rfta_submissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rfta_status     ON public.rfta_submissions(status);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_rfta_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_rfta_updated_at ON public.rfta_submissions;
CREATE TRIGGER trg_rfta_updated_at
  BEFORE UPDATE ON public.rfta_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_rfta_updated_at();

-- RLS
ALTER TABLE public.rfta_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Landlord manages RFTA" ON public.rfta_submissions;
CREATE POLICY "Landlord manages RFTA" ON public.rfta_submissions
  FOR ALL USING (auth.uid() = landlord_id);

DROP POLICY IF EXISTS "Tenant reads own RFTA" ON public.rfta_submissions;
CREATE POLICY "Tenant reads own RFTA" ON public.rfta_submissions
  FOR SELECT USING (auth.uid() = tenant_id);
