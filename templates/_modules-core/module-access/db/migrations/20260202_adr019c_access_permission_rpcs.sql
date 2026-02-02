-- ============================================================================
-- Migration: Add ADR-019c resource permission RPC functions
-- Date: 2026-02-02
-- Module: module-access
-- ============================================================================
-- Purpose: Add Layer 2 resource permission functions for module-access
-- ADR: docs/arch decisions/ADR-019c-AUTH-RESOURCE-PERMISSIONS.md
--
-- This migration adds resource-level permission checks for:
-- - Organization access (view, edit, delete)
-- - Member management (view, manage)
-- - Invite management (view, manage)
-- - User profile access (view, edit)
-- - Email domain management
-- ============================================================================

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
-- Grant Execute Permissions
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

-- ============================================================================
-- Migration Complete
-- ============================================================================
