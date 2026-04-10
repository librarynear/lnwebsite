CREATE INDEX IF NOT EXISTS idx_library_branches_active_city_profile
  ON public.library_branches (city, profile_completeness_score DESC)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_library_branches_active_city_locality_profile
  ON public.library_branches (city, locality, profile_completeness_score DESC)
  WHERE is_active = true AND locality IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_library_branches_active_city_verified_profile
  ON public.library_branches (city, verification_status, profile_completeness_score DESC)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_library_images_branch_cover_sort
  ON public.library_images (library_branch_id, is_cover DESC, sort_order ASC);
