-- Migration: 20260710011000_geospatial_search_fix.sql
-- Purpose: Adds slug to geospatial search return type

DROP FUNCTION IF EXISTS public.search_libraries_geospatial(TEXT);

CREATE OR REPLACE FUNCTION public.search_libraries_geospatial(search_term TEXT)
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  slug TEXT,
  locality TEXT,
  city TEXT,
  aggregate_rating DOUBLE PRECISION,
  review_count INTEGER,
  distance_meters DOUBLE PRECISION,
  library_score DOUBLE PRECISION,
  matched_locality TEXT
) AS $$
DECLARE
  target_lat DOUBLE PRECISION;
  target_lng DOUBLE PRECISION;
  matched_locality_name TEXT;
  target_geog GEOGRAPHY;
BEGIN
  -- Pillar 1: Relevance (Fuzzy Matching using pg_trgm)
  SELECT name, latitude, longitude INTO matched_locality_name, target_lat, target_lng
  FROM public.localities
  WHERE is_active = true AND latitude IS NOT NULL
  ORDER BY similarity(name, search_term) DESC
  LIMIT 1;

  IF target_lat IS NULL OR target_lng IS NULL THEN
    RETURN;
  END IF;

  target_geog := ST_SetSRID(ST_MakePoint(target_lng, target_lat), 4326)::geography;

  -- Pillar 2 & 3: Distance and Prominence
  RETURN QUERY
  SELECT 
    lb.id,
    lb.display_name,
    lb.slug,
    lb.locality,
    lb.city,
    COALESCE(lb.aggregate_rating, 0) AS aggregate_rating,
    COALESCE(lb.review_count, 0) AS review_count,
    ST_Distance(lb.geography, target_geog) AS distance_meters,
    (COALESCE(lb.aggregate_rating, 0) * 10) / 
    (1 + POWER(ST_Distance(lb.geography, target_geog) / 1000.0, 1.5)) AS library_score,
    matched_locality_name AS matched_locality
  FROM public.library_branches lb
  WHERE lb.is_active = true
    AND lb.geography IS NOT NULL
    AND ST_DWithin(lb.geography, target_geog, 20000)
  ORDER BY library_score DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql STABLE;
