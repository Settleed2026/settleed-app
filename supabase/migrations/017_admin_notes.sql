-- 017_admin_notes.sql
-- Allow admins to save verification notes on each review

alter table landlord_reviews add column if not exists admin_notes text;
