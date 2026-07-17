-- 003_listing_expansion.sql
-- Expands profiles and properties tables for comprehensive landlord onboarding

-- ── Profiles: landlord contact detail fields ──
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS first_name          text,
  ADD COLUMN IF NOT EXISTS last_name           text,
  ADD COLUMN IF NOT EXISTS company_name        text,
  ADD COLUMN IF NOT EXISTS office_phone        text,
  ADD COLUMN IF NOT EXISTS preferred_contact   text,  -- 'phone' | 'text' | 'email'
  ADD COLUMN IF NOT EXISTS best_time_to_contact text;

-- ── Properties: full expansion ──
ALTER TABLE properties
  -- Address
  ADD COLUMN IF NOT EXISTS unit_number         text,
  ADD COLUMN IF NOT EXISTS city                text    DEFAULT 'Atlanta',
  ADD COLUMN IF NOT EXISTS state               text    DEFAULT 'GA',
  ADD COLUMN IF NOT EXISTS property_type       text,   -- Single Family Home, Apartment, etc.

  -- Unit details
  ADD COLUMN IF NOT EXISTS floor_level         text,
  ADD COLUMN IF NOT EXISTS year_built          integer,

  -- Costs
  ADD COLUMN IF NOT EXISTS application_fee     numeric(10,2),
  ADD COLUMN IF NOT EXISTS pet_deposit         numeric(10,2),
  ADD COLUMN IF NOT EXISTS monthly_pet_rent    numeric(10,2),
  ADD COLUMN IF NOT EXISTS holding_fee         numeric(10,2),
  ADD COLUMN IF NOT EXISTS move_in_fee         numeric(10,2),

  -- Utilities (jsonb: { "Water": "landlord"|"tenant"|"included", ... })
  ADD COLUMN IF NOT EXISTS utilities           jsonb   DEFAULT '{}',

  -- Appliances & Amenities (arrays)
  ADD COLUMN IF NOT EXISTS appliances          text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS amenities           text[]  DEFAULT '{}',

  -- Pet policy
  ADD COLUMN IF NOT EXISTS pets_allowed        boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pet_types           text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS breed_restrictions  text,
  ADD COLUMN IF NOT EXISTS weight_limit        text,

  -- HCV / voucher info
  ADD COLUMN IF NOT EXISTS hcv_accepted        boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS voucher_sizes_accepted text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS previously_inspected boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS currently_occupied  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS move_in_ready       boolean DEFAULT true,

  -- Rental requirements
  ADD COLUMN IF NOT EXISTS min_credit_score    text,
  ADD COLUMN IF NOT EXISTS income_requirement  text,
  ADD COLUMN IF NOT EXISTS criminal_background_policy text,
  ADD COLUMN IF NOT EXISTS eviction_policy     text,
  ADD COLUMN IF NOT EXISTS rental_history_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cosigner_accepted   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS smoking_allowed     boolean DEFAULT false,

  -- Media
  ADD COLUMN IF NOT EXISTS video_url           text,
  ADD COLUMN IF NOT EXISTS documents           jsonb   DEFAULT '[]',

  -- Contact & availability
  ADD COLUMN IF NOT EXISTS contact_preferences text[]  DEFAULT '{"email"}',
  ADD COLUMN IF NOT EXISTS lease_type          text    DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS min_lease_months    integer DEFAULT 12,
  ADD COLUMN IF NOT EXISTS month_to_month      boolean DEFAULT false,

  -- Admin (hidden from public)
  ADD COLUMN IF NOT EXISTS verified            boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured            boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS internal_notes      text,
  ADD COLUMN IF NOT EXISTS date_approved       timestamptz,

  -- Nearby attractions (auto or manual)
  ADD COLUMN IF NOT EXISTS nearby_attractions  text[]  DEFAULT '{}';

-- Keep neighborhood for display name; add city/state/unit to complement street_address
-- status column already exists ('draft', 'active', 'inactive', 'rented', 'deleted')
