-- Migration: 20260702000000_waterfall_search_suggestions.sql
-- Description: Rewrite search_suggestions to use a Waterfall architecture (tsvector -> pg_trgm fallback)
-- to avoid sequential scans and utilize GIN indexes.

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
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  clean_query text;
  ts_query tsquery;
  result_count int;
  normalized_city text;
  normalized_query text;
BEGIN
  -- Normalize city filter
  normalized_city := nullif(lower(trim(city_filter)), '');
  normalized_query := lower(unaccent(trim(query_term)));

  IF normalized_query = '' OR length(normalized_query) < 2 THEN
    RETURN;
  END IF;

  -- Create prefix matching syntax for tsvector
  SELECT string_agg(lexeme || ':*', ' & ') INTO clean_query
  FROM unnest(string_to_array(normalized_query, ' ')) AS lexeme 
  WHERE lexeme != '';

  IF clean_query IS NULL OR clean_query = '' THEN
    RETURN;
  END IF;

  ts_query := to_tsquery('english', clean_query);

  -- Create a temporary table for alias matches
  CREATE TEMP TABLE temp_suggestions ON COMMIT DROP AS
  SELECT 
    pa.place_type AS type,
    pa.canonical_name AS label,
    lower(replace(pa.canonical_name, ' ', '-')) AS slug,
    coalesce(normalized_city, 'delhi') AS city,
    2 AS sort_order,
    CASE 
      WHEN lower(unaccent(pa.alias_text)) = normalized_query THEN 100
      WHEN lower(unaccent(pa.alias_text)) LIKE normalized_query || '%' THEN 80
      ELSE 0
    END AS score
  FROM public.place_aliases pa
  WHERE pa.is_active = true
    AND (
      lower(unaccent(pa.alias_text)) = normalized_query
      OR lower(unaccent(pa.alias_text)) LIKE normalized_query || '%'
    );

  -- STEP 1: TSVector Lightning Strike
  INSERT INTO temp_suggestions (type, label, slug, city, sort_order, score)
  SELECT 
    'library'::text AS type,
    sb.display_name AS label,
    sb.slug AS slug,
    sb.city AS city,
    3 AS sort_order,
    (ts_rank(sb.fts_document, ts_query) * 100 + coalesce(sb.profile_completeness_score, 0)) AS score
  FROM public.search_branches sb
  WHERE sb.fts_document @@ ts_query
    AND (normalized_city IS NULL OR lower(sb.city) = normalized_city)
  ORDER BY score DESC
  LIMIT max_results;

  GET DIAGNOSTICS result_count = ROW_COUNT;

  -- STEP 2: Trigram Typo Safety Net (Fallback)
  IF result_count = 0 THEN
    -- Postgres uses the GIN index for the '%' operator based on pg_trgm.similarity_threshold.
    -- Set a strict threshold for the session to ensure high-quality matches.
    SET LOCAL pg_trgm.similarity_threshold = 0.3;
    
    INSERT INTO temp_suggestions (type, label, slug, city, sort_order, score)
    SELECT 
      'library'::text AS type,
      sb.display_name AS label,
      sb.slug AS slug,
      sb.city AS city,
      3 AS sort_order,
      (similarity(sb.trgm_document, normalized_query) * 100 + coalesce(sb.profile_completeness_score, 0)) AS score
    FROM public.search_branches sb
    WHERE sb.trgm_document % normalized_query
      AND (normalized_city IS NULL OR lower(sb.city) = normalized_city)
    ORDER BY score DESC
    LIMIT max_results;
  END IF;

  -- Return aggregated results sorted by exact match first, then by score
  RETURN QUERY
  SELECT t.type, t.label, t.slug, t.city
  FROM temp_suggestions t
  ORDER BY t.sort_order ASC, t.score DESC
  LIMIT max_results;
END;
$$;
