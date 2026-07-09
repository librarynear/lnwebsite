-- Migration: 20260710010000_geospatial_search.sql
-- Purpose: Enables PostGIS and pg_trgm, adds lat/lng to localities, creates scoring function

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Update Localities Table
ALTER TABLE public.localities
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 3. Add GiST Indexes for insane performance
CREATE INDEX IF NOT EXISTS idx_localities_name_trgm 
ON public.localities USING gist (name gist_trgm_ops);

-- Add a generated geography column to library_branches for spatial indexing
ALTER TABLE public.library_branches
ADD COLUMN IF NOT EXISTS geography GEOGRAPHY(Point, 4326) 
GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED;

CREATE INDEX IF NOT EXISTS idx_library_branches_geography 
ON public.library_branches USING gist (geography);

-- 4. Backfill Localities Centers
-- We calculate the center of each locality by averaging the coordinates of all its libraries
UPDATE public.localities l
SET 
  latitude = subquery.avg_lat,
  longitude = subquery.avg_lng
FROM (
  SELECT locality_id, AVG(latitude) as avg_lat, AVG(longitude) as avg_lng
  FROM public.library_branches
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND locality_id IS NOT NULL
  GROUP BY locality_id
) AS subquery
WHERE l.id = subquery.locality_id;

-- 5. Create the Geospatial Search RPC Function
CREATE OR REPLACE FUNCTION public.search_libraries_geospatial(search_term TEXT)
RETURNS TABLE (
  id UUID,
  display_name TEXT,
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
  -- Find the best matching locality based on user's typo-prone input
  SELECT name, latitude, longitude INTO matched_locality_name, target_lat, target_lng
  FROM public.localities
  WHERE is_active = true AND latitude IS NOT NULL
  ORDER BY similarity(name, search_term) DESC
  LIMIT 1;

  -- If no locality is matched at all (or missing coordinates), return empty
  IF target_lat IS NULL OR target_lng IS NULL THEN
    RETURN;
  END IF;

  target_geog := ST_SetSRID(ST_MakePoint(target_lng, target_lat), 4326)::geography;

  -- Pillar 2 & 3: Distance and Prominence
  RETURN QUERY
  SELECT 
    lb.id,
    lb.display_name,
    lb.locality,
    lb.city,
    COALESCE(lb.aggregate_rating, 0) AS aggregate_rating,
    COALESCE(lb.review_count, 0) AS review_count,
    ST_Distance(lb.geography, target_geog) AS distance_meters,
    
    -- The "Google Maps" Exponential Decay Scoring Algorithm
    -- (Rating * 10) / (1 + (Distance_in_KM ^ 1.5))
    -- Note: distance_meters / 1000 = distance_km
    (COALESCE(lb.aggregate_rating, 0) * 10) / 
    (1 + POWER(ST_Distance(lb.geography, target_geog) / 1000.0, 1.5)) AS library_score,
    
    matched_locality_name AS matched_locality
  FROM public.library_branches lb
  WHERE lb.is_active = true
    AND lb.geography IS NOT NULL
    -- Restrict to a massive 20km radius (to catch those edge cases but avoid scanning all of India)
    AND ST_DWithin(lb.geography, target_geog, 20000)
  ORDER BY library_score DESC
  LIMIT 50;

END;
$$ LANGUAGE plpgsql STABLE;
