-- ========================================
-- Knowledge Base Module Schema
-- Migration: 008-kb-rpc-functions.sql
-- Created: January 14, 2026
-- ========================================

-- Function: Check if user can access a KB (4-level inheritance check)
CREATE OR REPLACE FUNCTION can_access_kb(p_user_id UUID, p_kb_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_kb RECORD;
    v_has_access BOOLEAN := false;
BEGIN
    -- Get KB details
    SELECT * INTO v_kb FROM public.kb_bases WHERE id = p_kb_id AND is_deleted = false;
    
    IF v_kb IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check access based on scope with 4-level inheritance chain
    CASE v_kb.scope
        WHEN 'sys' THEN
            -- System KB requires ALL 4 levels enabled
            SELECT EXISTS (
                SELECT 1 FROM public.kb_access_sys kas
                JOIN public.kb_access_orgs kao ON kao.kb_id = kas.kb_id 
                    AND kao.org_id = kas.org_id
                JOIN public.org_members om ON om.org_id = kas.org_id
                WHERE kas.kb_id = p_kb_id
                AND kas.is_enabled = true
                AND kao.is_enabled = true
                AND om.user_id = p_user_id
            ) INTO v_has_access;
            
        WHEN 'org' THEN
            -- Org KB: Check user is org member
            SELECT EXISTS (
                SELECT 1 FROM public.org_members
                WHERE org_id = v_kb.org_id AND user_id = p_user_id
            ) INTO v_has_access;
            
        WHEN 'workspace' THEN
            -- Workspace KB: Check if user is workspace member
            SELECT EXISTS (
                SELECT 1 FROM public.ws_members
                WHERE ws_id = v_kb.workspace_id AND user_id = p_user_id
            ) INTO v_has_access;
            
        WHEN 'chat' THEN
            -- Chat KB: Use module-chat's access control function
            -- This checks: owner OR direct share OR workspace share (via ws_members)
            SELECT can_view_chat(p_user_id, v_kb.chat_session_id) INTO v_has_access;
    END CASE;
    
    RETURN v_has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user can upload to a KB
CREATE OR REPLACE FUNCTION can_upload_to_kb(p_user_id UUID, p_kb_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_kb RECORD;
    v_config JSONB;
    v_who_can_upload TEXT;
    v_has_permission BOOLEAN := false;
BEGIN
    IF NOT can_access_kb(p_user_id, p_kb_id) THEN
        RETURN false;
    END IF;
    
    SELECT * INTO v_kb FROM public.kb_bases WHERE id = p_kb_id AND is_deleted = false;
    v_config := v_kb.config;
    v_who_can_upload := COALESCE(v_config->>'whoCanUpload', 'all_members');
    
    CASE v_kb.scope
        WHEN 'sys' THEN
            SELECT EXISTS (
                SELECT 1 FROM public.user_profiles
                WHERE user_id = p_user_id AND sys_role = 'sys_admin'
            ) INTO v_has_permission;
            
        WHEN 'org' THEN
            IF v_who_can_upload = 'admin' THEN
                SELECT EXISTS (
                    SELECT 1 FROM public.org_members
                    WHERE org_id = v_kb.org_id 
                    AND user_id = p_user_id 
                    AND org_role IN ('org_owner', 'org_admin')
                ) INTO v_has_permission;
            ELSE
                v_has_permission := true;
            END IF;
            
        WHEN 'workspace' THEN
            IF v_who_can_upload = 'admin' THEN
                SELECT EXISTS (
                    SELECT 1 FROM public.ws_members
                    WHERE ws_id = v_kb.workspace_id 
                    AND user_id = p_user_id 
                    AND ws_role IN ('ws_owner', 'ws_admin')
                ) INTO v_has_permission;
            ELSE
                v_has_permission := true;
            END IF;
            
        WHEN 'chat' THEN
            v_has_permission := true;
    END CASE;
    
    RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get accessible KBs for a workspace
CREATE OR REPLACE FUNCTION get_accessible_kbs_for_workspace(p_user_id UUID, p_workspace_id UUID)
RETURNS TABLE (
    kb_id UUID,
    kb_name VARCHAR(255),
    kb_scope VARCHAR(50),
    is_enabled BOOLEAN,
    source TEXT
) AS $$
DECLARE
    v_workspace RECORD;
BEGIN
    SELECT * INTO v_workspace FROM public.workspaces WHERE id = p_workspace_id;
    
    -- Return workspace's own KB
    RETURN QUERY
    SELECT kb.id, kb.name, kb.scope, kb.is_enabled, 'workspace'::TEXT
    FROM public.kb_bases kb
    WHERE kb.workspace_id = p_workspace_id
    AND kb.scope = 'workspace'
    AND kb.is_deleted = false;
    
    -- Return org KBs enabled at workspace level
    RETURN QUERY
    SELECT kb.id, kb.name, kb.scope, kaw.is_enabled, 'org'::TEXT
    FROM public.kb_bases kb
    JOIN public.kb_access_ws kaw ON kaw.kb_id = kb.id AND kaw.workspace_id = p_workspace_id
    WHERE kb.org_id = v_workspace.org_id
    AND kb.scope = 'org'
    AND kb.is_deleted = false
    AND kb.is_enabled = true
    AND kaw.is_enabled = true;
    
    -- Return system KBs enabled through full inheritance chain
    RETURN QUERY
    SELECT kb.id, kb.name, kb.scope, kaw.is_enabled, 'sys'::TEXT
    FROM public.kb_bases kb
    JOIN public.kb_access_sys kas ON kas.kb_id = kb.id
    JOIN public.kb_access_orgs kao ON kao.kb_id = kb.id AND kao.org_id = kas.org_id
    JOIN public.kb_access_ws kaw ON kaw.kb_id = kb.id AND kaw.workspace_id = p_workspace_id
    WHERE kas.org_id = v_workspace.org_id
    AND kb.scope = 'sys'
    AND kb.is_deleted = false
    AND kb.is_enabled = true
    AND kas.is_enabled = true
    AND kao.is_enabled = true
    AND kaw.is_enabled = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Semantic search across KBs
CREATE OR REPLACE FUNCTION search_kb_chunks(
    p_query_embedding vector(1024),
    p_kb_ids UUID[],
    p_top_k INTEGER DEFAULT 5,
    p_similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    chunk_id UUID,
    kb_id UUID,
    document_id UUID,
    content TEXT,
    similarity FLOAT,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id AS chunk_id,
        c.kb_id,
        c.document_id,
        c.content,
        (1 - (c.embedding <=> p_query_embedding))::FLOAT AS similarity,
        c.metadata
    FROM public.kb_chunks c
    WHERE c.kb_id = ANY(p_kb_ids)
    AND c.embedding IS NOT NULL
    AND (1 - (c.embedding <=> p_query_embedding)) >= p_similarity_threshold
    ORDER BY c.embedding <=> p_query_embedding
    LIMIT p_top_k;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON FUNCTION can_access_kb IS 'Check if user can access a KB based on scope and 4-level inheritance';
COMMENT ON FUNCTION can_upload_to_kb IS 'Check if user can upload documents to a KB';
COMMENT ON FUNCTION get_accessible_kbs_for_workspace IS 'Get all KBs accessible in a workspace context';
COMMENT ON FUNCTION search_kb_chunks IS 'Semantic search across multiple KBs using pgvector';
