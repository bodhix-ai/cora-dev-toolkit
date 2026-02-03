-- =============================================================================
-- ADR-019: Auth Standardization - RPC Functions
-- =============================================================================
-- Purpose: Provide standard RPC functions for admin authorization checks
-- Author: CORA Dev Toolkit
-- Created: 2026-01-30
-- Updated: 2026-01-31 (renamed to check_* for backward compatibility)
-- ADR: docs/arch decisions/ADR-019-AUTH-STANDARDIZATION.md
--
-- These functions are called by the org-common helper functions:
-- - common.check_sys_admin(user_id) -> calls check_sys_admin(p_user_id) RPC
-- - common.check_org_admin(user_id, org_id) -> calls check_org_admin(p_user_id, p_org_id) RPC
-- - common.check_ws_admin(user_id, ws_id) -> calls check_ws_admin(p_user_id, p_ws_id) RPC
--
-- NAMING CONVENTION: check_* (not is_*) to avoid conflicts with existing functions
-- that may exist in legacy databases with different signatures.
--
-- These functions use parameterized queries to prevent SQL injection and
-- enforce authorization at the database level.
-- =============================================================================

-- =============================================================================
-- System Admin Check
-- =============================================================================

CREATE OR REPLACE FUNCTION check_sys_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if user has sys_owner or sys_admin role
    -- Note: user_profiles table doesn't have deleted_at column
    RETURN EXISTS (
        SELECT 1
        FROM user_profiles
        WHERE user_id = p_user_id
        AND sys_role IN ('sys_owner', 'sys_admin')
    );
END;
$$;

COMMENT ON FUNCTION check_sys_admin(UUID) IS 'ADR-019: Check if user has system admin privileges (sys_owner or sys_admin)';

-- =============================================================================
-- Organization Admin Check
-- =============================================================================

CREATE OR REPLACE FUNCTION check_org_admin(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if user has org_owner or org_admin role in the specified organization
    -- Note: org_members table doesn't have soft-delete columns
    RETURN EXISTS (
        SELECT 1
        FROM org_members
        WHERE user_id = p_user_id
        AND org_id = p_org_id
        AND org_role IN ('org_owner', 'org_admin')
    );
END;
$$;

COMMENT ON FUNCTION check_org_admin(UUID, UUID) IS 'ADR-019: Check if user has organization admin privileges (org_owner or org_admin)';

-- =============================================================================
-- Workspace Admin Check
-- =============================================================================

CREATE OR REPLACE FUNCTION check_ws_admin(p_user_id UUID, p_ws_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if user has ws_owner or ws_admin role in the specified workspace
    -- Note: ws_members uses ws_role column (not role) and has deleted_at for soft-delete
    RETURN EXISTS (
        SELECT 1
        FROM ws_members
        WHERE user_id = p_user_id
        AND ws_id = p_ws_id
        AND ws_role IN ('ws_owner', 'ws_admin')
        AND deleted_at IS NULL
    );
END;
$$;

COMMENT ON FUNCTION check_ws_admin(UUID, UUID) IS 'ADR-019: Check if user has workspace admin privileges (ws_owner or ws_admin)';

-- =============================================================================
-- Grant Execute Permissions
-- =============================================================================

-- Grant execute to authenticated users (functions use SECURITY DEFINER)
GRANT EXECUTE ON FUNCTION check_sys_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_org_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_ws_admin(UUID, UUID) TO authenticated;

-- =============================================================================
-- ADR-019c: Resource Permission Authorization - Layer 2
-- =============================================================================
-- Purpose: Provide resource-level permission checks for module-access
-- Created: 2026-02-01
-- ADR: docs/arch decisions/ADR-019c-AUTH-RESOURCE-PERMISSIONS.md
--
-- These functions enforce resource-level access control:
-- - Organization access (view, edit, delete)
-- - Member management (view, manage)
-- - Invite management (view, manage)
-- - User profile access (view, edit)
-- - Email domain management
-- =============================================================================

-- =============================================================================
-- Organization Permissions
-- =============================================================================

CREATE OR REPLACE FUNCTION can_view_org(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- User can view org if they are a member
    RETURN EXISTS (
        SELECT 1
        FROM org_members
        WHERE user_id = p_user_id
        AND org_id = p_org_id
    );
END;
$$;

COMMENT ON FUNCTION can_view_org(UUID, UUID) IS 'ADR-019c: Check if user can view organization (is member)';

CREATE OR REPLACE FUNCTION can_edit_org(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- User can edit org if they are org_admin or org_owner
    RETURN EXISTS (
        SELECT 1
        FROM org_members
        WHERE user_id = p_user_id
        AND org_id = p_org_id
        AND org_role IN ('org_admin', 'org_owner')
    );
END;
$$;

COMMENT ON FUNCTION can_edit_org(UUID, UUID) IS 'ADR-019c: Check if user can edit organization (is org_admin or org_owner)';

CREATE OR REPLACE FUNCTION can_delete_org(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- User can delete org if they are org_owner
    RETURN EXISTS (
        SELECT 1
        FROM org_members
        WHERE user_id = p_user_id
        AND org_id = p_org_id
        AND org_role = 'org_owner'
    );
END;
$$;

COMMENT ON FUNCTION can_delete_org(UUID, UUID) IS 'ADR-019c: Check if user can delete organization (is org_owner)';

-- =============================================================================
-- Member Management Permissions
-- =============================================================================

CREATE OR REPLACE FUNCTION can_view_members(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- User can view members if they are a member of the org
    RETURN EXISTS (
        SELECT 1
        FROM org_members
        WHERE user_id = p_user_id
        AND org_id = p_org_id
    );
END;
$$;

COMMENT ON FUNCTION can_view_members(UUID, UUID) IS 'ADR-019c: Check if user can view org members (is member)';

CREATE OR REPLACE FUNCTION can_manage_members(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- User can manage members if they are org_admin or org_owner
    RETURN EXISTS (
        SELECT 1
        FROM org_members
        WHERE user_id = p_user_id
        AND org_id = p_org_id
        AND org_role IN ('org_admin', 'org_owner')
    );
END;
$$;

COMMENT ON FUNCTION can_manage_members(UUID, UUID) IS 'ADR-019c: Check if user can manage members (is org_admin or org_owner)';

-- =============================================================================
-- Invite Permissions
-- =============================================================================

CREATE OR REPLACE FUNCTION can_view_invites(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- User can view invites if they are a member of the org
    RETURN EXISTS (
        SELECT 1
        FROM org_members
        WHERE user_id = p_user_id
        AND org_id = p_org_id
    );
END;
$$;

COMMENT ON FUNCTION can_view_invites(UUID, UUID) IS 'ADR-019c: Check if user can view invites (is member)';

CREATE OR REPLACE FUNCTION can_manage_invites(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- User can manage invites if they are org_admin or org_owner
    RETURN EXISTS (
        SELECT 1
        FROM org_members
        WHERE user_id = p_user_id
        AND org_id = p_org_id
        AND org_role IN ('org_admin', 'org_owner')
    );
END;
$$;

COMMENT ON FUNCTION can_manage_invites(UUID, UUID) IS 'ADR-019c: Check if user can manage invites (is org_admin or org_owner)';

-- =============================================================================
-- User Profile Permissions
-- =============================================================================

CREATE OR REPLACE FUNCTION can_view_profile(p_user_id UUID, p_target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    is_self BOOLEAN;
    is_admin BOOLEAN;
BEGIN
    -- Can view own profile
    is_self := (p_user_id = p_target_user_id);
    
    -- Can view if sys_admin
    is_admin := EXISTS (
        SELECT 1
        FROM user_profiles
        WHERE user_id = p_user_id
        AND sys_role IN ('sys_owner', 'sys_admin')
    );
    
    RETURN is_self OR is_admin;
END;
$$;

COMMENT ON FUNCTION can_view_profile(UUID, UUID) IS 'ADR-019c: Check if user can view profile (self or sys_admin)';

CREATE OR REPLACE FUNCTION can_edit_profile(p_user_id UUID, p_target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Can edit if can view (same rules apply)
    RETURN can_view_profile(p_user_id, p_target_user_id);
END;
$$;

COMMENT ON FUNCTION can_edit_profile(UUID, UUID) IS 'ADR-019c: Check if user can edit profile (self or sys_admin)';

-- =============================================================================
-- Email Domain Permissions
-- =============================================================================

CREATE OR REPLACE FUNCTION can_manage_email_domains(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- User can manage email domains if they are org_admin or org_owner
    RETURN EXISTS (
        SELECT 1
        FROM org_members
        WHERE user_id = p_user_id
        AND org_id = p_org_id
        AND org_role IN ('org_admin', 'org_owner')
    );
END;
$$;

COMMENT ON FUNCTION can_manage_email_domains(UUID, UUID) IS 'ADR-019c: Check if user can manage email domains (is org_admin or org_owner)';

-- =============================================================================
-- Grant Execute Permissions (Layer 2)
-- =============================================================================

GRANT EXECUTE ON FUNCTION can_view_org(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_edit_org(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_delete_org(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_view_members(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_members(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_view_invites(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_invites(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_view_profile(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_edit_profile(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_email_domains(UUID, UUID) TO authenticated;

-- =============================================================================
-- Verification Queries
-- =============================================================================
-- Run these queries after applying the schema to verify the functions work:
--
-- Test sys admin check:
-- SELECT check_sys_admin('user-uuid-here'::uuid);
--
-- Test org admin check:
-- SELECT check_org_admin('user-uuid-here'::uuid, 'org-uuid-here'::uuid);
--
-- Test workspace admin check:
-- SELECT check_ws_admin('user-uuid-here'::uuid, 'ws-uuid-here'::uuid);
--
-- Test org permissions:
-- SELECT can_view_org('user-uuid-here'::uuid, 'org-uuid-here'::uuid);
-- SELECT can_edit_org('user-uuid-here'::uuid, 'org-uuid-here'::uuid);
--
-- Test profile permissions:
-- SELECT can_view_profile('user-uuid-here'::uuid, 'target-user-uuid-here'::uuid);
-- =============================================================================
