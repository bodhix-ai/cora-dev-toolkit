-- =============================================
-- MODULE-ACCESS: User Provisioning Enhancement
-- =============================================
-- Purpose: Support automated user provisioning with org association
-- Features:
--   1. Email domain-based auto-provisioning
--   2. Invite-based user provisioning
--   3. Platform initialization tracking
-- Source: Phase 8 - User Provisioning Implementation

-- =============================================
-- TABLE: org_email_domains
-- =============================================
-- Stores email domains that can auto-join organizations
-- Example: Users with @acme.com email auto-join Acme Corp

CREATE TABLE IF NOT EXISTS public.org_email_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL,
    auto_provision BOOLEAN DEFAULT true,
    default_role VARCHAR(50) DEFAULT 'org_user',
    is_verified BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Prevent duplicate domains for same org
    CONSTRAINT org_email_domains_unique UNIQUE (org_id, domain)
);

-- =============================================
-- TABLE: user_invites
-- =============================================
-- Stores pending invitations for users to join organizations

CREATE TABLE IF NOT EXISTS public.user_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'org_user',
    invited_by UUID REFERENCES auth.users(id),
    status VARCHAR(20) DEFAULT 'pending',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Prevent duplicate invites for same email+org
    CONSTRAINT user_invites_unique UNIQUE (email, org_id),
    
    -- Status must be valid
    CONSTRAINT user_invites_status_check CHECK (status IN ('pending', 'accepted', 'expired', 'revoked'))
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Fast lookup during user provisioning (domain matching)
CREATE INDEX IF NOT EXISTS idx_org_email_domains_domain 
    ON public.org_email_domains(domain) 
    WHERE auto_provision = true;

-- Fast lookup for org's configured domains
CREATE INDEX IF NOT EXISTS idx_org_email_domains_org_id 
    ON public.org_email_domains(org_id);

-- Fast lookup for default role during provisioning
CREATE INDEX IF NOT EXISTS idx_org_email_domains_default_role 
    ON public.org_email_domains(default_role);

-- Fast lookup during user provisioning (invite checking)
CREATE INDEX IF NOT EXISTS idx_user_invites_email_status 
    ON public.user_invites(email, status) 
    WHERE status = 'pending';

-- Fast lookup for org's pending invites
CREATE INDEX IF NOT EXISTS idx_user_invites_org_id 
    ON public.user_invites(org_id, status);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.org_email_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS: org_email_domains
-- =============================================

-- Drop existing policies if they exist (makes this script idempotent)
DROP POLICY IF EXISTS "org_email_domains_select" ON public.org_email_domains;
DROP POLICY IF EXISTS "org_email_domains_insert" ON public.org_email_domains;
DROP POLICY IF EXISTS "org_email_domains_update" ON public.org_email_domains;
DROP POLICY IF EXISTS "org_email_domains_delete" ON public.org_email_domains;

-- Org members can view their org's email domains
-- Sys admins can view all email domains
DROP POLICY IF EXISTS "org_email_domains_select" ON public.org_email_domains;
DROP POLICY IF EXISTS "org_email_domains_select" ON public.org_email_domains;
DROP POLICY IF EXISTS "org_email_domains_select" ON public.org_email_domains;
CREATE POLICY "org_email_domains_select" ON public.org_email_domains
    FOR SELECT 
    TO authenticated
    USING (
        -- Org members can see their org's domains
        org_id IN (
            SELECT org_id 
            FROM public.org_members 
            WHERE user_id = auth.uid()
        )
        OR
        -- Sys admins can see all domains
        EXISTS (
            SELECT 1
            FROM public.user_profiles
            WHERE user_id = auth.uid()
            AND sys_role IN ('sys_owner', 'sys_admin')
        )
    );

-- Org owners/admins can insert email domains for their org
-- Sys admins can insert email domains for any org
DROP POLICY IF EXISTS "org_email_domains_insert" ON public.org_email_domains;
DROP POLICY IF EXISTS "org_email_domains_insert" ON public.org_email_domains;
DROP POLICY IF EXISTS "org_email_domains_insert" ON public.org_email_domains;
CREATE POLICY "org_email_domains_insert" ON public.org_email_domains
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        -- Org owners/admins can add domains to their org
        org_id IN (
            SELECT org_id 
            FROM public.org_members 
            WHERE user_id = auth.uid() 
            AND org_role IN ('org_owner', 'org_admin')
        )
        OR
        -- Sys admins can add domains to any org
        EXISTS (
            SELECT 1 
            FROM public.user_profiles 
            WHERE user_id = auth.uid() 
            AND sys_role IN ('sys_owner', 'sys_admin')
        )
    );

-- Org owners/admins can update email domains for their org
-- Sys admins can update email domains for any org
DROP POLICY IF EXISTS "org_email_domains_update" ON public.org_email_domains;
DROP POLICY IF EXISTS "org_email_domains_update" ON public.org_email_domains;
DROP POLICY IF EXISTS "org_email_domains_update" ON public.org_email_domains;
CREATE POLICY "org_email_domains_update" ON public.org_email_domains
    FOR UPDATE 
    TO authenticated
    USING (
        -- Org owners/admins can update their org's domains
        org_id IN (
            SELECT org_id 
            FROM public.org_members 
            WHERE user_id = auth.uid() 
            AND org_role IN ('org_owner', 'org_admin')
        )
        OR
        -- Sys admins can update any org's domains
        EXISTS (
            SELECT 1 
            FROM public.user_profiles 
            WHERE user_id = auth.uid() 
            AND sys_role IN ('sys_owner', 'sys_admin')
        )
    )
    WITH CHECK (
        -- Same as USING clause
        org_id IN (
            SELECT org_id 
            FROM public.org_members 
            WHERE user_id = auth.uid() 
            AND org_role IN ('org_owner', 'org_admin')
        )
        OR
        EXISTS (
            SELECT 1 
            FROM public.user_profiles 
            WHERE user_id = auth.uid() 
            AND sys_role IN ('sys_owner', 'sys_admin')
        )
    );

-- Org owners/admins can delete email domains for their org
-- Sys admins can delete email domains for any org
DROP POLICY IF EXISTS "org_email_domains_delete" ON public.org_email_domains;
DROP POLICY IF EXISTS "org_email_domains_delete" ON public.org_email_domains;
DROP POLICY IF EXISTS "org_email_domains_delete" ON public.org_email_domains;
CREATE POLICY "org_email_domains_delete" ON public.org_email_domains
    FOR DELETE 
    TO authenticated
    USING (
        -- Org owners/admins can delete their org's domains
        org_id IN (
            SELECT org_id 
            FROM public.org_members 
            WHERE user_id = auth.uid() 
            AND org_role IN ('org_owner', 'org_admin')
        )
        OR
        -- Sys admins can delete any org's domains
        EXISTS (
            SELECT 1 
            FROM public.user_profiles 
            WHERE user_id = auth.uid() 
            AND sys_role IN ('sys_owner', 'sys_admin')
        )
    );

-- Note: Service role bypasses RLS automatically, no policy needed

-- =============================================
-- RLS: user_invites
-- =============================================

-- Drop existing policies if they exist (makes this script idempotent)
DROP POLICY IF EXISTS "user_invites_select" ON public.user_invites;
DROP POLICY IF EXISTS "user_invites_insert" ON public.user_invites;
DROP POLICY IF EXISTS "user_invites_update" ON public.user_invites;
DROP POLICY IF EXISTS "user_invites_delete" ON public.user_invites;

-- Org members can view invites for their orgs
-- Sys admins can view all invites
-- Users can view invites addressed to them
DROP POLICY IF EXISTS "user_invites_select" ON public.user_invites;
DROP POLICY IF EXISTS "user_invites_select" ON public.user_invites;
DROP POLICY IF EXISTS "user_invites_select" ON public.user_invites;
CREATE POLICY "user_invites_select" ON public.user_invites
    FOR SELECT 
    TO authenticated
    USING (
        -- Org members can see their org's invites
        org_id IN (
            SELECT org_id 
            FROM public.org_members 
            WHERE user_id = auth.uid()
        )
        OR
        -- Sys admins can see all invites
        EXISTS (
            SELECT 1 
            FROM public.user_profiles 
            WHERE user_id = auth.uid() 
            AND sys_role IN ('sys_owner', 'sys_admin')
        )
        OR
        -- Users can see invites addressed to them
        email = (
            SELECT email
            FROM public.user_profiles
            WHERE user_id = auth.uid()
        )
    );

-- Org owners/admins can create invites for their org
-- Sys admins can create invites for any org
DROP POLICY IF EXISTS "user_invites_insert" ON public.user_invites;
DROP POLICY IF EXISTS "user_invites_insert" ON public.user_invites;
DROP POLICY IF EXISTS "user_invites_insert" ON public.user_invites;
CREATE POLICY "user_invites_insert" ON public.user_invites
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        -- Org owners/admins can invite to their org
        org_id IN (
            SELECT org_id 
            FROM public.org_members 
            WHERE user_id = auth.uid() 
            AND org_role IN ('org_owner', 'org_admin')
        )
        OR
        -- Sys admins can invite to any org
        EXISTS (
            SELECT 1 
            FROM public.user_profiles 
            WHERE user_id = auth.uid() 
            AND sys_role IN ('sys_owner', 'sys_admin')
        )
    );

-- Org owners/admins can update invites for their org
-- Sys admins can update any invite
DROP POLICY IF EXISTS "user_invites_update" ON public.user_invites;
DROP POLICY IF EXISTS "user_invites_update" ON public.user_invites;
DROP POLICY IF EXISTS "user_invites_update" ON public.user_invites;
CREATE POLICY "user_invites_update" ON public.user_invites
    FOR UPDATE 
    TO authenticated
    USING (
        -- Org owners/admins can update their org's invites
        org_id IN (
            SELECT org_id 
            FROM public.org_members 
            WHERE user_id = auth.uid() 
            AND org_role IN ('org_owner', 'org_admin')
        )
        OR
        -- Sys admins can update any invite
        EXISTS (
            SELECT 1 
            FROM public.user_profiles 
            WHERE user_id = auth.uid() 
            AND sys_role IN ('sys_owner', 'sys_admin')
        )
    )
    WITH CHECK (
        -- Same as USING clause
        org_id IN (
            SELECT org_id 
            FROM public.org_members 
            WHERE user_id = auth.uid() 
            AND org_role IN ('org_owner', 'org_admin')
        )
        OR
        EXISTS (
            SELECT 1 
            FROM public.user_profiles 
            WHERE user_id = auth.uid() 
            AND sys_role IN ('sys_owner', 'sys_admin')
        )
    );

-- Org owners/admins can delete invites for their org
-- Sys admins can delete any invite
DROP POLICY IF EXISTS "user_invites_delete" ON public.user_invites;
DROP POLICY IF EXISTS "user_invites_delete" ON public.user_invites;
DROP POLICY IF EXISTS "user_invites_delete" ON public.user_invites;
CREATE POLICY "user_invites_delete" ON public.user_invites
    FOR DELETE 
    TO authenticated
    USING (
        -- Org owners/admins can delete their org's invites
        org_id IN (
            SELECT org_id 
            FROM public.org_members 
            WHERE user_id = auth.uid() 
            AND org_role IN ('org_owner', 'org_admin')
        )
        OR
        -- Sys admins can delete any invite
        EXISTS (
            SELECT 1 
            FROM public.user_profiles 
            WHERE user_id = auth.uid() 
            AND sys_role IN ('sys_owner', 'sys_admin')
        )
    );

-- Note: Service role bypasses RLS automatically, no policy needed

-- =============================================
-- TRIGGERS: Auto-update updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_org_email_domains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS org_email_domains_updated_at ON public.org_email_domains;
DROP TRIGGER IF EXISTS org_email_domains_updated_at ON public.org_email_domains;
DROP TRIGGER IF EXISTS org_email_domains_updated_at ON public.org_email_domains;
DROP TRIGGER IF EXISTS org_email_domains_updated_at ON public.org_email_domains;
CREATE TRIGGER org_email_domains_updated_at BEFORE UPDATE ON public.org_email_domains
    FOR EACH ROW
    EXECUTE FUNCTION update_org_email_domains_updated_at();

CREATE OR REPLACE FUNCTION update_user_invites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_invites_updated_at ON public.user_invites;
DROP TRIGGER IF EXISTS user_invites_updated_at ON public.user_invites;
DROP TRIGGER IF EXISTS user_invites_updated_at ON public.user_invites;
DROP TRIGGER IF EXISTS user_invites_updated_at ON public.user_invites;
CREATE TRIGGER user_invites_updated_at BEFORE UPDATE ON public.user_invites
    FOR EACH ROW
    EXECUTE FUNCTION update_user_invites_updated_at();

-- =============================================
-- TRIGGER: Auto-expire invites
-- =============================================

CREATE OR REPLACE FUNCTION auto_expire_invites()
RETURNS TRIGGER AS $$
BEGIN
    -- Mark expired invites as expired
    UPDATE public.user_invites
    SET status = 'expired'
    WHERE status = 'pending'
      AND expires_at IS NOT NULL
      AND expires_at < NOW();
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_expired_invites ON public.user_invites;
DROP TRIGGER IF EXISTS check_expired_invites ON public.user_invites;
DROP TRIGGER IF EXISTS check_expired_invites ON public.user_invites;
CREATE TRIGGER check_expired_invites AFTER INSERT ON public.user_invites
    FOR EACH STATEMENT
    EXECUTE FUNCTION auto_expire_invites();

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.org_email_domains IS 'Email domains that can auto-join organizations during user provisioning';
COMMENT ON COLUMN public.org_email_domains.domain IS 'Email domain (e.g., acme.com)';
COMMENT ON COLUMN public.org_email_domains.auto_provision IS 'Whether users with this domain are auto-provisioned into org';
COMMENT ON COLUMN public.org_email_domains.default_role IS 'Role assigned to users who auto-provision via this domain (org_user, org_admin, org_owner)';
COMMENT ON COLUMN public.org_email_domains.is_verified IS 'Whether the domain ownership has been verified';
COMMENT ON COLUMN public.org_email_domains.updated_by IS 'User who last updated this domain configuration';

COMMENT ON TABLE public.user_invites IS 'Pending invitations for users to join organizations';
COMMENT ON COLUMN public.user_invites.email IS 'Email address of invited user';
COMMENT ON COLUMN public.user_invites.status IS 'Invite status: pending, accepted, expired, revoked';
COMMENT ON COLUMN public.user_invites.expires_at IS 'When the invite expires (NULL = never expires)';
