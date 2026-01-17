-- ========================================
-- Voice Module - Analytics Table
-- Created: January 16, 2026
-- ========================================

DROP TABLE IF EXISTS public.voice_analytics CASCADE;

CREATE TABLE public.voice_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.voice_sessions(id) ON DELETE CASCADE,
    transcript_id UUID REFERENCES public.voice_transcripts(id) ON DELETE SET NULL,
    overall_score NUMERIC(5,2),
    category_scores JSONB NOT NULL DEFAULT '{}',
    strengths TEXT[] NOT NULL DEFAULT '{}',
    weaknesses TEXT[] NOT NULL DEFAULT '{}',
    recommendations TEXT[] NOT NULL DEFAULT '{}',
    key_moments JSONB NOT NULL DEFAULT '[]',
    detailed_analysis JSONB NOT NULL DEFAULT '{}',
    model_used VARCHAR(100),
    processing_time_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- One analytics per session
    CONSTRAINT voice_analytics_session_unique UNIQUE (session_id),
    CONSTRAINT voice_analytics_score_check CHECK (
        overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100)
    )
);

-- Indexes
CREATE INDEX idx_voice_analytics_org_id ON public.voice_analytics(org_id);
CREATE INDEX idx_voice_analytics_session_id ON public.voice_analytics(session_id);
CREATE INDEX idx_voice_analytics_transcript_id ON public.voice_analytics(transcript_id);
CREATE INDEX idx_voice_analytics_overall_score ON public.voice_analytics(overall_score DESC);

-- Trigger function
CREATE OR REPLACE FUNCTION update_voice_analytics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS voice_analytics_updated_at ON public.voice_analytics;
CREATE TRIGGER voice_analytics_updated_at 
    BEFORE UPDATE ON public.voice_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_voice_analytics_updated_at();

-- Comments
COMMENT ON TABLE public.voice_analytics IS 'AI-generated interview analysis and scoring';
COMMENT ON COLUMN public.voice_analytics.category_scores IS 'JSON object with scores per evaluation category';
COMMENT ON COLUMN public.voice_analytics.key_moments IS 'JSON array of notable moments during interview';
COMMENT ON COLUMN public.voice_analytics.model_used IS 'AI model used for analysis (e.g., gpt-4)';
