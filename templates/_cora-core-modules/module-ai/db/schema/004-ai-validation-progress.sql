-- =============================================
-- MODULE-AI: AI Model Validation Progress
-- =============================================
-- Purpose: Track real-time validation progress for AI model validation batches
-- Version: 2.0 (December 2025 - Aligned with pm-app production)
-- Note: Platform-level table for tracking ongoing validation jobs

-- =============================================
-- AI_MODEL_VALIDATION_PROGRESS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.ai_model_validation_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.ai_providers(id) ON DELETE CASCADE,
    total_models INTEGER NOT NULL DEFAULT 0,
    validated_count INTEGER NOT NULL DEFAULT 0,
    available_count INTEGER NOT NULL DEFAULT 0,
    unavailable_count INTEGER NOT NULL DEFAULT 0,
    current_model_id TEXT,  -- The model currently being validated
    status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_ai_model_validation_progress_provider 
    ON public.ai_model_validation_progress(provider_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_model_validation_progress_status 
    ON public.ai_model_validation_progress(status, started_at DESC);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.ai_model_validation_progress IS 'Tracks real-time progress of model validation batches. Used to avoid API Gateway timeouts.';
COMMENT ON COLUMN public.ai_model_validation_progress.total_models IS 'Total number of models to validate';
COMMENT ON COLUMN public.ai_model_validation_progress.validated_count IS 'Number of models validated so far';
COMMENT ON COLUMN public.ai_model_validation_progress.available_count IS 'Number of models found available';
COMMENT ON COLUMN public.ai_model_validation_progress.unavailable_count IS 'Number of models found unavailable';
COMMENT ON COLUMN public.ai_model_validation_progress.current_model_id IS 'Model ID currently being validated';
COMMENT ON COLUMN public.ai_model_validation_progress.status IS 'Job status: pending, in_progress, completed, failed';

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.ai_model_validation_progress ENABLE ROW LEVEL SECURITY;

-- Admin-only access (super_admin, global_owner, global_admin)
DROP POLICY IF EXISTS "ai_model_validation_progress_admin_access" ON public.ai_model_validation_progress;
CREATE POLICY "ai_model_validation_progress_admin_access" ON public.ai_model_validation_progress
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.global_role IN ('super_admin', 'global_owner', 'global_admin')
        )
    );

-- Service role has full access (for Lambda functions)
DROP POLICY IF EXISTS "Service role full access to ai_model_validation_progress" ON public.ai_model_validation_progress;
CREATE POLICY "Service role full access to ai_model_validation_progress" ON public.ai_model_validation_progress
    FOR ALL
    USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- =============================================
-- TRIGGER: Auto-update updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_ai_model_validation_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.last_updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ai_model_validation_progress_updated_at ON public.ai_model_validation_progress;
CREATE TRIGGER ai_model_validation_progress_updated_at BEFORE UPDATE ON public.ai_model_validation_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_model_validation_progress_updated_at();
