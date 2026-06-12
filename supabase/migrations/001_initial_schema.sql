-- ============================================================
-- SETTLEED DATABASE SCHEMA  v1.1
-- Run in Supabase SQL Editor
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES — one row per user
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('landlord', 'tenant')),
  full_name text,
  phone text,
  email text,
  market text not null default 'atlanta',
  -- Housing authority + voucher (for tenants)
  housing_authority text,
  voucher_size int,
  -- Stripe / subscription
  stripe_customer_id text,
  subscription_status text default 'inactive' check (subscription_status in ('inactive', 'trialing', 'active', 'canceled', 'past_due')),
  subscription_tier text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- PROPERTIES
-- ============================================================
create table properties (
  id uuid primary key default uuid_generate_v4(),
  landlord_id uuid not null references profiles(id) on delete cascade,
  market text not null default 'atlanta',

  -- Address
  street_address text,
  neighborhood text not null,
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

  -- Section 8
  accepts_section8 boolean default true,
  ha_accepted text[] default array['AHA','DCA','other'],
  photos text[],

  -- Status
  status text not null default 'active' check (status in ('active', 'inactive', 'rented')),
  move_in_special text,
  credit_friendly boolean default false,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- APPLICATIONS
-- ============================================================
create table applications (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  tenant_id uuid not null references profiles(id) on delete cascade,
  landlord_id uuid references profiles(id),
  market text not null default 'atlanta',

  -- Status
  status text not null default 'pending' check (status in ('pending', 'reviewing', 'approved', 'rejected', 'withdrawn')),

  -- Application content
  message text,
  desired_move_in date,
  household_size int,

  -- Voucher details at time of application
  housing_authority text,
  voucher_size int,
  voucher_expiration date,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(property_id, tenant_id)
);

-- Trigger: auto-fill landlord_id from property on insert
create or replace function applications_set_landlord_id()
returns trigger as $$
begin
  if new.landlord_id is null then
    select landlord_id into new.landlord_id from properties where id = new.property_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger applications_landlord_id_trigger
  before insert on applications
  for each row execute function applications_set_landlord_id();

-- ============================================================
-- HQS INSPECTIONS
-- ============================================================
create table hqs_inspections (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  landlord_id uuid not null references profiles(id),
  market text not null default 'atlanta',

  inspection_date date,
  next_inspection_date date,
  result text check (result in ('pass', 'fail', 'pending', 'scheduled')),
  notes text,
  failed_items text[],

  reinspection_scheduled boolean default false,
  reinspection_date date,

  hap_suspended boolean default false,
  hap_suspended_date date,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- LEASES
-- ============================================================
create table leases (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id),
  landlord_id uuid not null references profiles(id),
  tenant_id uuid not null references profiles(id),
  market text not null default 'atlanta',

  lease_start_date date not null,
  lease_end_date date,
  rent_amount numeric(10,2) not null,
  ha_portion numeric(10,2),
  tenant_portion numeric(10,2),

  hap_contract_number text,
  recertification_date date,

  status text not null default 'active' check (status in ('active', 'expired', 'terminated')),

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- MATCH ALERT CRITERIA
-- ============================================================
create table match_criteria (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  user_role text not null check (user_role in ('landlord', 'tenant')),
  market text not null default 'atlanta',

  bedrooms int[],
  zip_codes text[],
  ha text[],
  rent_min numeric(10,2),
  rent_max numeric(10,2),

  notify_email boolean default true,
  notify_sms boolean default false,
  active boolean default true,

  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table properties enable row level security;
alter table applications enable row level security;
alter table hqs_inspections enable row level security;
alter table leases enable row level security;
alter table match_criteria enable row level security;

-- Profiles
create policy "Users view own profile" on profiles for select using (auth.uid() = id);
create policy "Users update own profile" on profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on profiles for insert with check (auth.uid() = id);

-- Properties: public can see active listings; landlords manage their own
create policy "Public view active properties" on properties for select using (status = 'active');
create policy "Landlords manage own properties" on properties for all using (auth.uid() = landlord_id);

-- Applications
create policy "Tenants view own applications" on applications for select using (auth.uid() = tenant_id);
create policy "Landlords view their applications" on applications for select using (auth.uid() = landlord_id);
create policy "Tenants create applications" on applications for insert with check (auth.uid() = tenant_id);
create policy "Landlords update application status" on applications for update using (auth.uid() = landlord_id);
create policy "Tenants update own applications" on applications for update using (auth.uid() = tenant_id);

-- HQS: landlords manage their own
create policy "Landlords manage own HQS" on hqs_inspections for all using (auth.uid() = landlord_id);

-- Leases
create policy "Users view own leases" on leases for select using (auth.uid() = landlord_id or auth.uid() = tenant_id);
create policy "Landlords manage leases" on leases for all using (auth.uid() = landlord_id);

-- Match criteria
create policy "Users manage own match criteria" on match_criteria for all using (auth.uid() = user_id);

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

-- ============================================================
-- AUTO-UPDATE updated_at
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

-- ============================================================
-- PROFILE AUTO-CREATE ON SIGNUP
-- Automatically create a profile row when a user signs up
-- ============================================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, role, market)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'tenant'),
    'atlanta'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
