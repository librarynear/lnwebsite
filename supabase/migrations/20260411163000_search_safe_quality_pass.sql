INSERT INTO public.place_aliases (place_type, canonical_name, alias_text, source)
VALUES
  ('locality', 'Connaught Place', 'cp', 'safe-search-pass'),
  ('metro', 'Rajiv Chowk', 'cp', 'safe-search-pass'),
  ('locality', 'Old Rajender Nagar', 'orn', 'safe-search-pass'),
  ('locality', 'Old Rajender Nagar', 'old rajinder nagar', 'safe-search-pass'),
  ('locality', 'Old Rajender Nagar', 'old rajendra nagar', 'safe-search-pass'),
  ('locality', 'New Rajendra Nagar', 'nrn', 'safe-search-pass'),
  ('locality', 'New Rajendra Nagar', 'new rajinder nagar', 'safe-search-pass'),
  ('locality', 'Rajinder Nagar', 'rajender nagar', 'safe-search-pass'),
  ('locality', 'Rajinder Nagar', 'rajinder ngr', 'safe-search-pass'),
  ('metro', 'Rajendra Place', 'rajender place', 'safe-search-pass'),
  ('metro', 'Rajendra Place', 'rajinder place', 'safe-search-pass'),
  ('metro', 'Rajiv Chowk', 'connaught place metro', 'safe-search-pass'),
  ('locality', 'Karol Bagh', 'karol bag', 'safe-search-pass'),
  ('metro', 'Barakhamba Road', 'barakhamba road metro', 'safe-search-pass')
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_place_aliases_active_alias_text_lower
  ON public.place_aliases (lower(alias_text))
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_place_aliases_active_alias_text_trgm
  ON public.place_aliases USING GIN (lower(alias_text) gin_trgm_ops)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_search_branches_lower_city_profile
  ON public.search_branches (lower(city), profile_completeness_score DESC);

CREATE INDEX IF NOT EXISTS idx_library_branches_active_display_name_trgm
  ON public.library_branches USING GIN (lower(display_name) gin_trgm_ops)
  WHERE is_active = true AND display_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_library_branches_active_name_trgm
  ON public.library_branches USING GIN (lower(name) gin_trgm_ops)
  WHERE is_active = true AND name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_library_branches_active_locality_trgm
  ON public.library_branches USING GIN (lower(locality) gin_trgm_ops)
  WHERE is_active = true AND locality IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_library_branches_active_metro_trgm
  ON public.library_branches USING GIN (lower(nearest_metro) gin_trgm_ops)
  WHERE is_active = true AND nearest_metro IS NOT NULL;

DROP FUNCTION IF EXISTS public.search_libraries(text, text, int);

CREATE OR REPLACE FUNCTION public.search_libraries(
  query_term text,
  city_filter text DEFAULT NULL,
  max_results int DEFAULT 60
)
RETURNS TABLE (
  id uuid,
  slug text,
  city text,
  display_name text,
  locality text,
  nearest_metro text,
  nearest_metro_distance_km double precision,
  verification_status text,
  profile_completeness_score int,
  rank float4
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  normalized text;
  alias_term text;
  effective_term text;
  tsq tsquery;
BEGIN
  normalized := lower(unaccent(trim(query_term)));
  IF normalized = '' THEN
    RETURN;
  END IF;

  SELECT pa.canonical_name INTO alias_term
  FROM public.place_aliases pa
  WHERE pa.is_active = true
    AND (
      lower(unaccent(pa.alias_text)) = normalized
      OR lower(unaccent(pa.alias_text)) LIKE normalized || '%'
    )
  ORDER BY
    CASE
      WHEN lower(unaccent(pa.alias_text)) = normalized THEN 0
      ELSE 1
    END,
    CASE pa.place_type
      WHEN 'locality' THEN 0
      WHEN 'metro' THEN 1
      ELSE 2
    END,
    length(pa.alias_text) ASC
  LIMIT 1;

  effective_term := lower(unaccent(coalesce(alias_term, query_term)));

  BEGIN
    tsq := websearch_to_tsquery('english', effective_term);
  EXCEPTION WHEN OTHERS THEN
    tsq := NULL;
  END;

  RETURN QUERY
  WITH ranked AS (
    SELECT
      sb.id,
      sb.slug,
      sb.city,
      sb.display_name,
      sb.locality,
      sb.nearest_metro,
      sb.nearest_metro_distance_km,
      sb.verification_status,
      sb.profile_completeness_score,
      (
        CASE WHEN tsq IS NOT NULL THEN ts_rank_cd(sb.search_vector, tsq, 4) * 2.4 ELSE 0 END
        + greatest(
            similarity(sb.trgm_document, normalized),
            similarity(sb.trgm_document, effective_term)
          )
        + CASE
            WHEN lower(unaccent(coalesce(sb.display_name, ''))) = normalized THEN 1.8
            WHEN lower(unaccent(coalesce(sb.display_name, ''))) = effective_term THEN 1.6
            WHEN lower(unaccent(coalesce(sb.display_name, ''))) LIKE normalized || '%' THEN 1.05
            WHEN lower(unaccent(coalesce(sb.display_name, ''))) LIKE effective_term || '%' THEN 0.95
            WHEN lower(unaccent(coalesce(sb.display_name, ''))) LIKE '%' || effective_term || '%' THEN 0.25
            ELSE 0
          END
        + CASE
            WHEN lower(unaccent(coalesce(sb.locality, ''))) = normalized THEN 1.1
            WHEN lower(unaccent(coalesce(sb.locality, ''))) = effective_term THEN 1.0
            WHEN lower(unaccent(coalesce(sb.locality, ''))) LIKE effective_term || '%' THEN 0.55
            ELSE 0
          END
        + CASE
            WHEN lower(unaccent(coalesce(sb.nearest_metro, ''))) = normalized THEN 0.95
            WHEN lower(unaccent(coalesce(sb.nearest_metro, ''))) = effective_term THEN 0.9
            WHEN lower(unaccent(coalesce(sb.nearest_metro, ''))) LIKE effective_term || '%' THEN 0.45
            ELSE 0
          END
        + CASE WHEN alias_term IS NOT NULL THEN 0.2 ELSE 0 END
        + CASE WHEN sb.verification_status = 'verified' THEN 0.14 ELSE 0 END
        + CASE
            WHEN sb.profile_completeness_score IS NOT NULL
              THEN (sb.profile_completeness_score::float / 100.0) * 0.10
            ELSE 0
          END
      )::float4 AS rank,
      CASE
        WHEN lower(unaccent(coalesce(sb.display_name, ''))) = normalized THEN 0
        WHEN lower(unaccent(coalesce(sb.display_name, ''))) = effective_term THEN 1
        WHEN lower(unaccent(coalesce(sb.locality, ''))) = normalized THEN 2
        WHEN lower(unaccent(coalesce(sb.locality, ''))) = effective_term THEN 3
        WHEN lower(unaccent(coalesce(sb.nearest_metro, ''))) = normalized THEN 4
        WHEN lower(unaccent(coalesce(sb.nearest_metro, ''))) = effective_term THEN 5
        WHEN lower(unaccent(coalesce(sb.display_name, ''))) LIKE normalized || '%' THEN 6
        WHEN lower(unaccent(coalesce(sb.display_name, ''))) LIKE effective_term || '%' THEN 7
        ELSE 8
      END AS priority_bucket
    FROM public.search_branches sb
    WHERE
      sb.is_active = true
      AND (city_filter IS NULL OR lower(sb.city) = lower(city_filter))
      AND (
        (tsq IS NOT NULL AND sb.search_vector @@ tsq)
        OR similarity(sb.trgm_document, normalized) > 0.07
        OR similarity(sb.trgm_document, effective_term) > 0.07
        OR lower(unaccent(coalesce(sb.display_name, ''))) LIKE '%' || effective_term || '%'
        OR lower(unaccent(coalesce(sb.locality, ''))) LIKE '%' || effective_term || '%'
        OR lower(unaccent(coalesce(sb.nearest_metro, ''))) LIKE '%' || effective_term || '%'
      )
  )
  SELECT
    r.id,
    r.slug,
    r.city,
    r.display_name,
    r.locality,
    r.nearest_metro,
    r.nearest_metro_distance_km,
    r.verification_status,
    r.profile_completeness_score,
    r.rank
  FROM ranked r
  ORDER BY
    r.priority_bucket ASC,
    r.rank DESC,
    r.profile_completeness_score DESC NULLS LAST,
    r.display_name ASC
  LIMIT max_results;
END;
$$;

CREATE OR REPLACE FUNCTION public.search_suggestions(query_term text)
RETURNS TABLE (
  type text,
  label text,
  slug text,
  city text
)
LANGUAGE sql
STABLE
AS $$
  WITH params AS (
    SELECT lower(unaccent(trim(query_term))) AS normalized
  ),
  alias_hits AS (
    SELECT DISTINCT ON (pa.place_type, pa.canonical_name)
      pa.place_type,
      lower(unaccent(pa.canonical_name)) AS canonical_term,
      CASE
        WHEN lower(unaccent(pa.alias_text)) = p.normalized THEN 2.4
        WHEN lower(unaccent(pa.alias_text)) LIKE p.normalized || '%' THEN 1.6
        ELSE similarity(lower(unaccent(pa.alias_text)), p.normalized)
      END AS alias_score
    FROM public.place_aliases pa
    CROSS JOIN params p
    WHERE
      pa.is_active = true
      AND p.normalized <> ''
      AND length(p.normalized) >= 2
      AND (
        lower(unaccent(pa.alias_text)) = p.normalized
        OR lower(unaccent(pa.alias_text)) LIKE p.normalized || '%'
        OR similarity(lower(unaccent(pa.alias_text)), p.normalized) > 0.35
      )
    ORDER BY pa.place_type, pa.canonical_name, alias_score DESC
  ),
  resolved_terms AS (
    SELECT p.normalized AS term, NULL::text AS source_type, 0::float8 AS alias_score
    FROM params p
    UNION ALL
    SELECT ah.canonical_term, ah.place_type, ah.alias_score
    FROM alias_hits ah
  ),
  library_matches AS (
    SELECT
      'library'::text AS type,
      sb.display_name AS label,
      sb.slug AS slug,
      sb.city AS city,
      max(
        CASE
          WHEN lower(unaccent(coalesce(sb.display_name, ''))) = rt.term THEN 3.3
          WHEN lower(unaccent(coalesce(sb.display_name, ''))) LIKE rt.term || '%' THEN 2.35
          WHEN lower(unaccent(coalesce(sb.display_name, ''))) LIKE '%' || rt.term || '%' THEN 1.25
          ELSE 0
        END
        + CASE
            WHEN lower(unaccent(coalesce(sb.locality, ''))) = rt.term THEN 0.95
            WHEN lower(unaccent(coalesce(sb.nearest_metro, ''))) = rt.term THEN 0.85
            ELSE 0
          END
        + similarity(sb.trgm_document, rt.term)
        + CASE WHEN rt.source_type IS NOT NULL THEN rt.alias_score * 0.18 ELSE 0 END
        + CASE WHEN sb.verification_status = 'verified' THEN 0.12 ELSE 0 END
        + CASE
            WHEN sb.profile_completeness_score IS NOT NULL
              THEN (sb.profile_completeness_score::float / 100.0) * 0.06
            ELSE 0
          END
      ) AS score
    FROM public.search_branches sb
    CROSS JOIN resolved_terms rt
    CROSS JOIN params p
    WHERE
      sb.is_active = true
      AND p.normalized <> ''
      AND length(p.normalized) >= 2
      AND (
        lower(unaccent(coalesce(sb.display_name, ''))) LIKE '%' || rt.term || '%'
        OR lower(unaccent(coalesce(sb.locality, ''))) LIKE '%' || rt.term || '%'
        OR lower(unaccent(coalesce(sb.nearest_metro, ''))) LIKE '%' || rt.term || '%'
        OR similarity(sb.trgm_document, rt.term) > 0.08
      )
    GROUP BY sb.display_name, sb.slug, sb.city, sb.profile_completeness_score
    ORDER BY score DESC, sb.profile_completeness_score DESC NULLS LAST, sb.display_name ASC
    LIMIT 5
  ),
  locality_matches AS (
    SELECT DISTINCT ON (lower(unaccent(lb.locality)), lb.city)
      'locality'::text AS type,
      lb.locality AS label,
      lower(replace(lb.locality, ' ', '-')) AS slug,
      lb.city AS city,
      max(
        CASE
          WHEN lower(unaccent(lb.locality)) = rt.term THEN 2.7
          WHEN lower(unaccent(lb.locality)) LIKE rt.term || '%' THEN 1.85
          WHEN lower(unaccent(lb.locality)) LIKE '%' || rt.term || '%' THEN 1.15
          ELSE 0
        END
        + similarity(lower(unaccent(lb.locality)), rt.term)
        + CASE WHEN rt.source_type = 'locality' THEN rt.alias_score * 0.35 ELSE 0 END
      ) AS score
    FROM public.library_branches lb
    CROSS JOIN resolved_terms rt
    CROSS JOIN params p
    WHERE
      lb.is_active = true
      AND lb.locality IS NOT NULL
      AND p.normalized <> ''
      AND length(p.normalized) >= 2
      AND (
        lower(unaccent(lb.locality)) LIKE '%' || rt.term || '%'
        OR similarity(lower(unaccent(lb.locality)), rt.term) > 0.10
      )
    GROUP BY lb.locality, lb.city
    ORDER BY lower(unaccent(lb.locality)), lb.city, score DESC
  ),
  metro_matches AS (
    SELECT DISTINCT ON (lower(unaccent(lb.nearest_metro)), lb.city)
      'metro'::text AS type,
      lb.nearest_metro AS label,
      lower(replace(lb.nearest_metro, ' ', '-')) AS slug,
      lb.city AS city,
      max(
        CASE
          WHEN lower(unaccent(lb.nearest_metro)) = rt.term THEN 2.55
          WHEN lower(unaccent(lb.nearest_metro)) LIKE rt.term || '%' THEN 1.75
          WHEN lower(unaccent(lb.nearest_metro)) LIKE '%' || rt.term || '%' THEN 1.05
          ELSE 0
        END
        + similarity(lower(unaccent(lb.nearest_metro)), rt.term)
        + CASE WHEN rt.source_type = 'metro' THEN rt.alias_score * 0.35 ELSE 0 END
      ) AS score
    FROM public.library_branches lb
    CROSS JOIN resolved_terms rt
    CROSS JOIN params p
    WHERE
      lb.is_active = true
      AND lb.nearest_metro IS NOT NULL
      AND p.normalized <> ''
      AND length(p.normalized) >= 2
      AND (
        lower(unaccent(lb.nearest_metro)) LIKE '%' || rt.term || '%'
        OR similarity(lower(unaccent(lb.nearest_metro)), rt.term) > 0.10
      )
    GROUP BY lb.nearest_metro, lb.city
    ORDER BY lower(unaccent(lb.nearest_metro)), lb.city, score DESC
  )
  SELECT type, label, slug, city
  FROM (
    SELECT type, label, slug, city, score, 0 AS type_sort FROM library_matches
    UNION ALL
    SELECT type, label, slug, city, score, 1 AS type_sort FROM (
      SELECT * FROM locality_matches ORDER BY score DESC, label ASC LIMIT 3
    ) locality_ranked
    UNION ALL
    SELECT type, label, slug, city, score, 2 AS type_sort FROM (
      SELECT * FROM metro_matches ORDER BY score DESC, label ASC LIMIT 3
    ) metro_ranked
  ) combined
  ORDER BY type_sort ASC, score DESC, label ASC;
$$;
