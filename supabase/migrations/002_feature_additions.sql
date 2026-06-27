-- ============================================================
-- Migration 002: Feature additions
-- Landlord Specials, Background Checks, Maintenance, Payments
-- ============================================================

-- Landlord Specials: add specials array to properties
alter table public.properties
  add column if not exists specials text[] default '{}';
-- Example values: 'no_credit_check', 'no_app_fee', 'pet_friendly', 
--                 'move_in_ready', 'no_security_deposit', 'section8_welcome'

-- Background checks
create table if not exists public.background_checks (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.applications(id) on delete cascade,
  landlord_id uuid references public.profiles(id),
  tenant_id uuid references public.profiles(id),
  property_id uuid references public.properties(id),
  checkr_candidate_id text,
  checkr_report_id text,
  status text default 'pending', -- pending, in_progress, complete, failed
  result text, -- clear, consider, suspended
  members_checked jsonb default '[]', -- [{name, dob, relation, consent_at}]
  stripe_charge_id text,
  amount_cents int, -- amount charged to landlord
  requested_at timestamptz default now(),
  completed_at timestamptz,
  created_at timestamptz default now()
);

alter table public.background_checks enable row level security;

create policy "Landlord sees own checks" on public.background_checks
  for select using (auth.uid() = landlord_id);

create policy "Tenant sees own checks" on public.background_checks
  for select using (auth.uid() = tenant_id);

create policy "Landlord can request check" on public.background_checks
  for insert with check (auth.uid() = landlord_id);

-- Maintenance requests
create table if not exists public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade,
  tenant_id uuid references public.profiles(id),
  landlord_id uuid references public.profiles(id),
  category text not null, -- plumbing, electrical, hvac, appliance, pest, structural, other
  urgency text default 'normal', -- emergency, urgent, normal
  description text not null,
  photos text[] default '{}',
  status text default 'submitted', -- submitted, acknowledged, in_progress, completed, closed
  landlord_notes text,
  submitted_at timestamptz default now(),
  acknowledged_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);

alter table public.maintenance_requests enable row level security;

create policy "Tenant sees own requests" on public.maintenance_requests
  for select using (auth.uid() = tenant_id);

create policy "Landlord sees property requests" on public.maintenance_requests
  for select using (auth.uid() = landlord_id);

create policy "Tenant can submit request" on public.maintenance_requests
  for insert with check (auth.uid() = tenant_id);

create policy "Landlord can update status" on public.maintenance_requests
  for update using (auth.uid() = landlord_id);

-- Rent payments
create table if not exists public.rent_payments (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade,
  tenant_id uuid references public.profiles(id),
  landlord_id uuid references public.profiles(id),
  amount_cents int not null, -- tenant portion only (above HAP)
  due_date date not null,
  paid_at timestamptz,
  status text default 'pending', -- pending, paid, late, failed
  stripe_payment_intent_id text,
  stripe_transfer_id text, -- transfer to landlord Stripe Connect account
  platform_fee_cents int, -- Settleed's cut (1-2%)
  landlord_payout_cents int,
  created_at timestamptz default now()
);

alter table public.rent_payments enable row level security;

create policy "Tenant sees own payments" on public.rent_payments
  for select using (auth.uid() = tenant_id);

create policy "Landlord sees property payments" on public.rent_payments
  for select using (auth.uid() = landlord_id);

-- Household members (for background checks)
alter table public.profiles
  add column if not exists household_members jsonb default '[]';
-- [{name, dob, relation, age}] — captured during background check consent flow
