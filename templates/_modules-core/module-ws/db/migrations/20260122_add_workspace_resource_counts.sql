-- =============================================
-- MIGRATION: Add Workspace Resource Counts RPC Function
-- =============================================
-- Created: 2026-01-22
-- Purpose: Add get_workspace_resource_counts RPC function for batch counting
--          workspace resources (documents, evaluations, chats, voice sessions)
-- 
-- This function enables efficient counting of resources across multiple workspaces
-- in a single query, with graceful handling for optional modules.
--
-- Usage:
--   SELECT * FROM get_workspace_resource_counts(ARRAY[uuid1, uuid2, ...]);
--
-- Returns:
--   ws_id UUID, document_count BIGINT, evaluation_count BIGINT, 
--   chat_count BIGINT, voice_count BIGINT
-- =============================================

-- Function: get_workspace_resource_counts
CREATE OR REPLACE FUNCTION get_workspace_resource_counts(
    p_workspace_ids UUID[]
) RETURNS TABLE (
    ws_id UUID,
    document_count BIGINT,
    evaluation_count BIGINT,
    chat_count BIGINT,
    voice_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH workspace_list AS (
        SELECT unnest(p_workspace_ids) AS ws_id
    ),
    doc_counts AS (
        SELECT 
            kb_bases.ws_id,
            COUNT(*) AS count
        FROM kb_docs
        INNER JOIN kb_bases ON kb_docs.kb_id = kb_bases.id
        WHERE kb_bases.ws_id = ANY(p_workspace_ids)
        AND kb_docs.is_deleted = false
        AND kb_bases.is_deleted = false
        GROUP BY kb_bases.ws_id
    ),
    eval_counts AS (
        SELECT 
            eval_doc_summaries.ws_id,
            COUNT(*) AS count
        FROM eval_doc_summaries
        WHERE eval_doc_summaries.ws_id = ANY(p_workspace_ids)
        AND eval_doc_summaries.is_deleted = false
        GROUP BY eval_doc_summaries.ws_id
    ),
    chat_counts AS (
        SELECT 
            chat_sessions.ws_id,
            COUNT(*) AS count
        FROM chat_sessions
        WHERE chat_sessions.ws_id = ANY(p_workspace_ids)
        AND chat_sessions.is_deleted = false
        GROUP BY chat_sessions.ws_id
    ),
    voice_counts AS (
        SELECT 
            voice_sessions.ws_id,
            COUNT(*) AS count
        FROM voice_sessions
        WHERE voice_sessions.ws_id = ANY(p_workspace_ids)
        AND voice_sessions.is_deleted = false
        GROUP BY voice_sessions.ws_id
    )
    SELECT 
        wl.ws_id,
        COALESCE(dc.count, 0) AS document_count,
        COALESCE(ec.count, 0) AS evaluation_count,
        COALESCE(cc.count, 0) AS chat_count,
        COALESCE(vc.count, 0) AS voice_count
    FROM workspace_list wl
    LEFT JOIN doc_counts dc ON wl.ws_id = dc.ws_id
    LEFT JOIN eval_counts ec ON wl.ws_id = ec.ws_id
    LEFT JOIN chat_counts cc ON wl.ws_id = cc.ws_id
    LEFT JOIN voice_counts vc ON wl.ws_id = vc.ws_id;
    
EXCEPTION
    WHEN undefined_table THEN
        -- If any table doesn't exist (optional modules not installed),
        -- return zeros for all workspaces
        RETURN QUERY
        SELECT 
            unnest(p_workspace_ids) AS ws_id,
            0::BIGINT AS document_count,
            0::BIGINT AS evaluation_count,
            0::BIGINT AS chat_count,
            0::BIGINT AS voice_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_workspace_resource_counts(UUID[]) IS 
'Returns resource counts (documents, evaluations, chats, voice) for multiple workspaces in a single query. 
Gracefully handles missing tables (optional modules) by returning zeros.';

-- Verification query (optional - comment out for production)
-- SELECT * FROM get_workspace_resource_counts(ARRAY['00000000-0000-0000-0000-000000000000']::UUID[]);
