-- =============================================
-- MODULE-ACCESS: Organization Members (Production Schema)
-- =============================================
-- Purpose: Track organization membership and roles
-- Source: Extracted from pm-app-stack production database Dec 2025
-- Updated: December 20, 2025 - Updated FK reference profiles → user_profiles

-- =============================================
-- ORG_MEMBERS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.org_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    added_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Ensure a user can only be a member of an org once
    CONSTRAINT org_members_org_user_unique UNIQUE (org_id, user_id)
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON public.org_members(role);
CREATE INDEX IF NOT EXISTS idx_org_members_org_role ON public.org_members(org_id, role);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.org_members IS 'Organization membership with roles';
COMMENT ON COLUMN public.org_members.org_id IS 'Foreign key to orgs table';
COMMENT ON COLUMN public.org_members.user_id IS 'Foreign key to user_profiles.user_id';
COMMENT ON COLUMN public.org_members.role IS 'Organization-specific role: org_owner, org_admin, org_user';
COMMENT ON COLUMN public.org_members.added_by IS 'User who added this member';

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

-- Org members can view other members in their organizations
DROP POLICY IF EXISTS "Org members can view org members" ON public.org_members;
CREATE POLICY "Org members can view org members" ON public.org_members
    FOR SELECT 
    TO authenticated
    USING (
        org_id IN (
            SELECT org_id 
            FROM public.org_members 
            WHERE user_id = auth.uid()
        )
    );

-- Org owners can add members
DROP POLICY IF EXISTS "Org owners can add members" ON public.org_members;
CREATE POLICY "Org owners can add members" ON public.org_members
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        org_id IN (
            SELECT om.org_id 
            FROM public.org_members om
            WHERE om.user_id = auth.uid()
              AND om.role = 'org_owner'
        )
    );

-- Org owners can update members
DROP POLICY IF EXISTS "Org owners can update members" ON public.org_members;
CREATE POLICY "Org owners can update members" ON public.org_members
    FOR UPDATE 
    TO authenticated
    USING (
        org_id IN (
            SELECT om.org_id 
            FROM public.org_members om
            WHERE om.user_id = auth.uid()
              AND om.role = 'org_owner'
        )
    )
    WITH CHECK (
        org_id IN (
            SELECT om.org_id 
            FROM public.org_members om
            WHERE om.user_id = auth.uid()
              AND om.role = 'org_owner'
        )
    );

-- Org owners can remove members
DROP POLICY IF EXISTS "Org owners can remove members" ON public.org_members;
CREATE POLICY "Org owners can remove members" ON public.org_members
    FOR DELETE 
    TO authenticated
    USING (
        org_id IN (
            SELECT om.org_id 
            FROM public.org_members om
            WHERE om.user_id = auth.uid()
              AND om.role = 'org_owner'
        )
    );

-- Service role has full access
DROP POLICY IF EXISTS "Service role full access to org_members" ON public.org_members;
CREATE POLICY "Service role full access to org_members" ON public.org_members
    FOR ALL
    USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- =============================================
-- TRIGGER: Auto-update updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_org_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS org_members_updated_at ON public.org_members;
CREATE TRIGGER org_members_updated_at BEFORE UPDATE ON public.org_members
    FOR EACH ROW
    EXECUTE FUNCTION update_org_members_updated_at();

-- =============================================
-- RLS POLICY FOR ORGS (Now that org_members exists)
-- =============================================

-- Org members can view their organizations
DROP POLICY IF EXISTS "Org members can view orgs" ON public.orgs;
CREATE POLICY "Org members can view orgs" ON public.orgs
    FOR SELECT 
    TO authenticated
    USING (
        id IN (
            SELECT org_id 
            FROM public.org_members 
            WHERE user_id = auth.uid()
        )
    );
