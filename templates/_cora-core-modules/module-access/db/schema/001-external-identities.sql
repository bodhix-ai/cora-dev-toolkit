-- =============================================
-- MODULE-ACCESS: External Identities
-- =============================================
-- Purpose: Map external authentication provider user IDs to Supabase auth.users
-- Note: Supports multiple auth providers (Okta, Clerk, Auth0, etc.)
-- Source: Copied from pm-app-stack production schema

-- =============================================
-- EXTERNAL_IDENTITIES TABLE
-- =============================================

CREATE TABLE public.external_identities (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,
    provider_name TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Ensure one external_id per provider
    CONSTRAINT external_identities_external_id_provider_name_key UNIQUE (external_id, provider_name)
);

-- =============================================
-- INDEXES
-- =============================================

-- Optimize lookups by auth_user_id
CREATE INDEX idx_external_identities_auth_user_id ON public.external_identities(auth_user_id);

-- Optimize lookups by provider
CREATE INDEX idx_external_identities_provider ON public.external_identities(provider_name);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.external_identities IS 'Maps external auth provider user IDs (e.g., Okta sub claim) to Supabase auth.users.id';
COMMENT ON COLUMN public.external_identities.auth_user_id IS 'Supabase auth.users.id (UUID)';
COMMENT ON COLUMN public.external_identities.external_id IS 'User ID from external provider (e.g., Okta user ID from JWT sub claim)';
COMMENT ON COLUMN public.external_identities.provider_name IS 'Auth provider name (e.g., "okta", "clerk", "auth0")';
COMMENT ON COLUMN public.external_identities.metadata IS 'Additional provider-specific data (e.g., original JWT claims)';

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.external_identities ENABLE ROW LEVEL SECURITY;

-- Users can view their own external identities
CREATE POLICY "Users can view their own external identities" 
    ON public.external_identities
    FOR SELECT 
    TO authenticated
    USING (auth_user_id = auth.uid());

-- Users can link their own external identities
CREATE POLICY "Users can link their own external identities" 
    ON public.external_identities
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth_user_id = auth.uid());

-- Users can update their own external identities
CREATE POLICY "Users can update their own external identities" 
    ON public.external_identities
    FOR UPDATE 
    TO authenticated
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

-- Users can delete their own external identities
CREATE POLICY "Users can delete their own external identities" 
    ON public.external_identities
    FOR DELETE 
    TO authenticated
    USING (auth_user_id = auth.uid());

-- Service role has full access (for Lambda functions)
CREATE POLICY "Service role full access to external_identities" 
    ON public.external_identities
    FOR ALL
    USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- =============================================
-- TRIGGER: Auto-update updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_external_identities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER external_identities_updated_at
    BEFORE UPDATE ON public.external_identities
    FOR EACH ROW
    EXECUTE FUNCTION update_external_identities_updated_at();
