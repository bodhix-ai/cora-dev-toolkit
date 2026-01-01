-- =============================================
-- MODULE-AI: AI Providers (Production-Aligned)
-- =============================================
-- Purpose: Platform-level AI provider configuration
-- Version: 2.0 (December 2025 - Aligned with pm-app production)
-- Note: This is PLATFORM-LEVEL (no org_id) - accessible to admins only

-- =============================================
-- AI_PROVIDERS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.ai_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT,
    provider_type TEXT NOT NULL,  -- e.g., 'aws_bedrock', 'azure_openai', 'openai'
    auth_method TEXT DEFAULT 'secrets_manager',  -- 'iam_role', 'secrets_manager', 'ssm_parameter'
    credentials_secret_path TEXT,  -- Path to secret (null for iam_role)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT valid_auth_method CHECK (auth_method IN ('iam_role', 'secrets_manager', 'ssm_parameter'))
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_ai_providers_name ON public.ai_providers(name);
CREATE INDEX IF NOT EXISTS idx_ai_providers_provider_type ON public.ai_providers(provider_type);
CREATE INDEX IF NOT EXISTS idx_ai_providers_is_active ON public.ai_providers(is_active);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.ai_providers IS 'Platform-level configuration for external AI providers. Only accessible by platform_owner and platform_admin.';
COMMENT ON COLUMN public.ai_providers.name IS 'Unique provider name';
COMMENT ON COLUMN public.ai_providers.provider_type IS 'Provider type: aws_bedrock, azure_openai, openai, etc.';
COMMENT ON COLUMN public.ai_providers.auth_method IS 'Authentication method: iam_role (AWS only), secrets_manager (all providers), ssm_parameter (dev only)';
COMMENT ON COLUMN public.ai_providers.credentials_secret_path IS 'Path to secret in AWS Secrets Manager or Parameter Store. Null for iam_role auth.';
COMMENT ON COLUMN public.ai_providers.is_active IS 'Whether provider is currently enabled';

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;

-- Admin-only access (platform_owner, platform_admin)
DROP POLICY IF EXISTS "ai_providers_admin_access" ON public.ai_providers;
CREATE POLICY "ai_providers_admin_access" ON public.ai_providers
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.user_id = auth.uid()
            AND user_profiles.global_role IN ('platform_owner', 'platform_admin')
        )
    );

-- Service role has full access
DROP POLICY IF EXISTS "Service role full access to ai_providers" ON public.ai_providers;
CREATE POLICY "Service role full access to ai_providers" ON public.ai_providers
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

DROP TRIGGER IF EXISTS ai_providers_updated_at ON public.ai_providers;
CREATE TRIGGER ai_providers_updated_at BEFORE UPDATE ON public.ai_providers
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

DROP TRIGGER IF EXISTS ai_providers_created_by ON public.ai_providers;
CREATE TRIGGER ai_providers_created_by BEFORE INSERT ON public.ai_providers
    FOR EACH ROW
    EXECUTE FUNCTION set_ai_providers_created_by();

-- =============================================
-- SEED DATA: Default AI Providers
-- =============================================
-- These are the standard AI providers available in CORA
-- Idempotent: Safe to run multiple times

INSERT INTO public.ai_providers (name, display_name, provider_type, credentials_secret_path, is_active)
VALUES 
    ('google_ai', 'Google AI', 'google_vertex', NULL, true),
    ('azure_ai_foundry', 'Azure AI Foundry', 'azure_openai', NULL, true),
    ('aws_bedrock', 'AWS Bedrock', 'aws_bedrock', NULL, true)
ON CONFLICT (name) 
DO UPDATE SET
    display_name = EXCLUDED.display_name,
    provider_type = EXCLUDED.provider_type,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();
