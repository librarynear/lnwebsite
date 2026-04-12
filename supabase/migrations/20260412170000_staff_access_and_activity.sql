CREATE TABLE IF NOT EXISTS public.staff_users (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'sales',
    is_approved BOOLEAN NOT NULL DEFAULT false,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sales_locality_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.staff_users(user_id) ON DELETE CASCADE,
    city TEXT NOT NULL,
    locality TEXT NOT NULL,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, city, locality)
);

CREATE TABLE IF NOT EXISTS public.library_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    library_branch_id UUID NOT NULL REFERENCES public.library_branches(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    verification_status TEXT,
    changed_fields TEXT[] DEFAULT '{}'::TEXT[],
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.library_branches
    ADD COLUMN IF NOT EXISTS last_sales_reviewed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS last_sales_reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS last_verification_updated_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS last_verification_updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_staff_users_role_approved
    ON public.staff_users(role, is_approved);

CREATE INDEX IF NOT EXISTS idx_sales_locality_assignments_user_id
    ON public.sales_locality_assignments(user_id, city, locality);

CREATE INDEX IF NOT EXISTS idx_library_activity_logs_actor_user_id
    ON public.library_activity_logs(actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_library_activity_logs_library_branch_id
    ON public.library_activity_logs(library_branch_id, created_at DESC);

DROP TRIGGER IF EXISTS update_staff_users_updated_at ON public.staff_users;
CREATE TRIGGER update_staff_users_updated_at
BEFORE UPDATE ON public.staff_users
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
