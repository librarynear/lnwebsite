-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- 1. library_branches
CREATE TABLE public.library_branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    branch TEXT,
    display_name TEXT NOT NULL,
    pin_code TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT,
    locality TEXT,
    district TEXT,
    formatted_address TEXT,
    full_address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    map_link TEXT,
    nearest_metro TEXT,
    nearest_metro_line TEXT,
    nearest_metro_distance_km DOUBLE PRECISION,
    whatsapp_number TEXT,
    phone_number TEXT,
    total_seats INTEGER,
    opening_time TEXT,
    closing_time TEXT,
    amenities_text TEXT,
    verification_status TEXT DEFAULT 'unverified',
    profile_completeness_score INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_source TEXT,
    last_confirmed_at TIMESTAMP WITH TIME ZONE,
    last_admin_reviewed_at TIMESTAMP WITH TIME ZONE,
    last_owner_updated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. library_fee_plans
CREATE TABLE public.library_fee_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    library_branch_id UUID NOT NULL REFERENCES public.library_branches(id) ON DELETE CASCADE,
    plan_name TEXT NOT NULL,
    plan_type TEXT,
    duration_label TEXT,
    price INTEGER NOT NULL,
    currency TEXT DEFAULT 'INR',
    seat_type TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. library_images
CREATE TABLE public.library_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    library_branch_id UUID NOT NULL REFERENCES public.library_branches(id) ON DELETE CASCADE,
    imagekit_url TEXT NOT NULL,
    alt_text TEXT,
    is_cover BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. library_social_links
CREATE TABLE public.library_social_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    library_branch_id UUID NOT NULL REFERENCES public.library_branches(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    url TEXT NOT NULL,
    label TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. place_aliases
CREATE TABLE public.place_aliases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    place_type TEXT NOT NULL, -- e.g., 'metro', 'locality'
    canonical_name TEXT NOT NULL,
    alias_text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    source TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. leads
CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    library_branch_id UUID NOT NULL REFERENCES public.library_branches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    email TEXT,
    message TEXT,
    preferred_contact_method TEXT,
    status TEXT DEFAULT 'new', -- 'new', 'contacted', 'closed'
    source_page TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add updated_at trigger for tables with updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_library_branches_updated_at BEFORE UPDATE ON public.library_branches FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_library_fee_plans_updated_at BEFORE UPDATE ON public.library_fee_plans FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_library_social_links_updated_at BEFORE UPDATE ON public.library_social_links FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
