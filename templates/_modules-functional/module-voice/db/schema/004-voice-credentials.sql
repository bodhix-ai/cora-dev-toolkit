-- ========================================
-- Voice Module - Credentials Table
-- Created: January 16, 2026
-- ========================================

DROP TABLE IF EXISTS public.voice_credentials CASCADE;

CREATE TABLE public.voice_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE,  -- NULL = platform credential, set = org credential
    service_name VARCHAR(50) NOT NULL,
    credentials_secret_arn TEXT NOT NULL,
    config_metadata JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_validated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT voice_credentials_service_check CHECK (
        service_name IN ('daily', 'deepgram', 'cartesia')
    )
);

-- Partial unique indexes for dual-level credential system
-- Platform credentials (org_id IS NULL): one per service
CREATE UNIQUE INDEX voice_credentials_service_platform_unique 
ON public.voice_credentials (service_name) 
WHERE org_id IS NULL;

-- Org credentials (org_id IS NOT NULL): one per service per org
CREATE UNIQUE INDEX voice_credentials_service_org_unique 
ON public.voice_credentials (service_name, org_id) 
WHERE org_id IS NOT NULL;

-- Indexes
CREATE INDEX idx_voice_credentials_org_id ON public.voice_credentials(org_id);
CREATE INDEX idx_voice_credentials_service ON public.voice_credentials(service_name);
CREATE INDEX idx_voice_credentials_is_active ON public.voice_credentials(is_active);

-- Trigger function
CREATE OR REPLACE FUNCTION update_voice_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS voice_credentials_updated_at ON public.voice_credentials;
CREATE TRIGGER voice_credentials_updated_at 
    BEFORE UPDATE ON public.voice_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_voice_credentials_updated_at();

-- Comments
COMMENT ON TABLE public.voice_credentials IS 'Voice service credentials (Daily, Deepgram, Cartesia)';
COMMENT ON COLUMN public.voice_credentials.credentials_secret_arn IS 'AWS Secrets Manager ARN for actual credentials';
COMMENT ON COLUMN public.voice_credentials.last_validated_at IS 'Last time credentials were validated';
