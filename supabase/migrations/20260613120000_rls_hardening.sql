-- Security hardening migration: enable Row Level Security on every table that
-- was previously unprotected, and lock direct PostgREST access down to match
-- the application's actual access pattern.
--
-- Access model:
--   * The app performs all privileged reads/writes through the SERVICE ROLE
--     client (src/lib/supabase-server.ts), which bypasses RLS.
--   * The public website only needs anon/authenticated READ access to the
--     public catalog (libraries, fee plans, images, social links, localities,
--     place aliases).
--   * Sensitive tables (staff_users, leads, activity logs, sales assignments,
--     search_events) must NOT be readable or writable with the public anon key.
--
-- This migration is idempotent: it uses IF EXISTS / DROP POLICY IF EXISTS and
-- can be re-run safely.

-- ---------------------------------------------------------------------------
-- 1. PUBLIC CATALOG TABLES — public READ only, no client writes.
--    Enabling RLS with only a SELECT policy makes these read-only to the
--    anon/authenticated roles; the service role still has full access.
-- ---------------------------------------------------------------------------

ALTER TABLE public.library_branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "library_branches_public_read" ON public.library_branches;
CREATE POLICY "library_branches_public_read"
    ON public.library_branches
    FOR SELECT
    USING (is_active = true);

ALTER TABLE public.library_fee_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "library_fee_plans_public_read" ON public.library_fee_plans;
CREATE POLICY "library_fee_plans_public_read"
    ON public.library_fee_plans
    FOR SELECT
    USING (true);

ALTER TABLE public.library_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "library_images_public_read" ON public.library_images;
CREATE POLICY "library_images_public_read"
    ON public.library_images
    FOR SELECT
    USING (true);

-- library_social_links may not exist in every environment; guard it.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'library_social_links'
    ) THEN
        EXECUTE 'ALTER TABLE public.library_social_links ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "library_social_links_public_read" ON public.library_social_links';
        EXECUTE 'CREATE POLICY "library_social_links_public_read" ON public.library_social_links FOR SELECT USING (true)';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'place_aliases'
    ) THEN
        EXECUTE 'ALTER TABLE public.place_aliases ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "place_aliases_public_read" ON public.place_aliases';
        EXECUTE 'CREATE POLICY "place_aliases_public_read" ON public.place_aliases FOR SELECT USING (true)';
    END IF;
END $$;

ALTER TABLE public.localities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "localities_public_read" ON public.localities;
CREATE POLICY "localities_public_read"
    ON public.localities
    FOR SELECT
    USING (is_active = true);

-- ---------------------------------------------------------------------------
-- 2. SENSITIVE TABLES — no anon/authenticated access at all.
--    Enabling RLS with NO permissive policy denies all access to non-service
--    roles. The service role bypasses RLS so server actions keep working.
-- ---------------------------------------------------------------------------

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
-- No policies: anon/authenticated get zero rows and cannot write.

ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;
-- Allow a signed-in user to read ONLY their own staff row (useful if a future
-- client-side check is added). All writes remain service-role-only.
DROP POLICY IF EXISTS "staff_users_select_own" ON public.staff_users;
CREATE POLICY "staff_users_select_own"
    ON public.staff_users
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

ALTER TABLE public.sales_locality_assignments ENABLE ROW LEVEL SECURITY;
-- No policies: service-role-only.

ALTER TABLE public.library_activity_logs ENABLE ROW LEVEL SECURITY;
-- No policies: service-role-only.

-- ---------------------------------------------------------------------------
-- 3. search_events — replace the world-open (true) policies.
--    All inserts/reads go through the service role, so deny client access.
-- ---------------------------------------------------------------------------

ALTER TABLE public.search_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_insert_search_events" ON public.search_events;
DROP POLICY IF EXISTS "allow_read_search_events_admin" ON public.search_events;
-- No replacement policies: service-role-only access.

-- ---------------------------------------------------------------------------
-- 4. owner_library_submissions — tighten the INSERT policy so a user cannot
--    self-approve or pre-fill review fields by calling PostgREST directly.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "owner_submissions_insert_own" ON public.owner_library_submissions;
CREATE POLICY "owner_submissions_insert_own"
    ON public.owner_library_submissions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND status = 'pending_review'
        AND reviewer_notes IS NULL
        AND reviewed_at IS NULL
        AND submitted_library_branch_id IS NULL
    );

-- ---------------------------------------------------------------------------
-- 5. replace_library_fee_plans — SECURITY DEFINER function must not be
--    callable by ordinary users (it can wipe/replace any library's plans).
-- ---------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.replace_library_fee_plans(UUID, JSONB) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.replace_library_fee_plans(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_library_fee_plans(UUID, JSONB) TO service_role;

-- ---------------------------------------------------------------------------
-- 6. search_branches materialized view — stop leaking phone/WhatsApp numbers
--    through direct PostgREST reads. The search RPCs do not return these
--    columns, so column-level revoke is safe.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_matviews
        WHERE schemaname = 'public' AND matviewname = 'search_branches'
    ) THEN
        EXECUTE 'REVOKE SELECT (phone_number, whatsapp_number) ON public.search_branches FROM anon';
        EXECUTE 'REVOKE SELECT (phone_number, whatsapp_number) ON public.search_branches FROM authenticated';
        EXECUTE 'REVOKE SELECT (phone_number, whatsapp_number) ON public.search_branches FROM PUBLIC';
    END IF;
END $$;
