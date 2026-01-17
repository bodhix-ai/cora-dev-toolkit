-- =============================================
-- MODULE-CHAT: Chat Messages Table
-- =============================================
-- Purpose: Message storage with role (user/assistant/system), content, and metadata including citations
-- Source: Created for CORA toolkit Jan 2026

-- =============================================
-- CHAT_MESSAGES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    token_usage JSONB,
    was_truncated BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT chat_messages_role_check CHECK (role IN ('user', 'assistant', 'system')),
    CONSTRAINT chat_messages_content_check CHECK (char_length(content) >= 1)
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

-- Composite index for fetching messages in order
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created ON public.chat_messages(session_id, created_at DESC);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.chat_messages IS 'Message storage with role (user/assistant/system), content, and metadata including citations';
COMMENT ON COLUMN public.chat_messages.session_id IS 'Parent chat session';
COMMENT ON COLUMN public.chat_messages.role IS 'Message role: user, assistant, or system';
COMMENT ON COLUMN public.chat_messages.content IS 'Message content (non-empty)';
COMMENT ON COLUMN public.chat_messages.metadata IS 'Message metadata (citations, model, temperature, ragContext)';
COMMENT ON COLUMN public.chat_messages.token_usage IS 'Token usage for this message (promptTokens, completionTokens, totalTokens)';
COMMENT ON COLUMN public.chat_messages.was_truncated IS 'Whether the response was truncated due to token limits';
COMMENT ON COLUMN public.chat_messages.created_by IS 'Creator user ID (for user messages)';

-- =============================================
-- NOTE: Row Level Security (RLS) Policies
-- =============================================
-- RLS policies for this table are defined in 007-chat-rls.sql
-- This ensures all tables exist before applying security constraints
