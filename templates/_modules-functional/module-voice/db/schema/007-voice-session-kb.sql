-- =============================================
-- MODULE-VOICE: Voice Session KB Junction Table
-- =============================================
-- Purpose: Associates knowledge bases with voice sessions for AI grounding
-- Created: January 16, 2026
-- Naming: Follows CORA Rule 3 (Junction Tables - both nouns singular)

-- Drop if exists for idempotency
DROP TABLE IF EXISTS public.voice_session_kb CASCADE;

-- =============================================
-- VOICE_SESSION_KB TABLE (Junction: voice_sessions <-> kb_bases)
-- =============================================

CREATE TABLE IF NOT EXISTS public.voice_session_kb (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.voice_sessions(id) ON DELETE CASCADE,
    kb_id UUID NOT NULL REFERENCES public.kb_bases(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    added_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT voice_session_kb_unique UNIQUE (session_id, kb_id)
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_voice_session_kb_session ON public.voice_session_kb(session_id);
CREATE INDEX IF NOT EXISTS idx_voice_session_kb_kb ON public.voice_session_kb(kb_id);

-- Index for finding enabled KBs for a voice session
CREATE INDEX IF NOT EXISTS idx_voice_session_kb_enabled ON public.voice_session_kb(session_id, is_enabled) WHERE is_enabled = true;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.voice_session_kb ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Access controlled through parent voice_sessions table
CREATE POLICY "voice_session_kb_select_policy" ON public.voice_session_kb
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.voice_sessions vs
            WHERE vs.id = voice_session_kb.session_id
            AND can_access_org_data(vs.org_id)
        )
    );

CREATE POLICY "voice_session_kb_insert_policy" ON public.voice_session_kb
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.voice_sessions vs
            WHERE vs.id = voice_session_kb.session_id
            AND can_access_org_data(vs.org_id)
        )
    );

CREATE POLICY "voice_session_kb_update_policy" ON public.voice_session_kb
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.voice_sessions vs
            WHERE vs.id = voice_session_kb.session_id
            AND can_modify_org_data(vs.org_id)
        )
    );

CREATE POLICY "voice_session_kb_delete_policy" ON public.voice_session_kb
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.voice_sessions vs
            WHERE vs.id = voice_session_kb.session_id
            AND can_modify_org_data(vs.org_id)
        )
    );

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.voice_session_kb IS 'Junction table: Associates knowledge bases with voice sessions for AI grounding';
COMMENT ON COLUMN public.voice_session_kb.session_id IS 'Voice session this KB association belongs to';
COMMENT ON COLUMN public.voice_session_kb.kb_id IS 'Knowledge base to use for AI grounding in voice responses';
COMMENT ON COLUMN public.voice_session_kb.is_enabled IS 'Whether this KB is currently active for the voice session';
COMMENT ON COLUMN public.voice_session_kb.added_at IS 'When the KB association was added';
COMMENT ON COLUMN public.voice_session_kb.added_by IS 'User who added the KB association';
