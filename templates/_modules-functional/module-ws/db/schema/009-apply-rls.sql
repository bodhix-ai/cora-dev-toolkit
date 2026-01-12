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
-- WS_CONFIGS TABLE RLS
-- =============================================

ALTER TABLE public.ws_configs ENABLE ROW LEVEL SECURITY;

-- Everyone can read config
DROP POLICY IF EXISTS "Everyone can view ws_configs" ON public.ws_configs;
CREATE POLICY "Everyone can view ws_configs" ON public.ws_configs
FOR SELECT
TO authenticated
USING (true);

-- Only platform admins/owners can update
DROP POLICY IF EXISTS "Platform admins can update ws_configs" ON public.ws_configs;
CREATE POLICY "Platform admins can update ws_configs" ON public.ws_configs
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.global_role IN ('platform_owner', 'platform_admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.global_role IN ('platform_owner', 'platform_admin')
    )
);

-- Service role has full access
DROP POLICY IF EXISTS "Service role full access to ws_configs" ON public.ws_configs;
CREATE POLICY "Service role full access to ws_configs" ON public.ws_configs
FOR ALL
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Grant usage to authenticated users (RLS policies will restrict actual access)
GRANT SELECT, UPDATE ON public.ws_configs TO authenticated;

COMMENT ON POLICY "Everyone can view ws_configs" ON public.ws_configs IS 'All authenticated users can read workspace configuration';
COMMENT ON POLICY "Platform admins can update ws_configs" ON public.ws_configs IS 'Only platform_owner and platform_admin can modify configuration';

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
-- WS_ORG_SETTINGS TABLE RLS
-- =============================================

ALTER TABLE public.ws_org_settings ENABLE ROW LEVEL SECURITY;

-- Org members can view their org's settings
DROP POLICY IF EXISTS "Org members can view org settings" ON public.ws_org_settings;
CREATE POLICY "Org members can view org settings" ON public.ws_org_settings
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = ws_org_settings.org_id
        AND org_members.user_id = auth.uid()
    )
);

-- Org admins and platform admins can create settings
DROP POLICY IF EXISTS "Org and platform admins can create settings" ON public.ws_org_settings;
CREATE POLICY "Org and platform admins can create settings" ON public.ws_org_settings
FOR INSERT
TO authenticated
WITH CHECK (
    -- User is platform admin
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.global_role IN ('platform_owner', 'platform_admin')
    )
    OR
    -- User is org admin/owner
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = ws_org_settings.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.role IN ('org_owner', 'org_admin')
    )
);

-- Org admins and platform admins can update settings
DROP POLICY IF EXISTS "Org and platform admins can update settings" ON public.ws_org_settings;
CREATE POLICY "Org and platform admins can update settings" ON public.ws_org_settings
FOR UPDATE
TO authenticated
USING (
    -- User is platform admin
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.global_role IN ('platform_owner', 'platform_admin')
    )
    OR
    -- User is org admin/owner
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = ws_org_settings.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.role IN ('org_owner', 'org_admin')
    )
)
WITH CHECK (
    -- User is platform admin
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.global_role IN ('platform_owner', 'platform_admin')
    )
    OR
    -- User is org admin/owner
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = ws_org_settings.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.role IN ('org_owner', 'org_admin')
    )
);

-- Service role has full access
DROP POLICY IF EXISTS "Service role full access to ws_org_settings" ON public.ws_org_settings;
CREATE POLICY "Service role full access to ws_org_settings" ON public.ws_org_settings
FOR ALL
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Grant usage to authenticated users (RLS policies will restrict actual access)
GRANT SELECT, INSERT, UPDATE ON public.ws_org_settings TO authenticated;

COMMENT ON POLICY "Org members can view org settings" ON public.ws_org_settings IS 'All org members can view their organization workspace settings';
COMMENT ON POLICY "Org and platform admins can create settings" ON public.ws_org_settings IS 'Only org admins/owners and platform admins can create org settings';
COMMENT ON POLICY "Org and platform admins can update settings" ON public.ws_org_settings IS 'Only org admins/owners and platform admins can update org settings';

-- =============================================
-- WS_ACTIVITY_LOG TABLE RLS
-- =============================================

ALTER TABLE public.ws_activity_log ENABLE ROW LEVEL SECURITY;

-- Workspace members can view their workspace's activity log
DROP POLICY IF EXISTS "Workspace members can view activity" ON public.ws_activity_log;
CREATE POLICY "Workspace members can view activity" ON public.ws_activity_log
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.ws_members
        WHERE ws_members.ws_id = ws_activity_log.ws_id
        AND ws_members.user_id = auth.uid()
        AND ws_members.deleted_at IS NULL
    )
);

-- Only service role can insert activity logs (automated logging)
DROP POLICY IF EXISTS "Service role can insert activity logs" ON public.ws_activity_log;
CREATE POLICY "Service role can insert activity logs" ON public.ws_activity_log
FOR INSERT
WITH CHECK (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Activity logs are immutable - no updates or deletes allowed
-- (Only service role via ALL policy below)

-- Service role has full access
DROP POLICY IF EXISTS "Service role full access to ws_activity_log" ON public.ws_activity_log;
CREATE POLICY "Service role full access to ws_activity_log" ON public.ws_activity_log
FOR ALL
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Grant usage to authenticated users (RLS policies will restrict actual access)
GRANT SELECT ON public.ws_activity_log TO authenticated;
-- Note: Only service role can INSERT (via service_role policy)

COMMENT ON POLICY "Workspace members can view activity" ON public.ws_activity_log IS 'Workspace members can view their workspace activity log';
COMMENT ON POLICY "Service role can insert activity logs" ON public.ws_activity_log IS 'Only service role (Lambda functions) can create activity log entries';
