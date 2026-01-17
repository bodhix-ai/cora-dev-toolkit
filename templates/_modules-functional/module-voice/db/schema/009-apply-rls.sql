-- =============================================
-- MODULE-VOICE: Row Level Security Policies
-- =============================================
-- Purpose: Apply RLS policies to all voice tables AFTER all tables are created
-- Source: Created for CORA toolkit Jan 2026 (ADR-014)
-- Pattern: Owner + Assignee + Shares model (similar to chat module)
-- Created: January 17, 2026

-- =============================================
-- VOICE_SESSIONS TABLE RLS
-- =============================================

ALTER TABLE public.voice_sessions ENABLE ROW LEVEL SECURITY;

-- Session owners can view their sessions
DROP POLICY IF EXISTS "voice_sessions_owner_select" ON public.voice_sessions;
CREATE POLICY "voice_sessions_owner_select" ON public.voice_sessions
FOR SELECT
TO authenticated
USING (
    created_by = auth.uid()
);

-- Session assignees can view their assigned sessions
DROP POLICY IF EXISTS "voice_sessions_assignee_select" ON public.voice_sessions;
CREATE POLICY "voice_sessions_assignee_select" ON public.voice_sessions
FOR SELECT
TO authenticated
USING (
    assigned_to = auth.uid()
);

-- Users with shares can view sessions
DROP POLICY IF EXISTS "voice_sessions_shared_select" ON public.voice_sessions;
CREATE POLICY "voice_sessions_shared_select" ON public.voice_sessions
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.voice_shares
        WHERE voice_shares.session_id = voice_sessions.id
        AND voice_shares.shared_with_user_id = auth.uid()
    )
);

-- Workspace members can view workspace-shared sessions
DROP POLICY IF EXISTS "voice_sessions_workspace_select" ON public.voice_sessions;
CREATE POLICY "voice_sessions_workspace_select" ON public.voice_sessions
FOR SELECT
TO authenticated
USING (
    is_shared_with_workspace = true
    AND workspace_id IS NOT NULL
    AND EXISTS (
        SELECT 1 FROM public.ws_members
        WHERE ws_members.ws_id = voice_sessions.workspace_id
        AND ws_members.user_id = auth.uid()
        AND ws_members.deleted_at IS NULL
    )
);

-- Org members can create sessions in their org
DROP POLICY IF EXISTS "voice_sessions_org_member_insert" ON public.voice_sessions;
CREATE POLICY "voice_sessions_org_member_insert" ON public.voice_sessions
FOR INSERT
TO authenticated
WITH CHECK (
    is_org_member(org_id, auth.uid())
);

-- Session owners can update their sessions
DROP POLICY IF EXISTS "voice_sessions_owner_update" ON public.voice_sessions;
CREATE POLICY "voice_sessions_owner_update" ON public.voice_sessions
FOR UPDATE
TO authenticated
USING (
    created_by = auth.uid()
)
WITH CHECK (
    created_by = auth.uid()
);

-- Session owners can delete their sessions
DROP POLICY IF EXISTS "voice_sessions_owner_delete" ON public.voice_sessions;
CREATE POLICY "voice_sessions_owner_delete" ON public.voice_sessions
FOR DELETE
TO authenticated
USING (
    created_by = auth.uid()
);

-- Service role has full access
DROP POLICY IF EXISTS "voice_sessions_service_role" ON public.voice_sessions;
CREATE POLICY "voice_sessions_service_role" ON public.voice_sessions
FOR ALL
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Grant usage to authenticated users (RLS policies will restrict actual access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_sessions TO authenticated;

COMMENT ON POLICY "voice_sessions_owner_select" ON public.voice_sessions IS 'Session owners can view their sessions';
COMMENT ON POLICY "voice_sessions_assignee_select" ON public.voice_sessions IS 'Session assignees can view their assigned sessions';
COMMENT ON POLICY "voice_sessions_shared_select" ON public.voice_sessions IS 'Users with shares can view sessions';
COMMENT ON POLICY "voice_sessions_workspace_select" ON public.voice_sessions IS 'Workspace members can view workspace-shared sessions';
COMMENT ON POLICY "voice_sessions_org_member_insert" ON public.voice_sessions IS 'Org members can create sessions in their organization';
COMMENT ON POLICY "voice_sessions_owner_update" ON public.voice_sessions IS 'Session owners can update their sessions';
COMMENT ON POLICY "voice_sessions_owner_delete" ON public.voice_sessions IS 'Session owners can delete their sessions';

-- =============================================
-- VOICE_SHARES TABLE RLS
-- =============================================

ALTER TABLE public.voice_shares ENABLE ROW LEVEL SECURITY;

-- Users can view shares they created or received
DROP POLICY IF EXISTS "voice_shares_select" ON public.voice_shares;
CREATE POLICY "voice_shares_select" ON public.voice_shares
FOR SELECT
TO authenticated
USING (
    created_by = auth.uid() OR
    shared_with_user_id = auth.uid()
);

-- Session owners can create shares
DROP POLICY IF EXISTS "voice_shares_owner_insert" ON public.voice_shares;
CREATE POLICY "voice_shares_owner_insert" ON public.voice_shares
FOR INSERT
TO authenticated
WITH CHECK (
    is_voice_owner(session_id, auth.uid())
);

-- Session owners can update shares they created
DROP POLICY IF EXISTS "voice_shares_owner_update" ON public.voice_shares;
CREATE POLICY "voice_shares_owner_update" ON public.voice_shares
FOR UPDATE
TO authenticated
USING (
    created_by = auth.uid()
)
WITH CHECK (
    created_by = auth.uid()
);

-- Session owners can delete shares they created
DROP POLICY IF EXISTS "voice_shares_owner_delete" ON public.voice_shares;
CREATE POLICY "voice_shares_owner_delete" ON public.voice_shares
FOR DELETE
TO authenticated
USING (
    created_by = auth.uid()
);

-- Service role has full access
DROP POLICY IF EXISTS "voice_shares_service_role" ON public.voice_shares;
CREATE POLICY "voice_shares_service_role" ON public.voice_shares
FOR ALL
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Grant usage to authenticated users (RLS policies will restrict actual access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_shares TO authenticated;

COMMENT ON POLICY "voice_shares_select" ON public.voice_shares IS 'Users can view shares they created or received';
COMMENT ON POLICY "voice_shares_owner_insert" ON public.voice_shares IS 'Session owners can create shares';
COMMENT ON POLICY "voice_shares_owner_update" ON public.voice_shares IS 'Session owners can update shares they created';
COMMENT ON POLICY "voice_shares_owner_delete" ON public.voice_shares IS 'Session owners can delete shares they created';

-- =============================================
-- VOICE_TRANSCRIPTS TABLE RLS
-- =============================================

ALTER TABLE public.voice_transcripts ENABLE ROW LEVEL SECURITY;

-- Access inherited from parent voice_sessions
DROP POLICY IF EXISTS "voice_transcripts_select" ON public.voice_transcripts;
CREATE POLICY "voice_transcripts_select" ON public.voice_transcripts
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.voice_sessions vs
        WHERE vs.id = voice_transcripts.session_id
        AND (
            -- Owner
            vs.created_by = auth.uid() OR
            -- Assignee
            vs.assigned_to = auth.uid() OR
            -- Shared
            EXISTS (
                SELECT 1 FROM public.voice_shares vsh
                WHERE vsh.session_id = vs.id
                AND vsh.shared_with_user_id = auth.uid()
                AND vsh.permission_level IN ('view', 'view_transcript')
            ) OR
            -- Workspace shared
            (
                vs.is_shared_with_workspace = true
                AND vs.workspace_id IS NOT NULL
                AND EXISTS (
                    SELECT 1 FROM public.ws_members
                    WHERE ws_members.ws_id = vs.workspace_id
                    AND ws_members.user_id = auth.uid()
                    AND ws_members.deleted_at IS NULL
                )
            )
        )
    )
);

-- Only service role can insert/update/delete transcripts (automated)
DROP POLICY IF EXISTS "voice_transcripts_service_role" ON public.voice_transcripts;
CREATE POLICY "voice_transcripts_service_role" ON public.voice_transcripts
FOR ALL
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Grant usage to authenticated users (RLS policies will restrict actual access)
GRANT SELECT ON public.voice_transcripts TO authenticated;

COMMENT ON POLICY "voice_transcripts_select" ON public.voice_transcripts IS 'Access inherited from parent voice_sessions table';

-- =============================================
-- VOICE_ANALYTICS TABLE RLS
-- =============================================

ALTER TABLE public.voice_analytics ENABLE ROW LEVEL SECURITY;

-- Access inherited from parent voice_sessions
DROP POLICY IF EXISTS "voice_analytics_select" ON public.voice_analytics;
CREATE POLICY "voice_analytics_select" ON public.voice_analytics
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.voice_sessions vs
        WHERE vs.id = voice_analytics.session_id
        AND (
            -- Owner
            vs.created_by = auth.uid() OR
            -- Assignee
            vs.assigned_to = auth.uid() OR
            -- Shared
            EXISTS (
                SELECT 1 FROM public.voice_shares vsh
                WHERE vsh.session_id = vs.id
                AND vsh.shared_with_user_id = auth.uid()
                AND vsh.permission_level IN ('view', 'view_analytics')
            ) OR
            -- Workspace shared
            (
                vs.is_shared_with_workspace = true
                AND vs.workspace_id IS NOT NULL
                AND EXISTS (
                    SELECT 1 FROM public.ws_members
                    WHERE ws_members.ws_id = vs.workspace_id
                    AND ws_members.user_id = auth.uid()
                    AND ws_members.deleted_at IS NULL
                )
            )
        )
    )
);

-- Only service role can insert/update/delete analytics (automated)
DROP POLICY IF EXISTS "voice_analytics_service_role" ON public.voice_analytics;
CREATE POLICY "voice_analytics_service_role" ON public.voice_analytics
FOR ALL
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Grant usage to authenticated users (RLS policies will restrict actual access)
GRANT SELECT ON public.voice_analytics TO authenticated;

COMMENT ON POLICY "voice_analytics_select" ON public.voice_analytics IS 'Access inherited from parent voice_sessions table';

-- =============================================
-- VOICE_SESSION_KB TABLE RLS (Junction Table)
-- =============================================

ALTER TABLE public.voice_session_kb ENABLE ROW LEVEL SECURITY;

-- Access inherited from parent voice_sessions
DROP POLICY IF EXISTS "voice_session_kb_select" ON public.voice_session_kb;
CREATE POLICY "voice_session_kb_select" ON public.voice_session_kb
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.voice_sessions vs
        WHERE vs.id = voice_session_kb.session_id
        AND (
            vs.created_by = auth.uid() OR
            vs.assigned_to = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.voice_shares vsh
                WHERE vsh.session_id = vs.id
                AND vsh.shared_with_user_id = auth.uid()
            ) OR
            (
                vs.is_shared_with_workspace = true
                AND vs.workspace_id IS NOT NULL
                AND EXISTS (
                    SELECT 1 FROM public.ws_members
                    WHERE ws_members.ws_id = vs.workspace_id
                    AND ws_members.user_id = auth.uid()
                    AND ws_members.deleted_at IS NULL
                )
            )
        )
    )
);

-- Session owners can add KBs to their sessions
DROP POLICY IF EXISTS "voice_session_kb_owner_insert" ON public.voice_session_kb;
CREATE POLICY "voice_session_kb_owner_insert" ON public.voice_session_kb
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.voice_sessions vs
        WHERE vs.id = voice_session_kb.session_id
        AND vs.created_by = auth.uid()
    )
);

-- Session owners can update KB associations
DROP POLICY IF EXISTS "voice_session_kb_owner_update" ON public.voice_session_kb;
CREATE POLICY "voice_session_kb_owner_update" ON public.voice_session_kb
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.voice_sessions vs
        WHERE vs.id = voice_session_kb.session_id
        AND vs.created_by = auth.uid()
    )
);

-- Session owners can remove KBs from their sessions
DROP POLICY IF EXISTS "voice_session_kb_owner_delete" ON public.voice_session_kb;
CREATE POLICY "voice_session_kb_owner_delete" ON public.voice_session_kb
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.voice_sessions vs
        WHERE vs.id = voice_session_kb.session_id
        AND vs.created_by = auth.uid()
    )
);

-- Service role has full access
DROP POLICY IF EXISTS "voice_session_kb_service_role" ON public.voice_session_kb;
CREATE POLICY "voice_session_kb_service_role" ON public.voice_session_kb
FOR ALL
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Grant usage to authenticated users (RLS policies will restrict actual access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_session_kb TO authenticated;

COMMENT ON POLICY "voice_session_kb_select" ON public.voice_session_kb IS 'Access inherited from parent voice_sessions table';
COMMENT ON POLICY "voice_session_kb_owner_insert" ON public.voice_session_kb IS 'Session owners can add KBs to their sessions';
COMMENT ON POLICY "voice_session_kb_owner_update" ON public.voice_session_kb IS 'Session owners can update KB associations';
COMMENT ON POLICY "voice_session_kb_owner_delete" ON public.voice_session_kb IS 'Session owners can remove KBs from their sessions';

-- =============================================
-- VOICE_CONFIGS TABLE RLS (Org-level)
-- =============================================

ALTER TABLE public.voice_configs ENABLE ROW LEVEL SECURITY;

-- Org members can view their org's configs
DROP POLICY IF EXISTS "voice_configs_org_select" ON public.voice_configs;
CREATE POLICY "voice_configs_org_select" ON public.voice_configs
FOR SELECT
TO authenticated
USING (
    is_org_member(org_id, auth.uid())
);

-- Org members can create configs in their org
DROP POLICY IF EXISTS "voice_configs_org_insert" ON public.voice_configs;
CREATE POLICY "voice_configs_org_insert" ON public.voice_configs
FOR INSERT
TO authenticated
WITH CHECK (
    is_org_member(org_id, auth.uid())
);

-- Config creators can update their configs
DROP POLICY IF EXISTS "voice_configs_owner_update" ON public.voice_configs;
CREATE POLICY "voice_configs_owner_update" ON public.voice_configs
FOR UPDATE
TO authenticated
USING (
    created_by = auth.uid()
)
WITH CHECK (
    created_by = auth.uid()
);

-- Config creators can delete their configs
DROP POLICY IF EXISTS "voice_configs_owner_delete" ON public.voice_configs;
CREATE POLICY "voice_configs_owner_delete" ON public.voice_configs
FOR DELETE
TO authenticated
USING (
    created_by = auth.uid()
);

-- Service role has full access
DROP POLICY IF EXISTS "voice_configs_service_role" ON public.voice_configs;
CREATE POLICY "voice_configs_service_role" ON public.voice_configs
FOR ALL
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Grant usage to authenticated users (RLS policies will restrict actual access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_configs TO authenticated;

COMMENT ON POLICY "voice_configs_org_select" ON public.voice_configs IS 'Org members can view their org configs';
COMMENT ON POLICY "voice_configs_org_insert" ON public.voice_configs IS 'Org members can create configs in their organization';
COMMENT ON POLICY "voice_configs_owner_update" ON public.voice_configs IS 'Config creators can update their configs';
COMMENT ON POLICY "voice_configs_owner_delete" ON public.voice_configs IS 'Config creators can delete their configs';

-- =============================================
-- VOICE_CREDENTIALS TABLE RLS (Org-level)
-- =============================================

ALTER TABLE public.voice_credentials ENABLE ROW LEVEL SECURITY;

-- Org members can view their org's credentials
DROP POLICY IF EXISTS "voice_credentials_org_select" ON public.voice_credentials;
CREATE POLICY "voice_credentials_org_select" ON public.voice_credentials
FOR SELECT
TO authenticated
USING (
    is_org_member(org_id, auth.uid())
);

-- Org members can create credentials in their org
DROP POLICY IF EXISTS "voice_credentials_org_insert" ON public.voice_credentials;
CREATE POLICY "voice_credentials_org_insert" ON public.voice_credentials
FOR INSERT
TO authenticated
WITH CHECK (
    is_org_member(org_id, auth.uid())
);

-- Credential creators can update their credentials
DROP POLICY IF EXISTS "voice_credentials_owner_update" ON public.voice_credentials;
CREATE POLICY "voice_credentials_owner_update" ON public.voice_credentials
FOR UPDATE
TO authenticated
USING (
    created_by = auth.uid()
)
WITH CHECK (
    created_by = auth.uid()
);

-- Credential creators can delete their credentials
DROP POLICY IF EXISTS "voice_credentials_owner_delete" ON public.voice_credentials;
CREATE POLICY "voice_credentials_owner_delete" ON public.voice_credentials
FOR DELETE
TO authenticated
USING (
    created_by = auth.uid()
);

-- Service role has full access
DROP POLICY IF EXISTS "voice_credentials_service_role" ON public.voice_credentials;
CREATE POLICY "voice_credentials_service_role" ON public.voice_credentials
FOR ALL
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Grant usage to authenticated users (RLS policies will restrict actual access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_credentials TO authenticated;

COMMENT ON POLICY "voice_credentials_org_select" ON public.voice_credentials IS 'Org members can view their org credentials';
COMMENT ON POLICY "voice_credentials_org_insert" ON public.voice_credentials IS 'Org members can create credentials in their organization';
COMMENT ON POLICY "voice_credentials_owner_update" ON public.voice_credentials IS 'Credential creators can update their credentials';
COMMENT ON POLICY "voice_credentials_owner_delete" ON public.voice_credentials IS 'Credential creators can delete their credentials';
