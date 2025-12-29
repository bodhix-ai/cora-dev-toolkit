-- =============================================
-- MODULE-AI: AI Models (Production-Aligned)
-- =============================================
-- Purpose: Platform-level AI model catalog
-- Version: 2.0 (December 2025 - Aligned with pm-app production)
-- Note: This is PLATFORM-LEVEL (no org_id) - includes description and validation_category

-- =============================================
-- AI_MODELS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.ai_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.ai_providers(id) ON DELETE CASCADE,
    model_id TEXT NOT NULL,  -- Unique identifier from the provider
    display_name TEXT,
    description TEXT,  -- Human-readable description of the model
    capabilities JSONB,  -- e.g., {"chat": true, "embedding": false, "max_tokens": 4096}
    status TEXT DEFAULT 'available',  -- e.g., 'available', 'testing', 'deprecated'
    cost_per_1k_tokens_input NUMERIC(10, 6),
    cost_per_1k_tokens_output NUMERIC(10, 6),
    last_discovered_at TIMESTAMPTZ,
    validation_category VARCHAR(50),  -- Categorizes validation results
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Unique constraint on provider_id + model_id
    CONSTRAINT ai_models_provider_model_unique UNIQUE(provider_id, model_id)
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_ai_models_provider_id ON public.ai_models(provider_id);
CREATE INDEX IF NOT EXISTS idx_ai_models_model_id ON public.ai_models(model_id);
CREATE INDEX IF NOT EXISTS idx_ai_models_status ON public.ai_models(status);
CREATE INDEX IF NOT EXISTS idx_ai_models_validation_category ON public.ai_models(validation_category);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.ai_models IS 'Platform-level catalog of AI models discovered from configured providers. Only accessible by super_admin, global_owner, and global_admin.';
COMMENT ON COLUMN public.ai_models.model_id IS 'The unique identifier for the model as defined by the provider.';
COMMENT ON COLUMN public.ai_models.description IS 'Human-readable description of the model and its use cases';
COMMENT ON COLUMN public.ai_models.capabilities IS 'JSON object describing model capabilities (chat, embedding, max_tokens, etc.)';
COMMENT ON COLUMN public.ai_models.status IS 'Model status: available, testing, deprecated';
COMMENT ON COLUMN public.ai_models.validation_category IS 'Categorizes validation results: available, requires_inference_profile, requires_marketplace, invalid_request_format, access_denied, deprecated, timeout, unknown_error';

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;

-- Admin-only access (super_admin, global_owner, global_admin)
DROP POLICY IF EXISTS "ai_models_admin_access" ON public.ai_models;
CREATE POLICY "ai_models_admin_access" ON public.ai_models
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.global_role IN ('super_admin', 'global_owner', 'global_admin')
        )
    );

-- Service role has full access
DROP POLICY IF EXISTS "Service role full access to ai_models" ON public.ai_models;
CREATE POLICY "Service role full access to ai_models" ON public.ai_models
    FOR ALL
    USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- =============================================
-- TRIGGER: Auto-update updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_ai_models_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ai_models_updated_at ON public.ai_models;
CREATE TRIGGER ai_models_updated_at BEFORE UPDATE ON public.ai_models
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_models_updated_at();

-- =============================================
-- TRIGGER: Set created_by on insert
-- =============================================

CREATE OR REPLACE FUNCTION set_ai_models_created_by()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.created_by IS NULL THEN
        NEW.created_by = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ai_models_created_by ON public.ai_models;
CREATE TRIGGER ai_models_created_by BEFORE INSERT ON public.ai_models
    FOR EACH ROW
    EXECUTE FUNCTION set_ai_models_created_by();
