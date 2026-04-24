CREATE UNIQUE INDEX IF NOT EXISTS idx_owner_library_submissions_user_id_unique
  ON public.owner_library_submissions(user_id);
