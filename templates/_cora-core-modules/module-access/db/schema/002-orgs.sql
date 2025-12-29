-- =============================================
-- MODULE-ACCESS: Organizations (Production Schema)
-- =============================================
-- Purpose: Multi-tenant organization management
-- Source: Extracted from pm-app-stack production database Dec 2025

-- =============================================
-- ORGS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.orgs (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    owner_id UUID NOT NULL,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    logo_url TEXT NULL,
    CONSTRAINT orgs_pkey PRIMARY KEY (id),
    CONSTRAINT orgs_slug_key UNIQUE (slug),
    CONSTRAINT orgs_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users (id),
    CONSTRAINT orgs_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users (id) ON DELETE SET NULL,
    CONSTRAINT orgs_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users (id) ON DELETE SET NULL
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_orgs_owner_id ON public.orgs USING btree (owner_id);
CREATE INDEX IF NOT EXISTS idx_orgs_slug ON public.orgs USING btree (slug);
CREATE INDEX IF NOT EXISTS idx_orgs_created_by ON public.orgs(created_by);
CREATE INDEX IF NOT EXISTS idx_orgs_updated_by ON public.orgs(updated_by);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.orgs IS 'Organizations for multi-tenant data isolation';
COMMENT ON COLUMN public.orgs.name IS 'Organization display name';
COMMENT ON COLUMN public.orgs.slug IS 'URL-friendly unique identifier (e.g., acme-corp)';
COMMENT ON COLUMN public.orgs.owner_id IS 'Primary owner of the organization (references auth.users)';
COMMENT ON COLUMN public.orgs.created_by IS 'User who created this organization';
COMMENT ON COLUMN public.orgs.updated_by IS 'User who last updated this organization';
COMMENT ON COLUMN public.orgs.logo_url IS 'URL to organization logo image';

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;

-- Organization owners can update their organizations
DROP POLICY IF EXISTS "Org owners can update org" ON public.orgs;
CREATE POLICY "Org owners can update org" ON public.orgs
    FOR UPDATE 
    TO authenticated
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- Users can create new organizations
DROP POLICY IF EXISTS "Users can create organizations" ON public.orgs;
CREATE POLICY "Users can create organizations" ON public.orgs
    FOR INSERT 
    TO authenticated
    WITH CHECK (owner_id = auth.uid());

-- Organization owners can delete their organizations
DROP POLICY IF EXISTS "Org owners can delete org" ON public.orgs;
CREATE POLICY "Org owners can delete org" ON public.orgs
    FOR DELETE 
    TO authenticated
    USING (owner_id = auth.uid());

-- Service role has full access
DROP POLICY IF EXISTS "Service role full access to orgs" ON public.orgs;
CREATE POLICY "Service role full access to orgs" ON public.orgs
    FOR ALL
    USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- =============================================
-- TRIGGER: Auto-update updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_orgs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_orgs_updated_at ON orgs;
CREATE TRIGGER update_orgs_updated_at BEFORE UPDATE ON orgs 
    FOR EACH ROW
    EXECUTE FUNCTION update_orgs_updated_at();
