-- Migration: Add provider_model_summary view and validation history tracking
-- Created: 2025-11-17
-- Description: Adds database view for efficient model count queries and tracking validation history

-- Create validation history table to track validation attempts
CREATE TABLE IF NOT EXISTS public.ai_model_validation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.ai_providers(id) ON DELETE CASCADE,
    model_id UUID REFERENCES public.ai_models(id) ON DELETE CASCADE,
    status TEXT NOT NULL, -- 'available' or 'unavailable'
    error_message TEXT,
    latency_ms INTEGER,
    validated_at TIMESTAMPTZ DEFAULT NOW(),
    validated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_validation_history_provider 
    ON public.ai_model_validation_history(provider_id, validated_at DESC);
CREATE INDEX IF NOT EXISTS idx_validation_history_model 
    ON public.ai_model_validation_history(model_id, validated_at DESC);

-- Enable RLS
ALTER TABLE public.ai_model_validation_history ENABLE ROW LEVEL SECURITY;

-- Create policy for validation history (platform admin only)
DROP POLICY IF EXISTS "ai_model_validation_history_admin_access" ON public.ai_model_validation_history;
CREATE POLICY "ai_model_validation_history_admin_access" ON public.ai_model_validation_history
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() 
            AND global_role IN ('super_admin', 'global_owner', 'global_admin')
        )
    );

-- Create view for provider model summary counts
DROP VIEW IF EXISTS public.provider_model_summary;
DROP VIEW IF EXISTS public.ai_provider_model_summary;
CREATE VIEW public.ai_provider_model_summary AS
SELECT 
    p.id as provider_id,
    p.name as provider_name,
    p.display_name as provider_display_name,
    p.provider_type,
    p.is_active,
    COUNT(m.id) as total_models,
    COUNT(CASE WHEN m.status = 'discovered' THEN 1 END) as discovered_count,
    COUNT(CASE WHEN m.status = 'testing' THEN 1 END) as testing_count,
    COUNT(CASE WHEN m.status = 'available' THEN 1 END) as available_count,
    COUNT(CASE WHEN m.status = 'unavailable' THEN 1 END) as unavailable_count,
    COUNT(CASE WHEN m.status = 'deprecated' THEN 1 END) as deprecated_count,
    MAX(vh.validated_at) as last_validated_at,
    p.created_at,
    p.updated_at
FROM public.ai_providers p
LEFT JOIN public.ai_models m ON m.provider_id = p.id
LEFT JOIN public.ai_model_validation_history vh ON vh.provider_id = p.id
GROUP BY p.id, p.name, p.display_name, p.provider_type, p.is_active, p.created_at, p.updated_at;

-- Add comments
COMMENT ON TABLE public.ai_model_validation_history IS 'Tracks validation attempts for AI models with results and timestamps';
COMMENT ON VIEW public.ai_provider_model_summary IS 'Provides aggregated model counts by status for each provider';
COMMENT ON COLUMN public.ai_model_validation_history.latency_ms IS 'Model response latency in milliseconds during validation test';

-- Grant access to the view (inherits RLS from base tables)
GRANT SELECT ON public.ai_provider_model_summary TO authenticated;
