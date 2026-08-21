-- Migration 025: Agency inquiries table for /for-agencies contact form

CREATE TABLE IF NOT EXISTS public.agency_inquiries (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name   text NOT NULL,
  contact_title  text,
  agency_name    text NOT NULL,
  email          text NOT NULL,
  phone          text,
  message        text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- No RLS needed — insert-only from public form, readable by admins via service role
