-- 018_verification_storage.sql
-- Creates the private storage bucket for landlord verification documents
-- and sets RLS policies so only the owning landlord can upload/read their files.

-- Bucket
INSERT INTO storage.buckets (id, name, public)
  VALUES ('verification-documents', 'verification-documents', false)
  ON CONFLICT (id) DO NOTHING;

-- RLS: landlord uploads into their own folder ({landlord_id}/filename)
CREATE POLICY "Landlords upload verification docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'verification-documents'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- RLS: landlord reads their own files
CREATE POLICY "Landlords read own verification docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'verification-documents'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- RLS: admins can read all verification docs
CREATE POLICY "Admins read all verification docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'verification-documents'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );
