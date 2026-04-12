CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    user_type TEXT DEFAULT 'student',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_saved_libraries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    library_branch_id UUID NOT NULL REFERENCES public.library_branches(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, library_branch_id)
);

CREATE TABLE IF NOT EXISTS public.owner_library_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending_review',
    display_name TEXT NOT NULL,
    city TEXT NOT NULL,
    locality TEXT,
    district TEXT,
    state TEXT,
    pin_code TEXT,
    full_address TEXT,
    nearest_metro TEXT,
    phone_number TEXT NOT NULL,
    whatsapp_number TEXT,
    opening_time TEXT,
    closing_time TEXT,
    total_seats INTEGER,
    map_link TEXT,
    description TEXT,
    amenities_text TEXT,
    submitted_library_branch_id UUID REFERENCES public.library_branches(id) ON DELETE SET NULL,
    reviewer_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_user_saved_libraries_user_id
    ON public.user_saved_libraries(user_id);

CREATE INDEX IF NOT EXISTS idx_owner_library_submissions_user_id
    ON public.owner_library_submissions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_owner_library_submissions_status
    ON public.owner_library_submissions(status, created_at DESC);

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_owner_library_submissions_updated_at ON public.owner_library_submissions;
CREATE TRIGGER update_owner_library_submissions_updated_at
BEFORE UPDATE ON public.owner_library_submissions
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_saved_libraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_library_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "saved_libraries_select_own" ON public.user_saved_libraries;
CREATE POLICY "saved_libraries_select_own"
    ON public.user_saved_libraries
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_libraries_insert_own" ON public.user_saved_libraries;
CREATE POLICY "saved_libraries_insert_own"
    ON public.user_saved_libraries
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_libraries_delete_own" ON public.user_saved_libraries;
CREATE POLICY "saved_libraries_delete_own"
    ON public.user_saved_libraries
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "owner_submissions_select_own" ON public.owner_library_submissions;
CREATE POLICY "owner_submissions_select_own"
    ON public.owner_library_submissions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "owner_submissions_insert_own" ON public.owner_library_submissions;
CREATE POLICY "owner_submissions_insert_own"
    ON public.owner_library_submissions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "owner_submissions_update_pending_own" ON public.owner_library_submissions;
CREATE POLICY "owner_submissions_update_pending_own"
    ON public.owner_library_submissions
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id AND status = 'pending_review')
    WITH CHECK (auth.uid() = user_id AND status = 'pending_review');
