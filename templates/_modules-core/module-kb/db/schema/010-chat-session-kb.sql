-- =============================================
-- MODULE-CHAT: Chat Session KB Junction Table
-- =============================================
-- Purpose: Associates knowledge bases with chat sessions for RAG context retrieval
-- Source: Created for CORA toolkit Jan 2026
-- Naming: Follows Rule 2 (Table names use plural nouns - ADR-011)
--
-- NOTE: This migration MUST run AFTER module-kb is installed
-- because it references the kb_bases table from module-kb.
-- See deployment sequence in docs/plans/plan_module-chat-implementation.md

-- =============================================
-- CHAT_SESSION_KBS TABLE (Junction: chat_sessions <-> kb_bases)
-- =============================================

CREATE TABLE IF NOT EXISTS public.chat_session_kbs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    kb_id UUID NOT NULL REFERENCES public.kb_bases(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    added_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT chat_session_kbs_unique UNIQUE (session_id, kb_id)
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_chat_session_kbs_session ON public.chat_session_kbs(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_session_kbs_kb ON public.chat_session_kbs(kb_id);

-- Index for finding enabled KBs for a chat
CREATE INDEX IF NOT EXISTS idx_chat_session_kbs_enabled ON public.chat_session_kbs(session_id, is_enabled) WHERE is_enabled = true;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.chat_session_kbs IS 'Junction table: Associates knowledge bases with chat sessions for RAG context retrieval';
COMMENT ON COLUMN public.chat_session_kbs.session_id IS 'Chat session this KB association belongs to';
COMMENT ON COLUMN public.chat_session_kbs.kb_id IS 'Knowledge base to use for RAG context';
COMMENT ON COLUMN public.chat_session_kbs.is_enabled IS 'Whether this KB is currently active for the chat';
COMMENT ON COLUMN public.chat_session_kbs.added_at IS 'When the KB association was added';
COMMENT ON COLUMN public.chat_session_kbs.added_by IS 'User who added the KB association';

-- =============================================
-- RPC FUNCTIONS (KB-Chat Integration)
-- =============================================
-- These functions reference both chat_sessions (from module-chat) and kb_bases (from module-kb)
-- so they must be created AFTER both modules' base tables exist.

-- =============================================
-- FUNCTION: get_kbs_for_chat
-- =============================================
-- Get all knowledge bases associated with a chat session

CREATE OR REPLACE FUNCTION public.get_kbs_for_chat(
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
        csk.is_enabled,
        csk.added_at,
        csk.added_by
    FROM public.chat_session_kbs csk
    JOIN public.kb_bases kb ON kb.id = csk.kb_id
    WHERE csk.session_id = p_session_id
    ORDER BY csk.added_at ASC;
$$;

COMMENT ON FUNCTION public.get_kbs_for_chat(UUID) IS 'Get all knowledge bases associated with a chat session';

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
    is_already_added BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    WITH chat_info AS (
        SELECT cs.org_id, cs.ws_id
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
        WHERE kb.scope = 'sys'
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
        JOIN chat_info ci ON kb.ws_id = ci.ws_id
        WHERE kb.scope = 'workspace'
        AND ci.ws_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.ws_members wm
            WHERE wm.ws_id = ci.ws_id
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
            SELECT 1 FROM public.chat_session_kbs csk
            WHERE csk.session_id = p_session_id
            AND csk.kb_id = uak.id
        ) AS is_already_added
    FROM user_accessible_kbs uak
    ORDER BY uak.scope, uak.name;
$$;

COMMENT ON FUNCTION public.get_available_kbs_for_chat(UUID, UUID) IS 'Get knowledge bases a user can add to a chat session';

-- =============================================
-- GRANTS for RPC Functions
-- =============================================

GRANT EXECUTE ON FUNCTION public.get_kbs_for_chat(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_kbs_for_chat(UUID, UUID) TO authenticated;

-- =============================================
-- NOTE: Row Level Security (RLS) Policies
-- =============================================
-- RLS policies for this table are defined in 011-chat-rls-kb.sql
-- This ensures all tables exist before applying security constraints
