-- =============================================
-- MODULE-CHAT: Chat Shares Table
-- =============================================
-- Purpose: Enables sharing chat sessions with specific users with permission levels
-- Source: Created for CORA toolkit Jan 2026

-- =============================================
-- CHAT_SHARES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.chat_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    shared_with_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    permission_level VARCHAR(50) NOT NULL DEFAULT 'view',
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chat_shares_unique UNIQUE (session_id, shared_with_user_id),
    CONSTRAINT chat_shares_permission_check CHECK (permission_level IN ('view', 'edit'))
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_chat_shares_session_id ON public.chat_shares(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_shares_shared_with ON public.chat_shares(shared_with_user_id);

-- Index for finding all chats shared with a user
CREATE INDEX IF NOT EXISTS idx_chat_shares_user_permission ON public.chat_shares(shared_with_user_id, permission_level);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.chat_shares IS 'Enables sharing chat sessions with specific users with permission levels';
COMMENT ON COLUMN public.chat_shares.session_id IS 'Chat session being shared';
COMMENT ON COLUMN public.chat_shares.shared_with_user_id IS 'User receiving access to the chat';
COMMENT ON COLUMN public.chat_shares.permission_level IS 'Permission level: view (read-only) or edit (can send messages)';
COMMENT ON COLUMN public.chat_shares.created_by IS 'User who created the share (chat owner)';
COMMENT ON COLUMN public.chat_shares.created_at IS 'When the share was created';

-- =============================================
-- NOTE: Row Level Security (RLS) Policies
-- =============================================
-- RLS policies for this table are defined in 007-chat-rls.sql
-- This ensures all tables exist before applying security constraints
