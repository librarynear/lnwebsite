DROP FUNCTION IF EXISTS public.search_suggestions(text);
DROP FUNCTION IF EXISTS public.search_suggestions(text, text, int);

CREATE OR REPLACE FUNCTION public.search_suggestions(
  query_term text,
  city_filter text DEFAULT NULL,
  max_results int DEFAULT 10
)
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
    SELECT
      lower(unaccent(trim(query_term))) AS normalized,
      nullif(lower(trim(city_filter)), '') AS normalized_city,
      greatest(1, least(coalesce(max_results, 10), 12)) AS result_limit
  ),
  alias_hits AS (
    SELECT DISTINCT ON (pa.place_type, pa.canonical_name)
      pa.place_type,
      lower(unaccent(pa.canonical_name)) AS canonical_term,
      CASE
        WHEN lower(unaccent(pa.alias_text)) = p.normalized THEN 2.5
        WHEN lower(unaccent(pa.alias_text)) LIKE p.normalized || '%' THEN 1.7
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
          WHEN lower(unaccent(coalesce(sb.display_name, ''))) = rt.term THEN 3.4
          WHEN lower(unaccent(coalesce(sb.display_name, ''))) LIKE rt.term || '%' THEN 2.45
          WHEN lower(unaccent(coalesce(sb.display_name, ''))) LIKE '%' || rt.term || '%' THEN 1.15
          ELSE 0
        END
        + CASE
            WHEN lower(unaccent(coalesce(sb.locality, ''))) = rt.term THEN 0.95
            WHEN lower(unaccent(coalesce(sb.locality, ''))) LIKE rt.term || '%' THEN 0.45
            WHEN lower(unaccent(coalesce(sb.nearest_metro, ''))) = rt.term THEN 0.85
            WHEN lower(unaccent(coalesce(sb.nearest_metro, ''))) LIKE rt.term || '%' THEN 0.35
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
      AND (p.normalized_city IS NULL OR lower(sb.city) = p.normalized_city)
      AND (
        lower(unaccent(coalesce(sb.display_name, ''))) LIKE '%' || rt.term || '%'
        OR lower(unaccent(coalesce(sb.locality, ''))) LIKE '%' || rt.term || '%'
        OR lower(unaccent(coalesce(sb.nearest_metro, ''))) LIKE '%' || rt.term || '%'
        OR similarity(sb.trgm_document, rt.term) > 0.08
      )
    GROUP BY sb.display_name, sb.slug, sb.city, sb.profile_completeness_score
  ),
  ranked_library_matches AS (
    SELECT type, label, slug, city, score, 0 AS type_sort
    FROM library_matches
    ORDER BY score DESC, label ASC
    LIMIT 6
  ),
  locality_matches AS (
    SELECT DISTINCT ON (lower(unaccent(lb.locality)), lb.city)
      'locality'::text AS type,
      lb.locality AS label,
      lower(replace(lb.locality, ' ', '-')) AS slug,
      lb.city AS city,
      max(
        CASE
          WHEN lower(unaccent(lb.locality)) = rt.term THEN 2.8
          WHEN lower(unaccent(lb.locality)) LIKE rt.term || '%' THEN 1.95
          WHEN lower(unaccent(lb.locality)) LIKE '%' || rt.term || '%' THEN 1.1
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
      AND (p.normalized_city IS NULL OR lower(lb.city) = p.normalized_city)
      AND (
        lower(unaccent(lb.locality)) LIKE '%' || rt.term || '%'
        OR similarity(lower(unaccent(lb.locality)), rt.term) > 0.10
      )
    GROUP BY lb.locality, lb.city
    ORDER BY lower(unaccent(lb.locality)), lb.city, score DESC
  ),
  ranked_locality_matches AS (
    SELECT type, label, slug, city, score, 1 AS type_sort
    FROM locality_matches
    ORDER BY score DESC, label ASC
    LIMIT 2
  ),
  metro_matches AS (
    SELECT DISTINCT ON (lower(unaccent(lb.nearest_metro)), lb.city)
      'metro'::text AS type,
      lb.nearest_metro AS label,
      lower(replace(lb.nearest_metro, ' ', '-')) AS slug,
      lb.city AS city,
      max(
        CASE
          WHEN lower(unaccent(lb.nearest_metro)) = rt.term THEN 2.6
          WHEN lower(unaccent(lb.nearest_metro)) LIKE rt.term || '%' THEN 1.8
          WHEN lower(unaccent(lb.nearest_metro)) LIKE '%' || rt.term || '%' THEN 1.0
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
      AND (p.normalized_city IS NULL OR lower(lb.city) = p.normalized_city)
      AND (
        lower(unaccent(lb.nearest_metro)) LIKE '%' || rt.term || '%'
        OR similarity(lower(unaccent(lb.nearest_metro)), rt.term) > 0.10
      )
    GROUP BY lb.nearest_metro, lb.city
    ORDER BY lower(unaccent(lb.nearest_metro)), lb.city, score DESC
  ),
  ranked_metro_matches AS (
    SELECT type, label, slug, city, score, 2 AS type_sort
    FROM metro_matches
    ORDER BY score DESC, label ASC
    LIMIT 2
  )
  SELECT type, label, slug, city
  FROM (
    SELECT * FROM ranked_library_matches
    UNION ALL
    SELECT * FROM ranked_locality_matches
    UNION ALL
    SELECT * FROM ranked_metro_matches
  ) combined
  CROSS JOIN params p
  ORDER BY type_sort ASC, score DESC, label ASC
  LIMIT p.result_limit;
$$;
