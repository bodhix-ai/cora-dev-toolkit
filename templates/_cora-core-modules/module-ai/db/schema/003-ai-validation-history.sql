-- =============================================
-- MODULE-AI: AI Model Validation History
-- =============================================
-- Purpose: Track validation attempts for AI models
-- Version: 2.0 (December 2025 - Aligned with pm-app production)
-- Note: Platform-level table for tracking model validation results

-- =============================================
-- AI_MODEL_VALIDATION_HISTORY TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.ai_model_validation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.ai_providers(id) ON DELETE CASCADE,
    model_id UUID REFERENCES public.ai_models(id) ON DELETE CASCADE,
    status TEXT NOT NULL,  -- 'available' or 'unavailable'
    error_message TEXT,
    latency_ms INTEGER,
    validation_category TEXT,  -- Categorizes validation results
    validated_at TIMESTAMPTZ DEFAULT NOW(),
    validated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_ai_model_validation_history_provider 
    ON public.ai_model_validation_history(provider_id, validated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_model_validation_history_model 
    ON public.ai_model_validation_history(model_id, validated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_model_validation_history_status 
    ON public.ai_model_validation_history(status);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.ai_model_validation_history IS 'Tracks validation attempts for AI models. Platform-level, admin-only access.';
COMMENT ON COLUMN public.ai_model_validation_history.status IS 'Validation result: available, unavailable';
COMMENT ON COLUMN public.ai_model_validation_history.error_message IS 'Error message if validation failed';
COMMENT ON COLUMN public.ai_model_validation_history.latency_ms IS 'Response latency in milliseconds';
COMMENT ON COLUMN public.ai_model_validation_history.validation_category IS 'Category: direct_invocation, requires_inference_profile, requires_marketplace, access_denied, etc.';

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.ai_model_validation_history ENABLE ROW LEVEL SECURITY;

-- Admin-only access (super_admin, global_owner, global_admin)
DROP POLICY IF EXISTS "ai_model_validation_history_admin_access" ON public.ai_model_validation_history;
CREATE POLICY "ai_model_validation_history_admin_access" ON public.ai_model_validation_history
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.global_role IN ('super_admin', 'global_owner', 'global_admin')
        )
    );

-- Service role has full access (for Lambda functions)
DROP POLICY IF EXISTS "Service role full access to ai_model_validation_history" ON public.ai_model_validation_history;
CREATE POLICY "Service role full access to ai_model_validation_history" ON public.ai_model_validation_history
    FOR ALL
    USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- =============================================
-- TRIGGER: Auto-update updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_ai_model_validation_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ai_model_validation_history_updated_at ON public.ai_model_validation_history;
CREATE TRIGGER ai_model_validation_history_updated_at BEFORE UPDATE ON public.ai_model_validation_history
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_model_validation_history_updated_at();
