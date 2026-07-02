-- Migration: 20260702200000_user_reviews.sql
-- Purpose: Adds User Reviews & UGC system with automatic aggregation for Yellow Stars schema

-- 1. Add aggregation columns to library_branches
ALTER TABLE public.library_branches
ADD COLUMN IF NOT EXISTS aggregate_rating DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- 2. Create the library_reviews table
CREATE TABLE IF NOT EXISTS public.library_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    library_branch_id UUID NOT NULL REFERENCES public.library_branches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'published', -- 'published', 'flagged', 'hidden'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Enforce one review per user per library
    CONSTRAINT unique_user_library_review UNIQUE(library_branch_id, user_id)
);

-- 3. Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_library_reviews_branch_id ON public.library_reviews(library_branch_id);
CREATE INDEX IF NOT EXISTS idx_library_reviews_user_id ON public.library_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_library_reviews_created_at ON public.library_reviews(created_at DESC);

-- 4. Enable RLS
ALTER TABLE public.library_reviews ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Anyone can read published reviews
CREATE POLICY "Anyone can read published reviews"
    ON public.library_reviews
    FOR SELECT
    USING (status = 'published');

-- Authenticated users can read their own reviews regardless of status
CREATE POLICY "Users can read their own reviews"
    ON public.library_reviews
    FOR SELECT
    USING (auth.uid() = user_id);

-- Authenticated users can insert their own reviews
CREATE POLICY "Users can insert their own reviews"
    ON public.library_reviews
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Authenticated users can update their own reviews
CREATE POLICY "Users can update their own reviews"
    ON public.library_reviews
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Authenticated users can delete their own reviews
CREATE POLICY "Users can delete their own reviews"
    ON public.library_reviews
    FOR DELETE
    USING (auth.uid() = user_id);

-- 6. Trigger to automatically update aggregate_rating and review_count on library_branches
CREATE OR REPLACE FUNCTION public.update_library_aggregate_rating()
RETURNS TRIGGER AS $$
DECLARE
    v_branch_id UUID;
    v_avg DOUBLE PRECISION;
    v_count INTEGER;
BEGIN
    -- Determine which branch ID needs recalculating
    IF TG_OP = 'DELETE' THEN
        v_branch_id := OLD.library_branch_id;
    ELSE
        v_branch_id := NEW.library_branch_id;
    END IF;

    -- Calculate new average and count
    SELECT COALESCE(AVG(rating), 0), COUNT(*)
    INTO v_avg, v_count
    FROM public.library_reviews
    WHERE library_branch_id = v_branch_id AND status = 'published';

    -- Update the library_branches table
    UPDATE public.library_branches
    SET aggregate_rating = ROUND(v_avg::numeric, 1),
        review_count = v_count
    WHERE id = v_branch_id;

    RETURN NULL; -- AFTER triggers can return NULL
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind the trigger
DROP TRIGGER IF EXISTS trg_update_library_aggregate_rating ON public.library_reviews;
CREATE TRIGGER trg_update_library_aggregate_rating
AFTER INSERT OR UPDATE OR DELETE ON public.library_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_library_aggregate_rating();

-- 7. Add updated_at trigger for library_reviews
DROP TRIGGER IF EXISTS update_library_reviews_updated_at ON public.library_reviews;
CREATE TRIGGER update_library_reviews_updated_at
BEFORE UPDATE ON public.library_reviews
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();
