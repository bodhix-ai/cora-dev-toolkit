-- =============================================
-- MODULE-WS: Row Level Security Policies
-- =============================================
-- Purpose: Apply RLS policies to all workspace tables AFTER all tables are created
-- Source: Extracted from individual schema files to avoid circular dependencies
-- Created: Jan 2026 for CORA toolkit

-- =============================================
-- WORKSPACES TABLE RLS
-- =============================================

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Workspace members can view their workspaces
DROP POLICY IF EXISTS "Workspace members can view workspaces" ON public.workspaces;
CREATE POLICY "Workspace members can view workspaces" ON public.workspaces
FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL AND
    EXISTS (
        SELECT 1 FROM public.ws_members
        WHERE ws_members.ws_id = workspaces.id
        AND ws_members.user_id = auth.uid()
        AND ws_members.deleted_at IS NULL
    )
);

-- Org members can create workspaces
DROP POLICY IF EXISTS "Org members can create workspaces" ON public.workspaces;
CREATE POLICY "Org members can create workspaces" ON public.workspaces
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = workspaces.org_id
        AND org_members.user_id = auth.uid()
    )
);

-- Workspace admins and owners can update
DROP POLICY IF EXISTS "Workspace admins and owners can update" ON public.workspaces;
CREATE POLICY "Workspace admins and owners can update" ON public.workspaces
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.ws_members
        WHERE ws_members.ws_id = workspaces.id
        AND ws_members.user_id = auth.uid()
        AND ws_members.ws_role IN ('ws_owner', 'ws_admin')
        AND ws_members.deleted_at IS NULL
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.ws_members
        WHERE ws_members.ws_id = workspaces.id
        AND ws_members.user_id = auth.uid()
        AND ws_members.ws_role IN ('ws_owner', 'ws_admin')
        AND ws_members.deleted_at IS NULL
    )
);

-- Only workspace owners can delete
DROP POLICY IF EXISTS "Workspace owners can delete" ON public.workspaces;
CREATE POLICY "Workspace owners can delete" ON public.workspaces
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.ws_members
        WHERE ws_members.ws_id = workspaces.id
        AND ws_members.user_id = auth.uid()
        AND ws_members.ws_role = 'ws_owner'
        AND ws_members.deleted_at IS NULL
    )
);

-- Service role has full access
DROP POLICY IF EXISTS "Service role full access to workspaces" ON public.workspaces;
CREATE POLICY "Service role full access to workspaces" ON public.workspaces
FOR ALL
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Grant usage to authenticated users (RLS policies will restrict actual access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO authenticated;

COMMENT ON POLICY "Workspace members can view workspaces" ON public.workspaces IS 'Only workspace members can view workspace details';
COMMENT ON POLICY "Org members can create workspaces" ON public.workspaces IS 'Any org member can create a workspace in their organization';
COMMENT ON POLICY "Workspace admins and owners can update" ON public.workspaces IS 'Only ws_admin and ws_owner roles can update workspace settings';
COMMENT ON POLICY "Workspace owners can delete" ON public.workspaces IS 'Only ws_owner role can soft-delete a workspace';

-- =============================================
-- WS_MEMBERS TABLE RLS
-- =============================================

ALTER TABLE public.ws_members ENABLE ROW LEVEL SECURITY;

-- Workspace members can view other members
DROP POLICY IF EXISTS "Workspace members can view members" ON public.ws_members;
CREATE POLICY "Workspace members can view members" ON public.ws_members
FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL AND
    EXISTS (
        SELECT 1 FROM public.ws_members wm
        WHERE wm.ws_id = ws_members.ws_id
        AND wm.user_id = auth.uid()
        AND wm.deleted_at IS NULL
    )
);

-- Only workspace owners can add members
DROP POLICY IF EXISTS "Workspace owners can add members" ON public.ws_members;
CREATE POLICY "Workspace owners can add members" ON public.ws_members
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.ws_members wm
        WHERE wm.ws_id = ws_members.ws_id
        AND wm.user_id = auth.uid()
        AND wm.ws_role = 'ws_owner'
        AND wm.deleted_at IS NULL
    )
);

-- Only workspace owners can update member roles
DROP POLICY IF EXISTS "Workspace owners can update members" ON public.ws_members;
CREATE POLICY "Workspace owners can update members" ON public.ws_members
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.ws_members wm
        WHERE wm.ws_id = ws_members.ws_id
        AND wm.user_id = auth.uid()
        AND wm.ws_role = 'ws_owner'
        AND wm.deleted_at IS NULL
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.ws_members wm
        WHERE wm.ws_id = ws_members.ws_id
        AND wm.user_id = auth.uid()
        AND wm.ws_role = 'ws_owner'
        AND wm.deleted_at IS NULL
    )
);

-- Owners can remove members, or users can remove themselves
DROP POLICY IF EXISTS "Owners or self can remove members" ON public.ws_members;
CREATE POLICY "Owners or self can remove members" ON public.ws_members
FOR DELETE
TO authenticated
USING (
    -- User is removing themselves
    user_id = auth.uid() OR
    -- User is a workspace owner
    EXISTS (
        SELECT 1 FROM public.ws_members wm
        WHERE wm.ws_id = ws_members.ws_id
        AND wm.user_id = auth.uid()
        AND wm.ws_role = 'ws_owner'
        AND wm.deleted_at IS NULL
    )
);

-- Service role has full access
DROP POLICY IF EXISTS "Service role full access to ws_members" ON public.ws_members;
CREATE POLICY "Service role full access to ws_members" ON public.ws_members
FOR ALL
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Grant usage to authenticated users (RLS policies will restrict actual access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ws_members TO authenticated;

COMMENT ON POLICY "Workspace members can view members" ON public.ws_members IS 'Any workspace member can view other members';
COMMENT ON POLICY "Workspace owners can add members" ON public.ws_members IS 'Only ws_owner can add new members';
COMMENT ON POLICY "Workspace owners can update members" ON public.ws_members IS 'Only ws_owner can change member roles';
COMMENT ON POLICY "Owners or self can remove members" ON public.ws_members IS 'Owners can remove anyone, users can remove themselves';

-- =============================================
-- WS_CFG_SYS TABLE RLS (ADR-011 compliant naming)
-- =============================================
-- Note: Renamed from ws_configs to ws_cfg_sys per ADR-011

ALTER TABLE public.ws_cfg_sys ENABLE ROW LEVEL SECURITY;

-- Everyone can read config
DROP POLICY IF EXISTS "Everyone can view ws_cfg_sys" ON public.ws_cfg_sys;
CREATE POLICY "Everyone can view ws_cfg_sys" ON public.ws_cfg_sys
FOR SELECT
TO authenticated
USING (true);

-- Only sys admins/owners can update
DROP POLICY IF EXISTS "Sys admins can update ws_cfg_sys" ON public.ws_cfg_sys;
CREATE POLICY "Sys admins can update ws_cfg_sys" ON public.ws_cfg_sys
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.sys_role IN ('sys_owner', 'sys_admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.sys_role IN ('sys_owner', 'sys_admin')
    )
);

-- Service role has full access
DROP POLICY IF EXISTS "Service role full access to ws_cfg_sys" ON public.ws_cfg_sys;
CREATE POLICY "Service role full access to ws_cfg_sys" ON public.ws_cfg_sys
FOR ALL
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Grant usage to authenticated users (RLS policies will restrict actual access)
GRANT SELECT, UPDATE ON public.ws_cfg_sys TO authenticated;

COMMENT ON POLICY "Everyone can view ws_cfg_sys" ON public.ws_cfg_sys IS 'All authenticated users can read workspace configuration';
COMMENT ON POLICY "Sys admins can update ws_cfg_sys" ON public.ws_cfg_sys IS 'Only sys_owner and sys_admin can modify configuration';

-- =============================================
-- WS_FAVORITES TABLE RLS
-- =============================================

ALTER TABLE public.ws_favorites ENABLE ROW LEVEL SECURITY;

-- Users can only view their own favorites
DROP POLICY IF EXISTS "Users can view own favorites" ON public.ws_favorites;
CREATE POLICY "Users can view own favorites" ON public.ws_favorites
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can add favorites for themselves if they're a workspace member
DROP POLICY IF EXISTS "Members can add favorites" ON public.ws_favorites;
CREATE POLICY "Members can add favorites" ON public.ws_favorites
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM public.ws_members
        WHERE ws_members.ws_id = ws_favorites.ws_id
        AND ws_members.user_id = auth.uid()
        AND ws_members.deleted_at IS NULL
    )
);

-- Users can only remove their own favorites
DROP POLICY IF EXISTS "Users can remove own favorites" ON public.ws_favorites;
CREATE POLICY "Users can remove own favorites" ON public.ws_favorites
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Service role has full access
DROP POLICY IF EXISTS "Service role full access to ws_favorites" ON public.ws_favorites;
CREATE POLICY "Service role full access to ws_favorites" ON public.ws_favorites
FOR ALL
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Grant usage to authenticated users (RLS policies will restrict actual access)
GRANT SELECT, INSERT, DELETE ON public.ws_favorites TO authenticated;

COMMENT ON POLICY "Users can view own favorites" ON public.ws_favorites IS 'Users can only see their own favorites';
COMMENT ON POLICY "Members can add favorites" ON public.ws_favorites IS 'Only workspace members can favorite a workspace';
COMMENT ON POLICY "Users can remove own favorites" ON public.ws_favorites IS 'Users can only unfavorite their own favorites';

-- =============================================
-- WS_CFG_ORG TABLE RLS (ADR-011 compliant naming)
-- =============================================
-- Note: Renamed from ws_org_settings to ws_cfg_org per ADR-011

ALTER TABLE public.ws_cfg_org ENABLE ROW LEVEL SECURITY;

-- Org members can view their org's settings
DROP POLICY IF EXISTS "Org members can view org config" ON public.ws_cfg_org;
CREATE POLICY "Org members can view org config" ON public.ws_cfg_org
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = ws_cfg_org.org_id
        AND org_members.user_id = auth.uid()
    )
);

-- Org admins and sys admins can create settings
DROP POLICY IF EXISTS "Org and sys admins can create config" ON public.ws_cfg_org;
CREATE POLICY "Org and sys admins can create config" ON public.ws_cfg_org
FOR INSERT
TO authenticated
WITH CHECK (
    -- User is sys admin
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.sys_role IN ('sys_owner', 'sys_admin')
    )
    OR
    -- User is org admin/owner
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = ws_cfg_org.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.org_role IN ('org_owner', 'org_admin')
    )
);

-- Org admins and sys admins can update settings
DROP POLICY IF EXISTS "Org and sys admins can update config" ON public.ws_cfg_org;
CREATE POLICY "Org and sys admins can update config" ON public.ws_cfg_org
FOR UPDATE
TO authenticated
USING (
    -- User is sys admin
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.sys_role IN ('sys_owner', 'sys_admin')
    )
    OR
    -- User is org admin/owner
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = ws_cfg_org.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.org_role IN ('org_owner', 'org_admin')
    )
)
WITH CHECK (
    -- User is sys admin
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.sys_role IN ('sys_owner', 'sys_admin')
    )
    OR
    -- User is org admin/owner
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = ws_cfg_org.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.org_role IN ('org_owner', 'org_admin')
    )
);

-- Service role has full access
DROP POLICY IF EXISTS "Service role full access to ws_cfg_org" ON public.ws_cfg_org;
CREATE POLICY "Service role full access to ws_cfg_org" ON public.ws_cfg_org
FOR ALL
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Grant usage to authenticated users (RLS policies will restrict actual access)
GRANT SELECT, INSERT, UPDATE ON public.ws_cfg_org TO authenticated;

COMMENT ON POLICY "Org members can view org config" ON public.ws_cfg_org IS 'All org members can view their organization workspace settings';
COMMENT ON POLICY "Org and sys admins can create config" ON public.ws_cfg_org IS 'Only org admins/owners and sys admins can create org settings';
COMMENT ON POLICY "Org and sys admins can update config" ON public.ws_cfg_org IS 'Only org admins/owners and sys admins can update org settings';

-- =============================================
-- WS_LOG_ACTIVITY TABLE RLS (ADR-011 compliant naming)
-- =============================================
-- Note: Renamed from ws_activity_log to ws_log_activity per ADR-011

ALTER TABLE public.ws_log_activity ENABLE ROW LEVEL SECURITY;

-- Workspace members can view their workspace's activity log
DROP POLICY IF EXISTS "Workspace members can view activity" ON public.ws_log_activity;
CREATE POLICY "Workspace members can view activity" ON public.ws_log_activity
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.ws_members
        WHERE ws_members.ws_id = ws_log_activity.ws_id
        AND ws_members.user_id = auth.uid()
        AND ws_members.deleted_at IS NULL
    )
);

-- Only service role can insert activity logs (automated logging)
DROP POLICY IF EXISTS "Service role can insert activity logs" ON public.ws_log_activity;
CREATE POLICY "Service role can insert activity logs" ON public.ws_log_activity
FOR INSERT
WITH CHECK (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Activity logs are immutable - no updates or deletes allowed
-- (Only service role via ALL policy below)

-- Service role has full access
DROP POLICY IF EXISTS "Service role full access to ws_log_activity" ON public.ws_log_activity;
CREATE POLICY "Service role full access to ws_log_activity" ON public.ws_log_activity
FOR ALL
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Grant usage to authenticated users (RLS policies will restrict actual access)
GRANT SELECT ON public.ws_log_activity TO authenticated;
-- Note: Only service role can INSERT (via service_role policy)

COMMENT ON POLICY "Workspace members can view activity" ON public.ws_log_activity IS 'Workspace members can view their workspace activity log';
COMMENT ON POLICY "Service role can insert activity logs" ON public.ws_log_activity IS 'Only service role (Lambda functions) can create activity log entries';
