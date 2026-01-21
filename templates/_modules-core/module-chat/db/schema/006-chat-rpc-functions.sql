-- =============================================
-- MODULE-CHAT: RPC Functions
-- =============================================
-- Purpose: Helper functions for chat access control and queries
-- Source: Created for CORA toolkit Jan 2026

-- =============================================
-- FUNCTION: is_chat_owner
-- =============================================
-- Check if user is the owner (creator) of a chat session

CREATE OR REPLACE FUNCTION public.is_chat_owner(
    p_user_id UUID,
    p_session_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.chat_sessions
        WHERE id = p_session_id
        AND created_by = p_user_id
        AND is_deleted = false
    );
$$;

COMMENT ON FUNCTION public.is_chat_owner(UUID, UUID) IS 'Check if user is the owner (creator) of a chat session';

-- =============================================
-- FUNCTION: can_view_chat
-- =============================================
-- Check if user has permission to view a chat session
-- Returns true if user is owner, has a share, or is workspace member (for workspace-shared chats)

CREATE OR REPLACE FUNCTION public.can_view_chat(
    p_user_id UUID,
    p_session_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.chat_sessions cs
        WHERE cs.id = p_session_id
        AND cs.is_deleted = false
        AND (
            -- User is the owner
            cs.created_by = p_user_id
            OR
            -- User has a share (view or edit)
            EXISTS (
                SELECT 1 FROM public.chat_shares csh
                WHERE csh.session_id = cs.id
                AND csh.shared_with_user_id = p_user_id
            )
            OR
            -- Chat is shared with workspace and user is a workspace member
            (
                cs.is_shared_with_workspace = true
                AND cs.ws_id IS NOT NULL
                AND EXISTS (
                    SELECT 1 FROM public.ws_members wm
                    WHERE wm.ws_id = cs.ws_id
                    AND wm.user_id = p_user_id
                    AND wm.deleted_at IS NULL
                )
            )
        )
    );
$$;

COMMENT ON FUNCTION public.can_view_chat(UUID, UUID) IS 'Check if user has permission to view a chat session';

-- =============================================
-- FUNCTION: can_edit_chat
-- =============================================
-- Check if user has permission to send messages in a chat session
-- Returns true if user is owner, has edit share, or is workspace member (for workspace-shared chats)

CREATE OR REPLACE FUNCTION public.can_edit_chat(
    p_user_id UUID,
    p_session_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.chat_sessions cs
        WHERE cs.id = p_session_id
        AND cs.is_deleted = false
        AND (
            -- User is the owner
            cs.created_by = p_user_id
            OR
            -- User has an edit share
            EXISTS (
                SELECT 1 FROM public.chat_shares csh
                WHERE csh.session_id = cs.id
                AND csh.shared_with_user_id = p_user_id
                AND csh.permission_level = 'edit'
            )
            OR
            -- Chat is shared with workspace and user is a workspace member
            (
                cs.is_shared_with_workspace = true
                AND cs.ws_id IS NOT NULL
                AND EXISTS (
                    SELECT 1 FROM public.ws_members wm
                    WHERE wm.ws_id = cs.ws_id
                    AND wm.user_id = p_user_id
                    AND wm.deleted_at IS NULL
                )
            )
        )
    );
$$;

COMMENT ON FUNCTION public.can_edit_chat(UUID, UUID) IS 'Check if user has permission to send messages in a chat session';

-- =============================================
-- FUNCTION: get_accessible_chats
-- =============================================
-- Get all chat sessions accessible to a user, optionally filtered by workspace

CREATE OR REPLACE FUNCTION public.get_accessible_chats(
    p_user_id UUID,
    p_org_id UUID,
    p_ws_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    ws_id UUID,
    org_id UUID,
    created_by UUID,
    is_shared_with_workspace BOOLEAN,
    metadata JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    access_type TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        cs.id,
        cs.title,
        cs.ws_id,
        cs.org_id,
        cs.created_by,
        cs.is_shared_with_workspace,
        cs.metadata,
        cs.created_at,
        cs.updated_at,
        CASE 
            WHEN cs.created_by = p_user_id THEN 'owner'
            WHEN EXISTS (
                SELECT 1 FROM public.chat_shares csh
                WHERE csh.session_id = cs.id
                AND csh.shared_with_user_id = p_user_id
            ) THEN 'shared'
            ELSE 'workspace'
        END AS access_type
    FROM public.chat_sessions cs
    WHERE cs.org_id = p_org_id
    AND cs.is_deleted = false
    AND (p_ws_id IS NULL OR cs.ws_id = p_ws_id)
    AND (
        -- User is the owner
        cs.created_by = p_user_id
        OR
        -- User has a share
        EXISTS (
            SELECT 1 FROM public.chat_shares csh
            WHERE csh.session_id = cs.id
            AND csh.shared_with_user_id = p_user_id
        )
        OR
        -- Chat is shared with workspace and user is member
        (
            cs.is_shared_with_workspace = true
            AND cs.ws_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.ws_members wm
                WHERE wm.ws_id = cs.ws_id
                AND wm.user_id = p_user_id
                AND wm.deleted_at IS NULL
            )
        )
    )
    ORDER BY cs.updated_at DESC;
$$;

COMMENT ON FUNCTION public.get_accessible_chats(UUID, UUID, UUID) IS 'Get all chat sessions accessible to a user, optionally filtered by workspace';

-- =============================================
-- NOTE: KB-related RPC functions moved to module-kb
-- =============================================
-- The following functions are defined in module-kb/db/schema/010-chat-kb-grounding.sql:
-- - get_grounded_kbs_for_chat(UUID)
-- - get_available_kbs_for_chat(UUID, UUID)
-- These functions reference kb_bases and chat_kb_grounding tables which don't exist
-- until module-kb schema is created.

-- =============================================
-- GRANTS
-- =============================================

GRANT EXECUTE ON FUNCTION public.is_chat_owner(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_chat(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_chat(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_accessible_chats(UUID, UUID, UUID) TO authenticated;
