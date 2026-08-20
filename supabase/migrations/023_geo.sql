-- Migration 023: Add lat/lng to properties for map view
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS latitude  double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

CREATE INDEX IF NOT EXISTS idx_properties_geo ON public.properties(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
