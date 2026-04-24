ALTER TABLE public.library_branches
  ADD COLUMN IF NOT EXISTS source_submission_id UUID REFERENCES public.owner_library_submissions(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_library_branches_source_submission_id_unique
  ON public.library_branches(source_submission_id)
  WHERE source_submission_id IS NOT NULL;
