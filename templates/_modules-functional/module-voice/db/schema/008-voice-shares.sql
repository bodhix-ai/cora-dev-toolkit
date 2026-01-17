-- =============================================
-- MODULE-VOICE: Voice Shares Table
-- =============================================
-- Purpose: Enables sharing voice sessions with specific users with permission levels
-- Created: January 17, 2026
-- Pattern: Follows module-chat shares pattern (ADR-014)

-- =============================================
-- VOICE_SHARES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.voice_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.voice_sessions(id) ON DELETE CASCADE,
    shared_with_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    permission_level VARCHAR(50) NOT NULL DEFAULT 'view',
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT voice_shares_unique UNIQUE (session_id, shared_with_user_id),
    CONSTRAINT voice_shares_permission_check CHECK (
        permission_level IN ('view', 'view_transcript', 'view_analytics')
    )
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_voice_shares_session_id ON public.voice_shares(session_id);
CREATE INDEX IF NOT EXISTS idx_voice_shares_shared_with ON public.voice_shares(shared_with_user_id);

-- Index for finding all sessions shared with a user
CREATE INDEX IF NOT EXISTS idx_voice_shares_user_permission ON public.voice_shares(shared_with_user_id, permission_level);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.voice_shares IS 'Enables sharing voice sessions with specific users with permission levels';
COMMENT ON COLUMN public.voice_shares.session_id IS 'Voice session being shared';
COMMENT ON COLUMN public.voice_shares.shared_with_user_id IS 'User receiving access to the session';
COMMENT ON COLUMN public.voice_shares.permission_level IS 'Permission level: view (all), view_transcript (transcript only), view_analytics (analytics only)';
COMMENT ON COLUMN public.voice_shares.created_by IS 'User who created the share (session owner)';
COMMENT ON COLUMN public.voice_shares.created_at IS 'When the share was created';

-- =============================================
-- NOTE: Row Level Security (RLS) Policies
-- =============================================
-- RLS policies for this table are defined in 009-apply-rls.sql
-- This ensures all tables exist before applying security constraints
