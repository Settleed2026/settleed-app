-- 004_tenant_profile.sql
-- Comprehensive tenant profile fields for Section 8 voucher holders

ALTER TABLE profiles

  -- ── Section 1: Basic Info ──────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS date_of_birth          date,
  ADD COLUMN IF NOT EXISTS preferred_name         text,
  ADD COLUMN IF NOT EXISTS secondary_phone        text,

  -- ── Section 2: Current Housing Status ─────────────────────────────
  ADD COLUMN IF NOT EXISTS current_city           text,
  ADD COLUMN IF NOT EXISTS current_state          text,
  ADD COLUMN IF NOT EXISTS current_zip            text,
  -- 'renting' | 'family' | 'homeless' | 'shelter' | 'hotel' | 'transitional' | 'other'
  ADD COLUMN IF NOT EXISTS current_housing_situation text,

  -- ── Section 3: Voucher Information ────────────────────────────────
  -- housing_authority already exists from migration 001
  -- 'yes' | 'no' | 'pending'
  ADD COLUMN IF NOT EXISTS voucher_status         text,
  -- 'studio' | '1br' | '2br' | '3br' | '4br' | '5br+'
  ADD COLUMN IF NOT EXISTS voucher_bedroom_size   text,
  ADD COLUMN IF NOT EXISTS voucher_expiration_date date,
  -- 'city' | 'county' | 'state'
  ADD COLUMN IF NOT EXISTS search_radius          text,
  ADD COLUMN IF NOT EXISTS porting                boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS port_in_housing_authority text,

  -- ── Section 4: Household Information ──────────────────────────────
  ADD COLUMN IF NOT EXISTS num_adults             integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS num_children           integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_household_members integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS household_member_ages  text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS requires_accessible_unit boolean DEFAULT false,

  -- ── Section 5: Housing Preferences ────────────────────────────────
  ADD COLUMN IF NOT EXISTS desired_move_in_date   date,
  ADD COLUMN IF NOT EXISTS preferred_cities       text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_zip_codes    text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS max_rent               numeric(10,2),
  ADD COLUMN IF NOT EXISTS neighborhood_preferences text,
  ADD COLUMN IF NOT EXISTS distance_from_work     text,
  ADD COLUMN IF NOT EXISTS distance_from_transit  text,

  -- ── Section 6: Property Type Preferences ──────────────────────────
  -- e.g. ['single_family', 'apartment', 'townhome', 'duplex', 'condo']
  ADD COLUMN IF NOT EXISTS property_type_preferences text[] DEFAULT '{}',

  -- ── Section 7: Bedroom/Bathroom Preferences ───────────────────────
  ADD COLUMN IF NOT EXISTS min_bedrooms           integer,
  ADD COLUMN IF NOT EXISTS min_bathrooms          numeric(3,1),

  -- ── Section 8: Amenity Preferences ────────────────────────────────
  ADD COLUMN IF NOT EXISTS amenity_preferences    text[]  DEFAULT '{}',

  -- ── Section 9: Pet Information ────────────────────────────────────
  ADD COLUMN IF NOT EXISTS has_pets               boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pet_types              text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS num_pets               integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pet_breed              text,
  ADD COLUMN IF NOT EXISTS pet_weight             text,

  -- ── Section 10: Transportation ────────────────────────────────────
  ADD COLUMN IF NOT EXISTS owns_vehicle           boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS num_vehicles           integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS needs_public_transit   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS parking_required       boolean DEFAULT false,

  -- ── Section 11: Employment ────────────────────────────────────────
  -- 'full-time' | 'part-time' | 'self-employed' | 'disabled' | 'retired' | 'unemployed'
  ADD COLUMN IF NOT EXISTS employment_status      text,
  ADD COLUMN IF NOT EXISTS employer_name          text,

  -- ── Section 12: Rental History ────────────────────────────────────
  ADD COLUMN IF NOT EXISTS current_landlord       text,
  ADD COLUMN IF NOT EXISTS length_of_stay         text,
  ADD COLUMN IF NOT EXISTS reason_for_moving      text,

  -- ── Section 13: Screening ─────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS ok_background_check    boolean,
  ADD COLUMN IF NOT EXISTS ok_credit_check        boolean,
  -- 'yes' | 'no' | 'prefer_to_discuss'
  ADD COLUMN IF NOT EXISTS previous_eviction      text,

  -- ── Section 14: Accessibility Needs ───────────────────────────────
  ADD COLUMN IF NOT EXISTS accessibility_needs    text[]  DEFAULT '{}',

  -- ── Section 15: About Me ──────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS bio                    text,

  -- ── Section 16: Profile Photo ─────────────────────────────────────
  ADD COLUMN IF NOT EXISTS profile_photo_url      text,

  -- ── Section 17: Documents ─────────────────────────────────────────
  -- jsonb array: [{type, url, uploaded_at}]
  ADD COLUMN IF NOT EXISTS tenant_documents       jsonb   DEFAULT '[]',

  -- ── Section 18: Contact Preferences ──────────────────────────────
  -- contact_preferences already exists from migration 003

  -- ── Section 19: Notification Preferences ─────────────────────────
  -- jsonb: {new_matches, landlord_message, profile_viewed, favorite_available, voucher_expiry}
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{
    "new_matches": true,
    "landlord_message": true,
    "profile_viewed": true,
    "favorite_available": true,
    "voucher_expiry": true
  }',

  -- ── Section 20: Privacy Settings ──────────────────────────────────
  -- jsonb: controls what landlords can see
  ADD COLUMN IF NOT EXISTS privacy_settings       jsonb  DEFAULT '{
    "show_full_name": true,
    "show_phone": false,
    "show_email": false,
    "show_photo": true,
    "show_voucher_status": true,
    "show_household_size": true,
    "show_preferred_areas": true
  }',

  -- ── Profile wizard tracking ────────────────────────────────────────
  -- true once the tenant has completed or skipped the post-signup wizard
  ADD COLUMN IF NOT EXISTS profile_wizard_completed boolean DEFAULT false,
  -- which steps have been saved: e.g. ['housing','voucher','household',...]
  ADD COLUMN IF NOT EXISTS profile_wizard_steps   text[]  DEFAULT '{}';
