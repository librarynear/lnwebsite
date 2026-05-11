-- Stage 1 of the territory-by-locality production-readiness migration.
-- This migration is intentionally ADDITIVE ONLY: it creates the new
-- `localities` table, adds nullable `locality_id` FK columns to
-- `library_branches` and `sales_locality_assignments`, and backfills them
-- from existing text data. The legacy `city`/`locality` text columns on
-- `sales_locality_assignments` and the `UNIQUE (user_id, city, locality)`
-- constraint are left in place so application code can dual-write during
-- the rollout. A later migration can drop the legacy columns and tighten
-- NOT NULL after Stage 1 is verified in production.
--
-- Re-running this migration is safe: every step uses IF NOT EXISTS or
-- ON CONFLICT DO NOTHING.

CREATE TABLE IF NOT EXISTS public.localities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    city TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (city, name)
);

CREATE INDEX IF NOT EXISTS idx_localities_city_active
    ON public.localities(city)
    WHERE is_active;

DROP TRIGGER IF EXISTS update_localities_updated_at ON public.localities;
CREATE TRIGGER update_localities_updated_at
BEFORE UPDATE ON public.localities
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

ALTER TABLE public.library_branches
    ADD COLUMN IF NOT EXISTS locality_id UUID REFERENCES public.localities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_library_branches_locality_id_active
    ON public.library_branches(locality_id)
    WHERE is_active;

ALTER TABLE public.sales_locality_assignments
    ADD COLUMN IF NOT EXISTS locality_id UUID REFERENCES public.localities(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_sales_locality_assignments_locality_id
    ON public.sales_locality_assignments(locality_id);

-- Backfill the new table from every trimmed, non-empty (city, locality)
-- pair that currently exists in either source. Both feeds are unioned so
-- assignments referencing localities with zero libraries (or vice versa)
-- still get a canonical row.
INSERT INTO public.localities (city, name, slug)
SELECT
    pair.city,
    pair.name,
    regexp_replace(lower(pair.name), '[^a-z0-9]+', '-', 'g') AS slug
FROM (
    SELECT DISTINCT
        TRIM(BOTH FROM city) AS city,
        TRIM(BOTH FROM locality) AS name
    FROM public.library_branches
    WHERE city IS NOT NULL
      AND length(TRIM(BOTH FROM city)) > 0
      AND locality IS NOT NULL
      AND length(TRIM(BOTH FROM locality)) > 0

    UNION

    SELECT DISTINCT
        TRIM(BOTH FROM city) AS city,
        TRIM(BOTH FROM locality) AS name
    FROM public.sales_locality_assignments
    WHERE city IS NOT NULL
      AND length(TRIM(BOTH FROM city)) > 0
      AND locality IS NOT NULL
      AND length(TRIM(BOTH FROM locality)) > 0
) pair
ON CONFLICT (city, name) DO NOTHING;

UPDATE public.library_branches AS lb
SET locality_id = loc.id
FROM public.localities AS loc
WHERE lb.locality_id IS NULL
  AND lb.city IS NOT NULL
  AND lb.locality IS NOT NULL
  AND loc.city = TRIM(BOTH FROM lb.city)
  AND loc.name = TRIM(BOTH FROM lb.locality);

UPDATE public.sales_locality_assignments AS sla
SET locality_id = loc.id
FROM public.localities AS loc
WHERE sla.locality_id IS NULL
  AND sla.city IS NOT NULL
  AND sla.locality IS NOT NULL
  AND loc.city = TRIM(BOTH FROM sla.city)
  AND loc.name = TRIM(BOTH FROM sla.locality);

-- A locality-based uniqueness guard, enforced only when locality_id is set
-- so it coexists with the legacy (user_id, city, locality) unique while we
-- transition.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_sales_locality_assignments_user_locality_id
    ON public.sales_locality_assignments(user_id, locality_id)
    WHERE locality_id IS NOT NULL;
