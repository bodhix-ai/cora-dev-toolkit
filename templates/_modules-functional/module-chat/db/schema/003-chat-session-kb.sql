-- =============================================
-- MODULE-CHAT: Chat Session KB Junction Table
-- =============================================
-- Purpose: Associates knowledge bases with chat sessions for RAG context retrieval
-- Source: Created for CORA toolkit Jan 2026
-- Naming: Follows Rule 3 (Junction Tables - both nouns singular)

-- =============================================
-- CHAT_SESSION_KB TABLE (Junction: chat_sessions <-> kb_bases)
-- =============================================

CREATE TABLE IF NOT EXISTS public.chat_session_kb (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    kb_id UUID NOT NULL REFERENCES public.kb_bases(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    added_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT chat_session_kb_unique UNIQUE (session_id, kb_id)
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_chat_session_kb_session ON public.chat_session_kb(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_session_kb_kb ON public.chat_session_kb(kb_id);

-- Index for finding enabled KBs for a chat
CREATE INDEX IF NOT EXISTS idx_chat_session_kb_enabled ON public.chat_session_kb(session_id, is_enabled) WHERE is_enabled = true;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.chat_session_kb IS 'Junction table: Associates knowledge bases with chat sessions for RAG context retrieval';
COMMENT ON COLUMN public.chat_session_kb.session_id IS 'Chat session this KB association belongs to';
COMMENT ON COLUMN public.chat_session_kb.kb_id IS 'Knowledge base to use for RAG context';
COMMENT ON COLUMN public.chat_session_kb.is_enabled IS 'Whether this KB is currently active for the chat';
COMMENT ON COLUMN public.chat_session_kb.added_at IS 'When the KB association was added';
COMMENT ON COLUMN public.chat_session_kb.added_by IS 'User who added the KB association';

-- =============================================
-- NOTE: Row Level Security (RLS) Policies
-- =============================================
-- RLS policies for this table are defined in 007-chat-rls.sql
-- This ensures all tables exist before applying security constraints
