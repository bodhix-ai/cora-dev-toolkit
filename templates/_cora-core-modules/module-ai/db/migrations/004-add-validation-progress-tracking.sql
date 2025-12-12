-- Migration: Add validation progress tracking table
-- Created: 2025-11-18
-- Description: Adds table for tracking real-time validation progress to avoid API Gateway timeouts

-- Create validation progress table for tracking ongoing validations
CREATE TABLE IF NOT EXISTS public.ai_model_validation_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.ai_providers(id) ON DELETE CASCADE,
    total_models INTEGER NOT NULL DEFAULT 0,
    validated_count INTEGER NOT NULL DEFAULT 0,
    available_count INTEGER NOT NULL DEFAULT 0,
    unavailable_count INTEGER NOT NULL DEFAULT 0,
    current_model_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient queries by provider
CREATE INDEX IF NOT EXISTS idx_validation_progress_provider 
    ON public.ai_model_validation_progress(provider_id, started_at DESC);

-- Create index for querying active validations
CREATE INDEX IF NOT EXISTS idx_validation_progress_status 
    ON public.ai_model_validation_progress(status, started_at DESC);

-- Enable RLS
ALTER TABLE public.ai_model_validation_progress ENABLE ROW LEVEL SECURITY;

-- Create policy for validation progress (platform admin only)
DROP POLICY IF EXISTS "ai_model_validation_progress_admin_access" ON public.ai_model_validation_progress;
CREATE POLICY "ai_model_validation_progress_admin_access" ON public.ai_model_validation_progress
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() 
            AND global_role IN ('super_admin', 'global_owner', 'global_admin')
        )
    );

-- Add comments
COMMENT ON TABLE public.ai_model_validation_progress IS 'Tracks real-time progress of model validation operations to provide user feedback during long-running validations';
COMMENT ON COLUMN public.ai_model_validation_progress.status IS 'Validation status: pending, in_progress, completed, or failed';
COMMENT ON COLUMN public.ai_model_validation_progress.current_model_id IS 'The model ID currently being validated (for progress display)';
COMMENT ON COLUMN public.ai_model_validation_progress.validated_count IS 'Number of models validated so far';
COMMENT ON COLUMN public.ai_model_validation_progress.available_count IS 'Number of models that passed validation';
COMMENT ON COLUMN public.ai_model_validation_progress.unavailable_count IS 'Number of models that failed validation';
