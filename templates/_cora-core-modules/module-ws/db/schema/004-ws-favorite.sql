-- =============================================
-- MODULE-WS: Workspace Favorite Table
-- =============================================
-- Purpose: Per-user workspace favorites for quick access and prioritization
-- Source: Created for CORA toolkit Dec 2025

-- =============================================
-- WS_FAVORITE TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.ws_favorite (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ws_id UUID NOT NULL REFERENCES public.workspace(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_ws_favorite_ws_id ON public.ws_favorite(ws_id);
CREATE INDEX IF NOT EXISTS idx_ws_favorite_user_id ON public.ws_favorite(user_id);
CREATE INDEX IF NOT EXISTS idx_ws_favorite_created_at ON public.ws_favorite(created_at DESC);

-- Unique constraint: one favorite per user per workspace
CREATE UNIQUE INDEX IF NOT EXISTS idx_ws_favorite_unique ON public.ws_favorite(ws_id, user_id);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.ws_favorite IS 'Per-user workspace favorites for quick access';
COMMENT ON COLUMN public.ws_favorite.ws_id IS 'Foreign key to workspace table';
COMMENT ON COLUMN public.ws_favorite.user_id IS 'User who favorited the workspace';
COMMENT ON COLUMN public.ws_favorite.created_at IS 'When the workspace was favorited';

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.ws_favorite ENABLE ROW LEVEL SECURITY;

-- Users can only view their own favorites
DROP POLICY IF EXISTS "Users can view own favorites" ON public.ws_favorite;
CREATE POLICY "Users can view own favorites" ON public.ws_favorite
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can add favorites for themselves if they're a workspace member
DROP POLICY IF EXISTS "Members can add favorites" ON public.ws_favorite;
CREATE POLICY "Members can add favorites" ON public.ws_favorite
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM public.ws_member
        WHERE ws_member.ws_id = ws_favorite.ws_id
        AND ws_member.user_id = auth.uid()
        AND ws_member.deleted_at IS NULL
    )
);

-- Users can only remove their own favorites
DROP POLICY IF EXISTS "Users can remove own favorites" ON public.ws_favorite;
CREATE POLICY "Users can remove own favorites" ON public.ws_favorite
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Service role has full access
DROP POLICY IF EXISTS "Service role full access to ws_favorite" ON public.ws_favorite;
CREATE POLICY "Service role full access to ws_favorite" ON public.ws_favorite
FOR ALL
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Grant usage to authenticated users (RLS policies will restrict actual access)
GRANT SELECT, INSERT, DELETE ON public.ws_favorite TO authenticated;

COMMENT ON POLICY "Users can view own favorites" ON public.ws_favorite IS 'Users can only see their own favorites';
COMMENT ON POLICY "Members can add favorites" ON public.ws_favorite IS 'Only workspace members can favorite a workspace';
COMMENT ON POLICY "Users can remove own favorites" ON public.ws_favorite IS 'Users can only unfavorite their own favorites';
