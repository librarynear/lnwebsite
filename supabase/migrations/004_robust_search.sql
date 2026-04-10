-- ============================================================
-- RUN THIS ENTIRE SCRIPT IN SUPABASE SQL EDITOR
-- Dashboard → SQL Editor → New query → paste → Run
-- ============================================================

-- 1. EXTENSIONS (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. SEARCH_EVENTS TABLE (for query logging)
CREATE TABLE IF NOT EXISTS public.search_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query       text NOT NULL,
  result_count int NOT NULL DEFAULT 0,
  city        text,
  clicked_slug text,  -- filled when user clicks a result
  session_id  text,
  created_at  timestamptz DEFAULT now()
);

-- 3. PLACE_ALIASES (already exists, but ensure it does)
CREATE TABLE IF NOT EXISTS public.place_aliases (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_type     text NOT NULL,  -- 'metro' | 'locality' | 'abbreviation'
  canonical_name text NOT NULL,
  alias_text     text NOT NULL,
  is_active      bool DEFAULT true,
  source         text DEFAULT 'manual',
  created_at     timestamptz DEFAULT now()
);

-- Seed common Delhi metro + locality aliases
INSERT INTO public.place_aliases (place_type, canonical_name, alias_text) VALUES
  ('metro', 'Guru Teg Bahadur Nagar', 'GTB Nagar'),
  ('metro', 'Guru Teg Bahadur Nagar', 'gtb'),
  ('metro', 'Rajiv Chowk', 'CP'),
  ('metro', 'Rajiv Chowk', 'Connaught Place'),
  ('metro', 'Vishwavidyalaya', 'VV'),
  ('metro', 'Indira Gandhi International Airport T3', 'IGI Airport'),
  ('metro', 'New Delhi', 'NDLS'),
  ('metro', 'Hauz Khas', 'HK'),
  ('locality', 'Mukherjee Nagar', 'Mukhrjee Nagar'),
  ('locality', 'Mukherjee Nagar', 'Mukherjee Ngr'),
  ('locality', 'Rajinder Nagar', 'Rajendra Nagar'),
  ('locality', 'Old Rajender Nagar', 'ORN'),
  ('locality', 'New Rajendra Nagar', 'NRN'),
  ('locality', 'Connaught Place', 'CP'),
  ('locality', 'Karol Bagh', 'KB')
ON CONFLICT DO NOTHING;

-- 4. DROP OLD SEARCH VIEW / FUNCTION IF EXISTS
DROP MATERIALIZED VIEW IF EXISTS public.search_branches CASCADE;
DROP FUNCTION IF EXISTS public.search_libraries(text);
DROP FUNCTION IF EXISTS public.search_suggestions(text);

-- 5. BUILD search_branches MATERIALIZED VIEW
CREATE MATERIALIZED VIEW public.search_branches AS
SELECT
  lb.id,
  lb.slug,
  lb.city,
  lb.display_name,
  lb.locality,
  lb.nearest_metro,
  lb.nearest_metro_distance_km,
  lb.verification_status,
  lb.profile_completeness_score,
  lb.is_active,
  lb.phone_number,
  lb.whatsapp_number,
  -- Full-text vector: weighted (A = name, B = locality+metro, C = address)
  setweight(to_tsvector('english', unaccent(coalesce(lb.display_name, ''))), 'A') ||
  setweight(to_tsvector('english', unaccent(coalesce(lb.name, ''))), 'A') ||
  setweight(to_tsvector('english', unaccent(coalesce(lb.locality, ''))), 'B') ||
  setweight(to_tsvector('english', unaccent(coalesce(lb.nearest_metro, ''))), 'B') ||
  setweight(to_tsvector('english', unaccent(coalesce(lb.district, ''))), 'C') ||
  setweight(to_tsvector('english', unaccent(coalesce(lb.full_address, ''))), 'C') ||
  setweight(to_tsvector('english', unaccent(coalesce(lb.amenities_text, ''))), 'D')
    AS search_vector,
  -- Trigram document for fuzzy matching
  unaccent(lower(
    coalesce(lb.display_name, '') || ' ' ||
    coalesce(lb.name, '') || ' ' ||
    coalesce(lb.locality, '') || ' ' ||
    coalesce(lb.nearest_metro, '') || ' ' ||
    coalesce(lb.district, '') || ' ' ||
    coalesce(lb.pin_code, '')
  )) AS trgm_document
FROM public.library_branches lb;

-- Indexes on the materialized view
CREATE INDEX idx_search_branches_fts  ON public.search_branches USING gin(search_vector);
CREATE INDEX idx_search_branches_trgm ON public.search_branches USING gin(trgm_document gin_trgm_ops);
CREATE INDEX idx_search_branches_slug ON public.search_branches(slug);

-- 6. MAIN SEARCH FUNCTION — hybrid FTS + trigram + aliases
CREATE OR REPLACE FUNCTION public.search_libraries(
  query_term  text,
  city_filter text DEFAULT NULL,
  max_results int  DEFAULT 60
)
RETURNS TABLE (
  id                        uuid,
  slug                      text,
  city                      text,
  display_name              text,
  locality                  text,
  nearest_metro             text,
  nearest_metro_distance_km numeric,
  verification_status       text,
  profile_completeness_score int,
  rank                      float4
)
LANGUAGE plpgsql STABLE AS $$
DECLARE
  normalized text;
  tsq        tsquery;
  alias_term text;
BEGIN
  -- Normalize: lowercase + unaccent
  normalized := lower(unaccent(trim(query_term)));
  IF normalized = '' THEN RETURN; END IF;

  -- Resolve alias (e.g. "GTB" → "Guru Teg Bahadur Nagar")
  SELECT pa.canonical_name INTO alias_term
  FROM public.place_aliases pa
  WHERE pa.is_active = true
    AND lower(pa.alias_text) = normalized
  LIMIT 1;

  -- Build tsquery: prefer alias if found, else websearch
  BEGIN
    tsq := websearch_to_tsquery('english', unaccent(coalesce(alias_term, query_term)));
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
      -- Composite rank: fts rank + trgm similarity + trust boosts
      (
        CASE WHEN tsq IS NOT NULL THEN
          ts_rank_cd(sb.search_vector, tsq, 4)  -- fts rank
        ELSE 0 END
        +
        greatest(
          similarity(sb.trgm_document, normalized),            -- trigram on original
          similarity(sb.trgm_document, lower(unaccent(coalesce(alias_term, normalized)))) -- trigram on alias
        )
        -- Trust boosts
        + CASE WHEN sb.verification_status = 'verified' THEN 0.15 ELSE 0 END
        + CASE WHEN sb.profile_completeness_score IS NOT NULL
               THEN (sb.profile_completeness_score::float / 100.0) * 0.10 ELSE 0 END
      )::float4 AS rank
    FROM public.search_branches sb
    WHERE
      (city_filter IS NULL OR lower(sb.city) = lower(city_filter))
      AND (
        -- 1. FTS match
        (tsq IS NOT NULL AND sb.search_vector @@ tsq)
        OR
        -- 2. Trigram match (handles typos, partials)
        similarity(sb.trgm_document, normalized) > 0.07
        OR
        -- 3. Alias-based trigram
        (alias_term IS NOT NULL AND similarity(sb.trgm_document, lower(unaccent(alias_term))) > 0.07)
      )
  )
  SELECT r.id, r.slug, r.city, r.display_name, r.locality,
         r.nearest_metro, r.nearest_metro_distance_km,
         r.verification_status, r.profile_completeness_score, r.rank
  FROM ranked r
  ORDER BY r.rank DESC
  LIMIT max_results;
END;
$$;

-- 7. SUGGESTIONS FUNCTION (for autocomplete dropdown)
CREATE OR REPLACE FUNCTION public.search_suggestions(query_term text)
RETURNS TABLE (
  type  text,
  label text,
  slug  text,
  city  text
)
LANGUAGE plpgsql STABLE AS $$
DECLARE
  normalized text;
BEGIN
  normalized := lower(unaccent(trim(query_term)));
  IF normalized = '' OR length(normalized) < 2 THEN RETURN; END IF;

  -- Library name matches (top 4)
  RETURN QUERY
  SELECT
    'library'::text as type,
    sb.display_name  as label,
    sb.slug          as slug,
    sb.city          as city
  FROM public.search_branches sb
  WHERE similarity(sb.trgm_document, normalized) > 0.08
     OR sb.trgm_document ILIKE '%' || normalized || '%'
  ORDER BY similarity(sb.trgm_document, normalized) DESC,
           sb.profile_completeness_score DESC NULLS LAST
  LIMIT 4;

  -- Locality matches (top 3, distinct)
  RETURN QUERY
  SELECT DISTINCT ON (lb.locality)
    'locality'::text as type,
    lb.locality      as label,
    lower(replace(lb.locality, ' ', '-')) as slug,
    lb.city          as city
  FROM public.library_branches lb
  WHERE lb.locality IS NOT NULL
    AND lower(unaccent(lb.locality)) ILIKE '%' || normalized || '%'
  LIMIT 3;

  -- Metro station matches (top 3, distinct)
  RETURN QUERY
  SELECT DISTINCT ON (lb.nearest_metro)
    'metro'::text         as type,
    lb.nearest_metro      as label,
    lower(replace(lb.nearest_metro, ' ', '-')) as slug,
    lb.city               as city
  FROM public.library_branches lb
  WHERE lb.nearest_metro IS NOT NULL
    AND lower(unaccent(lb.nearest_metro)) ILIKE '%' || normalized || '%'
  LIMIT 3;
END;
$$;

-- 8. AUTO-REFRESH: trigger to refresh search_branches when library data changes
CREATE OR REPLACE FUNCTION public.refresh_search_branches()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.search_branches;
  RETURN NULL;
END;
$$;

-- Uncomment below to enable auto-refresh (can slow writes; enable after testing)
-- DROP TRIGGER IF EXISTS trg_refresh_search ON public.library_branches;
-- CREATE TRIGGER trg_refresh_search
--   AFTER INSERT OR UPDATE OR DELETE ON public.library_branches
--   FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_search_branches();

-- Do an initial refresh now
REFRESH MATERIALIZED VIEW public.search_branches;

-- 9. RLS for search_events (optional but recommended)
ALTER TABLE public.search_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_insert_search_events" ON public.search_events
  FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_read_search_events_admin" ON public.search_events
  FOR SELECT USING (true); -- tighten once you have admin auth
