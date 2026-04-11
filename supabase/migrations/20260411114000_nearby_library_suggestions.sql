CREATE OR REPLACE FUNCTION public.nearby_library_suggestions(
  user_lat double precision,
  user_lng double precision,
  city_filter text DEFAULT NULL,
  max_results int DEFAULT 10
)
RETURNS TABLE (
  type text,
  label text,
  slug text,
  city text,
  distance_km double precision
)
LANGUAGE sql
STABLE
AS $$
  WITH candidates AS (
    SELECT
      lb.display_name,
      lb.slug,
      lb.city,
      lb.verification_status,
      lb.profile_completeness_score,
      (
        6371 * acos(
          least(
            1.0,
            greatest(
              -1.0,
              cos(radians(user_lat)) * cos(radians(lb.latitude)) *
              cos(radians(lb.longitude) - radians(user_lng)) +
              sin(radians(user_lat)) * sin(radians(lb.latitude))
            )
          )
        )
      ) AS distance_km
    FROM public.library_branches lb
    WHERE
      lb.is_active = true
      AND lb.latitude IS NOT NULL
      AND lb.longitude IS NOT NULL
      AND (city_filter IS NULL OR lower(lb.city) = lower(city_filter))
  )
  SELECT
    'nearby'::text AS type,
    c.display_name AS label,
    c.slug AS slug,
    c.city AS city,
    round(c.distance_km::numeric, 2)::double precision AS distance_km
  FROM candidates c
  WHERE c.distance_km IS NOT NULL
  ORDER BY
    c.distance_km ASC,
    CASE WHEN c.verification_status = 'verified' THEN 0 ELSE 1 END ASC,
    c.profile_completeness_score DESC NULLS LAST,
    c.display_name ASC
  LIMIT max_results;
$$;
