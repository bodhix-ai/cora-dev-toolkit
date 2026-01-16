-- ========================================
-- Knowledge Base Module Schema
-- Migration: 007-kb-access-chats.sql
-- Created: January 14, 2026
-- ========================================

-- Table: kb_access_chats
CREATE TABLE IF NOT EXISTS public.kb_access_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_base_id UUID NOT NULL REFERENCES public.kb_bases(id) ON DELETE CASCADE,
    chat_session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    is_override BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- One toggle per KB-chat pair
    CONSTRAINT kb_access_chats_unique UNIQUE (knowledge_base_id, chat_session_id)
);

-- Indexes
CREATE INDEX idx_kb_access_chats_kb_id ON public.kb_access_chats(knowledge_base_id);
CREATE INDEX idx_kb_access_chats_chat_id ON public.kb_access_chats(chat_session_id);
CREATE INDEX idx_kb_access_chats_enabled ON public.kb_access_chats(chat_session_id, is_enabled) 
    WHERE is_enabled = true;

-- Comments
COMMENT ON TABLE public.kb_access_chats IS 'Chat-level KB enablement (Step 4: user enables KB for specific chat session)';
COMMENT ON COLUMN public.kb_access_chats.is_override IS 'True if user explicitly toggled (vs. default inheritance)';
