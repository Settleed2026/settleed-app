-- ============================================================
-- SETTLEED DATABASE SCHEMA
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- One row per user. Linked to Supabase auth.users.
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('landlord', 'tenant')),
  full_name text,
  phone text,
  email text,
  market text not null default 'atlanta', -- city/market field, required for expansion
  ha text check (ha in ('AHA', 'DCA', 'other')), -- housing authority
  stripe_customer_id text,
  subscription_status text default 'inactive' check (subscription_status in ('inactive', 'trialing', 'active', 'canceled', 'past_due')),
  subscription_tier text, -- 'founding', 'starter', 'professional', 'portfolio', 'enterprise', 'tenant_premium'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- LANDLORD PROFILES
-- Extra details for landlord users
-- ============================================================
create table landlord_profiles (
  id uuid primary key references profiles(id) on delete cascade,
  company_name text,
  properties_count int default 0,
  match_criteria jsonb default '{}', -- bedrooms, zip codes, ha, voucher range for instant match alerts
  notifications_email boolean default true,
  notifications_sms boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- TENANT PROFILES
-- Extra details for tenant users
-- ============================================================
create table tenant_profiles (
  id uuid primary key references profiles(id) on delete cascade,
  voucher_number text,
  voucher_expiry_date date,
  voucher_amount numeric(10,2), -- max monthly subsidy
  bedrooms_needed int check (bedrooms_needed between 0 and 6),
  zip_codes_preferred text[], -- array of preferred zip codes
  is_verified boolean default false, -- verified voucher badge
  notifications_email boolean default true,
  notifications_sms boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- PROPERTIES
-- Listings created by landlords
-- ============================================================
create table properties (
  id uuid primary key default uuid_generate_v4(),
  landlord_id uuid not null references profiles(id) on delete cascade,
  market text not null default 'atlanta',

  -- Address (full address hidden until application submitted)
  street_address text, -- hidden from tenants until matched
  neighborhood text not null, -- shown publicly
  city text not null default 'Atlanta',
  state text not null default 'GA',
  zip_code text not null,

  -- Unit details
  bedrooms int not null check (bedrooms between 0 and 10),
  bathrooms numeric(3,1) not null,
  square_feet int,
  rent_amount numeric(10,2) not null,
  deposit_amount numeric(10,2),
  available_date date,
  description text,

  -- Section 8 specific
  accepts_section8 boolean default true,
  ha_accepted text[] default array['AHA','DCA','other'], -- which HAs accepted
  voucher_min numeric(10,2), -- minimum voucher amount accepted
  voucher_max numeric(10,2), -- maximum voucher amount accepted

  -- Media
  photos text[], -- Cloudinary URLs

  -- Status
  status text not null default 'active' check (status in ('active', 'inactive', 'rented')),
  move_in_special text, -- e.g. "First month free"
  credit_friendly boolean default false,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- APPLICATIONS
-- Tenant applies to a property
-- ============================================================
create table applications (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  tenant_id uuid not null references profiles(id) on delete cascade,
  landlord_id uuid not null references profiles(id),
  market text not null default 'atlanta',

  -- Status
  status text not null default 'pending' check (status in ('pending', 'reviewing', 'approved', 'denied', 'withdrawn')),

  -- Application content
  message text,
  move_in_date date,
  household_size int,
  income numeric(10,2),

  -- Voucher details at time of application
  voucher_amount numeric(10,2),
  voucher_expiry_date date,
  ha text,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(property_id, tenant_id) -- one application per tenant per property
);

-- ============================================================
-- HQS INSPECTIONS
-- Housing Quality Standards inspection tracking per property
-- ============================================================
create table hqs_inspections (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  landlord_id uuid not null references profiles(id),
  market text not null default 'atlanta',

  -- Inspection dates
  last_inspection_date date,
  next_inspection_date date generated always as (last_inspection_date + interval '365 days') stored,

  -- Result
  result text check (result in ('pass', 'fail', 'pending', 'scheduled')),
  notes text,
  failed_items text[], -- list of items that failed

  -- Re-inspection
  reinspection_scheduled boolean default false,
  reinspection_date date,

  -- Payment status
  hap_suspended boolean default false,
  hap_suspended_date date,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- LEASES
-- Active lease records linking landlord, tenant, and property
-- ============================================================
create table leases (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id),
  landlord_id uuid not null references profiles(id),
  tenant_id uuid not null references profiles(id),
  market text not null default 'atlanta',

  -- Lease terms
  lease_start_date date not null,
  lease_end_date date,
  rent_amount numeric(10,2) not null,
  ha_portion numeric(10,2), -- what the HA pays
  tenant_portion numeric(10,2), -- what the tenant pays

  -- HAP contract
  hap_contract_number text,
  recertification_date date, -- annual recertification date

  -- Status
  status text not null default 'active' check (status in ('active', 'expired', 'terminated')),

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- MATCH ALERTS CRITERIA
-- Landlords set criteria; tenants notified when match found
-- ============================================================
create table match_criteria (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  user_role text not null check (user_role in ('landlord', 'tenant')),
  market text not null default 'atlanta',

  -- Matching fields
  bedrooms int[],
  zip_codes text[],
  ha text[],
  rent_min numeric(10,2),
  rent_max numeric(10,2),
  voucher_min numeric(10,2),
  voucher_max numeric(10,2),

  -- Notifications
  notify_email boolean default true,
  notify_sms boolean default false,

  active boolean default true,
  created_at timestamptz default now()
);

-- ============================================================
-- NOTIFICATIONS LOG
-- Track all sent alerts
-- ============================================================
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null, -- 'match_alert', 'hqs_reminder', 'recert_reminder', 'payment_reminder'
  channel text not null check (channel in ('email', 'sms')),
  subject text,
  body text,
  sent_at timestamptz default now(),
  status text default 'sent' check (status in ('sent', 'failed'))
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table landlord_profiles enable row level security;
alter table tenant_profiles enable row level security;
alter table properties enable row level security;
alter table applications enable row level security;
alter table hqs_inspections enable row level security;
alter table leases enable row level security;
alter table match_criteria enable row level security;
alter table notifications enable row level security;

-- Profiles: users can only read/update their own profile
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Properties: anyone can view active listings, only landlord can edit their own
create policy "Anyone can view active properties" on properties for select using (status = 'active');
create policy "Landlords can manage own properties" on properties for all using (auth.uid() = landlord_id);

-- Applications: tenants see their own, landlords see applications to their properties
create policy "Tenants can view own applications" on applications for select using (auth.uid() = tenant_id);
create policy "Landlords can view applications to their properties" on applications for select using (auth.uid() = landlord_id);
create policy "Tenants can create applications" on applications for insert with check (auth.uid() = tenant_id);
create policy "Landlords can update application status" on applications for update using (auth.uid() = landlord_id);

-- HQS: landlords can only see/edit their own
create policy "Landlords can manage own HQS records" on hqs_inspections for all using (auth.uid() = landlord_id);

-- Leases: landlords and tenants can view their own leases
create policy "Users can view own leases" on leases for select using (auth.uid() = landlord_id or auth.uid() = tenant_id);
create policy "Landlords can manage leases" on leases for all using (auth.uid() = landlord_id);

-- Match criteria: users can only manage their own
create policy "Users can manage own match criteria" on match_criteria for all using (auth.uid() = user_id);

-- Notifications: users can only view their own
create policy "Users can view own notifications" on notifications for select using (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_properties_market on properties(market);
create index idx_properties_status on properties(status);
create index idx_properties_zip on properties(zip_code);
create index idx_properties_bedrooms on properties(bedrooms);
create index idx_applications_tenant on applications(tenant_id);
create index idx_applications_landlord on applications(landlord_id);
create index idx_hqs_property on hqs_inspections(property_id);
create index idx_hqs_next_date on hqs_inspections(next_inspection_date);
create index idx_leases_recert on leases(recertification_date);
create index idx_profiles_market on profiles(market);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on profiles for each row execute function update_updated_at();
create trigger properties_updated_at before update on properties for each row execute function update_updated_at();
create trigger applications_updated_at before update on applications for each row execute function update_updated_at();
create trigger hqs_updated_at before update on hqs_inspections for each row execute function update_updated_at();
create trigger leases_updated_at before update on leases for each row execute function update_updated_at();
