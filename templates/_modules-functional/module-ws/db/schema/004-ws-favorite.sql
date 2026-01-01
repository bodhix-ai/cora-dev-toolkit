-- =============================================
-- MODULE-WS: Workspace Favorite Table
-- =============================================
-- Purpose: Per-user workspace favorites for quick access and prioritization
-- Source: Created for CORA toolkit Dec 2025

-- =============================================
-- WS_FAVORITES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.ws_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ws_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_ws_favorites_ws_id ON public.ws_favorites(ws_id);
CREATE INDEX IF NOT EXISTS idx_ws_favorites_user_id ON public.ws_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_ws_favorites_created_at ON public.ws_favorites(created_at DESC);

-- Unique constraint: one favorite per user per workspace
CREATE UNIQUE INDEX IF NOT EXISTS idx_ws_favorites_unique ON public.ws_favorites(ws_id, user_id);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.ws_favorites IS 'Per-user workspace favorites for quick access';
COMMENT ON COLUMN public.ws_favorites.ws_id IS 'Foreign key to workspaces table';
COMMENT ON COLUMN public.ws_favorites.user_id IS 'User who favorited the workspace';
COMMENT ON COLUMN public.ws_favorites.created_at IS 'When the workspace was favorited';

-- =============================================
-- NOTE: Row Level Security (RLS) Policies
-- =============================================
-- RLS policies for this table are defined in 006-apply-rls.sql
-- This ensures all tables exist before applying security constraints
