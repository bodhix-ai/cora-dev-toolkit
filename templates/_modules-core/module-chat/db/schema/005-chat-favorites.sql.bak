-- =============================================
-- MODULE-CHAT: Chat Favorites Table
-- =============================================
-- Purpose: Allows users to mark chat sessions as favorites for quick access
-- Source: Created for CORA toolkit Jan 2026

-- =============================================
-- CHAT_FAVORITES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.chat_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chat_favorites_unique UNIQUE (session_id, user_id)
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_chat_favorites_session_id ON public.chat_favorites(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_favorites_user_id ON public.chat_favorites(user_id);

-- Composite index for user's favorites list
CREATE INDEX IF NOT EXISTS idx_chat_favorites_user_created ON public.chat_favorites(user_id, created_at DESC);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.chat_favorites IS 'Allows users to mark chat sessions as favorites for quick access';
COMMENT ON COLUMN public.chat_favorites.session_id IS 'Chat session that was favorited';
COMMENT ON COLUMN public.chat_favorites.user_id IS 'User who favorited the chat';
COMMENT ON COLUMN public.chat_favorites.created_at IS 'When the favorite was created';

-- =============================================
-- NOTE: Row Level Security (RLS) Policies
-- =============================================
-- RLS policies for this table are defined in 007-chat-rls.sql
-- This ensures all tables exist before applying security constraints
