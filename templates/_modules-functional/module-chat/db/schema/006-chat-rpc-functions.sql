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
                AND cs.workspace_id IS NOT NULL
                AND EXISTS (
                    SELECT 1 FROM public.ws_members wm
                    WHERE wm.ws_id = cs.workspace_id
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
                AND cs.workspace_id IS NOT NULL
                AND EXISTS (
                    SELECT 1 FROM public.ws_members wm
                    WHERE wm.ws_id = cs.workspace_id
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
    p_workspace_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    workspace_id UUID,
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
        cs.workspace_id,
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
    AND (p_workspace_id IS NULL OR cs.workspace_id = p_workspace_id)
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
            AND cs.workspace_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.ws_members wm
                WHERE wm.ws_id = cs.workspace_id
                AND wm.user_id = p_user_id
                AND wm.deleted_at IS NULL
            )
        )
    )
    ORDER BY cs.updated_at DESC;
$$;

COMMENT ON FUNCTION public.get_accessible_chats(UUID, UUID, UUID) IS 'Get all chat sessions accessible to a user, optionally filtered by workspace';

-- =============================================
-- FUNCTION: get_grounded_kbs_for_chat
-- =============================================
-- Get all enabled knowledge bases for a chat session

CREATE OR REPLACE FUNCTION public.get_grounded_kbs_for_chat(
    p_session_id UUID
)
RETURNS TABLE (
    kb_id UUID,
    kb_name VARCHAR(255),
    kb_scope VARCHAR(50),
    is_enabled BOOLEAN,
    added_at TIMESTAMPTZ,
    added_by UUID
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        kb.id AS kb_id,
        kb.name AS kb_name,
        kb.scope AS kb_scope,
        ckg.is_enabled,
        ckg.added_at,
        ckg.added_by
    FROM public.chat_kb_grounding ckg
    JOIN public.kb_bases kb ON kb.id = ckg.kb_id
    WHERE ckg.session_id = p_session_id
    ORDER BY ckg.added_at ASC;
$$;

COMMENT ON FUNCTION public.get_grounded_kbs_for_chat(UUID) IS 'Get all knowledge bases grounded to a chat session';

-- =============================================
-- FUNCTION: get_available_kbs_for_chat
-- =============================================
-- Get knowledge bases a user can add to a chat session
-- Based on user's org membership, workspace membership, and KB access settings

CREATE OR REPLACE FUNCTION public.get_available_kbs_for_chat(
    p_user_id UUID,
    p_session_id UUID
)
RETURNS TABLE (
    kb_id UUID,
    kb_name VARCHAR(255),
    kb_scope VARCHAR(50),
    kb_description TEXT,
    is_already_grounded BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    WITH chat_info AS (
        SELECT cs.org_id, cs.workspace_id
        FROM public.chat_sessions cs
        WHERE cs.id = p_session_id
        AND cs.is_deleted = false
    ),
    user_accessible_kbs AS (
        -- System KBs the user's org has access to
        SELECT kb.id, kb.name, kb.scope, kb.description
        FROM public.kb_bases kb
        JOIN public.kb_access_sys kas ON kas.kb_id = kb.id
        JOIN chat_info ci ON true
        WHERE kb.scope = 'system'
        AND EXISTS (
            SELECT 1 FROM public.kb_access_orgs kao
            WHERE kao.kb_id = kb.id
            AND kao.org_id = ci.org_id
            AND kao.is_enabled = true
        )
        
        UNION
        
        -- Org-level KBs for user's org
        SELECT kb.id, kb.name, kb.scope, kb.description
        FROM public.kb_bases kb
        JOIN chat_info ci ON kb.org_id = ci.org_id
        WHERE kb.scope = 'org'
        AND EXISTS (
            SELECT 1 FROM public.org_members om
            WHERE om.org_id = ci.org_id
            AND om.user_id = p_user_id
        )
        
        UNION
        
        -- Workspace-level KBs for chats in workspaces
        SELECT kb.id, kb.name, kb.scope, kb.description
        FROM public.kb_bases kb
        JOIN chat_info ci ON kb.ws_id = ci.workspace_id
        WHERE kb.scope = 'workspace'
        AND ci.workspace_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.ws_members wm
            WHERE wm.ws_id = ci.workspace_id
            AND wm.user_id = p_user_id
            AND wm.deleted_at IS NULL
        )
    )
    SELECT 
        uak.id AS kb_id,
        uak.name AS kb_name,
        uak.scope AS kb_scope,
        uak.description AS kb_description,
        EXISTS (
            SELECT 1 FROM public.chat_kb_grounding ckg
            WHERE ckg.session_id = p_session_id
            AND ckg.kb_id = uak.id
        ) AS is_already_grounded
    FROM user_accessible_kbs uak
    ORDER BY uak.scope, uak.name;
$$;

COMMENT ON FUNCTION public.get_available_kbs_for_chat(UUID, UUID) IS 'Get knowledge bases a user can add to a chat session';

-- =============================================
-- GRANTS
-- =============================================

GRANT EXECUTE ON FUNCTION public.is_chat_owner(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_chat(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_chat(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_accessible_chats(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_grounded_kbs_for_chat(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_kbs_for_chat(UUID, UUID) TO authenticated;
