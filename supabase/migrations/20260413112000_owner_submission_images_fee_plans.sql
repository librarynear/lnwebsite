ALTER TABLE public.owner_library_submissions
  ADD COLUMN IF NOT EXISTS image_urls TEXT[],
  ADD COLUMN IF NOT EXISTS fee_plans JSONB;
