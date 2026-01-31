-- =====================================================================
-- Chat Analytics RPC Functions
-- =====================================================================
-- These functions provide analytics queries for chat admin pages
-- All functions use security definer to access data with proper permissions

-- =====================================================================
-- System Admin Analytics Functions
-- =====================================================================

-- Get platform-wide chat analytics
CREATE OR REPLACE FUNCTION get_sys_chat_analytics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'totalSessions', (
            SELECT COUNT(*) FROM chat_sessions WHERE is_deleted = false
        ),
        'totalMessages', (
            SELECT COUNT(*) FROM chat_messages
        ),
        'activeSessions', json_build_object(
            'last24Hours', (
                SELECT COUNT(*) 
                FROM chat_sessions 
                WHERE updated_at > NOW() - INTERVAL '24 hours' 
                AND is_deleted = false
            ),
            'last7Days', (
                SELECT COUNT(*) 
                FROM chat_sessions 
                WHERE updated_at > NOW() - INTERVAL '7 days' 
                AND is_deleted = false
            ),
            'last30Days', (
                SELECT COUNT(*) 
                FROM chat_sessions 
                WHERE updated_at > NOW() - INTERVAL '30 days' 
                AND is_deleted = false
            )
        )
    ) INTO result;
    
    RETURN result;
END;
$$;

-- Get most active organizations by session count
CREATE OR REPLACE FUNCTION get_sys_most_active_orgs(
    p_limit INTEGER DEFAULT 10
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(row_to_json(t))
    INTO result
    FROM (
        SELECT 
            o.id as "orgId",
            o.name as "orgName",
            COALESCE(COUNT(cs.id), 0) as "sessionCount"
        FROM orgs o
        LEFT JOIN chat_sessions cs ON cs.org_id = o.id AND cs.is_deleted = false
        GROUP BY o.id, o.name
        ORDER BY "sessionCount" DESC
        LIMIT p_limit
    ) t;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- =====================================================================
-- Organization Admin Analytics Functions
-- =====================================================================

-- Get organization chat analytics
CREATE OR REPLACE FUNCTION get_org_chat_analytics(
    p_org_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'totalSessions', (
            SELECT COUNT(*) 
            FROM chat_sessions 
            WHERE org_id = p_org_id AND is_deleted = false
        ),
        'totalMessages', (
            SELECT COUNT(*) 
            FROM chat_messages cm
            JOIN chat_sessions cs ON cs.id = cm.session_id
            WHERE cs.org_id = p_org_id
        )
    ) INTO result;
    
    RETURN result;
END;
$$;

-- Get most active users in organization by session count
CREATE OR REPLACE FUNCTION get_org_most_active_users(
    p_org_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(row_to_json(t))
    INTO result
    FROM (
        SELECT 
            cs.created_by as "userId",
            COALESCE(up.full_name, up.email) as "userName",
            COUNT(cs.id) as "sessionCount"
        FROM chat_sessions cs
        JOIN user_profiles up ON up.user_id = cs.created_by
        WHERE cs.org_id = p_org_id AND cs.is_deleted = false
        GROUP BY cs.created_by, up.full_name, up.email
        ORDER BY "sessionCount" DESC
        LIMIT p_limit
    ) t;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Get most active workspaces in organization by session count
CREATE OR REPLACE FUNCTION get_org_most_active_workspaces(
    p_org_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(row_to_json(t))
    INTO result
    FROM (
        SELECT 
            cs.ws_id as "workspaceId",
            w.name as "workspaceName",
            COUNT(cs.id) as "sessionCount"
        FROM chat_sessions cs
        JOIN workspaces w ON w.id = cs.ws_id
        WHERE cs.org_id = p_org_id 
        AND cs.ws_id IS NOT NULL 
        AND cs.is_deleted = false
        GROUP BY cs.ws_id, w.name
        ORDER BY "sessionCount" DESC
        LIMIT p_limit
    ) t;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- =====================================================================
-- Grant permissions to service role
-- =====================================================================

GRANT EXECUTE ON FUNCTION get_sys_chat_analytics() TO service_role;
GRANT EXECUTE ON FUNCTION get_sys_most_active_orgs(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_org_chat_analytics(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_org_most_active_users(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_org_most_active_workspaces(UUID, INTEGER) TO service_role;