-- Migration: 20260710000000_google_reviews_and_enrichment.sql
-- Purpose: Support Google Reviews and track data enrichment

-- 1. Add tracking column for Data Enrichment
ALTER TABLE public.library_branches
ADD COLUMN IF NOT EXISTS is_enriched BOOLEAN DEFAULT false;

-- 2. Modify library_reviews to support Google Reviews
ALTER TABLE public.library_reviews
ALTER COLUMN user_id DROP NOT NULL;

-- 3. Add Google reviewer details
ALTER TABLE public.library_reviews
ADD COLUMN IF NOT EXISTS reviewer_name TEXT,
ADD COLUMN IF NOT EXISTS reviewer_photo_url TEXT,
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'user'; -- 'user' or 'google'

-- 4. Drop the strict unique constraint (so a user can theoretically leave multiple reviews if they use multiple google accounts, or we don't care about constraint for google reviews)
ALTER TABLE public.library_reviews
DROP CONSTRAINT IF EXISTS unique_user_library_review;

-- Re-add constraint ONLY for 'user' source reviews (partial index/constraint requires unique index)
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_library_review_idx 
ON public.library_reviews (library_branch_id, user_id) 
WHERE source = 'user' AND user_id IS NOT NULL;
