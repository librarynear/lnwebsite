INSERT INTO public.place_aliases (place_type, canonical_name, alias_text, source)
VALUES
  ('locality', 'New Rajendra Nagar', 'new rajinder nagar', 'phase1-search-quality'),
  ('locality', 'Old Rajender Nagar', 'old rajinder nagar', 'phase1-search-quality'),
  ('locality', 'Rajinder Nagar', 'rajinder nagar', 'phase1-search-quality'),
  ('locality', 'Rajinder Nagar', 'rajendra nagar', 'phase1-search-quality'),
  ('locality', 'Connaught Place', 'connaught pl', 'phase1-search-quality'),
  ('locality', 'Karol Bagh', 'karolbagh', 'phase1-search-quality'),
  ('metro', 'Rajendra Place', 'rajinder place', 'phase1-search-quality'),
  ('metro', 'Rajendra Place', 'rajendra pl', 'phase1-search-quality'),
  ('metro', 'Barakhamba Road', 'barakhamba', 'phase1-search-quality')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.search_libraries(
  query_term  text,
  city_filter text DEFAULT NULL,
  max_results int  DEFAULT 60
)
RETURNS TABLE (
  id                         uuid,
  slug                       text,
  city                       text,
  display_name               text,
  locality                   text,
  nearest_metro              text,
  nearest_metro_distance_km  numeric,
  verification_status        text,
  profile_completeness_score int,
  rank                       float4
)
LANGUAGE plpgsql STABLE AS $$
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
    AND lower(unaccent(pa.alias_text)) = normalized
  ORDER BY
    CASE pa.place_type
      WHEN 'locality' THEN 0
      WHEN 'metro' THEN 1
      ELSE 2
    END
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
        CASE WHEN tsq IS NOT NULL THEN ts_rank_cd(sb.search_vector, tsq, 4) * 2.2 ELSE 0 END
        + greatest(
            similarity(sb.trgm_document, normalized),
            similarity(sb.trgm_document, effective_term)
          )
        + CASE
            WHEN lower(unaccent(coalesce(sb.display_name, ''))) = effective_term THEN 1.35
            WHEN lower(unaccent(coalesce(sb.display_name, ''))) LIKE effective_term || '%' THEN 0.75
            WHEN lower(unaccent(coalesce(sb.display_name, ''))) LIKE '%' || effective_term || '%' THEN 0.25
            ELSE 0
          END
        + CASE
            WHEN lower(unaccent(coalesce(sb.locality, ''))) = effective_term THEN 0.95
            WHEN lower(unaccent(coalesce(sb.locality, ''))) LIKE effective_term || '%' THEN 0.45
            ELSE 0
          END
        + CASE
            WHEN lower(unaccent(coalesce(sb.nearest_metro, ''))) = effective_term THEN 0.85
            WHEN lower(unaccent(coalesce(sb.nearest_metro, ''))) LIKE effective_term || '%' THEN 0.35
            ELSE 0
          END
        + CASE WHEN alias_term IS NOT NULL THEN 0.18 ELSE 0 END
        + CASE WHEN sb.verification_status = 'verified' THEN 0.15 ELSE 0 END
        + CASE
            WHEN sb.profile_completeness_score IS NOT NULL
              THEN (sb.profile_completeness_score::float / 100.0) * 0.10
            ELSE 0
          END
      )::float4 AS rank,
      CASE
        WHEN lower(unaccent(coalesce(sb.display_name, ''))) = effective_term THEN 0
        WHEN lower(unaccent(coalesce(sb.locality, ''))) = effective_term THEN 1
        WHEN lower(unaccent(coalesce(sb.nearest_metro, ''))) = effective_term THEN 2
        WHEN lower(unaccent(coalesce(sb.display_name, ''))) LIKE effective_term || '%' THEN 3
        ELSE 4
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
  type  text,
  label text,
  slug  text,
  city  text
)
LANGUAGE sql STABLE AS $$
  WITH params AS (
    SELECT
      lower(unaccent(trim(query_term))) AS normalized
  ),
  library_matches AS (
    SELECT
      'library'::text AS type,
      sb.display_name AS label,
      sb.slug AS slug,
      sb.city AS city,
      (
        CASE
          WHEN lower(unaccent(coalesce(sb.display_name, ''))) = p.normalized THEN 3.0
          WHEN lower(unaccent(coalesce(sb.display_name, ''))) LIKE p.normalized || '%' THEN 2.1
          WHEN lower(unaccent(coalesce(sb.display_name, ''))) LIKE '%' || p.normalized || '%' THEN 1.2
          ELSE 0
        END
        + similarity(sb.trgm_document, p.normalized)
        + CASE WHEN sb.verification_status = 'verified' THEN 0.12 ELSE 0 END
        + CASE
            WHEN sb.profile_completeness_score IS NOT NULL
              THEN (sb.profile_completeness_score::float / 100.0) * 0.06
            ELSE 0
          END
      ) AS score
    FROM public.search_branches sb
    CROSS JOIN params p
    WHERE
      sb.is_active = true
      AND p.normalized <> ''
      AND length(p.normalized) >= 2
      AND (
        lower(unaccent(coalesce(sb.display_name, ''))) LIKE '%' || p.normalized || '%'
        OR lower(unaccent(coalesce(sb.locality, ''))) LIKE '%' || p.normalized || '%'
        OR lower(unaccent(coalesce(sb.nearest_metro, ''))) LIKE '%' || p.normalized || '%'
        OR similarity(sb.trgm_document, p.normalized) > 0.08
      )
    ORDER BY score DESC, sb.profile_completeness_score DESC NULLS LAST, sb.display_name ASC
    LIMIT 5
  ),
  locality_matches AS (
    SELECT DISTINCT ON (lower(unaccent(lb.locality)), lb.city)
      'locality'::text AS type,
      lb.locality AS label,
      lower(replace(lb.locality, ' ', '-')) AS slug,
      lb.city AS city,
      (
        CASE
          WHEN lower(unaccent(lb.locality)) = p.normalized THEN 2.5
          WHEN lower(unaccent(lb.locality)) LIKE p.normalized || '%' THEN 1.8
          WHEN lower(unaccent(lb.locality)) LIKE '%' || p.normalized || '%' THEN 1.1
          ELSE 0
        END
        + similarity(lower(unaccent(lb.locality)), p.normalized)
      ) AS score
    FROM public.library_branches lb
    CROSS JOIN params p
    WHERE
      lb.is_active = true
      AND lb.locality IS NOT NULL
      AND p.normalized <> ''
      AND length(p.normalized) >= 2
      AND (
        lower(unaccent(lb.locality)) LIKE '%' || p.normalized || '%'
        OR similarity(lower(unaccent(lb.locality)), p.normalized) > 0.1
      )
    ORDER BY lower(unaccent(lb.locality)), lb.city, score DESC
  ),
  metro_matches AS (
    SELECT DISTINCT ON (lower(unaccent(lb.nearest_metro)), lb.city)
      'metro'::text AS type,
      lb.nearest_metro AS label,
      lower(replace(lb.nearest_metro, ' ', '-')) AS slug,
      lb.city AS city,
      (
        CASE
          WHEN lower(unaccent(lb.nearest_metro)) = p.normalized THEN 2.4
          WHEN lower(unaccent(lb.nearest_metro)) LIKE p.normalized || '%' THEN 1.7
          WHEN lower(unaccent(lb.nearest_metro)) LIKE '%' || p.normalized || '%' THEN 1.0
          ELSE 0
        END
        + similarity(lower(unaccent(lb.nearest_metro)), p.normalized)
      ) AS score
    FROM public.library_branches lb
    CROSS JOIN params p
    WHERE
      lb.is_active = true
      AND lb.nearest_metro IS NOT NULL
      AND p.normalized <> ''
      AND length(p.normalized) >= 2
      AND (
        lower(unaccent(lb.nearest_metro)) LIKE '%' || p.normalized || '%'
        OR similarity(lower(unaccent(lb.nearest_metro)), p.normalized) > 0.1
      )
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
