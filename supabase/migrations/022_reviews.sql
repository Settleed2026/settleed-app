-- Migration 022: Reviews & ratings system
-- Tenants review landlords/properties; landlords review tenants

CREATE TABLE IF NOT EXISTS public.reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id     uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  lease_id        uuid REFERENCES public.leases(id) ON DELETE SET NULL,

  reviewer_role   text NOT NULL CHECK (reviewer_role IN ('tenant','landlord')),
  rating          integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content         text CHECK (char_length(content) <= 1000),

  -- Category sub-ratings (optional, 1-5)
  rating_communication  integer CHECK (rating_communication BETWEEN 1 AND 5),
  rating_accuracy       integer CHECK (rating_accuracy BETWEEN 1 AND 5),   -- listing accuracy (tenant→landlord)
  rating_responsiveness integer CHECK (rating_responsiveness BETWEEN 1 AND 5),
  rating_cleanliness    integer CHECK (rating_cleanliness BETWEEN 1 AND 5), -- property cleanliness (tenant→landlord)

  is_public       boolean NOT NULL DEFAULT true,
  flagged         boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),

  -- One review per reviewer per property/lease
  UNIQUE (reviewer_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewee  ON public.reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_property  ON public.reviews(property_id);

-- Materialized average rating view per profile
CREATE OR REPLACE VIEW public.profile_ratings AS
SELECT
  reviewee_id                                            AS profile_id,
  COUNT(*)                                               AS review_count,
  ROUND(AVG(rating)::numeric, 1)                        AS avg_rating,
  ROUND(AVG(rating_communication)::numeric, 1)          AS avg_communication,
  ROUND(AVG(rating_responsiveness)::numeric, 1)         AS avg_responsiveness
FROM public.reviews
WHERE is_public = true AND flagged = false
GROUP BY reviewee_id;

-- RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads public reviews" ON public.reviews;
CREATE POLICY "Anyone reads public reviews" ON public.reviews
  FOR SELECT USING (is_public = true AND flagged = false);

DROP POLICY IF EXISTS "Reviewer reads own reviews" ON public.reviews;
CREATE POLICY "Reviewer reads own reviews" ON public.reviews
  FOR SELECT USING (auth.uid() = reviewer_id);

DROP POLICY IF EXISTS "Authenticated users write reviews" ON public.reviews;
CREATE POLICY "Authenticated users write reviews" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

DROP POLICY IF EXISTS "Reviewer updates own review" ON public.reviews;
CREATE POLICY "Reviewer updates own review" ON public.reviews
  FOR UPDATE USING (auth.uid() = reviewer_id);
