-- ========================================
-- Voice Module - Transcripts Table
-- Created: January 16, 2026
-- ========================================

DROP TABLE IF EXISTS public.voice_transcripts CASCADE;

CREATE TABLE public.voice_transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.voice_sessions(id) ON DELETE CASCADE,
    transcript_text TEXT,
    transcript_s3_url TEXT,
    candidate_name VARCHAR(255),
    interview_type VARCHAR(100),
    summary TEXT,
    word_count INTEGER,
    speaker_segments JSONB NOT NULL DEFAULT '[]',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_voice_transcripts_org_id ON public.voice_transcripts(org_id);
CREATE INDEX idx_voice_transcripts_session_id ON public.voice_transcripts(session_id);
CREATE INDEX idx_voice_transcripts_created_at ON public.voice_transcripts(created_at DESC);

-- Trigger function
CREATE OR REPLACE FUNCTION update_voice_transcripts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS voice_transcripts_updated_at ON public.voice_transcripts;
CREATE TRIGGER voice_transcripts_updated_at 
    BEFORE UPDATE ON public.voice_transcripts
    FOR EACH ROW
    EXECUTE FUNCTION update_voice_transcripts_updated_at();

-- Comments
COMMENT ON TABLE public.voice_transcripts IS 'Interview transcripts with S3 archival';
COMMENT ON COLUMN public.voice_transcripts.speaker_segments IS 'JSON array of speaker segments with timestamps';
COMMENT ON COLUMN public.voice_transcripts.transcript_s3_url IS 'S3 URL for archived transcript';
