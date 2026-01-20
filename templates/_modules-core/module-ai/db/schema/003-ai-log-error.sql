-- =============================================
-- MODULE-AI: AI API Error Logging
-- =============================================
-- Purpose: Track AI API errors for operations monitoring
-- Dependencies: 001-ai-providers.sql, 002-ai-models.sql
-- Reference: docs/plans/plan_eval-inference-profile-fix.md Part 2
-- Naming: Follows ADR-011 Rule 8.2 (Log Tables) - ai_log_error

-- =============================================
-- AI_LOG_ERROR TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.ai_log_error (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Context
    provider_id UUID REFERENCES public.ai_providers(id) ON DELETE SET NULL,
    model_id UUID REFERENCES public.ai_models(id) ON DELETE SET NULL,
    request_source VARCHAR(100) NOT NULL,  -- e.g., 'eval-processor', 'chat', 'kb-processor'
    operation_type VARCHAR(50) NOT NULL,    -- e.g., 'text_generation', 'embedding', 'validation'
    
    -- Error Details
    error_type VARCHAR(100) NOT NULL,       -- e.g., 'inference_profile_required', 'rate_limit', 'model_not_found'
    error_message TEXT NOT NULL,
    error_raw JSONB,                        -- Full exception details
    
    -- Request Details
    model_id_attempted VARCHAR(255),        -- The model_id we tried to use
    validation_category VARCHAR(100),       -- What validation said about this model
    request_params JSONB,                   -- Sanitized request (no sensitive data)
    
    -- Metadata (Note: Uses ws_id per naming standard ADR-011 Rule 3)
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    org_id UUID,
    ws_id UUID,  -- ✅ Uses ws_ abbreviation for workspaces
    
    -- Tracking
    retry_count INTEGER DEFAULT 0,
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    
    -- Timestamps
    occurred_at TIMESTAMP NOT NULL DEFAULT now(),
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_ai_log_error_unresolved ON public.ai_log_error(occurred_at DESC) 
    WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_log_error_model ON public.ai_log_error(model_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_log_error_type ON public.ai_log_error(error_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_log_error_source ON public.ai_log_error(request_source, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_log_error_provider ON public.ai_log_error(provider_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_log_error_ws ON public.ai_log_error(ws_id, occurred_at DESC) WHERE ws_id IS NOT NULL;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.ai_log_error IS 'AI API error tracking for operations monitoring and alerting (ADR-011 Rule 8.2)';
COMMENT ON COLUMN public.ai_log_error.provider_id IS 'Foreign key to ai_providers table';
COMMENT ON COLUMN public.ai_log_error.model_id IS 'Foreign key to ai_models table';
COMMENT ON COLUMN public.ai_log_error.ws_id IS 'Foreign key to workspaces table (uses ws_ abbreviation per naming standard)';
COMMENT ON COLUMN public.ai_log_error.error_type IS 'Categorized error type: inference_profile_required, rate_limit_exceeded, model_not_found, access_denied, timeout, quota_exceeded, marketplace_subscription_required, unknown_error';
COMMENT ON COLUMN public.ai_log_error.validation_category IS 'Validation category from ai_models table at time of error';
COMMENT ON COLUMN public.ai_log_error.request_source IS 'Source Lambda/service that made the AI API call';
COMMENT ON COLUMN public.ai_log_error.operation_type IS 'Type of AI operation: text_generation, embedding, validation';

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.ai_log_error ENABLE ROW LEVEL SECURITY;

-- Admin-only access (sys_owner, sys_admin)
DROP POLICY IF EXISTS "ai_log_error_admin_access" ON public.ai_log_error;
CREATE POLICY "ai_log_error_admin_access" ON public.ai_log_error
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.user_id = auth.uid()
            AND user_profiles.sys_role IN ('sys_owner', 'sys_admin')
        )
    );

-- Service role has full access
DROP POLICY IF EXISTS "Service role full access to ai_log_error" ON public.ai_log_error;
CREATE POLICY "Service role full access to ai_log_error" ON public.ai_log_error
    FOR ALL
    USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');
