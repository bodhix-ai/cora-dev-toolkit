-- =============================================
-- MODULE-VOICE: Voice Session KB Junction Table
-- =============================================
-- Purpose: Associates knowledge bases with voice sessions for AI grounding
-- Created: January 16, 2026
-- Naming: Follows CORA Rule 1 (Plural tables)

-- Drop if exists for idempotency
DROP TABLE IF EXISTS public.voice_session_kbs CASCADE;

-- =============================================
-- VOICE_SESSION_KBS TABLE (Junction: voice_sessions <-> kb_bases)
-- =============================================

CREATE TABLE IF NOT EXISTS public.voice_session_kbs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.voice_sessions(id) ON DELETE CASCADE,
    kb_id UUID NOT NULL REFERENCES public.kb_bases(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    added_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT voice_session_kbs_unique UNIQUE (session_id, kb_id)
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_voice_session_kbs_session ON public.voice_session_kbs(session_id);
CREATE INDEX IF NOT EXISTS idx_voice_session_kbs_kb ON public.voice_session_kbs(kb_id);

-- Index for finding enabled KBs for a voice session
CREATE INDEX IF NOT EXISTS idx_voice_session_kbs_enabled ON public.voice_session_kbs(session_id, is_enabled) WHERE is_enabled = true;

-- =============================================
-- NOTE: Row Level Security (RLS) Policies
-- =============================================
-- RLS policies for this table are defined in 009-apply-rls.sql
-- This ensures all tables exist before applying security constraints
-- Access is controlled through parent voice_sessions table

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.voice_session_kbs IS 'Junction table: Associates knowledge bases with voice sessions for AI grounding';
COMMENT ON COLUMN public.voice_session_kbs.session_id IS 'Voice session this KB association belongs to';
COMMENT ON COLUMN public.voice_session_kbs.kb_id IS 'Knowledge base to use for AI grounding in voice responses';
COMMENT ON COLUMN public.voice_session_kbs.is_enabled IS 'Whether this KB is currently active for the voice session';
COMMENT ON COLUMN public.voice_session_kbs.added_at IS 'When the KB association was added';
COMMENT ON COLUMN public.voice_session_kbs.added_by IS 'User who added the KB association';
