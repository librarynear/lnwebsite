-- 1. Create a materialized view that aggregates all search document attributes
CREATE MATERIALIZED VIEW public.search_branches AS
SELECT
    lb.id as branch_id,
    lb.slug,
    lb.name,
    lb.display_name,
    lb.locality,
    lb.district,
    lb.nearest_metro,
    lb.pin_code,
    lb.amenities_text,
    lb.verification_status,
    lb.profile_completeness_score,
    
    -- Construct full-text vector weight map
    (
        setweight(to_tsvector('english', unaccent(coalesce(lb.name, ''))), 'A') ||
        setweight(to_tsvector('english', unaccent(coalesce(lb.locality, ''))), 'A') ||
        setweight(to_tsvector('english', unaccent(coalesce(lb.nearest_metro, ''))), 'B') ||
        setweight(to_tsvector('english', unaccent(coalesce(lb.district, ''))), 'B') ||
        setweight(to_tsvector('english', unaccent(coalesce(lb.amenities_text, ''))), 'C') ||
        setweight(to_tsvector('english', unaccent(coalesce(lb.full_address, ''))), 'D')
    ) as fts_document,

    -- String for Trigram Similarity matching
    unaccent(coalesce(lb.name, '') || ' ' || coalesce(lb.locality, '') || ' ' || coalesce(lb.district, '') || ' ' || coalesce(lb.nearest_metro, '')) as trgm_document
FROM
    public.library_branches lb
WHERE
    lb.is_active = true;

-- 2. Create the fast indexes on the Materialized View
-- Trigram index (GIST or GIN)
CREATE INDEX idx_search_branches_trgm ON public.search_branches USING GIN (trgm_document gin_trgm_ops);

-- Full-text index
CREATE INDEX idx_search_branches_fts ON public.search_branches USING GIN (fts_document);

-- Standard id index for concurrent refreshes
CREATE UNIQUE INDEX idx_search_branches_id ON public.search_branches(branch_id);

-- 3. Create a Postgres Function (RPC) for the frontend to call over API securely
CREATE OR REPLACE FUNCTION search_libraries(query_term text, limit_val int DEFAULT 20)
RETURNS TABLE (
    branch_id uuid,
    slug text,
    name text,
    display_name text,
    locality text,
    district text,
    nearest_metro text,
    verification_status text,
    score real
)
LANGUAGE plpgsql
AS $$
DECLARE
    clean_query text;
    ts_query tsquery;
BEGIN
    -- Normalize the incoming query
    clean_query := unaccent(query_term);
    
    -- Create prefix matching syntax
    SELECT string_agg(lexeme || ':*', ' & ') INTO clean_query
    FROM unnest(string_to_array(clean_query, ' ')) AS lexeme 
    WHERE lexeme != '';

    IF clean_query IS NULL OR clean_query = '' THEN
        RETURN;
    END IF;

    ts_query := to_tsquery('english', clean_query);

    RETURN QUERY
    SELECT 
        sb.branch_id,
        sb.slug,
        sb.name,
        sb.display_name,
        sb.locality,
        sb.district,
        sb.nearest_metro,
        sb.verification_status,
        -- Hybrid score: prioritize full-text match but blend in trigram similarity for typos
        (ts_rank(sb.fts_document, ts_query) * 2 + similarity(sb.trgm_document, unaccent(query_term)))::real as score
    FROM 
        public.search_branches sb
    WHERE 
        sb.fts_document @@ ts_query OR 
        sb.trgm_document % unaccent(query_term)
    ORDER BY 
        score DESC, 
        sb.verification_status DESC,
        sb.profile_completeness_score DESC
    LIMIT limit_val;
END;
$$;
