-- =============================================
-- MODULE-AI: AI Providers (Production-Aligned)
-- =============================================
-- Purpose: Platform-level AI provider configuration
-- Version: 2.0 (December 2025 - Aligned with pm-app production)
-- Note: This is PLATFORM-LEVEL (no org_id) - accessible to admins only

-- =============================================
-- AI_PROVIDERS TABLE
-- =============================================

CREATE TABLE public.ai_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT,
    provider_type TEXT NOT NULL,  -- e.g., 'aws_bedrock', 'azure_openai', 'openai'
    credentials_secret_path TEXT,  -- Path to secret in AWS Secrets Manager
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_ai_providers_name ON public.ai_providers(name);
CREATE INDEX idx_ai_providers_provider_type ON public.ai_providers(provider_type);
CREATE INDEX idx_ai_providers_is_active ON public.ai_providers(is_active);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.ai_providers IS 'Platform-level configuration for external AI providers. Only accessible by super_admin, global_owner, and global_admin.';
COMMENT ON COLUMN public.ai_providers.name IS 'Unique provider name';
COMMENT ON COLUMN public.ai_providers.provider_type IS 'Provider type: aws_bedrock, azure_openai, openai, etc.';
COMMENT ON COLUMN public.ai_providers.credentials_secret_path IS 'Path to the secret in a secrets manager (e.g., AWS Secrets Manager ARN).';
COMMENT ON COLUMN public.ai_providers.is_active IS 'Whether provider is currently enabled';

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;

-- Admin-only access (super_admin, global_owner, global_admin)
CREATE POLICY "ai_providers_admin_access" ON public.ai_providers
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.global_role IN ('super_admin', 'global_owner', 'global_admin')
        )
    );

-- Service role has full access
CREATE POLICY "Service role full access to ai_providers" 
    ON public.ai_providers
    FOR ALL
    USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- =============================================
-- TRIGGER: Auto-update updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_ai_providers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_providers_updated_at
    BEFORE UPDATE ON public.ai_providers
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_providers_updated_at();

-- =============================================
-- TRIGGER: Set created_by on insert
-- =============================================

CREATE OR REPLACE FUNCTION set_ai_providers_created_by()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.created_by IS NULL THEN
        NEW.created_by = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_providers_created_by
    BEFORE INSERT ON public.ai_providers
    FOR EACH ROW
    EXECUTE FUNCTION set_ai_providers_created_by();
